<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Concerns\ChecksPreferenceAccess;
use App\Http\Controllers\Controller;
use App\Models\Contracts\Contract;
use App\Models\CustomerInfo\Company;
use App\Models\CustomerInfo\PotentialCustomer;
use App\Models\LocationDepartment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CustomerInfoController extends Controller
{
    use ChecksPreferenceAccess;

    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 12);

        if ($perPage < 1) {
            $perPage = 12;
        } elseif ($perPage > 100) {
            $perPage = 100;
        }

        $sortBy    = $request->input('sort_by', 'company_name');
        $sortOrder = $request->input('sort_order', 'asc');
        $statusParam = $request->input('status', '1'); // default to Active only

        $currentUser = Auth::user();
        $userId      = (int) ($currentUser->id ?? 0);
        $employeeId  = $currentUser->employee_id ?? null;
        $isAdmin     = $userId === 1;
        $isPrivileged = $this->isCompanyVisibilityPrivileged();

        $approverLocationDepts = $isAdmin
            ? collect()
            : LocationDepartment::query()
                ->where(function ($q) use ($userId) {
                    $q->where('reviewed_by', $userId)
                    ->orWhere('checked_by', $userId)
                    ->orWhere('endorsed_by', $userId)
                    ->orWhere('confirmed_by', $userId)
                    ->orWhere('approved_by', $userId);
                })
                ->get(['location_id', 'department_id']);

        $applyVisibility = function ($query) use ($isAdmin, $isPrivileged, $employeeId, $approverLocationDepts) {
            if ($isAdmin || $isPrivileged) {
                return;
            }

            $query->where(function ($q) use ($employeeId, $approverLocationDepts) {
                $q->where('client_managers.employee_id', $employeeId);

                if ($approverLocationDepts->isNotEmpty()) {
                    $q->orWhere(function ($qOr) use ($approverLocationDepts) {
                        foreach ($approverLocationDepts as $ld) {
                            $qOr->orWhere(function ($qPair) use ($ld) {
                                $qPair->where('client_managers.primary_location_id', $ld->location_id)
                                    ->where('client_managers.department_id', $ld->department_id);
                            });
                        }
                    });
                }
            });
        };

        $allowedSorts = [
            'id', 'company_name', 'sap_code',
            'client_category', 'delsan_company', 'status', 'client_manager',
            'contracts',
        ];

        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'company_name';
        }

        $sortOrder = $sortOrder === 'desc' ? 'desc' : 'asc';

        $numericColumns = ['id', 'status'];

        $companyTable = (new Company())->getTable();

        $qualify = fn (string $table, string $column) =>
            '`' . str_replace('.', '`.`', $table) . '`.`' . $column . '`';

        $baseFilteredQuery = function () use ($companyTable, $request, $statusParam, $applyVisibility) {
            
            $categoryParam = $request->input('category');
            $categories = is_array($categoryParam) ? $categoryParam : array_filter(explode(',', $categoryParam ?? ''));

            $delsanParam = $request->input('delsan_company');
            $delsans = is_array($delsanParam) ? $delsanParam : array_filter(explode(',', $delsanParam ?? ''));

            return Company::query()
                ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
                    $join->on(
                        DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                        '=',
                        DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                    );
                })
                ->when(true, $applyVisibility)
                ->when($request->input('search'), function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('company_name', 'like', "%{$search}%")
                        ->orWhere('sap_code', 'like', "%{$search}%")
                        ->orWhereRaw(
                            "CONCAT(client_managers.first_name, ' ', client_managers.last_name) LIKE ?",
                            ["%{$search}%"]
                        );
                    });
                })
                ->when(!empty($categories), function ($query) use ($categories) {
                    $query->whereIn('client_category', $categories);
                })
                ->when(!empty($delsans), function ($query) use ($delsans) {
                    $query->whereIn('delsan_company', $delsans);
                })
                ->when($statusParam !== null && $statusParam !== '', function ($query) use ($statusParam, $companyTable) {
                    $statuses = array_filter(explode(',', $statusParam), fn($v) => $v !== '');
                    if (!empty($statuses)) {
                        $query->whereIn("{$companyTable}.status", $statuses);
                    }
                });
        };

        // Group key: sap_code when present/non-empty, otherwise the row's own
        // id (so sap_code-less rows never get merged with anything).
        $groupKeyExpr = "CASE WHEN {$companyTable}.sap_code IS NULL OR {$companyTable}.sap_code = '' "
            . "THEN CONCAT('__row_', {$companyTable}.id) ELSE {$companyTable}.sap_code END";

        // One representative id per group = lowest id among the rows that
        // currently match the filters (including status).
        $representativeIds = $baseFilteredQuery()
            ->selectRaw("MIN({$companyTable}.id) as rep_id")
            ->groupByRaw($groupKeyExpr)
            ->pluck('rep_id');

        $totalGroups = $representativeIds->count();

        // Contract count for a row's whole sap_code group (falls back to the
        // row's own id when it has no sap_code) — mirrors $groupKeyExpr /
        // $contractsCountBySapCode below so sort order matches what's shown.
        $contractsCountSubquery = "(
            SELECT COUNT(*) FROM contracts
            WHERE contracts.company_id IN (
                SELECT grp.id FROM {$companyTable} AS grp
                WHERE
                    (
                        {$companyTable}.sap_code IS NOT NULL AND {$companyTable}.sap_code != ''
                        AND grp.sap_code = {$companyTable}.sap_code
                    )
                    OR
                    (
                        ({$companyTable}.sap_code IS NULL OR {$companyTable}.sap_code = '')
                        AND grp.id = {$companyTable}.id
                    )
            )
        )";

        $exemptSorts = ['sap_code', 'client_manager', 'contracts'];

        $companiesQuery = $baseFilteredQuery()
            ->select("{$companyTable}.*")
            ->with(['clientManager', 'mainLocation'])
            ->whereIn("{$companyTable}.id", $representativeIds)
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
            ->when($sortBy === 'contracts', function ($query) use ($sortOrder, $contractsCountSubquery) {
                $query->orderByRaw("{$contractsCountSubquery} {$sortOrder}");
            })
            ->when(!in_array($sortBy, $exemptSorts) && in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder, $companyTable) {
                $query->orderBy("{$companyTable}.{$sortBy}", $sortOrder);
            })
            ->when(!in_array($sortBy, $exemptSorts) && !in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder, $companyTable, $qualify) {
                $query->orderByRaw("LOWER({$qualify($companyTable, $sortBy)}) {$sortOrder}");
            });

        $page = $request->integer('page', 1);

        $companiesForPage = (clone $companiesQuery)
            ->forPage($page, $perPage)
            ->get();

        $companies = new \Illuminate\Pagination\LengthAwarePaginator(
            $companiesForPage,
            $totalGroups,
            $perPage,
            $page,
            [
                'path'  => $request->url(),
                'query' => $request->query(),
            ]
        );

        $sapCodesOnPage = $companiesForPage
            ->pluck('sap_code')
            ->filter(fn ($v) => $v !== null && $v !== '')
            ->unique()
            ->values();

        $siblingsBySap = $sapCodesOnPage->isEmpty()
            ? collect()
            : Company::query()
                ->whereIn('sap_code', $sapCodesOnPage)
                ->when($statusParam !== null && $statusParam !== '', function ($query) use ($statusParam) {
                    $statuses = array_filter(explode(',', $statusParam), fn($v) => $v !== '');
                    if (!empty($statuses)) {
                        $query->whereIn('status', $statuses);
                    }
                })
                ->orderBy('address')
                ->with('mainLocation')
                ->get(['id', 'sap_code', 'company_name', 'address', 'main_location', 'contact_no', 'status'])
                ->groupBy('sap_code');

        // Sibling branches can grant upload permission through a shared
        // sap_code — a manager assigned to any branch in the group can
        // upload for every branch in that group. Mirrors the same rule
        // used by ContractController::upload().
        $managerIdsBySapCode = $sapCodesOnPage->isEmpty()
            ? collect()
            : Company::query()
                ->select('sap_code', 'id_client_mngr')
                ->whereIn('sap_code', $sapCodesOnPage)
                ->get()
                ->groupBy('sap_code')
                ->map(fn ($group) => $group->pluck('id_client_mngr')->filter()->unique()->values());

        $contractCompanyIds = $companiesForPage->pluck('id')
            ->merge($siblingsBySap->flatten(1)->pluck('id'))
            ->unique()
            ->values();

        $contractsRaw = Contract::query()
            ->whereIn('company_id', $contractCompanyIds)
            ->get();

        $contractsRaw->each(fn ($c) => $c->refreshStatus());

        $contractsByCompanyId = $contractsRaw->groupBy('company_id');

        $contractsCountByCompanyId = $contractsByCompanyId->map->count();

        $statusByCompanyId = $contractsByCompanyId->map(function ($group) {
            if ($group->contains(fn ($c) => $c->status === Contract::STATUS_EXPIRED)) {
                return 'expired';
            }
            if ($group->contains(fn ($c) => $c->status === Contract::STATUS_EXPIRING_SOON)) {
                return 'expiring_soon';
            }
            if ($group->contains(fn ($c) => in_array($c->status, [Contract::STATUS_ACTIVE, Contract::STATUS_EXTENDED], true))) {
                return 'ok';
            }
            return 'default';
        });

        $contractsCountBySapCode = $companiesForPage
            ->filter(fn ($c) => $c->sap_code)
            ->mapWithKeys(function ($c) use ($siblingsBySap, $contractsCountByCompanyId) {
                $allIds = ($siblingsBySap[$c->sap_code] ?? collect())->pluck('id')->push($c->id)->unique();
                return [$c->sap_code => $allIds->sum(fn ($id) => $contractsCountByCompanyId[$id] ?? 0)];
            });

        $statusBySapCode = $companiesForPage
            ->filter(fn ($c) => $c->sap_code)
            ->mapWithKeys(function ($c) use ($siblingsBySap, $statusByCompanyId) {
                $allIds = ($siblingsBySap[$c->sap_code] ?? collect())->pluck('id')->push($c->id)->unique();
                $statuses = $allIds->map(fn ($id) => $statusByCompanyId[$id] ?? 'default');
                return [$c->sap_code => $statuses->contains('expired')
                    ? 'expired'
                    : ($statuses->contains('expiring_soon')
                        ? 'expiring_soon'
                        : ($statuses->contains('ok') ? 'ok' : 'default'))];
            });

        $companies->getCollection()->transform(function ($c) use (
            $siblingsBySap, $contractsCountBySapCode, $contractsCountByCompanyId,
            $statusBySapCode, $statusByCompanyId,
            $managerIdsBySapCode, $isAdmin, $isPrivileged, $employeeId
        ) {
            $branchGroups = [];

            if ($c->sap_code && $siblingsBySap->has($c->sap_code)) {
                $siblings = $siblingsBySap[$c->sap_code]
                    ->reject(fn ($b) => (int) $b->id === (int) $c->id);

                $branchGroups = $siblings
                    ->groupBy('main_location')
                    ->map(function ($group) {
                        $first = $group->first();
                        return [
                            'main_location_id'   => $first->main_location,
                            'main_location_name' => $first->mainLocation->branch_name ?? null,
                            'addresses' => $group->map(fn ($b) => [
                                'id'           => $b->id,
                                'company_name' => $b->company_name,
                                'address'      => $b->address,
                                'contact_no'   => $b->contact_no,
                                'status'       => $b->status,
                            ])->values()->all(),
                        ];
                    })
                    ->values()
                    ->all();
            }

            $isDirectManager = $employeeId
                && (string) $c->id_client_mngr === (string) $employeeId;

            $isGroupManager = $employeeId && $c->sap_code
                && ($managerIdsBySapCode[$c->sap_code] ?? collect())
                    ->contains(fn ($id) => (string) $id === (string) $employeeId);

            return [
                'id'                 => $c->id,
                'company_name'       => $c->company_name,
                'sap_code'           => $c->sap_code,
                'client_category'    => $c->client_category,
                'delsan_company'     => $c->delsan_company,
                'address'            => $c->address,
                'main_location'      => $c->main_location,
                'main_location_name' => $c->mainLocation->branch_name ?? null,
                'branches'           => $branchGroups,
                'contact_no'         => $c->contact_no,
                'id_client_mngr'     => $c->id_client_mngr,
                'client_manager'     => $c->clientManager ? $c->clientManager->first_name . ' ' . $c->clientManager->last_name : null,
                'status'             => $c->status,
                'contracts'        => $c->sap_code
                    ? ($contractsCountBySapCode[$c->sap_code] ?? 0)
                    : ($contractsCountByCompanyId[$c->id] ?? 0),
                'contracts_status'  => $c->sap_code
                    ? ($statusBySapCode[$c->sap_code] ?? 'ok')
                    : ($statusByCompanyId[$c->id] ?? 'ok'),
                'can_upload'         => $isAdmin || $isPrivileged || $isDirectManager || $isGroupManager,
                    ];
        });

        $categories = Company::query()
            ->whereNotNull('client_category')
            ->where('client_category', '!=', '')
            ->distinct()
            ->orderBy('client_category')
            ->pluck('client_category');

        // ── Potential customers ─────────────────────────────────────────────

        $allowedPotentialSorts = ['id', 'company_name', 'address', 'status', 'created_at', 'client_manager'];

        $potentialSortBy = in_array($sortBy, $allowedPotentialSorts) ? $sortBy : 'company_name';

        $potentialTable = (new PotentialCustomer())->getTable();

        $potentials = PotentialCustomer::query()
            ->leftJoin('users as client_managers', function ($join) use ($potentialTable) {
                $join->on(
                    DB::raw("{$potentialTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                    DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                );
            })
            ->select("{$potentialTable}.*")
            ->with('clientManager')
            ->when(true, $applyVisibility)
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('company_name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
                });
            })
            ->when($statusParam !== null && $statusParam !== '', function ($query) use ($statusParam, $potentialTable) {
                $statuses = array_filter(explode(',', $statusParam), fn($v) => $v !== '');
                if (!empty($statuses)) {
                    $query->whereIn("{$potentialTable}.status", $statuses);
                }
            })
            ->when($potentialSortBy === 'client_manager', function ($query) use ($sortOrder) {
                $query->orderByRaw(
                    "LOWER(CONCAT(client_managers.first_name, ' ', client_managers.last_name)) {$sortOrder}"
                );
            })
            ->when($potentialSortBy !== 'client_manager' && in_array($potentialSortBy, ['id', 'status']), function ($query) use ($potentialSortBy, $sortOrder, $potentialTable) {
                $query->orderBy("{$potentialTable}.{$potentialSortBy}", $sortOrder);
            })
            ->when($potentialSortBy !== 'client_manager' && !in_array($potentialSortBy, ['id', 'status']), function ($query) use ($potentialSortBy, $sortOrder, $potentialTable, $qualify) {
                $query->orderByRaw("LOWER({$qualify($potentialTable, $potentialSortBy)}) {$sortOrder}");
            })
            ->paginate($perPage)
            ->withQueryString();

        $potentials->getCollection()->transform(fn($p) => [
            'id'             => $p->id,
            'company_name'   => $p->company_name,
            'address'        => $p->address,
            'contact_no'     => $p->contact_no,
            'id_client_mngr' => $p->id_client_mngr,
            'client_manager' => $p->clientManager ? $p->clientManager->first_name . ' ' . $p->clientManager->last_name : null,
            'delsan_company' => $p->clientManager?->delsan,
            'status'         => $p->status,
            'created_at'     => $p->created_at?->toDateTimeString(),
        ]);

        // ── AJAX (axios) search request: bypass Inertia, return raw paginators ──
        // Only for plain axios calls — never for Inertia's own visits, which send X-Inertia.
        if (!$request->header('X-Inertia') && ($request->ajax() || $request->wantsJson())) {
            return response()->json([
                'companies'  => $companies,
                'potentials' => $potentials,
            ]);
        }

        // ── Render ──────────────────────────────────────────────────────────

        return Inertia::render('CustomerManagement/CustomerInfo/Index', [
            'companies'  => $companies,
            'potentials' => $potentials,
            'categories' => $categories,
            'filters'    => $request->only([
                'search',
                'category',
                'status',
                'per_page',
                'sort_by',
                'sort_order',
                'delsan_company',
            ]),
        ]);
    }

    public function show($id)
    {
        $company = Company::findOrFail($id);

        return Inertia::render('Companies/Show', [
            'company' => $company,
        ]);
    }

    public function updatePotential(Request $request, PotentialCustomer $potential)
    {
        $validated = $request->validate([
            'address'    => ['sometimes', 'nullable', 'string', 'max:255'],
            'contact_no' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $potential->update($validated);

        return back();
    }
}