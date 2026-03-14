<?php

namespace App\Http\Controllers;

use App\Models\RoiArchiveProject;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryFee;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryProject;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class RoiCurrentProjectController extends Controller
{
    /**
     * TEMPORARY workflow mapping.
     * This will be replaced by Approver Matrix logic later.
     */
    private const ROLE_TO_LEVEL = [
        'preparer'  => 1,
        'reviewer'  => 2,
        'checker'   => 3,
        'endorser'  => 4,
        'confirmer' => 5,
        'approver'  => 6,
    ];

    private const LEVEL_TO_ROLE = [
        1 => 'preparer',
        2 => 'reviewer',
        3 => 'checker',
        4 => 'endorser',
        5 => 'confirmer',
        6 => 'approver',
    ];

    private const LEVEL_TO_LABEL = [
        1 => 'Prepared By',
        2 => 'Reviewed By',
        3 => 'Checked By',
        4 => 'Endorsed By',
        5 => 'Confirmed By',
        6 => 'Approved By',
    ];

    private function roleToLevel(?string $role): ?int
    {
        $role = strtolower(trim((string) $role));

        return self::ROLE_TO_LEVEL[$role] ?? null;
    }

    private function levelToRole(int $level): ?string
    {
        return self::LEVEL_TO_ROLE[$level] ?? null;
    }

    private function levelLabel(int $level): string
    {
        return self::LEVEL_TO_LABEL[$level] ?? 'Unknown';
    }

    private function getAuthenticatedUserAndLevel(): array
    {
        $user = Auth::user();
        $level = $this->roleToLevel($user->workflow_role);

        if ($level === null) {
            abort(403, 'Your account has no workflow role.');
        }

        return [$user, $level];
    }

    private function isPreparerLevel(int $level): bool
    {
        return $level === 1;
    }

    private function isApproverLevel(int $level): bool
    {
        return $level >= 2 && $level <= 6;
    }

    private function userMatchesProjectLocation($user, RoiCurrentProject $project): bool
    {
        $level = $this->roleToLevel($user->workflow_role);

        if ($level === 1) {
            return true;
        }

        $preparer = $this->emailUserById((int) $project->user_id);

        if (!$preparer) {
            return false;
        }

        return (int) $preparer->primary_location_id === (int) $user->primary_location_id;
    }

    /**
     * Current list visibility:
     * - Level 1 (preparer): can see own submitted in Current (user_id = self)
     * - Level 2-6: can see only projects assigned to their level (current_level = level)
     *   and only if the preparer is in the same primary location
     */
    private function applyCurrentVisibilityScope($query, $user, int $level)
    {
        if ($this->isPreparerLevel($level)) {
            return $query->where('user_id', $user->id);
        }

        $userPrimaryLocationId = (int) $user->primary_location_id;

        return $query
            ->where('current_level', $level)
            ->whereHas('user', function ($q) use ($userPrimaryLocationId) {
                $q->where('primary_location_id', $userPrimaryLocationId);
            });
    }

    private function ensureCanAct(RoiCurrentProject $project, $user, int $level): void
    {
        if (!$this->isApproverLevel($level)) {
            abort(403, 'Not allowed to perform actions.');
        }

        if ((int) $project->current_level !== (int) $level) {
            abort(403, 'Project is not assigned to your level.');
        }

        if (!$this->userMatchesProjectLocation($user, $project)) {
            abort(403, 'You are not in the same location as this project.');
        }
    }

    private function ensureCanView(RoiCurrentProject $project, $user, int $level): void
    {
        $canView = $this->isPreparerLevel($level)
            ? ((int) $project->user_id === (int) $user->id)
            : ((int) $project->current_level === (int) $level);

        if (!$canView) {
            abort(403, 'Not allowed to view this project.');
        }

        if (!$this->userMatchesProjectLocation($user, $project)) {
            abort(403, 'You are not in the same location as this project.');
        }
    }

    private function emailUsersByRole(string $role)
    {
        return User::query()
            ->whereNotNull('email')
            ->get()
            ->filter(function (User $user) use ($role) {
                return strtolower((string) $user->workflow_role) === strtolower($role);
            })
            ->values();
    }

    private function emailUserById(int $userId): ?User
    {
        return User::query()->find($userId);
    }

    private function sendEmail(?string $to, string $subject, string $body): void
    {
        if (!$to) {
            Log::warning('[ROI Mail] skipped: missing recipient', [
                'subject' => $subject,
            ]);
            return;
        }

        try {
            Mail::raw($body, function ($message) use ($to, $subject) {
                $message->to($to)->subject($subject);
            });

            Log::info('[ROI Mail] sent', [
                'to' => $to,
                'subject' => $subject,
            ]);
        } catch (\Throwable $e) {
            Log::warning('[ROI Mail] failed (safe mode)', [
                'to' => $to,
                'subject' => $subject,
                'error' => $e->getMessage(),
            ]);

            report($e);
        }
    }

    private function notifyMoveNextOrBack(
        RoiCurrentProject $project,
        User $actor,
        int $fromLevel,
        int $toLevel,
        string $action
    ): void {
        $ref = $project->reference;

        $toRole = $this->levelToRole($toLevel);

        if ($toRole) {
            $receivers = $this->emailUsersByRole($toRole);

            foreach ($receivers as $r) {
                $this->sendEmail(
                    $r->email,
                    "ROI Project Received: {$ref}",
                    "You received ROI project {$ref}.\nAssigned level: Level {$toLevel} ({$this->levelLabel($toLevel)}).\n"
                    . "Action: " . ($action === 'next' ? 'Sent to next level' : 'Sent back to previous level') . "\n"
                    . "From: {$actor->name} (Level {$fromLevel})."
                );
            }
        }

        $preparer = $this->emailUserById((int) $project->user_id);

        if ($preparer) {
            $this->sendEmail(
                $preparer->email,
                "ROI Project Update: {$ref}",
                "Your ROI project {$ref} moved.\nFrom: Level {$fromLevel} ({$this->levelLabel($fromLevel)})\n"
                . "To: Level {$toLevel} ({$this->levelLabel($toLevel)})\n"
                . "Action by: {$actor->name}"
            );
        }

        $this->sendEmail(
            $actor->email,
            "ROI Action Successful: {$ref}",
            "Success!\nYou " . ($action === 'next' ? 'sent' : 'sent back') . " ROI project {$ref}.\n"
            . "From level: {$fromLevel}\nTo level: {$toLevel}"
        );
    }

    private function notifyDecision(
        string $decision,
        string $reference,
        ?User $preparer,
        User $actor,
        int $actorLevel
    ): void {
        if ($preparer) {
            $this->sendEmail(
                $preparer->email,
                "ROI Project {$decision}: {$reference}",
                "Your ROI project {$reference} was {$decision}.\n"
                . ucfirst($decision) . " by: {$actor->name} (Level {$actorLevel} — {$this->levelLabel($actorLevel)})"
            );
        }

        $this->sendEmail(
            $actor->email,
            "ROI Action Successful: {$reference}",
            "Success!\nYou {$decision} ROI project {$reference}."
        );
    }

    private function archiveFromCurrent(RoiCurrentProject $current, array $archiveOverrides): RoiArchiveProject
    {
        $base = $current->only([
            'user_id', 'project_uid', 'reference', 'version', 'last_saved_at', 'status',
            'reviewed_by', 'checked_by', 'endorsed_by', 'confirmed_by',
            'company_name', 'contract_years', 'contract_type', 'bundled_std_ink',
            'annual_interest', 'percent_margin',
            'mono_yield_monthly', 'mono_yield_annual', 'color_yield_monthly', 'color_yield_annual',
            'mc_unit_cost', 'mc_qty', 'mc_total_cost', 'mc_yields', 'mc_cost_cpp',
            'mc_selling_price', 'mc_total_sell', 'mc_sell_cpp', 'mc_total_bundled_price',
            'fees_total',
            'grand_total_cost', 'grand_total_revenue', 'grand_roi', 'grand_roi_percentage',
            'yearly_breakdown', 'notes', 'comments',
        ]);

        $payload = array_merge($base, $archiveOverrides);

        /** @var RoiArchiveProject $archived */
        $archived = RoiArchiveProject::create($payload);

        $current->loadMissing(['items', 'fees']);

        if (method_exists($archived, 'items') && $current->items) {
            foreach ($current->items as $item) {
                $itemData = $item->toArray();
                unset($itemData['id'], $itemData['roi_current_project_id'], $itemData['created_at'], $itemData['updated_at']);
                $archived->items()->create($itemData);
            }
        }

        if (method_exists($archived, 'fees') && $current->fees) {
            foreach ($current->fees as $fee) {
                $feeData = $fee->toArray();
                unset($feeData['id'], $feeData['roi_current_project_id'], $feeData['created_at'], $feeData['updated_at']);
                $archived->fees()->create($feeData);
            }
        }

        $current->delete();

        return $archived;
    }

    public function current()
    {
        [$user, $level] = $this->getAuthenticatedUserAndLevel();

        $query = RoiCurrentProject::with(['items', 'fees', 'user'])
            ->orderBy('last_saved_at', 'desc');

        $this->applyCurrentVisibilityScope($query, $user, $level);

        $currentProjects = $query->paginate(10)
            ->through(function ($p) {
                $last = $p->last_saved_at;
                $display = null;

                if ($last) {
                    $now = now();

                    $diffMinutes = (int) $last->diffInMinutes($now);
                    $diffHours = (int) $last->diffInHours($now);
                    $diffDays = (int) $last->diffInDays($now);

                    if ($diffDays >= 2) {
                        $display = $last->format('m/d/y');
                    } elseif ($diffDays >= 1) {
                        $display = '1d ago';
                    } elseif ($diffHours >= 1) {
                        $display = $diffHours . 'hr ago';
                    } elseif ($diffMinutes >= 1) {
                        $display = $diffMinutes . ' minute' . ($diffMinutes === 1 ? '' : 's') . ' ago';
                    } else {
                        $display = 'just now';
                    }
                }

                $p->last_saved_display = $display ?? '—';

                $lvl = (int) ($p->current_level ?? 0);
                $p->level_display = ($lvl >= 1 && $lvl <= 6)
                    ? ('Level ' . $lvl . ' — ' . $this->levelLabel($lvl))
                    : '—';

                return $p;
            });

        $statsQuery = RoiCurrentProject::query();
        $this->applyCurrentVisibilityScope($statsQuery, $user, $level);

        $recentlyAddedToday = (clone $statsQuery)
            ->whereDate('last_saved_at', now()->toDateString())
            ->count();

        $latest = (clone $statsQuery)
            ->orderBy('last_saved_at', 'desc')
            ->first();

        $stats = [
            'totalCurrentProjects' => (clone $statsQuery)->count(),
            'recentlyModifiedText' => $latest?->last_saved_at?->diffForHumans() ?? '—',
            'recentlyAddedToday' => $recentlyAddedToday . ' Today',
        ];

        return Inertia::render('CustomerManagement/ProjectROIApproval/CurrentRoutes/CurrentList', [
            'currentProjects' => $currentProjects,
            'stats' => $stats,
            'viewerRole' => strtolower((string) $user->workflow_role),
            'viewerLevel' => $level,
        ]);
    }

    public function show($id)
    {
        [$user, $level] = $this->getAuthenticatedUserAndLevel();

        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

        $this->ensureCanView($project, $user, $level);

        $entryProject = RoiEntryProject::where('project_uid', $project->project_uid)->first();

        $userIds = collect([
            $project->user_id,
            $project->status_updated_by,
            $project->reviewed_by_id ?? null,
            $project->checked_by_id ?? null,
            $project->endorsed_by_id ?? null,
            $project->confirmed_by_id ?? null,
            $project->approved_by ?? null,
            $project->rejected_by ?? null,
        ])->filter()->unique()->values();

        $usersById = User::query()
            ->whereIn('id', $userIds)
            ->get(['id', 'first_name', 'last_name'])
            ->keyBy(fn ($u) => (string) $u->id)
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => trim($u->first_name . ' ' . $u->last_name),
            ]);

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
            'project' => $project,
            'entryProject' => $project,
            'readOnly' => true,
            'route' => 'current',
            'createdBy' => $project->user?->name ?? '—',
            'role' => $user->workflow_role,
            'viewerLevel' => $level,
            'usersById' => $usersById,
            'projectNotes' => $entryProject?->notes ?? [],
            'projectComments' => $entryProject?->comments ?? [],
        ]);
    }

    public function sendBack($id)
    {
        return DB::transaction(function () use ($id) {
            [$user, $level] = $this->getAuthenticatedUserAndLevel();

            $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

            $this->ensureCanAct($project, $user, $level);

            $fromLevel = (int) $project->current_level;

            if ($fromLevel < 2) {
                return back()->withErrors(['level' => 'Cannot send back any further.']);
            }

            $toLevel = $fromLevel - 1;

            if ($toLevel === 1) {
                $projectData = $project->toArray();
                unset($projectData['id']);
                unset($projectData['roi_current_project_id']);

                $entryProject = RoiEntryProject::create(array_merge($projectData, [
                    'status' => 'returned',
                    'current_level' => 1,
                    'status_updated_at' => now(),
                    'status_updated_by' => $user->id,
                    'last_saved_at' => now(),
                    'notes' => $project->notes ?? [],
                    'comments' => $project->comments ?? [],
                ]));

                foreach ($project->items as $item) {
                    $itemData = $item->toArray();
                    unset($itemData['id']);
                    unset($itemData['roi_current_project_id']);
                    $itemData['roi_entry_project_id'] = $entryProject->id;
                    RoiEntryItem::create($itemData);
                }

                foreach ($project->fees as $fee) {
                    $feeData = $fee->toArray();
                    unset($feeData['id']);
                    unset($feeData['roi_current_project_id']);
                    $feeData['roi_entry_project_id'] = $entryProject->id;
                    RoiEntryFee::create($feeData);
                }

                $project->items()->delete();
                $project->fees()->delete();
                $project->delete();

                $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'back');

                return to_route('roi.entry.list')->with('success', 'Project returned to Preparer for revision.');
            }

            $project->update([
                'current_level' => $toLevel,
                'status' => 'pending',
                'status_reason' => null,
                'status_updated_at' => now(),
                'status_updated_by' => $user->id,
                'last_saved_at' => now(),
            ]);

            $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'back');

            return to_route('roi.current')->with('success', 'Project sent back to Level ' . $toLevel . '.');
        });
    }

    public function advanceProject($id)
    {
        return DB::transaction(function () use ($id) {
            $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

            [$user, $level] = $this->getAuthenticatedUserAndLevel();

            $this->ensureCanAct($project, $user, $level);

            $fromLevel = (int) $project->current_level;

            if ($fromLevel >= 6) {
                return back()->withErrors(['level' => 'Already at final level. Use Approve.']);
            }

            $toLevel = $fromLevel + 1;

            $byColumn = match ($fromLevel) {
                2 => 'reviewed_by',
                3 => 'checked_by',
                4 => 'endorsed_by',
                5 => 'confirmed_by',
                default => null,
            };

            $update = [
                'current_level' => $toLevel,
                'status' => 'pending',
                'status_reason' => null,
                'status_updated_at' => now(),
                'status_updated_by' => $user->id,
                'last_saved_at' => now(),
            ];

            if ($byColumn) {
                $update[$byColumn] = $user->name;
            }

            $project->update($update);

            $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'next');

            return to_route('roi.current')->with('success', 'Project moved to Level ' . $toLevel . '.');
        });
    }

    public function reject($id)
    {
        return DB::transaction(function () use ($id) {
            $current = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

            [$actor, $actorLevel] = $this->getAuthenticatedUserAndLevel();

            $this->ensureCanAct($current, $actor, $actorLevel);

            $reference = $current->reference;
            $preparer = $this->emailUserById((int) $current->user_id);

            $this->archiveFromCurrent($current, [
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejected_by' => $actor->id,
                'rejected_by_level' => $actorLevel,
                'approved_at' => null,
                'approved_by' => null,
            ]);

            $this->notifyDecision('rejected', $reference, $preparer, $actor, $actorLevel);

            return to_route('roi.current')->with('success', 'Project rejected and archived.');
        });
    }

    public function approve($id)
    {
        return DB::transaction(function () use ($id) {
            $current = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

            [$actor, $actorLevel] = $this->getAuthenticatedUserAndLevel();

            $this->ensureCanAct($current, $actor, $actorLevel);

            if ((int) $actorLevel !== 6) {
                abort(403, 'Only approver (Level 6) can approve.');
            }

            $reference = $current->reference;
            $preparer = $this->emailUserById((int) $current->user_id);

            $this->archiveFromCurrent($current, [
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $actor->id,
                'rejected_at' => null,
                'rejected_by' => null,
                'rejected_by_level' => null,
            ]);

            $this->notifyDecision('approved', $reference, $preparer, $actor, 6);

            return to_route('roi.current')->with('success', 'Project approved and archived.');
        });
    }
}