<?php

namespace App\Http\Controllers;

use App\Models\RoiCurrentProject;
use App\Models\User;
use App\Http\Requests\Roi\Current\SendBackProjectRequest;
use App\Services\Roi\Current\RoiCurrentWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class RoiCurrentProjectController extends Controller
{
    protected RoiCurrentWorkflowService $workflowService;

    public function __construct(RoiCurrentWorkflowService $workflowService)
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
        $userId = (int) $user->id;
        return $query->where(function ($q) use ($userId) {
            $q->where('user_id', $userId)
                ->orWhere('reviewed_by', $userId)
                ->orWhere('checked_by', $userId)
                ->orWhere('endorsed_by', $userId)
                ->orWhere('confirmed_by', $userId)
                ->orWhere('approved_by', $userId);
        });
    }

    private function ensureCanAct(RoiCurrentProject $project, $user): void
    {
        abort_unless($this->currentProjectAssignedToUser($project, (int) $user->id), 403, 'Project is not assigned to you.');
    }

    private function ensureCanView(RoiCurrentProject $project, $user): void
    {
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

    public function current()
    {
        $user = $this->getAuthenticatedUser();

        $query = RoiCurrentProject::with([
            'items', 'fees', 'user',
            'reviewedByUser:id,first_name,last_name',
            'checkedByUser:id,first_name,last_name',
            'endorsedByUser:id,first_name,last_name',
            'confirmedByUser:id,first_name,last_name',
            'approvedByUser:id,first_name,last_name',
        ])->orderBy('last_saved_at', 'desc');

        $this->applyCurrentVisibilityScope($query, $user);

        $currentProjects = $query->paginate(10)->through(function ($p) use ($user) {
            $p->last_saved_display = $p->last_saved_at ? $p->last_saved_at->diffForHumans() : '—';
            $lvl = (int) ($p->current_level ?? 0);
            $p->level_display = ($lvl >= 1 && $lvl <= 6) ? ('Level ' . $lvl . ' — ' . $this->workflowService->levelLabel($lvl)) : '—';

            $assignedUser = match ($lvl) {
                2 => $p->reviewedByUser, 3 => $p->checkedByUser, 4 => $p->endorsedByUser,
                5 => $p->confirmedByUser, 6 => $p->approvedByUser, default => null
            };
            $p->status_assignee_name = $assignedUser ? trim(($assignedUser->first_name ?? '') . ' ' . ($assignedUser->last_name ?? '')) : '—';

            $isSentBack = strtolower((string) $p->status) === 'sent back';
            $p->status_display_main = $isSentBack ? $this->workflowService->getQueueLabelForLevel($lvl) : ($p->status ?? '—');
            $p->status_display_suffix = $isSentBack ? ' (Sent Back)' : '';
            
            $p->viewer_is_preparer = (int) $p->user_id === (int) $user->id;
            $p->viewer_is_current_approver = $this->currentProjectAssignedToUser($p, (int) $user->id);

            return $p;
        });

        $statsQuery = RoiCurrentProject::query();
        $this->applyCurrentVisibilityScope($statsQuery, $user);
        $latest = (clone $statsQuery)->orderBy('last_saved_at', 'desc')->first();

        $stats = [
            'totalCurrentProjects' => (clone $statsQuery)->count(),
            'recentlyModifiedText' => $latest?->last_saved_at?->diffForHumans() ?? '—',
            'recentlyAddedToday' => (clone $statsQuery)->whereDate('last_saved_at', now()->toDateString())->count() . ' Today',
        ];

        return Inertia::render('CustomerManagement/ProjectROIApproval/CurrentRoutes/CurrentList', [
            'currentProjects' => $currentProjects,
            'stats' => $stats,
            'viewerId' => (int) $user->id,
        ]);
    }

    public function show($id)
    {
        $user = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);
        $this->ensureCanView($project, $user);

        $userIds = collect([$project->user_id, $project->status_updated_by, $project->reviewed_by, $project->checked_by, $project->endorsed_by, $project->confirmed_by, $project->approved_by])->filter()->unique()->values();
        $usersById = User::query()->whereIn('id', $userIds)->get(['id', 'first_name', 'last_name', 'position'])->keyBy(fn ($u) => (string) $u->id)->map(fn ($u) => [
            'id' => $u->id, 'name' => trim($u->first_name . ' ' . $u->last_name), 'position' => $u->position ?? '—',
        ]);

        $project->notes = $this->workflowService->sortTimelineEntries($project->notes);
        $project->comments = $this->workflowService->sortTimelineEntries($project->comments);

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
            'project' => $project, 'entryProject' => $project, 'readOnly' => true, 'route' => 'current',
            'createdBy' => $project->user?->name ?? '—', 'viewerLevel' => (int) $project->current_level,
            'canActOnCurrentProject' => $this->currentProjectAssignedToUser($project, (int) $user->id), 'usersById' => $usersById,
            'projectNotes' => $project->notes ?? [], 'projectComments' => $project->comments ?? [],
            'requiredSendBackType' => $this->requiredSendBackTypeForLevel((int) $project->current_level),
            'machineCatalog' => $this->buildMachineCatalog(), 'consumableCatalog' => $this->buildConsumableCatalog(),
        ]);
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

        return to_route('roi.current')->with('success', 'Project moved to ' . $nextStatus . '.');
    }

    public function reject($id)
    {
        $user = $this->getAuthenticatedUser();
        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);
        $this->ensureCanAct($project, $user);

        $this->workflowService->handleReject($project, $user);

        return to_route('roi.current')->with('success', 'Project rejected and archived.');
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

    // Catalog builders left to serve Inertia frontend
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
}