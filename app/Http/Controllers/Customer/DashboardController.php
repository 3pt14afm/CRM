<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Concerns\AppliesCompanyVisibility;
use App\Http\Controllers\Concerns\ManagesCompanyContracts;
use App\Http\Controllers\Controller;
use App\Models\Contracts\Contract;
use App\Models\CustomerInfo\Company;
use App\Models\CustomerInfo\PotentialCustomer;
use App\Models\RoiEntryProject;
use App\Models\RoiCurrentProject;
use App\Models\RoiArchiveProject;
use App\Models\SPRF\SprfEntryProject;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\SPRF\SprfArchiveProject;
use App\Models\LocationDepartment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use ManagesCompanyContracts;
    use AppliesCompanyVisibility;
    
    public function customerStats(Request $request)
    {
        $companyTable   = (new Company())->getTable();
        $potentialTable = (new PotentialCustomer())->getTable();

        $asUserId = $request->integer('as_user_id') ?: null;
        
        $visibleCompanyIds = $this->visibleCompanyIds();

        $groupKeyExpr = "CASE WHEN {$companyTable}.sap_code IS NULL OR {$companyTable}.sap_code = '' "
            . "THEN CONCAT('__row_', {$companyTable}.id) ELSE {$companyTable}.sap_code END";

        // Active Accounts: dedup by sap_code (one sap_code can have many branches).
        $activeCustomers = Company::query()
            ->where("{$companyTable}.status", 1)
            ->whereIn("{$companyTable}.id", $visibleCompanyIds)
            ->selectRaw("MIN({$companyTable}.id) as rep_id")
            ->groupByRaw($groupKeyExpr)
            ->get()
            ->count();

        // Total Customer: all active branches, ungrouped, prospects excluded.
        $totalCustomers = $visibleCompanyIds->count();

        $prospectCustomers = PotentialCustomer::query()
            ->leftJoin('users as client_managers', function ($join) use ($potentialTable) {
                $join->on(
                    DB::raw("{$potentialTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                    DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                );
            })
            ->when(true, fn ($q) => $this->applyCompanyVisibility($q, $asUserId))
            ->count();

        return response()->json([
            'total_customers'    => $totalCustomers,
            'active_accounts'    => $activeCustomers,
            'prospect_customers' => $prospectCustomers,
        ]);
    }

    public function clientManagerOptions(Request $request)
    {
        $isAdmin      = ((int) Auth::id()) === 1;
        $isPrivileged = $this->isCompanyVisibilityPrivileged();

        if (!$isAdmin && !$isPrivileged) {
            return response()->json([]);
        }

        $companyTable = (new Company())->getTable();

        $managers = \App\Models\User::query()
            ->whereIn(DB::raw('employee_id COLLATE utf8mb4_unicode_ci'), function ($q) use ($companyTable) {
                $q->select(DB::raw('id_client_mngr COLLATE utf8mb4_unicode_ci'))
                  ->from($companyTable)
                  ->whereNotNull('id_client_mngr')
                  ->where('id_client_mngr', '!=', '')
                  ->where('status', 1);
            })
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn ($u) => [
                'id'   => $u->id,
                'name' => trim("{$u->first_name} {$u->last_name}"),
            ])
            ->values();

        return response()->json($managers);
    }

    private function joinClientManagers($query, string $table)
    {
        return $query->leftJoin('users as client_managers', function ($join) use ($table) {
            $join->on(
                DB::raw("{$table}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
            );
        });
    }

    public function pendingApprovals(Request $request)
    {
        $userId = (int) Auth::id();

        $isApprover = LocationDepartment::query()
            ->where(function ($q) use ($userId) {
                $q->where('reviewed_by', $userId)
                ->orWhere('checked_by', $userId)
                ->orWhere('endorsed_by', $userId)
                ->orWhere('confirmed_by', $userId)
                ->orWhere('approved_by', $userId);
            })
            ->exists();

        $roiPending = collect();
        $sprfPending = collect();

        if ($isApprover) {
            $roiPending = \App\Models\RoiCurrentProject::query()
                ->with('user:id,first_name,last_name')
                ->where(function ($q) use ($userId) {
                    $q->where(fn($sub) => $sub->where('current_level', 2)->where('reviewed_by', $userId))
                    ->orWhere(fn($sub) => $sub->where('current_level', 3)->where('checked_by', $userId))
                    ->orWhere(fn($sub) => $sub->where('current_level', 4)->where('endorsed_by', $userId))
                    ->orWhere(fn($sub) => $sub->where('current_level', 5)->where('confirmed_by', $userId))
                    ->orWhere(fn($sub) => $sub->where('current_level', 6)->where('approved_by', $userId));
                })
                ->whereNotIn('status', ['Withdrawn', 'Cancelled', 'Approved', 'Rejected'])
                ->orderByDesc('last_saved_at')
                ->get()
                ->map(fn ($p) => [
                    'id'           => $p->id,
                    'prepared_by'  => trim(($p->user->first_name ?? '') . ' ' . ($p->user->last_name ?? '')) ?: '—',
                    'company_name' => $p->company_name,
                    'status'       => $p->status,
                    'href'         => route('roi.current.show', $p->id),
                ]);

            $sprfPending = \App\Models\SPRF\SprfCurrentProject::query()
                ->with('preparer:id,first_name,last_name')
                ->where('current_approver_user_id', $userId)
                ->whereIn('status', ['for_review', 'under_review', 'Sent Back'])
                ->orderByDesc('updated_at')
                ->get()
                ->map(fn ($p) => [
                    'id'           => $p->id,
                    'prepared_by'  => trim(($p->preparer->first_name ?? '') . ' ' . ($p->preparer->last_name ?? '')) ?: '—',
                    'company_name' => $p->account,
                    'status'       => $p->status,
                    'href'         => route('sprf.current.show', $p->id),
                ]);
        }

        $roiMine = \App\Models\RoiCurrentProject::query()
            ->with('user:id,first_name,last_name')
            ->where('user_id', $userId)
            ->orderByDesc('last_saved_at')
            ->get()
            ->map(fn ($p) => [
                'id'           => $p->id,
                'prepared_by'  => trim(($p->user->first_name ?? '') . ' ' . ($p->user->last_name ?? '')) ?: '—',
                'company_name' => $p->company_name,
                'status'       => $p->status,
                'href'         => route('roi.current.show', $p->id),
            ]);

        $sprfMine = \App\Models\SPRF\SprfCurrentProject::query()
            ->with('preparer:id,first_name,last_name')
            ->where('prepared_by_user_id', $userId)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($p) => [
                'id'           => $p->id,
                'prepared_by'  => trim(($p->preparer->first_name ?? '') . ' ' . ($p->preparer->last_name ?? '')) ?: '—',
                'company_name' => $p->account,
                'status'       => $p->status,
                'href'         => route('sprf.current.show', $p->id),
            ]);

        return response()->json([
            'is_approver'  => $isApprover,
            'roi_pending'  => $roiPending,
            'sprf_pending' => $sprfPending,
            'roi_mine'     => $roiMine,
            'sprf_mine'    => $sprfMine,
        ]);
    }

    public function distributionStats(Request $request)
    {
        $period = in_array($request->input('period'), ['week', 'month', 'year'], true)
            ? $request->input('period')
            : 'month';

        [$start, $end] = match ($period) {
            'week'  => [now()->startOfWeek(), now()->endOfWeek()],
            'year'  => [now()->startOfYear(), now()->endOfYear()],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };

        $userId  = (int) Auth::id();
        $isAdmin = $userId === 1 || (Auth::user()->employee_id ?? null) === '0283';

        $isApprover = LocationDepartment::query()
            ->where(function ($q) use ($userId) {
                $q->where('reviewed_by', $userId)
                  ->orWhere('checked_by', $userId)
                  ->orWhere('endorsed_by', $userId)
                  ->orWhere('confirmed_by', $userId)
                  ->orWhere('approved_by', $userId);
            })
            ->exists();

        return response()->json([
            'is_approver' => $isApprover,
            'roi'  => $this->buildRoiDistribution($userId, $isAdmin, $isApprover, $start, $end),
            'sprf' => $this->buildSprfDistribution($userId, $isAdmin, $isApprover, $start, $end),
        ]);
    }

    private function buildRoiDistribution(int $userId, bool $isAdmin, bool $isApprover, $start, $end): array
    {
        $pendingApprovals = $isApprover
            ? RoiCurrentProject::query()
                ->where(function ($q) use ($userId) {
                    $q->where(fn($sub) => $sub->where('current_level', 2)->where('reviewed_by', $userId))
                    ->orWhere(fn($sub) => $sub->where('current_level', 3)->where('checked_by', $userId))
                    ->orWhere(fn($sub) => $sub->where('current_level', 4)->where('endorsed_by', $userId))
                    ->orWhere(fn($sub) => $sub->where('current_level', 5)->where('confirmed_by', $userId))
                    ->orWhere(fn($sub) => $sub->where('current_level', 6)->where('approved_by', $userId));
                })
                ->whereNotIn('status', ['Withdrawn', 'Cancelled', 'Approved', 'Rejected'])
                ->count()
            : RoiCurrentProject::query()
                ->where('user_id', $userId)
                ->count();

        $pendingProjects = $isApprover
            ? RoiCurrentProject::query()
                ->where('user_id', $userId)
                ->count()
            : 0;

        $archiveCounts = RoiArchiveProject::query()
            ->whereRaw('COALESCE(approved_at, rejected_at, cancelled_at, created_at) BETWEEN ? AND ?', [$start, $end])
            ->when(!$isAdmin, function ($q) use ($userId) {
                $q->where(function ($qq) use ($userId) {
                    $qq->where('user_id', $userId)
                    ->orWhere('reviewed_by', $userId)
                    ->orWhere('checked_by', $userId)
                    ->orWhere('endorsed_by', $userId)
                    ->orWhere('confirmed_by', $userId)
                    ->orWhere('approved_by', $userId)
                    ->orWhere('rejected_by', $userId);
                });
            })
            ->selectRaw('LOWER(status) as status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'pending'          => $pendingApprovals,
            'pending_projects' => $pendingProjects,
            'rejected'         => (int) ($archiveCounts['rejected'] ?? 0),
            'cancelled'        => (int) ($archiveCounts['cancelled'] ?? 0),
            'completed'        => (int) ($archiveCounts['approved'] ?? 0),
        ];
    }

    private function buildSprfDistribution(int $userId, bool $isAdmin, bool $isApprover, $start, $end): array
    {
        $pendingApprovals = $isApprover
            ? SprfCurrentProject::query()
                ->where('current_approver_user_id', $userId)
                ->whereIn('status', ['for_review', 'under_review', 'Sent Back'])
                ->count()
            : SprfCurrentProject::query()
                ->where('prepared_by_user_id', $userId)
                ->count();

        $pendingProjects = $isApprover
            ? SprfCurrentProject::query()
                ->where('prepared_by_user_id', $userId)
                ->count()
            : 0;

        $archiveCounts = SprfArchiveProject::query()
            ->whereRaw('COALESCE(approved_at, rejected_at, created_at) BETWEEN ? AND ?', [$start, $end])
            ->when(!$isAdmin, function ($q) use ($userId) {
                $q->where(function ($qq) use ($userId) {
                    $qq->where('prepared_by_user_id', $userId)
                    ->orWhere('director_customer_engagement_user_id', $userId)
                    ->orWhere('esd_director_user_id', $userId)
                    ->orWhere('vp_ccto_user_id', $userId)
                    ->orWhere('president_ceo_user_id', $userId);
                });
            })
            ->selectRaw('LOWER(status) as status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'pending'          => $pendingApprovals,
            'pending_projects' => $pendingProjects,
            'rejected'         => (int) ($archiveCounts['rejected'] ?? 0),
            'cancelled'        => (int) ($archiveCounts['cancelled'] ?? 0),
            'completed'        => (int) ($archiveCounts['approved'] ?? 0),
        ];
    }

    public function entriesByMonth(Request $request)
    {
        $userId = (int) Auth::id();
        $months = collect(range(11, 0))->map(fn ($i) => now()->subMonths($i)->startOfMonth());

        $roiCounts = $this->monthlyCountsAcross([
            [RoiEntryProject::class, 'user_id'],
            [RoiCurrentProject::class, 'user_id'],
            [RoiArchiveProject::class, 'user_id'],
        ], $months->first(), $userId);

        $sprfCounts = $this->monthlyCountsAcross([
            [SprfEntryProject::class, 'prepared_by_user_id'],
            [SprfCurrentProject::class, 'prepared_by_user_id'],
            [SprfArchiveProject::class, 'prepared_by_user_id'],
        ], $months->first(), $userId);

        $series = $months->map(function ($month) use ($roiCounts, $sprfCounts) {
            $key = $month->format('Y-m');

            return [
                'month' => $month->format('M Y'),
                'roi'   => $roiCounts[$key] ?? 0,
                'sprf'  => $sprfCounts[$key] ?? 0,
            ];
        });

        return response()->json($series);
    }

    private function monthlyCountsAcross(array $modelOwnerPairs, $since, int $userId): array
    {
        $totals = [];

        foreach ($modelOwnerPairs as [$modelClass, $ownerColumn]) {
            $rows = $modelClass::query()
                ->where('created_at', '>=', $since)
                ->where($ownerColumn, $userId)
                ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as ym, COUNT(*) as total")
                ->groupBy('ym')
                ->pluck('total', 'ym');

            foreach ($rows as $ym => $total) {
                $totals[$ym] = ($totals[$ym] ?? 0) + $total;
            }
        }

        return $totals;
    }

    
    private function excludeDdtcCompanyIds($companyIds)
    {
        $companyIds = collect($companyIds);

        if ($companyIds->isEmpty()) {
            return $companyIds->values();
        }

        $ddtcIds = Company::query()
            ->whereIn('id', $companyIds)
            ->whereRaw("UPPER(TRIM(COALESCE(delsan_company, ''))) = 'DDTC'")
            ->pluck('id');

        return $companyIds->diff($ddtcIds)->values();
    }

    public function statusStats(Request $request)
    {
        $counts = ['expiring_soon' => 0, 'active' => 0, 'expired' => 0];

        $visibleCompanyIds = $this->excludeDdtcCompanyIds(
            $this->visibleCompanyIds($request->integer('as_user_id') ?: null)
        );
        $companyIdsWithContracts = [];

        Contract::query()
            ->whereIn('company_id', $visibleCompanyIds)
            ->chunk(200, function ($contracts) use (&$counts, &$companyIdsWithContracts) {
                foreach ($contracts as $contract) {
                    $contract->refreshStatus();

                    $bucket = $contract->status === Contract::STATUS_EXTENDED
                        ? Contract::STATUS_ACTIVE
                        : $contract->status;

                    if (isset($counts[$bucket])) {
                        $counts[$bucket]++;
                        $companyIdsWithContracts[$contract->company_id] = true;
                    }
                }
            });

        $counts['no_contracts'] = $this->countActiveAccountsWithoutContracts(
            $visibleCompanyIds->all(),
            array_keys($companyIdsWithContracts)
        );

        return response()->json($counts);
    }

    private function countActiveAccountsWithoutContracts(array $visibleCompanyIds, array $companyIdsWithContracts): int
    {
        $companyTable = (new Company())->getTable();

        $groupKeyExpr = "CASE WHEN {$companyTable}.sap_code IS NULL OR {$companyTable}.sap_code = '' "
            . "THEN CONCAT('__row_', {$companyTable}.id) ELSE {$companyTable}.sap_code END";

        $groups = Company::query()
            ->where("{$companyTable}.status", 1)
            ->whereIn("{$companyTable}.id", $visibleCompanyIds)
            ->selectRaw("{$groupKeyExpr} as group_key, {$companyTable}.id as branch_id")
            ->get()
            ->groupBy('group_key');

        $withContracts = array_flip($companyIdsWithContracts);

        return $groups->filter(function ($branches) use ($withContracts) {
            foreach ($branches as $branch) {
                if (isset($withContracts[$branch->branch_id])) {
                    return false; // at least one branch in this account has a live contract
                }
            }
            return true;
        })->count();
    }

    public function byStatus(Request $request)
    {
        $status = $request->input('status', 'expiring_soon');

        if (!in_array($status, ['expiring_soon', 'active', 'expired'])) {
            $status = 'expiring_soon';
        }

        $limit = 50;

        $visibleCompanyIds = $this->excludeDdtcCompanyIds(
            $this->visibleCompanyIds($request->integer('as_user_id') ?: null)
        );

        $contracts = Contract::with('contractType')
            ->whereIn('company_id', $visibleCompanyIds)
            ->get();

        $filtered = $contracts
            ->each(fn ($c) => $c->refreshStatus())
            ->filter(function ($c) use ($status) {
                // Same "extended folds into active" rollup as statusStats().
                if ($status === Contract::STATUS_ACTIVE) {
                    return in_array($c->status, [Contract::STATUS_ACTIVE, Contract::STATUS_EXTENDED], true);
                }
                return $c->status === $status;
            })
            ->map(function ($c) {
                $effectiveDate = $c->latestExtendedDate() ?? optional($c->end_date)->format('Y-m-d');
                $company = Company::with('clientManager')->find($c->company_id);

                return [
                    'id'             => $c->id,
                    'company_id'     => $c->company_id,
                    'company_name'   => trim($c->company_name ?? ''),
                    'contract_type' => $c->contractType?->name ?? null,
                    'id_client_mngr' => $company->id_client_mngr ?? null,
                    'account_manager' => $company->clientManager
                        ? trim(
                            ($company->clientManager->first_name ?? '') . ' ' .
                            ($company->clientManager->last_name ?? '')
                        )
                        : null,
                    'sap_code'       => $company->sap_code ?? null,
                    'expires_at'     => $effectiveDate,
                    'days_remaining' => $effectiveDate
                        ? (int) now()->startOfDay()->diffInDays(\Carbon\Carbon::parse($effectiveDate)->startOfDay(), false)
                        : null,
                    'was_extended'   => !empty($c->extend_dates),
                    'can_upload'     => $company ? $this->canManageCompanyContracts($company) : false,
                    'pdf_url' => $c->pdf_path ? route('contract.pdf', $c->id) : null,
                ];
            });

        $sorted = $status === 'expired'
            ? $filtered->sortByDesc('expires_at')
            : $filtered->sortBy('expires_at');

        return response()->json($sorted->take($limit)->values());
    }
}