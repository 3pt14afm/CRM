<?php

namespace App\Http\Controllers\Contract;

use App\Http\Controllers\Concerns\AppliesCompanyVisibility;
use App\Http\Controllers\Controller;
use App\Models\Contracts\Contract;
use App\Models\Contracts\ContractType;
use App\Models\CustomerInfo\Company;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ContractMonitoringController extends Controller
{
    use AppliesCompanyVisibility;

    // Default view excludes final statuses — surfaced only via the status filter.
    private const DEFAULT_STATUSES = [
        Contract::STATUS_ACTIVE,
        Contract::STATUS_EXTENDED,
        Contract::STATUS_EXPIRING_SOON,
        Contract::STATUS_EXPIRED,
    ];

    private const STATUS_LABELS = [
        Contract::STATUS_ACTIVE        => 'Active Contract',
        Contract::STATUS_EXTENDED      => 'Extended Contract',
        Contract::STATUS_EXPIRING_SOON => 'Expiring Contract',
        Contract::STATUS_EXPIRED       => 'Expired Contract',
        Contract::STATUS_TERMINATED    => 'Terminated Contract',
        Contract::STATUS_ARCHIVED      => 'Archived Contract',
    ];

    public function index(Request $request)
    {
        $ctx = $this->buildFilteredCompaniesQuery($request);

        $perPage = $request->integer('per_page', 100);
        if ($perPage < 1) {
            $perPage = 100;
        } elseif ($perPage > 100) {
            $perPage = 100;
        }

        $companies = $ctx['query']
            ->paginate($perPage)
            ->withQueryString();

        $sapCodesOnPage = $companies->getCollection()->pluck('sap_code')->filter()->unique()->values();

        $siblingCompanies = $sapCodesOnPage->isEmpty()
            ? collect()
            : Company::query()
                ->where('status', 1)
                ->whereRaw("UPPER(TRIM(COALESCE(delsan_company, ''))) != 'DDTC'")
                ->whereIn('sap_code', $sapCodesOnPage)
                ->with('mainLocation', 'clientManager')
                ->get();

        $allCompanies = $companies->getCollection()
            ->concat($siblingCompanies)
            ->unique('id');

        $companyIds = $allCompanies->pluck('id');

        $contractsRaw = Contract::query()
            ->whereIn('company_id', $companyIds)
            ->with('contractType')
            ->when($ctx['statusesToShow'], fn ($q) => $q->whereIn('status', $ctx['statusesToShow']))
            ->when($ctx['typesToShow'], fn ($q) => $q->whereIn('ctid', $ctx['typesToShow']))
            ->get();

        // Reflect up-to-date statuses in THIS response without writing inline (avoids
        // write contention on every page load). Persisting is throttled + lock-guarded
        // below and deferred until after the response is sent.
        $statusUpdatesByTarget = [];

        foreach ($contractsRaw as $c) {
            if (in_array($c->status, Contract::FINAL_STATUSES, true)) {
                continue;
            }

            $computed = $c->computeStatus();
            if ($computed !== $c->status) {
                $c->status = $computed; // reflect in this response only
                $statusUpdatesByTarget[$computed][] = $c->id;
            }
        }

        if (!empty($statusUpdatesByTarget)) {
            // At most one writer at a time, at most once every 60s across all users/requests.
            // No cron/scheduler access needed — this piggybacks on real traffic instead.
            $lock = Cache::lock('contract_monitoring:refresh_statuses', 55);

            if ($lock->get()) {
                dispatch(function () use ($statusUpdatesByTarget, $lock) {
                    try {
                        foreach ($statusUpdatesByTarget as $status => $ids) {
                            Contract::whereIn('id', $ids)->update(['status' => $status]);
                        }
                    } finally {
                        $lock->release();
                    }
                })->afterResponse();
            }
        }

        $companiesById = $allCompanies->keyBy('id');

        $uploaderNamesByEmployeeId = User::query()
            ->whereIn('employee_id', $contractsRaw->pluck('uploader')->filter()->unique()->values())
            ->get(['employee_id', 'first_name', 'last_name'])
            ->keyBy('employee_id')
            ->map(fn ($u) => trim("{$u->first_name} {$u->last_name}"));

        $contractsList = $contractsRaw->map(function ($c) use ($companiesById, $uploaderNamesByEmployeeId) {
            $company = $companiesById->get($c->company_id);

            return [
                'id'             => $c->id,
                'sap_code'       => $company->sap_code ?? null,
                'company_id'     => $c->company_id,
                'company_name'   => trim($c->company_name ?? ''),
                'client_manager' => ($company && $company->clientManager)
                    ? (trim($company->clientManager->first_name . ' ' . $company->clientManager->last_name) ?: null)
                    : null,
                'id_client_mngr' => $company->id_client_mngr ?? null,
                'delsan_company' => $company->delsan_company ?? null,
                'uploader'       => $uploaderNamesByEmployeeId[$c->uploader] ?? null,
                'start_date'     => optional($c->start_date)->format('Y-m-d'),
                'end_date'       => optional($c->end_date)->format('Y-m-d'),
                'location'       => $company->mainLocation->branch_name ?? null,
                'status'         => $c->status,
                'status_label'   => self::STATUS_LABELS[$c->status] ?? ucfirst($c->status),
                'contract_type'  => optional($c->contractType)->name,
                'remaining_days' => $this->remainingDays($c),
                'doc_num'        => $c->doc_num,
                'pdf_url'        => $c->pdf_path ? route('contract.pdf', $c->id) : null,
            ];
        });

        $contractsByCompanyIdForFrontend = $contractsList->groupBy('company_id');

        $companies->getCollection()->transform(function ($c) use (
            $siblingCompanies, $contractsByCompanyIdForFrontend
        ) {
            $siblings = $c->sap_code
                ? $siblingCompanies->where('sap_code', $c->sap_code)->values()
                : collect([$c]);

            $branchContracts = $siblings
                ->flatMap(fn ($s) => $contractsByCompanyIdForFrontend->get($s->id, collect()))
                ->values();

            return [
                'id'                 => $c->id,
                'sap_code'           => $c->sap_code,
                'company_name'       => trim($c->company_name ?? ''),
                'delsan_company'     => $c->delsan_company,
                'location'           => $c->mainLocation->branch_name ?? null,
                'client_manager'     => $c->clientManager
                    ? (trim($c->clientManager->first_name . ' ' . $c->clientManager->last_name) ?: null)
                    : null,
                'id_client_mngr'     => $c->id_client_mngr,
                'branches'           => $siblings->map(fn ($s) => [
                    'id'             => $s->id,
                    'company_name'   => trim($s->company_name ?? ''),
                    'location'       => $s->mainLocation->branch_name ?? null,
                    'delsan_company' => $s->delsan_company,
                    'client_manager' => $s->clientManager
                        ? (trim($s->clientManager->first_name . ' ' . $s->clientManager->last_name) ?: null)
                        : null,
                    'id_client_mngr' => $s->id_client_mngr,
                ])->values()->all(),
                'contracts'          => $contractsByCompanyIdForFrontend->get($c->id, collect())->values()->all(),
                'branch_contracts'   => $branchContracts->all(),
            ];
        });

        $contractTypes = ContractType::where('status', 1)
            ->orderBy('name')
            ->get(['id', 'name']);

        if (!$request->header('X-Inertia') && ($request->ajax() || $request->wantsJson())) {
            return response()->json(['companies' => $companies]);
        }

        return Inertia::render('Contract/ContractMonitoring', [
            'companies'      => $companies,
            'contractTypes'  => $contractTypes,
            'statusOptions'  => collect(self::STATUS_LABELS)->map(fn ($label, $value) => [
                'value' => $value,
                'label' => $label,
            ])->values(),
            'filters' => array_merge(
                $request->only(['search', 'delsan_company', 'type', 'status', 'include_no_contracts', 'sort_by', 'sort_order']),
                ['per_page' => $perPage] // always echo the resolved value, not just what was in the request
            ),
        ]);
    }

    public function export(Request $request)
    {
        $ctx = $this->buildFilteredCompaniesQuery($request);

        $companies = $ctx['query']->get();

        $sapCodesAll = $companies->pluck('sap_code')->filter()->unique()->values();

        $siblingCompanies = $sapCodesAll->isEmpty()
            ? collect()
            : Company::query()
                ->where('status', 1)
                ->whereRaw("UPPER(TRIM(COALESCE(delsan_company, ''))) != 'DDTC'")
                ->whereIn('sap_code', $sapCodesAll)
                ->with('mainLocation', 'clientManager')
                ->get();

        $allCompanies = $companies->concat($siblingCompanies)->unique('id');
        $companyIds = $allCompanies->pluck('id');

        $contractsRaw = Contract::query()
            ->whereIn('company_id', $companyIds)
            ->with('contractType')
            ->when($ctx['statusesToShow'], fn ($q) => $q->whereIn('status', $ctx['statusesToShow']))
            ->when($ctx['typesToShow'], fn ($q) => $q->whereIn('ctid', $ctx['typesToShow']))
            ->get();

        $companiesById = $allCompanies->keyBy('id');

        $rows = $contractsRaw->map(function ($c) use ($companiesById) {
            $company = $companiesById->get($c->company_id);

            return [
                'sap_code'       => $company->sap_code ?? null,
                'company_name'   => trim($c->company_name ?? ($company->company_name ?? '')),
                'delsan_company' => $company->delsan_company ?? null,
                'location'       => $company->mainLocation->branch_name ?? null,
                'client_manager' => ($company && $company->clientManager)
                    ? (trim($company->clientManager->first_name . ' ' . $company->clientManager->last_name) ?: null)
                    : null,
                'contract_type'  => optional($c->contractType)->name,
                'status'         => $c->status, 
                'status_label'   => self::STATUS_LABELS[$c->status] ?? ucfirst($c->status),
                'start_date'     => optional($c->start_date)->format('Y-m-d'),
                'end_date'       => optional($c->end_date)->format('Y-m-d'),
                'remaining_days' => $this->remainingDays($c),
                'remaining_days_label'  => $this->formatRemainingDays($this->remainingDays($c)),
                'doc_num'        => $c->doc_num,
            ];
        })->values();

        if ($ctx['includeNoContracts']) {
            $companiesWithContracts = $contractsRaw->pluck('company_id')->unique();

            $noContractRows = $allCompanies
                ->reject(fn ($c) => $companiesWithContracts->contains($c->id))
                ->map(fn ($c) => [
                    'sap_code'       => $c->sap_code,
                    'company_name'   => trim($c->company_name ?? ''),
                    'delsan_company' => $c->delsan_company,
                    'location'       => $c->mainLocation->branch_name ?? null,
                    'client_manager' => $c->clientManager
                        ? (trim($c->clientManager->first_name . ' ' . $c->clientManager->last_name) ?: null)
                        : null,
                    'contract_type'  => null,
                    'status'         => 'no_contract', 
                    'status_label'   => 'No Contract',
                    'start_date'     => null,
                    'end_date'       => null,
                    'remaining_days' => null,
                    'remaining_days_label' => null,
                    'doc_num'        => null,
                ])
                ->values();

            $rows = $rows->concat($noContractRows)->values();
        }

        return $this->streamContractMonitoringXlsx($rows);
    }

    private function buildFilteredCompaniesQuery(Request $request): array
    {
        $sortBy    = $request->input('sort_by', 'company_name');
        $sortOrder = $request->input('sort_order', 'asc') === 'desc' ? 'desc' : 'asc';

        $allowedSorts = [
            'company_name', 'sap_code', 'delsan_company',
            'client_manager', 'location', 'status', 'contract_type', 'dates', 'remaining_days',
        ];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'company_name';
        }

        $statusFilter = $request->input('status');

        $statusesToShow = self::DEFAULT_STATUSES;

        if (is_array($statusFilter) && !empty($statusFilter)) {
            $validStatuses = array_filter($statusFilter, fn($s) => array_key_exists($s, self::STATUS_LABELS));
            if (!empty($validStatuses)) {
                $statusesToShow = $validStatuses;
            }
        } elseif (is_string($statusFilter)) {
            if ($statusFilter === 'all') {
                $statusesToShow = null;
            } elseif (array_key_exists($statusFilter, self::STATUS_LABELS)) {
                $statusesToShow = [$statusFilter];
            }
        }

        $includeNoContracts = $request->boolean('include_no_contracts');

        $typeInput = $request->input('type');
        $typesToShow = null;

        if (is_array($typeInput) && !empty($typeInput)) {
            $validTypes = array_filter($typeInput);
            if (!empty($validTypes)) {
                $typesToShow = $validTypes;
            }
        } elseif (is_string($typeInput) && $typeInput !== '') {
            $typesToShow = [$typeInput];
        }

        $companyTable = (new Company())->getTable();

        $sapGroups = Cache::remember('contract_monitoring:company_sap_groups', 300, function () use ($companyTable) {
            return DB::table($companyTable)
                ->select('id', 'sap_code')
                ->where('status', 1)
                ->whereRaw("UPPER(TRIM(COALESCE(delsan_company, ''))) != 'DDTC'")
                ->get()
                ->groupBy(fn ($c) => $c->sap_code ?: "solo:{$c->id}");
        });

        $qualifyingCompanyIds = null;
        if (!$includeNoContracts) {
            $qualifyingCacheKey = 'contract_monitoring:qualifying_company_ids:' . md5(json_encode([
                'statuses' => $statusesToShow,
                'types'    => $typesToShow,
            ]));

            $qualifyingCompanyIds = Cache::remember($qualifyingCacheKey, 120, function () use ($statusesToShow, $typesToShow) {
                return DB::table('contracts')
                    ->when($statusesToShow, fn ($q) => $q->whereIn('status', $statusesToShow))
                    ->when($typesToShow, fn ($q) => $q->whereIn('ctid', $typesToShow))
                    ->distinct()
                    ->pluck('company_id');
            })->flip();
        }

        $searchTerm   = $request->input('search');
        $delsanFilter = $request->input('delsan_company');

        $attributeQualifyingCompanyIds = null;
        if ($searchTerm || $delsanFilter) {
            $attributeQualifyingCompanyIds = Company::query()
                ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
                    $join->on(
                        DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                        '=',
                        DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                    );
                })
                ->select("{$companyTable}.id")
                ->where("{$companyTable}.status", 1)
                ->when($searchTerm, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('company_name', 'like', "%{$search}%")
                        ->orWhere('sap_code', 'like', "%{$search}%")
                        ->orWhere('delsan_company', 'like', "%{$search}%")
                        ->orWhereRaw(
                            "LOWER(CONCAT(client_managers.first_name, ' ', client_managers.last_name)) LIKE ?",
                            ['%' . strtolower($search) . '%']
                        )
                        ->orWhereHas('contracts', function ($cq) use ($search) {
                            $cq->where('doc_num', 'like', "%{$search}%");
                        });
                    });
                })
                ->when($delsanFilter, function ($query, $delsan) {
                    $query->where('delsan_company', $delsan);
                })
                ->pluck("{$companyTable}.id")
                ->flip();
        }

        $qualifyingGroups = $includeNoContracts
            ? $sapGroups
            : $sapGroups->filter(fn ($group) => $group->contains(fn ($c) => $qualifyingCompanyIds->has($c->id)));

        if ($attributeQualifyingCompanyIds !== null) {
            $qualifyingGroups = $qualifyingGroups->filter(
                fn ($group) => $group->contains(fn ($c) => $attributeQualifyingCompanyIds->has($c->id))
            );
        }

        $companyIdsToShow = $qualifyingGroups->map(fn ($group) => $group->min('id'))->values();

        $baseQuery = Company::query()
            ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
                $join->on(
                    DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                    DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                );
            })
            ->select("{$companyTable}.*")
            ->when($sortBy === 'client_manager', function ($query) {
                $query->addSelect([
                    DB::raw('client_managers.first_name as cm_sort_first_name'),
                    DB::raw('client_managers.last_name as cm_sort_last_name'),
                ]);
            })
            ->when($sortBy === 'location', function ($query) use ($companyTable) {
                $query->leftJoin('erms.tbl_location as sort_location', 'sort_location.id', '=', "{$companyTable}.main_location")
                    ->addSelect(DB::raw('sort_location.branch_name as loc_sort_branch_name'));
            })
            ->distinct()
            ->with('mainLocation', 'clientManager')
            ->where("{$companyTable}.status", 1)
            ->whereRaw("UPPER(TRIM(COALESCE({$companyTable}.delsan_company, ''))) != 'DDTC'")
            ->when(true, fn ($query) => $this->applyCompanyVisibility($query))
            ->whereIn("{$companyTable}.id", $companyIdsToShow);

        $qualify = fn (string $column) => '`' . str_replace('.', '`.`', $companyTable) . '`.`' . $column . '`';

        // Note: alias inside this expression must match whatever the "remaining_days"
        // derived table below names its contracts row — currently "remaining_sort_c".
        $effectiveEndExpr = "
            COALESCE(
                CASE WHEN remaining_sort_c.extend_dates IS NOT NULL AND JSON_LENGTH(remaining_sort_c.extend_dates) > 0
                    THEN (
                        SELECT MAX(jt.ext_date)
                        FROM JSON_TABLE(remaining_sort_c.extend_dates, '$[*]' COLUMNS (ext_date DATE PATH '$.date')) AS jt
                    )
                    ELSE NULL
                END,
                remaining_sort_c.end_date
            )
        ";

        $query = $baseQuery
            ->when($sortBy === 'sap_code', function ($query) use ($sortOrder) {
                $query->orderByRaw(
                    "CAST(REGEXP_REPLACE(sap_code, '^[A-Za-z-]+', '') AS UNSIGNED) {$sortOrder},
                    sap_code {$sortOrder}"
                );
            })
            ->when($sortBy === 'client_manager', function ($query) use ($sortOrder) {
                $query->orderByRaw(
                    "LOWER(CONCAT(client_managers.first_name, ' ', client_managers.last_name)) {$sortOrder}"
                );
            })
            ->when($sortBy === 'location', function ($query) use ($sortOrder) {
                $query->orderByRaw('LOWER(sort_location.branch_name) ' . $sortOrder);
            })
            ->when($sortBy === 'status', function ($query) use ($sortOrder, $companyTable, $statusesToShow, $typesToShow) {
                $query->leftJoinSub(
                    DB::table('contracts')
                        ->join("{$companyTable} as status_sort_cc", 'status_sort_cc.id', '=', 'contracts.company_id')
                        ->select('status_sort_cc.sap_code', DB::raw('COUNT(*) as sort_value'))
                        ->when($statusesToShow, fn ($q) => $q->whereIn('contracts.status', $statusesToShow))
                        ->when($typesToShow, fn ($q) => $q->whereIn('contracts.ctid', $typesToShow))
                        ->groupBy('status_sort_cc.sap_code'),
                    'status_sort',
                    'status_sort.sap_code', '=', "{$companyTable}.sap_code"
                )->addSelect(DB::raw('status_sort.sort_value as status_sort_value'))
                ->orderByRaw(
                    "COALESCE(status_sort.sort_value, 0) {$sortOrder}, LOWER({$companyTable}.company_name) asc"
                );
            })
            ->when($sortBy === 'contract_type', function ($query) use ($sortOrder, $companyTable, $statusesToShow, $typesToShow) {
                $aggFn = $sortOrder === 'desc' ? 'MAX' : 'MIN';
                $query->leftJoinSub(
                    DB::table('contracts as type_sort_c')
                        ->join('contract_type as type_sort_ct', 'type_sort_ct.id', '=', 'type_sort_c.ctid')
                        ->select('type_sort_c.company_id', DB::raw("{$aggFn}(type_sort_ct.name) as sort_value"))
                        ->when($statusesToShow, fn ($q) => $q->whereIn('type_sort_c.status', $statusesToShow))
                        ->when($typesToShow, fn ($q) => $q->whereIn('type_sort_c.ctid', $typesToShow))
                        ->groupBy('type_sort_c.company_id'),
                    'type_sort',
                    'type_sort.company_id', '=', "{$companyTable}.id"
                )->addSelect(DB::raw('type_sort.sort_value as type_sort_value'))
                ->orderByRaw("type_sort.sort_value {$sortOrder}");
            })
            ->when($sortBy === 'dates', function ($query) use ($sortOrder, $companyTable, $statusesToShow, $typesToShow) {
                $query->leftJoinSub(
                    DB::table('contracts as dates_sort_c')
                        ->select('dates_sort_c.company_id', DB::raw('MIN(dates_sort_c.start_date) as sort_value'))
                        ->when($statusesToShow, fn ($q) => $q->whereIn('dates_sort_c.status', $statusesToShow))
                        ->when($typesToShow, fn ($q) => $q->whereIn('dates_sort_c.ctid', $typesToShow))
                        ->groupBy('dates_sort_c.company_id'),
                    'dates_sort',
                    'dates_sort.company_id', '=', "{$companyTable}.id"
                )->addSelect(DB::raw('dates_sort.sort_value as dates_sort_value'))
                ->orderByRaw("dates_sort.sort_value {$sortOrder}");
            })
            ->when($sortBy === 'remaining_days', function ($query) use ($sortOrder, $companyTable, $statusesToShow, $typesToShow) {
                // Level 1: one row per contract, with its effective end date computed via a
                // real JSON_TABLE JOIN (not a scalar subquery nested inside CASE/MIN — that
                // form throws MySQL error 1210 once Laravel's paginate() count query
                // re-shapes the SELECT list).
                $perContractEnd = DB::table('contracts as remaining_sort_c')
                    ->leftJoin(
                        DB::raw("JSON_TABLE(remaining_sort_c.extend_dates, '$[*]' COLUMNS (ext_date DATE PATH '$.date')) as jt"),
                        DB::raw('1'), '=', DB::raw('1')
                    )
                    ->when($statusesToShow, fn ($q) => $q->whereIn('remaining_sort_c.status', $statusesToShow))
                    ->when($typesToShow, fn ($q) => $q->whereIn('remaining_sort_c.ctid', $typesToShow))
                    ->select(
                        'remaining_sort_c.id',
                        'remaining_sort_c.company_id',
                        DB::raw('COALESCE(MAX(jt.ext_date), remaining_sort_c.end_date) as effective_end')
                    )
                    ->groupBy('remaining_sort_c.id', 'remaining_sort_c.company_id', 'remaining_sort_c.end_date');

                // Level 2: aggregate per-company MIN across contracts.
                $query->leftJoinSub(
                    DB::table(DB::raw("({$perContractEnd->toSql()}) as per_contract_end"))
                        ->mergeBindings($perContractEnd)
                        ->select('per_contract_end.company_id', DB::raw('MIN(per_contract_end.effective_end) as sort_value'))
                        ->groupBy('per_contract_end.company_id'),
                    'remaining_sort',
                    'remaining_sort.company_id', '=', "{$companyTable}.id"
                )->addSelect(DB::raw('remaining_sort.sort_value as remaining_sort_value'))
                ->orderByRaw("remaining_sort.sort_value {$sortOrder}");
            })
            ->when(!in_array($sortBy, [
                'sap_code', 'client_manager', 'location', 'status', 'contract_type', 'dates', 'remaining_days',
            ]), function ($query) use ($sortBy, $sortOrder, $qualify) {
                $query->orderByRaw("LOWER({$qualify($sortBy)}) {$sortOrder}");
            });

        return [
            'query'              => $query,
            'statusesToShow'     => $statusesToShow,
            'typesToShow'        => $typesToShow,
            'includeNoContracts' => $includeNoContracts,
        ];
    }

    private const STATUS_FILL_COLORS = [
        Contract::STATUS_ACTIVE        => ['font' => '2DA300'],
        Contract::STATUS_EXTENDED      => ['font' => '059669'],
        Contract::STATUS_EXPIRING_SOON => ['font' => 'D97706'],
        Contract::STATUS_EXPIRED       => ['font' => 'DC2626'],
        Contract::STATUS_TERMINATED    => ['font' => '64748B'],
        Contract::STATUS_ARCHIVED      => ['font' => '64748B'],
        'no_contract'                   => ['font' => '64748B'],
    ];

    private function streamContractMonitoringXlsx(Collection $rows)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Contract Monitoring');

        $headers = ['SAP Code', 'Company Name', 'Delsan', 'Location', 'Account Manager', 'Contract Type', 'Status', 'Start Date', 'End Date', 'Remaining Days', 'Doc No.'];
        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle('A1:K1')->getFont()->setBold(true);
        $sheet->getStyle('A1:K1')->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setRGB('E9F7E7');

        $r = 2;
        foreach ($rows as $row) {
            $sheet->fromArray([
                $row['sap_code'],
                $row['company_name'],
                $row['delsan_company'],
                $row['location'],
                $row['client_manager'],
                $row['contract_type'],
                $row['status_label'],
                $row['start_date'],
                $row['end_date'],
                $row['remaining_days_label'],
                $row['doc_num'],
            ], null, "A{$r}");

            $colors = self::STATUS_FILL_COLORS[$row['status']] ?? self::STATUS_FILL_COLORS['no_contract'];

            $statusCell = $sheet->getStyle("G{$r}");
            $statusCell->getFont()->getColor()->setRGB($colors['font']);

            $sheet->getStyle("J{$r}")->getFont()->getColor()->setRGB($colors['font']);

            $r++;
        }

        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'company-contracts-' . now()->format('Y-m-d_His') . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function remainingDays(Contract $contract): ?int
    {
        $effectiveEnd = $contract->latestExtendedDate() ?? optional($contract->end_date)->format('Y-m-d');

        if (!$effectiveEnd) {
            return null;
        }

        $today  = Carbon::today();
        $target = Carbon::parse($effectiveEnd)->startOfDay();

        return $today->diffInDays($target, false);
    }

    private function formatRemainingDays(?int $days): ?string
    {
        if ($days === null) {
            return null;
        }

        if ($days === 0) {
            return 'Today';
        }

        $overdue = $days < 0;
        $abs = abs($days);
        $months = intdiv($abs, 30);
        $remDays = $abs % 30;

        $parts = [];
        if ($months > 0) {
            $parts[] = "{$months}m";
        }
        if ($remDays > 0 || $months === 0) {
            $parts[] = "{$remDays}d";
        }

        $label = implode(' ', $parts);

        return $overdue ? "{$label} overdue" : $label;
    }
}