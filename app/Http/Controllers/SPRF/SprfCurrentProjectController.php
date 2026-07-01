<?php

namespace App\Http\Controllers\SPRF;

use App\Http\Controllers\Controller;
use App\Models\SPRF\SprfArchiveProject;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\User;
use App\Services\SPRF\Current\SprfCurrentWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use App\Services\SprfActivityLogger;
use Illuminate\Support\Facades\Log;

class SprfCurrentProjectController extends Controller
{
    public function __construct(
        private readonly SprfCurrentWorkflowService $workflowService
    ) {}

    public function current(Request $request)
    {
        $userId = (int) Auth::id();
        $user = Auth::user();
        $isPresidentCeo = $user->role === 'president_ceo' || strtolower(trim($user->position ?? '')) === 'president & ceo';
        $perPage = (int) $request->input('per_page', 10);

        $query = SprfCurrentProject::query()
            ->with([
                'items.subitems',
                'fees',
                'preparer:id,first_name,last_name,position',
                'currentApprover:id,first_name,last_name,position',
            ]);

        // Apply visibility restriction only if the user is not ID 1
        if ($userId !== 1 && !$isPresidentCeo) {
            $query->where(function ($q) use ($userId) {
                $q->where('prepared_by_user_id', $userId)
                    ->orWhere('current_approver_user_id', $userId)
                    ->orWhere(function ($sub) use ($userId) {
                        $sub->where('director_customer_engagement_user_id', $userId)
                            ->where('requires_rebate_justification', true);
                    })
                    ->orWhere('esd_director_user_id', $userId)
                    ->orWhere('vp_ccto_user_id', $userId)
                    ->orWhere('president_ceo_user_id', $userId);
            });
        }
        $query->whereIn('status', ['for_review', 'under_review', 'Sent Back']);

        // ─── ALIGNED SPRF DYNAMIC FILTERS ────────────────────────────────────

        $query->when(filled($request->input('search')), function ($q) use ($request) {
            $search = trim($request->input('search'));
            $q->where(function ($sub) use ($search) {
                $sub->where('sprf_no', 'like', "%{$search}%")
                    ->orWhere('account', 'like', "%{$search}%")
                    ->orWhere('account_manager', 'like', "%{$search}%");
            });
        });

        $query->when(filled($request->input('sprf_no')), function ($q) use ($request) {
            $q->where('sprf_no', 'like', '%' . trim($request->input('sprf_no')) . '%');
        });

        $query->when(filled($request->input('account')), function ($q) use ($request) {
            $q->where('account', 'like', '%' . trim($request->input('account')) . '%');
        });

        $query->when(filled($request->input('account_manager')), function ($q) use ($request) {
            $q->where('account_manager', 'like', '%' . trim($request->input('account_manager')) . '%');
        });

        $query->when(filled($request->input('sub_category')), function ($q) use ($request) {
            $q->where('sub_category', 'like', '%' . trim($request->input('sub_category')) . '%');
        });

        $query->when($request->filled('type'), function ($q) use ($request) {
            $q->where('type', (int) $request->input('type'));
        });

        $query->when(filled($request->input('prepared_by')), function ($q) use ($request) {
            $preparedBy = trim($request->input('prepared_by'));
            $q->whereHas('preparer', function ($sub) use ($preparedBy) {
                $sub->whereRaw("CONCAT(first_name, ' ', last_name) like ?", ["%{$preparedBy}%"]);
            });
        });

        $query->when(filled($request->input('approval_level')), function ($q) use ($request) {
            $q->where('approval_level', $request->input('approval_level'));
        });

        $query->when(filled($request->input('status')), function ($q) use ($request, $userId) {
            $statusFilter = $request->input('status');

            if ($statusFilter === 'for_review') {
                // Rows where the logged-in user is the one it's currently sitting with
                $q->where('current_approver_user_id', $userId);
            } elseif ($statusFilter === 'under_review') {
                // Rows in the pipeline but NOT with the logged-in user right now
                $q->where(function ($sub) use ($userId) {
                    $sub->where('current_approver_user_id', '!=', $userId)
                        ->orWhereNull('current_approver_user_id');
                });
            }
        });

        $query->when(filled($request->input('date_from')), function ($q) use ($request) {
            $q->whereDate('updated_at', '>=', $request->input('date_from'));
        });
        $query->when(filled($request->input('date_to')), function ($q) use ($request) {
            $q->whereDate('updated_at', '<=', $request->input('date_to'));
        });

        // ─── SORTING ──────────────────────────────────────────────────────────
        $sortBy    = $request->input('sort_by');
        $sortOrder = in_array(strtolower($request->input('sort_order', 'desc')), ['asc', 'desc'])
            ? strtolower($request->input('sort_order', 'desc'))
            : 'desc';

        $allowedSorts = [
            'prepared_by'     => null,   // handled via join below
            'sprf_no'         => 'sprf_no',
            'sub_category'    => 'sub_category',
            'company_name'    => 'account',
            'account_manager' => 'account_manager',
            'type'            => 'type',
            'approval_level'  => 'approval_level',
            'status'          => 'status',
            'submitted_at'    => 'submitted_at',
            'last_saved_at'   => 'updated_at',
        ];

        if ($sortBy && array_key_exists($sortBy, $allowedSorts)) {
            if ($sortBy === 'prepared_by') {
                $query->join('users', 'users.id', '=', 'sprf_current_projects.prepared_by_user_id')
                    ->orderByRaw("CONCAT(users.first_name, ' ', users.last_name) {$sortOrder}")
                    ->select('sprf_current_projects.*');
            } else {
                $query->orderBy($allowedSorts[$sortBy], $sortOrder);
            }
        } else {
            $query->orderByDesc('updated_at');
        }

        $currentProjects = (clone $query)
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (SprfCurrentProject $project) use ($userId) {
                $isSentBack = strtolower((string) $project->status) === 'sent back';
                $isCurrentApprover = (int) ($project->current_approver_user_id ?? 0) === $userId;

                return [
                    'id' => $project->id,
                    'sprf_no' => $project->sprf_no,
                    'status' => $project->status,
                    'status_display_main' => $isCurrentApprover ? 'For Review' : 'Under Review',
                    'status_display_suffix' => $isSentBack ? ' (SB)' : '',
                    'current_level' => $project->current_level,
                    'approval_level' => $project->approval_level,
                    'company_name' => $project->account,
                    'sub_category' => $project->sub_category,
                    'account_manager' => $project->account_manager,
                    'type' => $project->type,
                    'revenue' => $project->revenue,
                    'gp_percent' => $project->gp_percent,
                    'submitted_at' => $project->submitted_at ? $project->submitted_at->toISOString() : null,
                    'prepared_by' => $project->preparer ? $project->preparer->first_name . ' ' . $project->preparer->last_name : null,
                    'current_approver' => $project->currentApprover ? $project->currentApprover->first_name . ' ' . $project->currentApprover->last_name : null,
                    'last_saved_display' => $project->updated_at
                        ? $project->updated_at->diffForHumans()
                        : '—',
                ];
            });

        $totalCurrentProjects = (clone $query)->count();

        $recentlyAddedToday = SprfCurrentProject::query()
            ->where(function ($q) use ($userId) {
                $q->where('prepared_by_user_id', $userId)
                    ->orWhere('current_approver_user_id', $userId);
            })
            ->whereIn('status', ['for_review', 'under_review', 'Sent Back'])
            ->count();

        $stats = [
            'totalCurrentProjects' => $totalCurrentProjects,
            'recentlyAddedToday' => $recentlyAddedToday . ' Today',
        ];

        $responseFilters = $request->only([
            'search',
            'status',
            'per_page',
            'date_from',
            'date_to',
            'sprf_no',
            'account',
            'account_manager',
            'sub_category',
            'prepared_by',
            'approval_level',
            'type',
            'sort_by',
            'sort_order',
        ]);

        if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
            return response()->json([
                'currentProjects' => $currentProjects,
                'stats' => $stats,
            ]);
        }

        return Inertia::render('CustomerManagement/ProjectSPRF/CurrentRoutes/CurrentList', [
            'currentProjects' => $currentProjects,
            'stats' => $stats,
            'viewerId' => $userId,
            'filters' => $responseFilters,
        ]);
    }
        
    public function show(SprfCurrentProject $project)
    {
        $this->ensureCanView($project);

        $project->load([
            'items.subitems',
            'fees',
            'preparer:id,first_name,last_name,position,email',
            'currentApprover:id,first_name,last_name,position,email',
        ]);

        $transformedProject = $this->transformProjectForFrontend($project, (int) Auth::id());

        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntry', [
            'project' => $transformedProject,
            'initialProject' => $transformedProject,
            'approverUsers' => $this->mapApproverUsersFromProject($project),
            'readOnly' => true,
            'route' => 'current',
            'createdBy' => $project->preparer ? $project->preparer->first_name . ' ' . $project->preparer->last_name : '—',
            'canActOnCurrentProject' => $this->canActOnCurrentProject($project),
            'canWithdraw' => $this->canWithdraw($project),
            'canCancel' => $this->canCancel($project),
            'timestamps' => [
                'submitted_at' => $project->submitted_at?->toIso8601String(),
                'dce_acted_at' => $project->dce_acted_at?->toIso8601String(),
                'esd_acted_at' => $project->esd_acted_at?->toIso8601String(),
                'vp_ccto_acted_at' => $project->vp_ccto_acted_at?->toIso8601String(),
                'president_ceo_acted_at' => $project->president_ceo_acted_at?->toIso8601String(),
            ],
            'rejectedAt' => $project->rejected_at?->toIso8601String(),
            // Determine which level rejected it (optional, for styling)
            'rejectedByLevel' => $project->status === 'rejected' ? $project->current_level : null,
        ]);
    }

    public function print(SprfCurrentProject $project)
    {
        $this->ensureCanView($project);

        $project->load([
            'items.subitems',
            'fees',
            'preparer:id,first_name,last_name,position,email',
            'currentApprover:id,first_name,last_name,position,email',
        ]);

        return Inertia::render('CustomerManagement/ProjectSPRF/sprfEntryPrint', [
            'entryProject' => $this->transformProjectForPrint($project),
            'storageKey' => request('storageKey'),
            'autoprint' => (bool) request('autoprint', false),
            'showDraftWatermark' => false,
        ]);
    }

    public function advanceProject(Request $request, SprfCurrentProject $project)
    {
        $this->assertAssignedApprover($project);

        $oldValues = $project->toArray();

        $validated = $request->validate([
            'rebate_justification' => ['nullable', 'string'],
        ]);

        // Rebate justification is only resolved and saved at level 2
        if ((int) $project->current_level === 2) {
            $rebateJustification = data_get(
                $validated,
                'rebate_justification',
                $project->rebate_justification
            );

            if ($project->requires_rebate_justification && trim((string) $rebateJustification) === '') {
                throw ValidationException::withMessages([
                    'rebate_justification' => 'Rebate justification is required when the Rebate row has a value.',
                ]);
            }

            $project->update(['rebate_justification' => $rebateJustification]);
        }

        // Service handles auto-advance through consecutive levels and auto-approve if terminal is reached
        $result = $this->workflowService->handleAdvance($project->fresh(), Auth::id());

        $wasApproved = $result instanceof SprfArchiveProject;

        try {
            SprfActivityLogger::log(
                activityType: $wasApproved ? 'approved' : 'advanced',
                sprf: $result,
                details: $wasApproved
                    ? 'SPRF project auto-advanced and approved'
                    : 'SPRF project advanced to the next level',
                oldValues: $oldValues,
                newValues: $result->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF advance activity log failed', [
                'message' => $e->getMessage(),
                'sprf_current_project_id' => $project->id,
            ]);
        }

        if ($wasApproved) {
            return to_route('sprf.current')->with('success', 'SPRF project approved and archived.');
        }

        return to_route('sprf.current')->with('success', 'SPRF project advanced to the next level.');
    }

    public function reject(Request $request, SprfCurrentProject $project)
    {
        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
        ]);

        $this->assertAssignedApprover($project);

        $project->load(['items.subitems', 'fees']);

        // Snapshot before archiving/deleting
        $oldValues = [
            'project' => $project->toArray(),
            'items' => $project->items->map->toArray()->toArray(),
            'fees' => $project->fees->map->toArray()->toArray(),
        ];

        $archiveProject = $this->workflowService->handleReject($project, Auth::id(), $validated['body'] ?? null);

        try {
            SprfActivityLogger::log(
                activityType: 'rejected',
                sprf: $archiveProject,
                details: 'SPRF project rejected and archived',
                oldValues: $oldValues,
                newValues: $archiveProject->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF reject activity log failed', [
                'message' => $e->getMessage(),
                'sprf_archive_project_id' => $archiveProject->id ?? null,
            ]);
        }

        return to_route('sprf.current')->with('success', 'SPRF project rejected and archived.');
    }

    public function approve(SprfCurrentProject $project)
    {
        $this->assertAssignedApprover($project);

        $finalLevel = $this->finalApprovalLevel($project);

        if ((int) $project->current_level !== $finalLevel) {
            throw ValidationException::withMessages([
                'project' => 'Only the final approver can approve this SPRF project.',
            ]);
        }

        $project->load(['items.subitems', 'fees']);

        // Snapshot before archiving/deleting
        $oldValues = [
            'project' => $project->toArray(),
            'items' => $project->items->map->toArray()->toArray(),
            'fees' => $project->fees->map->toArray()->toArray(),
        ];

        $archiveProject = $this->workflowService->handleApprove($project, Auth::id());

        try {
            SprfActivityLogger::log(
                activityType: 'approved',
                sprf: $archiveProject,
                details: 'SPRF project approved and archived',
                oldValues: $oldValues,
                newValues: $archiveProject->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF approve activity log failed', [
                'message' => $e->getMessage(),
                'sprf_archive_project_id' => $archiveProject->id ?? null,
            ]);
        }

        return to_route('sprf.current')->with('success', 'SPRF project approved and archived.');
    }

    public function sendBack(Request $request, SprfCurrentProject $project)
    {
        $this->assertAssignedApprover($project);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $oldValues = $project->toArray();

        $result = $this->workflowService->handleSendBack($project, $validated['message'], Auth::id());

        try {
            SprfActivityLogger::log(
                activityType: 'sent_back',
                sprf: clone $result, // Could be EntryProject or CurrentProject
                details: 'SPRF project sent back to previous level',
                oldValues: $oldValues,
                newValues: $result->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF send back activity log failed', [
                'message' => $e->getMessage(),
            ]);
        }

        if ($result instanceof \App\Models\SPRF\SprfEntryProject) {
            return to_route('sprf.entry.list')->with('success', 'SPRF project sent back to Preparer.');
        }

        return to_route('sprf.current')->with('success', 'SPRF project sent back to previous approver.');
    }

    public function withdraw(SprfCurrentProject $project)
    {
        $this->assertIsPreparer($project);

        if ((int) $project->current_level < 2) {
            throw ValidationException::withMessages([
                'project' => 'This SPRF project has not yet entered the approval pipeline.',
            ]);
        }

        $project->load(['items.subitems', 'fees']);

        // Snapshot before reverting/deleting
        $oldValues = [
            'project' => $project->toArray(),
            'items' => $project->items->map->toArray()->toArray(),
            'fees' => $project->fees->map->toArray()->toArray(),
        ];

        $entryProject = $this->workflowService->handleWithdraw($project, Auth::id());

        try {
            SprfActivityLogger::log(
                activityType: 'withdrawn',
                sprf: $entryProject,
                details: 'SPRF project withdrawn and returned to Preparer entry list',
                oldValues: $oldValues,
                newValues: $entryProject->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF withdraw activity log failed', [
                'message' => $e->getMessage(),
                'sprf_entry_project_id' => $entryProject->id ?? null,
            ]);
        }

        return to_route('sprf.entry.list')->with('success', 'SPRF project withdrawn and returned to your entry list.');
    }

    public function cancel(SprfCurrentProject $project)
    {
        $this->assertIsPreparer($project);

        $project->load(['items.subitems', 'fees']);

        // Snapshot before archiving/deleting
        $oldValues = [
            'project' => $project->toArray(),
            'items' => $project->items->map->toArray()->toArray(),
            'fees' => $project->fees->map->toArray()->toArray(),
        ];

        $archiveProject = $this->workflowService->handleCancel($project, Auth::id());

        try {
            SprfActivityLogger::log(
                activityType: 'cancelled',
                sprf: $archiveProject,
                details: 'SPRF project cancelled and archived',
                oldValues: $oldValues,
                newValues: $archiveProject->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF cancel activity log failed', [
                'message' => $e->getMessage(),
                'sprf_archive_project_id' => $archiveProject->id ?? null,
            ]);
        }

        return to_route('sprf.current')->with('success', 'SPRF project cancelled and archived.');
    }

    public function storeNote(Request $request, SprfCurrentProject $project)
    {
        $this->ensureCanView($project);

        // Notes are only for Preparer (level 1) and DCE (level 2)
        if (! in_array((int) $project->current_level, [1, 2])) {
            throw ValidationException::withMessages([
                'body' => 'Only the Preparer and Director – Customer Engagement can add notes.',
            ]);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $this->workflowService->appendMessage($project, $validated['body'], Auth::id(), (int) $project->current_level);

        return back()->with('success', 'Note added successfully.');
    }

    public function storeComment(Request $request, SprfCurrentProject $project)
    {
        $this->ensureCanView($project);

        // Comments are only for ESD Director and above (levels 3, 4, 5)
        if (! in_array((int) $project->current_level, [3, 4, 5])) {
            throw ValidationException::withMessages([
                'body' => 'Only ESD Director and above can add comments.',
            ]);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $this->workflowService->appendMessage($project, $validated['body'], Auth::id(), (int) $project->current_level);

        return back()->with('success', 'Comment added successfully.');
    }

    /**
     * Whether the currently authenticated user is the assigned approver
     * for this project AND the project is actually still actionable
     * (i.e. sitting in the live approval queue). Mirrors the same
     * conditions enforced server-side in assertAssignedApprover(), so
     * button visibility on the frontend never drifts from what the
     * approve/reject/advance/send-back endpoints will actually allow.
     */
    private function canActOnCurrentProject(SprfCurrentProject $project): bool
    {
        $userId = (int) Auth::id();

        $isActionableStatus = in_array($project->status, ['for_review', 'under_review', 'Sent Back'], true);
        $isAssignedApprover = (int) ($project->current_approver_user_id ?? 0) === $userId;

        return $isActionableStatus && $isAssignedApprover;
    }

    /**
     * Withdraw is only available to the Preparer once the project has
     * actually entered the approval pipeline (current_level >= 2) and
     * hasn't already reached a terminal state.
     */
    private function canWithdraw(SprfCurrentProject $project): bool
    {
        $userId = (int) Auth::id();
        $isPreparer = (int) $project->prepared_by_user_id === $userId;
        $isTerminal = in_array($project->status, ['approved', 'rejected', 'cancelled', 'withdrawn'], true);

        return $isPreparer && !$isTerminal && (int) $project->current_level >= 2;
    }

    /**
     * Cancel is available to the Preparer at any non-terminal point in
     * the pipeline (including level 1, unlike withdraw).
     */
    private function canCancel(SprfCurrentProject $project): bool
    {
        $userId = (int) Auth::id();
        $isPreparer = (int) $project->prepared_by_user_id === $userId;
        $isTerminal = in_array($project->status, ['approved', 'rejected', 'cancelled', 'withdrawn'], true);

        return $isPreparer && !$isTerminal;
    }

    private function ensureCanView(SprfCurrentProject $project): void
    {
        $userId = (int) Auth::id();

        // Allow user 1 to bypass checks
        if ($userId === 1) return;
        $viewer = Auth::user();
        if ($viewer->role === 'president_ceo'
            || strtolower(trim($viewer->position ?? '')) === 'president & ceo') {
            return;
        }
            
        $approverIds = array_filter([
            $project->requires_rebate_justification ? $project->director_customer_engagement_user_id : null,
            $project->esd_director_user_id,
            $project->vp_ccto_user_id,
            $project->president_ceo_user_id,
        ]);

        $canView =
            (int) $project->prepared_by_user_id === $userId
            || in_array($userId, array_map('intval', $approverIds), true);

        abort_unless($canView, 403);
    }

    private function assertAssignedApprover(SprfCurrentProject $project): void
    {
        if (! in_array($project->status, ['for_review', 'under_review', 'Sent Back'], true)) {
            throw ValidationException::withMessages([
                'project' => 'This SPRF project is not in the current approval queue.',
            ]);
        }

        if ((int) $project->current_approver_user_id !== (int) Auth::id()) {
            throw ValidationException::withMessages([
                'project' => 'You are not the assigned approver for this SPRF project.',
            ]);
        }
    }

    /**
     * Withdraw/Cancel are Preparer-only actions. Unlike assertAssignedApprover,
     * these don't require the project to be sitting with a specific approver —
     * the Preparer can pull it back from wherever it currently is in the queue.
     */
    private function assertIsPreparer(SprfCurrentProject $project): void
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            throw ValidationException::withMessages([
                'project' => 'Only the Preparer of this SPRF project can perform this action.',
            ]);
        }
    }

    private function finalApprovalLevel(SprfCurrentProject $project): int
    {
        if ($project->requires_president_ceo) {
            return 5;
        }

        if ($project->requires_vp_ccto) {
            return 4;
        }

        return 3;
    }

    private function resolveNextStep(SprfCurrentProject $project): array
    {
        $currentLevel = (int) $project->current_level;

        if ($currentLevel === 2) {
            return [3, $project->esd_director_user_id];
        }

        if ($currentLevel === 3) {
            if ($project->requires_vp_ccto || $project->requires_president_ceo) {
                return [4, $project->vp_ccto_user_id];
            }

            throw ValidationException::withMessages([
                'project' => 'ESD Director is the final approver for this SPRF project.',
            ]);
        }

        if ($currentLevel === 4) {
            if ($project->requires_president_ceo) {
                return [5, $project->president_ceo_user_id];
            }

            throw ValidationException::withMessages([
                'project' => 'VP & CCTO is the final approver for this SPRF project.',
            ]);
        }

        throw ValidationException::withMessages([
            'project' => 'Invalid SPRF approval state.',
        ]);
    }

    private function mapApproverUsersFromProject(SprfCurrentProject $project): array
    {
        return [
            'directorCustomerEngagement' => $this->findUserById($project->director_customer_engagement_user_id),
            'esdDirector' => $this->findUserById($project->esd_director_user_id),
            'vpCcto' => $this->findUserById($project->vp_ccto_user_id),
            'presidentCeo' => $this->findUserById($project->president_ceo_user_id),
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
            'name' => $user->first_name . ' ' . $user->last_name,
            'position' => $user->position,
            'email' => $user->email,
        ];
    }

    // ─── Remarks Attachments ──────────────────────────────────────────────────

    /**
     * Defensively normalizes the raw remarks_attachments column value to an
     * array, in case the model attribute isn't cast to 'array'.
     */
    private function normalizeAttachmentsArray($attachments): array
    {
        if (is_string($attachments)) {
            $attachments = json_decode($attachments, true);
        }

        return is_array($attachments) ? $attachments : [];
    }

    /**
     * Shapes a saved remarks_attachments map into the { index: [{name, url}, ...] }
     * structure the RemarksBlock frontend component expects. Each row can hold
     * multiple attachments; legacy rows stored as a single {path,name} object
     * are wrapped into a one-item array for backward compatibility.
     */
    private function mapRemarksAttachmentsForFrontend($attachments): array
    {
        $attachments = $this->normalizeAttachmentsArray($attachments);

        if (! $attachments) return [];

        $mapToUrl = function ($attachment) {
            $path = data_get($attachment, 'path');

            return [
                'name' => data_get($attachment, 'name'),
                'url'  => $path ? asset('storage/' . ltrim($path, '/')) : null,
            ];
        };

        return collect($attachments)
            ->mapWithKeys(function ($row, $index) use ($mapToUrl) {
                $isLegacySingle = ! isset($row[0]) && isset($row['path']);
                $rowItems = $isLegacySingle ? [$row] : (array) $row;

                return [
                    (string) $index => collect($rowItems)->map($mapToUrl)->values()->all(),
                ];
            })
            ->all();
    }

    private function transformProjectForFrontend(SprfCurrentProject $project, int $viewerId): array
    {
        $isSentBack = strtolower((string) $project->status) === 'sent back';
        $isCurrentApprover = (int) ($project->current_approver_user_id ?? 0) === $viewerId;

        return [
            'id' => $project->id,
            'sprf_no' => $project->sprf_no,
            'status' => $project->status,
            'status_display_main' => $isCurrentApprover ? 'For Review' : 'Under Review',
            'status_display_suffix' => $isSentBack ? ' (Sent Back)' : '',
            'current_level' => $project->current_level,
            'approval_level' => $project->approval_level,
            'requires_vp_ccto'               => $project->requires_vp_ccto,
            'requires_president_ceo'         => $project->requires_president_ceo,
            'requires_rebate_justification'  => $project->requires_rebate_justification,
            'last_saved_at' => $project->updated_at ? $project->updated_at->toISOString() : null,
            'submitted_at' => $project->submitted_at ? $project->submitted_at->toISOString() : null,
            'approved_at' => $project->approved_at ? $project->approved_at->toISOString() : null,
            'rejected_at' => $project->rejected_at ? $project->rejected_at->toISOString() : null,
            
            // New Role Timestamps
            'dce_acted_at' => $project->dce_acted_at ? $project->dce_acted_at->toISOString() : null,
            'esd_acted_at' => $project->esd_acted_at ? $project->esd_acted_at->toISOString() : null,
            'vp_ccto_acted_at' => $project->vp_ccto_acted_at ? $project->vp_ccto_acted_at->toISOString() : null,
            'president_ceo_acted_at' => $project->president_ceo_acted_at ? $project->president_ceo_acted_at->toISOString() : null,

            'prepared_by_name' => $project->preparer ? $project->preparer->first_name . ' ' . $project->preparer->last_name : null,
            'prepared_by_user_id' => $project->prepared_by_user_id,
            'current_approver_name' => $project->currentApprover ? $project->currentApprover->first_name . ' ' . $project->currentApprover->last_name : null,
            'current_approver_user_id' => $project->current_approver_user_id,

            'company_info' => [
                'subCategory'        => $project->sub_category,
                'account'            => $project->account,
                'accountManager'     => $project->account_manager,
                'type'               => $project->type,
                'companySapCode'     => $project->company_sap_code,
                'potentialCompanyId' => (int) $project->type === 0 ? $project->company_id : null,
            ],
            'remarks' => $project->remarks,
            'remarks_attachments' => $this->normalizeAttachmentsArray($project->remarks_attachments),
            'attachments' => $this->mapRemarksAttachmentsForFrontend($project->remarks_attachments),
            'rebate_justification' => $project->rebate_justification,
            
            // Notes and Comments Arrays
            'notes' => $project->notes ?? [],
            'comments' => $project->comments ?? [],

            'items' => $project->items
                ->map(function ($item) {
                    return [
                        'rowKey'                    => $item->row_key,
                        'totalCost'                 => $item->total_cost,
                        'sellingPricePerUnitVatInc' => $item->selling_price_per_unit_vat_inc,
                        'totalSellingPriceVatInc'   => $item->total_selling_price_vat_inc,
                        'markupValue'               => $item->markup_value,
                        'subitems' => $item->subitems
                            ->map(fn($sub) => [
                                'rowKey'          => $sub->row_key,
                                'productCode'     => $sub->product_code,
                                'itemDescription' => $sub->item_description,
                                'qty'             => $sub->qty,
                                'disty'           => $sub->disty,
                                'costPerUnit'     => $sub->cost_per_unit,
                                'markupPercent'   => $sub->markup_percent,
                                'totalCost'       => $sub->total_cost,
                            ])
                            ->values()
                            ->all(),
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

    private function transformProjectForPrint(SprfCurrentProject $project): array
    {
        return [
            'id' => $project->id,
            'sprf_no' => $project->sprf_no,
            'status' => $project->status,
            'remarks' => $project->remarks,
            'remarks_attachments' => $this->normalizeAttachmentsArray($project->remarks_attachments),
            'attachments' => $this->mapRemarksAttachmentsForFrontend($project->remarks_attachments),
            'rebate_justification' => $project->rebate_justification,
            'notes' => $project->notes ?? [],
            'comments' => $project->comments ?? [],
            
            'submitted_at' => $project->submitted_at ? $project->submitted_at->toISOString() : null,
            'dce_acted_at' => $project->dce_acted_at ? $project->dce_acted_at->toISOString() : null,
            'esd_acted_at' => $project->esd_acted_at ? $project->esd_acted_at->toISOString() : null,
            'vp_ccto_acted_at' => $project->vp_ccto_acted_at ? $project->vp_ccto_acted_at->toISOString() : null,
            'president_ceo_acted_at' => $project->president_ceo_acted_at ? $project->president_ceo_acted_at->toISOString() : null,

            'company_info' => [
                'subCategory'        => $project->sub_category,
                'account'            => $project->account,
                'accountManager'     => $project->account_manager,
                'type'               => $project->type,
                'companySapCode'     => $project->company_sap_code,
                'potentialCompanyId' => (int) $project->type === 0 ? $project->company_id : null,
            ],

            'items' => $project->items
                ->map(function ($item) {
                    return [
                        'rowKey'                    => $item->row_key,
                        'totalCost'                 => $item->total_cost,
                        'sellingPricePerUnitVatInc' => $item->selling_price_per_unit_vat_inc,
                        'totalSellingPriceVatInc'   => $item->total_selling_price_vat_inc,
                        'markupValue'               => $item->markup_value,
                        'subitems' => $item->subitems
                            ->map(fn($sub) => [
                                'rowKey'          => $sub->row_key,
                                'productCode'     => $sub->product_code,
                                'itemDescription' => $sub->item_description,
                                'qty'             => $sub->qty,
                                'disty'           => $sub->disty,
                                'costPerUnit'     => $sub->cost_per_unit,
                                'markupPercent'   => $sub->markup_percent,
                                'totalCost'       => $sub->total_cost,
                            ])
                            ->values()
                            ->all(),
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

            'approver_users' => $this->mapApproverUsersFromProject($project),

            'preparer' => [
                'id' => $project->preparer?->id,
                'name' => $project->preparer ? $project->preparer->first_name . ' ' . $project->preparer->last_name : null,
                'position' => $project->preparer?->position,
                'email' => $project->preparer?->email,
            ],
        ];
    }
}