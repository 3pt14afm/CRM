<?php

namespace App\Http\Controllers\Roi;

use App\Http\Controllers\Concerns\ChecksPreferenceAccess;
use App\Http\Controllers\Controller;
use App\Models\RoiCurrentProject;
use App\Models\User;
use App\Http\Requests\Roi\Current\SendBackProjectRequest;
use App\Models\Location;
use App\Services\Roi\Current\RoiMultiEntryWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class RoiCurrentProjectController extends Controller
{
    use ChecksPreferenceAccess;
    protected RoiMultiEntryWorkflowService $workflowService;

    public function __construct(RoiMultiEntryWorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    private function getAuthenticatedUser()
    {
        $user = Auth::user();
        abort_unless($user, 403, 'Unauthenticated.');
        return $user;
    }

    private function approverColumnForLevel(int $level): ?string
    {
        return match ($level) {
            2 => 'reviewed_by', 3 => 'checked_by', 4 => 'endorsed_by', 5 => 'confirmed_by', 6 => 'approved_by', default => null
        };
    }

    private function currentProjectAssignedToUser(RoiCurrentProject $project, int $userId): bool
    {
        $column = $this->approverColumnForLevel((int) $project->current_level);
        return $column ? (int) ($project->{$column} ?? 0) === $userId : false;
    }

    private function applyCurrentVisibilityScope($query, $user)
    {
        if ((int) $user->id === 1 || $this->isRoiViewAllPrivileged()) return;

        $userId = (int) $user->id;

        $query->where(function ($q) use ($userId) {
            // Preparer always sees their own, regardless of status
            $q->where('user_id', $userId)

            // Approvers only see active pipeline projects — not withdrawn/cancelled
            ->orWhere(function ($approverQ) use ($userId) {
                $approverQ->whereNotIn('status', ['Withdrawn', 'Cancelled'])
                            ->where(function ($cols) use ($userId) {
                                $cols->where('reviewed_by', $userId)
                                    ->orWhere('checked_by', $userId)
                                    ->orWhere('endorsed_by', $userId)
                                    ->orWhere('confirmed_by', $userId)
                                    ->orWhere('approved_by', $userId);
                            });
            });
        });
    }
    private function ensureCanAct(RoiCurrentProject $project, $user): void
    {
        abort_unless($this->currentProjectAssignedToUser($project, (int) $user->id), 403, 'Project is not assigned to you.');
    }

    private function ensureCanView(RoiCurrentProject $project, $user): void
    {
        // Super Viewer
        if ($user->id === 1 || $this->isRoiViewAllPrivileged()) {
            return;
        }

        $userId = (int) $user->id;
        $canView = (int) $project->user_id === $userId ||
            (int) ($project->reviewed_by ?? 0) === $userId ||
            (int) ($project->checked_by ?? 0) === $userId ||
            (int) ($project->endorsed_by ?? 0) === $userId ||
            (int) ($project->confirmed_by ?? 0) === $userId ||
            (int) ($project->approved_by ?? 0) === $userId;

        abort_unless($canView, 403, 'Not allowed to view this project.');
    }

    private function requiredSendBackTypeForLevel(int $level): ?string
    {
        return match ($level) { 2, 3, 4 => 'note', 5, 6 => 'comment', default => null };
    }

    public function current(Request $request)
    {
        $user = $this->getAuthenticatedUser();

        $search           = $request->input('search');
        $status           = $request->input('status');           
        $type             = $request->input('type');              
        $dateFrom         = $request->input('date_from');
        $dateTo           = $request->input('date_to');
        $preparedBy       = $request->input('prepared_by');
        $preparedByUserId = $request->input('prepared_by_user_id');
        $locationId       = $request->input('location_id');       
        $perPage          = (int) $request->input('per_page', 10);

        $statusList   = $status !== null && $status !== ''     ? explode(',', $status)                    : [];
        $typeList     = $type !== null && $type !== ''         ? array_map('intval', explode(',', $type)) : [];
        $locationIds  = $locationId !== null && $locationId !== '' ? array_map('intval', explode(',', $locationId)) : [];

        $query = RoiCurrentProject::with([
            'items', 'fees', 'user',
            'reviewedByUser:id,first_name,last_name,employee_id',
            'checkedByUser:id,first_name,last_name,employee_id',
            'endorsedByUser:id,first_name,last_name,employee_id',
            'confirmedByUser:id,first_name,last_name,employee_id',
            'approvedByUser:id,first_name,last_name,employee_id',
        ])
        ->leftJoin('users', 'roi_current_projects.user_id', '=', 'users.id')
        ->select('roi_current_projects.*')
        ->where('roi_current_projects.sequence', '<=', 1);

        // Enforce user pipeline visibility constraints
        $this->applyCurrentVisibilityScope($query, $user);

        $statsQuery = clone $query;

        // 1. Text search
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('roi_current_projects.company_name', 'like', "%{$search}%")
                ->orWhere('roi_current_projects.reference', 'like', "%{$search}%")
                ->orWhere('roi_current_projects.company_sap_code', 'like', "%{$search}%")
                ->orWhere('roi_current_projects.contract_type', 'like', "%{$search}%")
                ->orWhere('roi_current_projects.status', 'like', "%{$search}%")
                ->orWhereHas('user', function ($userQuery) use ($search) {
                    $userQuery->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                });
            });
        }

        // 2. Status filter
        if (!empty($statusList)) {
            $query->where(function ($outer) use ($statusList) {
                foreach ($statusList as $statusVal) {
                    $outer->orWhere(function ($q) use ($statusVal) {
                        match ($statusVal) {
                            'for_review' => $q->where(function ($q2) {
                                $q2->where('roi_current_projects.status', '=', 'For Review')
                                ->orWhere(fn($sub) => $sub->where('roi_current_projects.status', '=', 'Sent Back')->where('roi_current_projects.current_level', '=', 2));
                            }),
                            'for_checking' => $q->where(function ($q2) {
                                $q2->where('roi_current_projects.status', '=', 'For Checking')
                                ->orWhere(fn($sub) => $sub->where('roi_current_projects.status', '=', 'Sent Back')->where('roi_current_projects.current_level', '=', 3));
                            }),
                            'for_endorsement' => $q->where(function ($q2) {
                                $q2->where('roi_current_projects.status', '=', 'For Endorsement')
                                ->orWhere(fn($sub) => $sub->where('roi_current_projects.status', '=', 'Sent Back')->where('roi_current_projects.current_level', '=', 4));
                            }),
                            'for_confirmation' => $q->where(function ($q2) {
                                $q2->where('roi_current_projects.status', '=', 'For Confirmation')
                                ->orWhere(fn($sub) => $sub->where('roi_current_projects.status', '=', 'Sent Back')->where('roi_current_projects.current_level', '=', 5));
                            }),
                            'for_approval' => $q->where(function ($q2) {
                                $q2->where('roi_current_projects.status', '=', 'For Approval')
                                ->orWhere(fn($sub) => $sub->where('roi_current_projects.status', '=', 'Sent Back')->where('roi_current_projects.current_level', '=', 6));
                            }),
                            default => $q->where('roi_current_projects.status', '=', $statusVal),
                        };
                    });
                }
            });
        }

        // 3. Type filter
        if (!empty($typeList)) {
            $query->whereIn('roi_current_projects.type', $typeList);
        }

        // 4. Prepared By filter
        if (!empty($preparedByUserId)) {
            $query->where('roi_current_projects.user_id', '=', (int) $preparedByUserId);
        } elseif (!empty($preparedBy)) {
            $query->whereHas('user', function ($q) use ($preparedBy) {
                $q->where('first_name', 'like', "%{$preparedBy}%")
                ->orWhere('last_name', 'like', "%{$preparedBy}%")
                ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$preparedBy}%"]);
            });
        }

        // 5. Location filter
        if (!empty($locationIds)) {
            $query->whereIn('roi_current_projects.location_id', $locationIds);
        }

        // 6. Date range filter
        if (!empty($dateFrom)) $query->whereDate('roi_current_projects.last_saved_at', '>=', $dateFrom);
        if (!empty($dateTo))   $query->whereDate('roi_current_projects.last_saved_at', '<=', $dateTo);

        // 7. "Mine to act" filter — only projects currently sitting with this user
        if ($request->boolean('mine')) {
            $userId = (int) $user->id;
            $query->where(function ($q) use ($userId) {
                $q->where(fn($sub) => $sub->where('roi_current_projects.current_level', 2)->where('roi_current_projects.reviewed_by', $userId))
                ->orWhere(fn($sub) => $sub->where('roi_current_projects.current_level', 3)->where('roi_current_projects.checked_by', $userId))
                ->orWhere(fn($sub) => $sub->where('roi_current_projects.current_level', 4)->where('roi_current_projects.endorsed_by', $userId))
                ->orWhere(fn($sub) => $sub->where('roi_current_projects.current_level', 5)->where('roi_current_projects.confirmed_by', $userId))
                ->orWhere(fn($sub) => $sub->where('roi_current_projects.current_level', 6)->where('roi_current_projects.approved_by', $userId));
            });
        }

        $userId = (int) $user->id;

        // 7. Sorting
        $sortOrder = in_array($request->input('sort_order'), ['asc', 'desc'])
            ? $request->input('sort_order')
            : null;

        $allowedSorts = [
            'last_saved_at'    => 'roi_current_projects.last_saved_at',
            'prepared_by_name' => "TRIM(CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, '')))",
            'reference'        => 'roi_current_projects.reference',
            'company_sap_code' => 'roi_current_projects.company_sap_code',
            'company_name'     => 'roi_current_projects.company_name',
            'contract_years'   => 'roi_current_projects.contract_years',
            'contract_type'    => 'roi_current_projects.contract_type',
            'type'             => 'roi_current_projects.type',
            'status'           => 'roi_current_projects.status',
        ];

        $sortByKey = $request->input('sort_by');
        $sortCol   = $allowedSorts[$sortByKey] ?? null;

        $query->when(
              $sortOrder && $sortCol,
            fn($q) => $q->orderByRaw("{$sortCol} {$sortOrder}"),
            fn($q) => $q->orderByRaw("
                CASE 
                    WHEN (
                        (roi_current_projects.current_level = 2 AND roi_current_projects.reviewed_by  = ?) OR
                        (roi_current_projects.current_level = 3 AND roi_current_projects.checked_by   = ?) OR
                        (roi_current_projects.current_level = 4 AND roi_current_projects.endorsed_by  = ?) OR
                        (roi_current_projects.current_level = 5 AND roi_current_projects.confirmed_by = ?) OR
                        (roi_current_projects.current_level = 6 AND roi_current_projects.approved_by  = ?)
                    ) THEN 0
                    WHEN roi_current_projects.user_id = ? THEN 1
                    ELSE 2
                END ASC, roi_current_projects.last_saved_at DESC
            ", [$userId, $userId, $userId, $userId, $userId, $userId])
        );

        $currentProjects = $query->paginate($perPage)->withQueryString();

        $currentReferences = $currentProjects->getCollection()->pluck('reference');
        $currentEntryCounts = RoiCurrentProject::query()
            ->whereIn('reference', $currentReferences)
            ->selectRaw('reference, count(*) as cnt')
            ->groupBy('reference')
            ->pluck('cnt', 'reference');

        $groupReferences = $currentEntryCounts->filter(fn ($cnt) => $cnt > 1)->keys();
        $siblingsByReference = RoiCurrentProject::query()
            ->whereIn('reference', $groupReferences)
            ->where('sequence', '>', 1)
            ->orderBy('sequence')
            ->get(['id', 'reference', 'sequence', 'contract_type', 'contract_years', 'status'])
            ->groupBy('reference');

        $currentProjects = $currentProjects->through(function ($p) use ($user, $currentEntryCounts, $siblingsByReference) {
            $p->last_saved_display = $p->last_saved_at ? $p->last_saved_at->diffForHumans() : '—';
            $lvl = (int) ($p->current_level ?? 0);
            $p->level_display = ($lvl >= 1 && $lvl <= 6) ? ('Level ' . $lvl . ' — ' . $this->workflowService->levelLabel($lvl)) : '—';

            $assignedUser = match ($lvl) {
                2 => $p->reviewedByUser, 3 => $p->checkedByUser, 4 => $p->endorsedByUser,
                5 => $p->confirmedByUser, 6 => $p->approvedByUser, default => null
            };
            $p->status_assignee_name = $assignedUser
                ? trim(($assignedUser->first_name ?? '') . ' ' . ($assignedUser->last_name ?? ''))
                : '—';

            $isSentBack = strtolower((string) $p->status) === 'sent back';
            $p->status_display_main   = $isSentBack ? $this->workflowService->getQueueLabelForLevel($lvl) : ($p->status ?? '—');
            $p->status_display_suffix = $isSentBack ? ' (Sent Back)' : '';

            $p->viewer_is_preparer         = (int) $p->user_id === (int) $user->id;
            $p->viewer_is_current_approver = $this->currentProjectAssignedToUser($p, (int) $user->id);

            $p->entry_count = $currentEntryCounts[$p->reference] ?? 1;
            $p->is_group    = $p->entry_count > 1;

            $p->sibling_entries = $p->is_group ? ($siblingsByReference[$p->reference] ?? collect())->values() : [];
            
            return $p;
        });

        $latest = (clone $statsQuery)->first();

        $stats = [
            'totalCurrentProjects' => $statsQuery->count(),
            'recentlyModifiedText' => $latest?->last_saved_at?->diffForHumans() ?? '—',
            'recentlyAddedToday'   => (clone $statsQuery)->whereDate('roi_current_projects.last_saved_at', now()->toDateString())->count() . ' Today',
        ];

        if ($request->wantsJson()) {
            return response()->json([
                'currentProjects' => $currentProjects,
                'stats'           => $stats,
            ]);
        }

        $locations = Location::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('CustomerManagement/ProjectROIApproval/CurrentRoutes/CurrentList', [
            'currentProjects' => $currentProjects,
            'stats'           => $stats,
            'viewerId'        => (int) $user->id,
            'locations'       => $locations,
            'filters'         => [
                'search'              => $search,
                'status'              => $statusList,
                'date_from'           => $dateFrom,
                'date_to'             => $dateTo,
                'prepared_by'         => $preparedBy,
                'prepared_by_user_id' => $preparedByUserId,
                'location_id'         => $locationIds,
                'per_page'            => $perPage,
                'sort_by'             => $sortByKey,
                'sort_order'          => $sortOrder,
                'type'                => $typeList,
                'mine'                => $request->boolean('mine'),
            ],
        ]);
    }

    public function showGroup(string $reference, Request $request)
    {
        $user = $this->getAuthenticatedUser();

        $projects = RoiCurrentProject::with([
            'items', 'fees', 'user',
            'reviewedByUser', 'checkedByUser', 'endorsedByUser', 'confirmedByUser', 'approvedByUser',
        ])
            ->where('reference', $reference)
            ->orderBy('sequence')
            ->get();

        abort_if($projects->isEmpty(), 404);

        // $projects is ordered by sequence ascending, so first() IS the master.
        $master = $projects->first();
        $this->ensureCanView($master, $user);

        foreach ($projects as $project) {
            $project->notes    = $this->workflowService->sortTimelineEntries($project->notes);
            $project->comments = $this->workflowService->sortTimelineEntries($project->comments);
        }

        // Whichever entry is active client-side (?entry=) is the one AddComments/
        // AddNotes/Names need as their singular "project" from usePage().props —
        // its own id/notes/comments, but master's workflow columns (current_level,
        // reviewed_by, etc.), since those only ever live on the master row per the
        // multi-entry field-scoping decision. Previously no singular project/
        // entryProject was sent at all, which broke signatures and per-entry
        // commenting regardless of tab.
        $activeIndex = max(0, (int) $request->query('entry', 0));
        $activeEntry = $projects->get($activeIndex) ?? $master;

        $workflowFields = [
            'user_id', 'status', 'current_level', 'status_updated_by',
            'reviewed_by', 'checked_by', 'endorsed_by', 'confirmed_by', 'approved_by',
            'rejected_by', 'rejected_by_level',
            'submitted_at', 'reviewed_at', 'checked_at', 'endorsed_at', 'confirmed_at',
            'approved_at', 'rejected_at', 'cancelled_at',
        ];
        $entryProject = clone $activeEntry;
        $entryProject->setRawAttributes(
            array_merge(
                $activeEntry->getAttributes(),
                array_intersect_key($master->getAttributes(), array_flip($workflowFields))
            ),
            true
        );

        $userIds = collect([
            $master->user_id, $master->status_updated_by, $master->reviewed_by,
            $master->checked_by, $master->endorsed_by, $master->confirmed_by, $master->approved_by,
        ])->filter()->unique()->values();

        $usersById = User::query()->whereIn('id', $userIds)
            ->get(['id', 'first_name', 'last_name', 'position'])
            ->keyBy(fn ($u) => (string) $u->id)
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')),
                'position' => $u->position ?? '—',
            ]);

        $signatureFor = function ($userRelation) {
            if (!$userRelation || !$userRelation->employee_id) return null;
            foreach (['png', 'jpg', 'jpeg', 'webp'] as $ext) {
                $path = 'signatures/' . $userRelation->employee_id . '.' . $ext;
                if (Storage::disk('public')->exists($path)) {
                    return asset('storage/' . $path) . '?v=' . filemtime(storage_path('app/public/' . $path));
                }
            }
            return null;
        };

        $isSentBack   = strtolower((string) $master->status) === 'sent back';
        $currentLevel = (int) $master->current_level;

        $signatures = [
            'preparer'     => $signatureFor($master->user),
            'reviewed_by'  => (!$isSentBack || $currentLevel > 2) ? $signatureFor($master->reviewedByUser)  : null,
            'checked_by'   => (!$isSentBack || $currentLevel > 3) ? $signatureFor($master->checkedByUser)   : null,
            'endorsed_by'  => (!$isSentBack || $currentLevel > 4) ? $signatureFor($master->endorsedByUser)  : null,
            'confirmed_by' => (!$isSentBack || $currentLevel > 5) ? $signatureFor($master->confirmedByUser) : null,
            'approved_by'  => (!$isSentBack || $currentLevel > 6) ? $signatureFor($master->approvedByUser)  : null,
        ];

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/GroupEntry', [
            'reference'              => $reference,
            'entryProjects'          => $projects,
            'project'                => $entryProject,
            'entryProject'           => $entryProject,
            'readOnly'               => true,
            'route'                  => 'current',
            'activeEntryIndex'       => $activeIndex,
            'createdBy'              => $master->user?->name ?? '—',
            'viewerLevel'            => $this->getViewerLevel($master, $user),
            'canActOnCurrentProject' => $this->currentProjectAssignedToUser($master, (int) $user->id),
            'usersById'              => $usersById,
            'projectNotes'           => $activeEntry->notes ?? [],
            'projectComments'        => $activeEntry->comments ?? [],
            'requiredSendBackType'   => $this->requiredSendBackTypeForLevel($currentLevel),
            'machineCatalog'         => $this->buildMachineCatalog(),
            'consumableCatalog'      => $this->buildConsumableCatalog(),
            'signatures'             => $signatures,
        ]);
    }
 
    private function getViewerLevel(RoiCurrentProject $project, $user): int
    {
        $userId = (int) $user->id;

        $levelMap = [
            2 => 'reviewed_by',
            3 => 'checked_by',
            4 => 'endorsed_by',
            5 => 'confirmed_by',
            6 => 'approved_by',
        ];

        $currentLevel = (int) $project->current_level;

        // First, check if the user matches the CURRENT level — highest priority
        if (isset($levelMap[$currentLevel]) && (int) ($project->{$levelMap[$currentLevel]} ?? 0) === $userId) {
            return $currentLevel;
        }

        // Fallback: return any level they're assigned to (for view access)
        foreach ($levelMap as $level => $column) {
            if ((int) ($project->{$column} ?? 0) === $userId) {
                return $level;
            }
        }

        return 0;
    }

    public function show($id)
    {
        $user = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with([
            'items', 'fees', 'user',
            'reviewedByUser', 'checkedByUser', 'endorsedByUser', 'confirmedByUser', 'approvedByUser'
        ])->findOrFail($id);
        
        $this->ensureCanView($project, $user);

        $userIds = collect([$project->user_id, $project->status_updated_by, $project->reviewed_by, $project->checked_by, $project->endorsed_by, $project->confirmed_by, $project->approved_by])->filter()->unique()->values();
        $usersById = User::query()->whereIn('id', $userIds)->get(['id', 'first_name', 'last_name', 'position'])->keyBy(fn ($u) => (string) $u->id)->map(fn ($u) => [
            'id' => $u->id, 'name' => trim($u->first_name . ' ' . $u->last_name), 'position' => $u->position ?? '—',
        ]);

        $project->notes = $this->workflowService->sortTimelineEntries($project->notes);
        $project->comments = $this->workflowService->sortTimelineEntries($project->comments);

        $signatureFor = function ($userRelation) {
                    if (!$userRelation || !$userRelation->employee_id) return null;
                    $employeeId = $userRelation->employee_id;

                    foreach (['png', 'jpg', 'jpeg', 'webp'] as $ext) {
                        $path = 'signatures/' . $employeeId . '.' . $ext;
                        
                        // Check if the file physically exists on the storage disk
                        if (Storage::disk('public')->exists($path)) {
                            // Generate the direct public URL using the asset helper
                            return asset('storage/' . $path) . '?v=' . filemtime(storage_path('app/public/' . $path));
                        }
                    }

                    return null;
        };

        $isSentBack = strtolower((string) $project->status) === 'sent back';
        $currentLevel = (int) $project->current_level;

        $signatures = [
            'preparer'     => $signatureFor($project->user),
            'reviewed_by'  => (!$isSentBack || $currentLevel > 2) ? $signatureFor($project->reviewedByUser)  : null,
            'checked_by'   => (!$isSentBack || $currentLevel > 3) ? $signatureFor($project->checkedByUser)   : null,
            'endorsed_by'  => (!$isSentBack || $currentLevel > 4) ? $signatureFor($project->endorsedByUser)  : null,
            'confirmed_by' => (!$isSentBack || $currentLevel > 5) ? $signatureFor($project->confirmedByUser) : null,
            'approved_by'  => (!$isSentBack || $currentLevel > 6) ? $signatureFor($project->approvedByUser)  : null,
        ];

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
            'project' => $project, 'entryProject' => $project, 'readOnly' => true, 'route' => 'current',
            'createdBy' => $project->user?->name ?? '—', 'viewerLevel' => $this->getViewerLevel($project, $user),
            'canActOnCurrentProject' => $this->currentProjectAssignedToUser($project, (int) $user->id), 'usersById' => $usersById,
            'projectNotes' => $project->notes ?? [], 'projectComments' => $project->comments ?? [],
            'requiredSendBackType' => $this->requiredSendBackTypeForLevel((int) $project->current_level),
            'machineCatalog' => $this->buildMachineCatalog(), 'consumableCatalog' => $this->buildConsumableCatalog(),
            'signatures'        => $signatures,
        ]);
    }

    public function storeNote(Request $request, $id)
    {
        $user = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

        abort_unless($this->canNoteOnCurrentProject($project, $user), 403, 'Not allowed to add a note.');

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $notes = is_array($project->notes) ? $project->notes : [];

        $note = [
            'id'         => (string) \Illuminate\Support\Str::ulid(),
            'body'       => trim($validated['body']),
            'created_at' => now()->toISOString(),
            'author'     => [
                'id'   => $user->id,
                'name' => $user->name ?? 'Unknown',
                'role' => $user->role,
            ],
        ];

        $notes[] = $note;

        $project->update([
            'notes'         => $this->workflowService->sortTimelineEntries($notes),
            'last_saved_at' => now(),
            'version'       => $project->version + 1,
        ]);

        try {
            \App\Services\RoiActivityLogger::log(
                activityType: 'add_note',
                moduleType:   'ROI Current',
                details:      'Added note to ROI #' . $project->reference,
                subject:      $project,
                newValues:    [
                    'note_id' => $note['id'],
                    'body'    => $note['body'],
                ]
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('ROI current note log failed', [
                'message'    => $e->getMessage(),
                'project_id' => $project->id,
            ]);
        }

        return back()->with('success', 'Note added.');
    }

    private function canNoteOnCurrentProject(RoiCurrentProject $project, $user): bool
    {
        if (!$user) return false;

        $master = $project->sequence > 1
            ? RoiCurrentProject::where('reference', $project->reference)->where('sequence', '<=', 1)->first()
            : $project;

        if (!$master) return false;

        $userId = (int) $user->id;
        $level  = (int) $master->current_level;
        $column = $this->approverColumnForLevel($level);

        if (!$column) return false;

        return (int) ($master->{$column} ?? 0) === $userId;
    }

    public function sendBack(SendBackProjectRequest $request, $id)
    {
        $user = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);
        $this->ensureCanAct($project, $user);

        $fromLevel = (int) $project->current_level;
        abort_if($fromLevel < 2, 400, 'Cannot send back any further.');

        $requiredType = $this->requiredSendBackTypeForLevel($fromLevel);
        abort_unless($request->input('type') === $requiredType, 422, "Invalid type for this level. Expected {$requiredType}.");

        $targetEntryId = $request->validated()['target_entry_id'] ?? $project->id;
        if ((int) $targetEntryId !== (int) $project->id) {
            abort_unless(
                RoiCurrentProject::where('id', $targetEntryId)->where('reference', $project->reference)->exists(),
                422,
                'Selected entry does not belong to this group.'
            );
        }

        $redirectTarget = $this->workflowService->handleSendBack($project, $user, $request->validated());

        return $redirectTarget === 'entry_list' 
            ? to_route('roi.entry.list')->with('success', 'Project sent back to preparer.')
            : to_route('roi.current')->with('success', 'Project sent back.');
    }

    public function advanceProject($id)
    {
        $user = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);
        $this->ensureCanAct($project, $user);

        abort_if((int) $project->current_level >= 6, 400, 'Already at final level. Use Approve.');

        $nextStatus = $this->workflowService->handleAdvance($project, $user);

        if ($nextStatus === 'approved') {
            return to_route('roi.current')->with('success', 'Project approved and archived.');
        }

        return to_route('roi.current')->with('success', 'Project moved to ' . $nextStatus . '.');
    }

    public function reject($id)
    {
        $user = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);
        $this->ensureCanAct($project, $user);

        $this->workflowService->handleReject($project, $user);

        return to_route('roi.current')->with('success', 'Project disapproved and archived.');
    }

    public function approve($id)
    {
        $user = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);
        $this->ensureCanAct($project, $user);

        abort_unless((int) $project->current_level === 6 && (int) $project->approved_by === (int) $user->id, 403, 'Only the assigned approver can approve.');

        $this->workflowService->handleApprove($project, $user);

        return to_route('roi.current')->with('success', 'Project approved and archived.');
    }

    public function cancel($id)
    {
        $user    = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

        $this->ensureIsPreparer($project, $user);
        $this->ensureNotTerminal($project);

        $this->workflowService->handleCancel($project, $user);

        return to_route('roi.current')
            ->with('success', 'Project has been cancelled and archived.');
    }

    public function withdraw($id)
    {
        $user    = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

        $this->ensureIsPreparer($project, $user);
        $this->ensureNotTerminal($project);

        abort_if(
            (int) $project->current_level < 2,
            400,
            'Project has not been submitted yet. Use Cancel instead.'
        );

        $this->workflowService->handleWithdraw($project, $user);

        // ✅ Entry list — that's where the withdrawn project now lives
        return to_route('roi.entry.list')
            ->with('success', 'Project withdrawn and returned to your entry list.');
    }

    private function buildMachineCatalog() {
        return \App\Models\PrinterModel::query()->with(['printerModelSupplies.supply'])->where('status', 'Active')->orderBy('printer_name')->get()->map(fn($p) => [
            'id' => (string) $p->id, 'name' => $p->printer_name, 'unitCost' => number_format((float)($p->unit_cost??0), 2, '.', ''), 'sellingPrice' => number_format((float)($p->selling_price??0), 2, '.', ''),
            'consumables' => $p->printerModelSupplies->filter(fn($l)=>$l->supply && $l->supply->status === 'Active')->map(fn($l)=>[
                'id' => (string) $l->supply->id, 'mode' => strtolower($l->supply->category??'') === 'part' ? 'others' : (strtolower($l->supply->print_type??'') === 'mono' ? 'mono' : 'color'),
                'name' => $l->supply->supply_name, 'unitCost' => number_format((float)($l->supply->unit_cost??0), 2, '.', ''), 'sellingPrice' => number_format((float)($l->supply->selling_price??0), 2, '.', ''), 'yields' => (string)($l->supply->yield??''),
            ])->values()
        ])->values();
    }

    private function buildConsumableCatalog() {
        $c = ['mono' => [], 'color' => [], 'others' => []];
        foreach (\App\Models\Supply::where('status', 'Active')->orderBy('supply_name')->get() as $s) {
            $m = strtolower($s->category??'') === 'part' ? 'others' : (strtolower($s->print_type??'') === 'mono' ? 'mono' : 'color');
            $c[$m][] = ['id' => (string)$s->id, 'name' => $s->supply_name, 'unitCost' => number_format((float)($s->unit_cost??0), 2, '.', ''), 'sellingPrice' => number_format((float)($s->selling_price??0), 2, '.', ''), 'yields' => (string)($s->yield??'')];
        }
        return $c;
    }
    
    public function showAttachment($id, int $attachmentIndex)
    {
        abort_unless(Auth::check(), 403, 'You must be logged in to view attachments.');
        $project = RoiCurrentProject::findOrFail($id);
        $attachments = is_array($project->entry_remarks_attachments)
            ? array_values($project->entry_remarks_attachments)
            : [];

        abort_unless(array_key_exists($attachmentIndex, $attachments), 404, 'Attachment index not found.');
        $attachment = $attachments[$attachmentIndex];

        abort_unless(!empty($attachment['path']), 404, 'Attachment path is empty.');
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404, 'File not found on server.');

        return response()->file(Storage::disk('local')->path($attachment['path']));
    }

    // ─── Shared guard ──────────────────────────────────────────────────────────

    private function ensureIsPreparer(RoiCurrentProject $project, $user): void
    {
        abort_unless(
            (int) $project->user_id === (int) $user->id,
            403,
            'Only the project preparer can perform this action.'
        );
    }

    private function ensureNotTerminal(RoiCurrentProject $project): void
    {
        $terminal = ['approved', 'rejected', 'archived', 'withdrawn', 'cancelled'];

        abort_if(
            in_array(strtolower((string) $project->status), $terminal, true),
            400,
            'This project has already reached a terminal state and cannot be modified.'
        );
    }

}