<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerInfo\Company;
use App\Models\CustomerInfo\PotentialCustomer;
use App\Models\RoiEntryProject;
use App\Models\RoiCurrentProject;
use App\Models\RoiArchiveProject;
use App\Models\SPRF\SprfEntryProject;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\SPRF\SprfArchiveProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard/customer-stats
     * Total / Active customer counts use the same sap_code dedup grouping
     * as CustomerInfoController::index() so numbers stay consistent across pages.
     */
    public function customerStats(Request $request)
    {
        $companyTable = (new Company())->getTable();

        $groupKeyExpr = "CASE WHEN {$companyTable}.sap_code IS NULL OR {$companyTable}.sap_code = '' "
            . "THEN CONCAT('__row_', {$companyTable}.id) ELSE {$companyTable}.sap_code END";

        $activeCustomers = Company::query()
            ->where("{$companyTable}.status", 1)
            ->selectRaw("MIN({$companyTable}.id) as rep_id")
            ->groupByRaw($groupKeyExpr)
            ->get()
            ->count();

        // TODO: confirm which PotentialCustomer status value(s) actually mean
        // "still a prospect" (vs converted/lost) — counting all rows for now.
        $prospectCustomers = PotentialCustomer::count();

        // Total Customer excludes inactive companies: active accounts + prospects.
        $totalCustomers = $activeCustomers + $prospectCustomers;

        return response()->json([
            'total_customers'    => $totalCustomers,
            'active_accounts'    => $activeCustomers,
            'prospect_customers' => $prospectCustomers,
        ]);
    }

    /**
     * GET /customer-management/pending-approvals
     * Returns the actual projects sitting in the logged-in user's approval
     * queue — not just a count — so the dashboard can list them directly.
     */
    public function pendingApprovals(Request $request)
    {
        $userId = (int) Auth::id();

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

        return response()->json([
            'roi_pending'  => $roiPending,
            'sprf_pending' => $sprfPending,
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

        return response()->json([
            'roi'  => $this->buildRoiDistribution($userId, $isAdmin, $start, $end),
            'sprf' => $this->buildSprfDistribution($userId, $isAdmin, $start, $end),
        ]);
    }

    /**
     * "pending" = Pending Approvals — items sitting in this user's own
     * approval queue right now (mirrors pendingApprovals()'s ROI matching).
     *
     * rejected/cancelled/completed = archived projects this user has access
     * to view, mirroring RoiArchiveController::ensureCanViewArchive() —
     * owner or anywhere in the approval chain. Admin (id 1) sees all.
     */
    private function buildRoiDistribution(int $userId, bool $isAdmin, $start, $end): array
    {
        $pendingApprovals = RoiCurrentProject::query()
            ->whereBetween('created_at', [$start, $end])
            ->where(function ($q) use ($userId) {
                $q->where(fn($sub) => $sub->where('current_level', 2)->where('reviewed_by', $userId))
                ->orWhere(fn($sub) => $sub->where('current_level', 3)->where('checked_by', $userId))
                ->orWhere(fn($sub) => $sub->where('current_level', 4)->where('endorsed_by', $userId))
                ->orWhere(fn($sub) => $sub->where('current_level', 5)->where('confirmed_by', $userId))
                ->orWhere(fn($sub) => $sub->where('current_level', 6)->where('approved_by', $userId));
            })
            ->whereNotIn('status', ['Withdrawn', 'Cancelled', 'Approved', 'Rejected'])
            ->count();

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
            'pending'   => $pendingApprovals,
            'rejected'  => (int) ($archiveCounts['rejected'] ?? 0),
            'cancelled' => (int) ($archiveCounts['cancelled'] ?? 0),
            'completed' => (int) ($archiveCounts['approved'] ?? 0),
        ];
    }

    private function buildSprfDistribution(int $userId, bool $isAdmin, $start, $end): array
    {
        $pendingApprovals = SprfCurrentProject::query()
            ->whereBetween('created_at', [$start, $end])
            ->where('current_approver_user_id', $userId)
            ->whereIn('status', ['for_review', 'under_review', 'Sent Back'])
            ->count();

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
            'pending'   => $pendingApprovals,
            'rejected'  => (int) ($archiveCounts['rejected'] ?? 0),
            'cancelled' => (int) ($archiveCounts['cancelled'] ?? 0),
            'completed' => (int) ($archiveCounts['approved'] ?? 0),
        ];
    }

    /**
     * Scoped to entries this user prepared themselves — excludes anything
     * where they're only in the approval chain.
     * TODO: confirm RoiEntryProject's owner column is 'user_id' (matches
     * RoiCurrentProject/RoiArchiveProject) — not directly verified here.
     */
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
}