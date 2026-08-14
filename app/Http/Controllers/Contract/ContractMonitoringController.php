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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

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
        $perPage = $request->integer('per_page', 12);

        if ($perPage < 1) {
            $perPage = 12;
        } elseif ($perPage > 100) {
            $perPage = 100;
        }

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
            // If they ticked boxes, filter out any invalid statuses
            $validStatuses = array_filter($statusFilter, fn($s) => array_key_exists($s, self::STATUS_LABELS));
            if (!empty($validStatuses)) {
                $statusesToShow = $validStatuses;
            }
        } elseif (is_string($statusFilter)) {
            // Handle legacy/fallback string behavior
            if ($statusFilter === 'all') {
                $statusesToShow = null;
            } elseif (array_key_exists($statusFilter, self::STATUS_LABELS)) {
                $statusesToShow = [$statusFilter];
            }
        }
        // --------------------------------

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

        $contractFilterSql = '';
        $contractFilterBindings = [];
        if ($statusesToShow) {
            $placeholders = implode(',', array_fill(0, count($statusesToShow), '?'));
            $contractFilterSql .= " AND status IN ({$placeholders})";
            $contractFilterBindings = array_merge($contractFilterBindings, $statusesToShow);
        }
        if ($typesToShow) {
            $placeholders = implode(',', array_fill(0, count($typesToShow), '?'));
            $contractFilterSql .= " AND ctid IN ({$placeholders})";
            $contractFilterBindings = array_merge($contractFilterBindings, $typesToShow);
        }

        $sapGroups = Cache::remember('contract_monitoring:company_sap_groups', 300, function () use ($companyTable) {
            return Company::where("{$companyTable}.status", 1)
                ->get(["{$companyTable}.id", "{$companyTable}.sap_code"])
                ->groupBy(fn ($c) => $c->sap_code ?: "solo:{$c->id}");
        });

        if ($includeNoContracts) {
            $companyIdsToShow = $sapGroups->map(fn ($group) => $group->min('id'))->values();
        } else {
            // Cache per filter combination — there are only a handful of realistic ones
            // (default statuses, "all", specific picks), so this is a high hit-rate cache
            // even under concurrent load with different users applying the same filters.
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

            $companyIdsToShow = $sapGroups
                ->filter(fn ($group) => $group->contains(fn ($c) => $qualifyingCompanyIds->has($c->id)))
                ->map(fn ($group) => $group->min('id'))
                ->values();
        }

        $baseQuery = Company::query()
            ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
                $join->on(
                    DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                    DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                );
            })
            ->select("{$companyTable}.*")
            ->distinct()
            ->with('mainLocation', 'clientManager')
            ->where("{$companyTable}.status", 1)
            ->when(true, fn ($query) => $this->applyCompanyVisibility($query))
            ->whereIn("{$companyTable}.id", $companyIdsToShow)
            ->when($request->input('search'), function ($query, $search) {
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
            ->when($request->input('delsan_company'), function ($query, $delsan) {
                $query->where('delsan_company', $delsan);
            });

        $qualify = fn (string $column) => '`' . str_replace('.', '`.`', $companyTable) . '`.`' . $column . '`';

        $effectiveEndExpr = "
            COALESCE(
                CASE WHEN c.extend_dates IS NOT NULL AND JSON_LENGTH(c.extend_dates) > 0
                     THEN (
                        SELECT MAX(jt.ext_date)
                        FROM JSON_TABLE(c.extend_dates, '$[*]' COLUMNS (ext_date DATE PATH '$.date')) AS jt
                     )
                     ELSE NULL
                END,
                c.end_date
            )
        ";

        $companies = $baseQuery
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
            ->when($sortBy === 'location', function ($query) use ($sortOrder, $companyTable) {
                $query->leftJoin('erms.tbl_location as sort_location', 'sort_location.id', '=', "{$companyTable}.main_location")
                    ->orderByRaw('LOWER(sort_location.branch_name) ' . $sortOrder);
            })
            ->when($sortBy === 'status', function ($query) use ($sortOrder, $companyTable, $contractFilterSql, $contractFilterBindings) {
                $subFilter = str_replace('status', 'contracts.status', str_replace('ctid', 'contracts.ctid', $contractFilterSql));
                $query->orderByRaw(
                    "(SELECT COUNT(*) FROM contracts
                    JOIN {$companyTable} AS cc ON cc.id = contracts.company_id
                    WHERE cc.sap_code = {$companyTable}.sap_code{$subFilter}) {$sortOrder}, LOWER({$companyTable}.company_name) asc",
                    $contractFilterBindings
                );
            })
            ->when($sortBy === 'contract_type', function ($query) use ($sortOrder, $companyTable, $contractFilterSql, $contractFilterBindings) {
                $subFilter = str_replace('status', 'c.status', str_replace('ctid', 'c.ctid', $contractFilterSql));
                $query->orderByRaw(
                    "(SELECT ct.name FROM contracts c
                      JOIN contract_type ct ON ct.id = c.ctid
                      WHERE c.company_id = {$companyTable}.id{$subFilter}
                      ORDER BY ct.name {$sortOrder} LIMIT 1) {$sortOrder}",
                    $contractFilterBindings
                );
            })
            ->when($sortBy === 'dates', function ($query) use ($sortOrder, $companyTable, $contractFilterSql, $contractFilterBindings) {
                $query->orderByRaw(
                    "(SELECT MIN(start_date) FROM contracts WHERE contracts.company_id = {$companyTable}.id{$contractFilterSql}) {$sortOrder}",
                    $contractFilterBindings
                );
            })
            ->when($sortBy === 'remaining_days', function ($query) use ($sortOrder, $companyTable, $contractFilterSql, $contractFilterBindings, $effectiveEndExpr) {
                $subFilter = str_replace('status', 'c.status', str_replace('ctid', 'c.ctid', $contractFilterSql));
                $query->orderByRaw(
                    "(SELECT MIN({$effectiveEndExpr}) FROM contracts c WHERE c.company_id = {$companyTable}.id{$subFilter}) {$sortOrder}",
                    $contractFilterBindings
                );
            })
            ->when(!in_array($sortBy, [
                'sap_code', 'client_manager', 'location', 'status', 'contract_type', 'dates', 'remaining_days',
            ]), function ($query) use ($sortBy, $sortOrder, $qualify) {
                $query->orderByRaw("LOWER({$qualify($sortBy)}) {$sortOrder}");
            })
            ->paginate($perPage)
            ->withQueryString();

        $sapCodesOnPage = $companies->getCollection()->pluck('sap_code')->filter()->unique()->values();

        $siblingCompanies = $sapCodesOnPage->isEmpty()
            ? collect()
            : Company::query()
                ->where('status', 1)
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
            ->when($statusesToShow, fn ($q) => $q->whereIn('status', $statusesToShow))
            ->when($typesToShow, fn ($q) => $q->whereIn('ctid', $typesToShow))
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

        $contractsList = $contractsRaw->map(function ($c) use ($companiesById) {
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
            $sapCodesOnPage, $siblingCompanies, $contractsByCompanyIdForFrontend
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
            'filters' => $request->only([
                'search', 'delsan_company', 'type', 'status', 'include_no_contracts', 'per_page', 'sort_by', 'sort_order',
            ]),
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

        // Signed: positive = days left, negative = days overdue.
        return $today->diffInDays($target, false);
    }
}