<?php

namespace App\Http\Controllers\SPRF;

use App\Http\Controllers\Controller;
use App\Models\SPRF\SprfArchiveProject;
use App\Models\SPRF\SprfEntryProject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SprfController extends Controller
{
    public function entryList(Request $request)
    {
        $userId = Auth::id();
        $perPage = (int) $request->input('per_page', 10);

        $draftsQuery = SprfEntryProject::query()
            ->where('prepared_by_user_id', $userId)
            ->where('status', 'draft')
            ->orderByDesc('last_saved_at')
            ->orderByDesc('updated_at');

        $drafts = (clone $draftsQuery)
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (SprfEntryProject $project) {
                return [
                    'id' => $project->id,
                    'sprf_no' => $project->sprf_no,
                    'status' => $project->status,
                    'company_name' => $project->account,
                    'sub_category' => $project->sub_category,
                    'account_manager' => $project->account_manager,
                    'revenue' => $project->revenue,
                    'gp_percent' => $project->gp_percent,
                    'approval_level' => $project->approval_level,
                    'last_saved_at' => optional($project->last_saved_at)?->toISOString(),
                    'updated_at' => optional($project->updated_at)?->format('m/d/y H:i'),
                ];
            });

        $totalDrafts = (clone $draftsQuery)->count();

        $recentlyModifiedToday = SprfEntryProject::query()
            ->where('prepared_by_user_id', $userId)
            ->where('status', 'draft')
            ->whereDate('last_saved_at', now()->toDateString())
            ->count();

        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntryList', [
            'drafts' => $drafts,
            'stats' => [
                'totalDrafts' => $totalDrafts,
                'recentlyModifiedText' => $recentlyModifiedToday . ' Today',
            ],
        ]);
    }

    public function entryCreate()
    {
        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntry', [
            'approverUsers' => $this->resolveApproverUsers(),
        ]);
    }

    public function archive(Request $request)
    {
        $userId = Auth::id();
        $perPage = (int) $request->input('per_page', 10);

        $archiveQuery = SprfArchiveProject::query()
            ->with([
                'preparer:id,first_name,last_name,position',
                'approvedBy:id,first_name,last_name,position',
                'rejectedBy:id,first_name,last_name,position',
            ])
            ->where(function ($query) use ($userId) {
                $query->where('prepared_by_user_id', $userId)
                    ->orWhere('director_customer_engagement_user_id', $userId)
                    ->orWhere('esd_director_user_id', $userId)
                    ->orWhere('vp_ccto_user_id', $userId)
                    ->orWhere('president_ceo_user_id', $userId)
                    ->orWhere('approved_by_user_id', $userId)
                    ->orWhere('rejected_by_user_id', $userId);
            })
            ->whereIn('status', ['approved', 'rejected'])
            ->orderByDesc('updated_at');

        $archiveProjects = (clone $archiveQuery)
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (SprfArchiveProject $project) {
                $status = strtolower((string) ($project->status ?? ''));
                $isRejected = $status === 'rejected';
                $isApproved = $status === 'approved';

                $decidedByName = $isRejected
                    ? ($project->rejectedBy?->name ?? '—')
                    : ($project->approvedBy?->name ?? '—');

                $decidedAt = $isRejected ? $project->rejected_at : $project->approved_at;

                return [
                    'id' => $project->id,
                    'sprf_no' => $project->sprf_no,
                    'status' => $project->status,
                    'approval_level' => $project->approval_level,
                    'company_name' => $project->account,
                    'sub_category' => $project->sub_category,
                    'account_manager' => $project->account_manager,
                    'revenue' => $project->revenue,
                    'gp_percent' => $project->gp_percent,
                    'prepared_by' => $project->preparer?->name,
                    'approved_by_name' => $project->approvedBy?->name,
                    'rejected_by_name' => $project->rejectedBy?->name,
                    'decided_by_name' => $decidedByName,
                    'approved_at' => optional($project->approved_at)?->toISOString(),
                    'rejected_at' => optional($project->rejected_at)?->toISOString(),
                    'decided_at_display' => $decidedAt ? $decidedAt->diffForHumans() : '—',
                ];
            });

        $totalArchiveProjects = (clone $archiveQuery)->count();

        $recentlyArchivedToday = SprfArchiveProject::query()
            ->where(function ($query) use ($userId) {
                $query->where('prepared_by_user_id', $userId)
                    ->orWhere('director_customer_engagement_user_id', $userId)
                    ->orWhere('esd_director_user_id', $userId)
                    ->orWhere('vp_ccto_user_id', $userId)
                    ->orWhere('president_ceo_user_id', $userId)
                    ->orWhere('approved_by_user_id', $userId)
                    ->orWhere('rejected_by_user_id', $userId);
            })
            ->where(function ($query) {
                $query->whereDate('approved_at', now()->toDateString())
                    ->orWhereDate('rejected_at', now()->toDateString());
            })
            ->count();

        return Inertia::render('CustomerManagement/ProjectSPRF/ArchiveRoutes/Archive', [
            'archiveProjects' => $archiveProjects,
            'stats' => [
                'totalArchiveProjects' => $totalArchiveProjects,
                'recentlyArchivedToday' => $recentlyArchivedToday . ' Today',
            ],
        ]);
    }

    public function archiveShow(SprfArchiveProject $project)
    {
        $this->ensureCanViewArchive($project);

        $project->load([
            'items',
            'fees',
            'preparer:id,first_name,last_name,position,email',
            'approvedBy:id,first_name,last_name,position,email',
            'rejectedBy:id,first_name,last_name,position,email',
        ]);

        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntry', [
            'project' => $this->transformArchiveProjectForFrontend($project),
            'initialProject' => $this->transformArchiveProjectForFrontend($project),
            'approverUsers' => $this->mapApproverUsersFromArchiveProject($project),
            'readOnly' => true,
            'route' => 'archive',
            'createdBy' => $project->preparer?->name ?? '—',
        ]);
    }

    private function ensureCanViewArchive(SprfArchiveProject $project): void
    {
        $userId = (int) Auth::id();

        $canView =
            (int) $project->prepared_by_user_id === $userId
            || (int) ($project->director_customer_engagement_user_id ?? 0) === $userId
            || (int) ($project->esd_director_user_id ?? 0) === $userId
            || (int) ($project->vp_ccto_user_id ?? 0) === $userId
            || (int) ($project->president_ceo_user_id ?? 0) === $userId
            || (int) ($project->approved_by_user_id ?? 0) === $userId
            || (int) ($project->rejected_by_user_id ?? 0) === $userId;

        abort_unless($canView, 403);
    }

    private function resolveApproverUsers(): array
    {
        return [
            'directorCustomerEngagement' => $this->findActiveUserByPosition('Director - Customer Engagement'),
            'esdDirector' => $this->findActiveUserByPosition('Director - Enterprise Solutions'),
            'vpCcto' => $this->findActiveUserByPosition('VP & CCTO'),
            'presidentCeo' => $this->findActiveUserByPosition('President & CEO'),
        ];
    }

    private function findActiveUserByPosition(string $position): ?array
    {
        $user = User::query()
            ->where('position', $position)
            ->where('is_banned', false)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'position' => $user->position,
            'email' => $user->email,
        ];
    }

    private function findUserById(?int $id): ?array
    {
        if (! $id) {
            return null;
        }

        $user = User::query()
            ->whereKey($id)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'position' => $user->position,
            'email' => $user->email,
        ];
    }

    private function mapApproverUsersFromArchiveProject(SprfArchiveProject $project): array
    {
        return [
            'directorCustomerEngagement' => $this->findUserById($project->director_customer_engagement_user_id),
            'esdDirector' => $this->findUserById($project->esd_director_user_id),
            'vpCcto' => $this->findUserById($project->vp_ccto_user_id),
            'presidentCeo' => $this->findUserById($project->president_ceo_user_id),
        ];
    }

    private function transformArchiveProjectForFrontend(SprfArchiveProject $project): array
    {
        return [
            'id' => $project->id,
            'sprf_no' => $project->sprf_no,
            'status' => $project->status,
            'current_level' => $project->current_level,
            'approval_level' => $project->approval_level,
            'last_saved_at' => optional($project->last_saved_at)?->toISOString(),
            'submitted_at' => optional($project->submitted_at)?->toISOString(),
            'approved_at' => optional($project->approved_at)?->toISOString(),
            'rejected_at' => optional($project->rejected_at)?->toISOString(),
            'prepared_by_name' => $project->preparer?->name,
            'approved_by_name' => $project->approvedBy?->name,
            'rejected_by_name' => $project->rejectedBy?->name,
            'last_reject_note' => $project->last_reject_note,

            'company_info' => [
                'subCategory' => $project->sub_category,
                'account' => $project->account,
                'accountManager' => $project->account_manager,
            ],

            'remarks' => $project->remarks,
            'rebate_justification' => $project->rebate_justification,

            'items' => $project->items
                ->map(function ($item) {
                    return [
                        'productCode' => $item->product_code,
                        'itemDescription' => $item->item_description,
                        'qty' => $item->qty,
                        'disty' => $item->disty,
                        'costPerUnit' => $item->cost_per_unit,
                        'markupPercent' => $item->markup_percent,
                    ];
                })
                ->values()
                ->all(),

            'other_expenses' => $project->fees
                ->map(function ($fee) {
                    return [
                        'expenseKey' => $fee->expense_key,
                        'isFixed' => $fee->is_fixed,
                        'productCode' => $fee->product_code,
                        'itemDescription' => $fee->item_description,
                        'qty' => $fee->qty,
                        'unitPrice' => $fee->unit_price,
                    ];
                })
                ->values()
                ->all(),
        ];
    }
}