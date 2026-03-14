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
    private const LEVEL_TO_LABEL = [
        1 => 'Prepared By',
        2 => 'Reviewed By',
        3 => 'Checked By',
        4 => 'Endorsed By',
        5 => 'Confirmed By',
        6 => 'Approved By',
    ];

    private function levelLabel(int $level): string
    {
        return self::LEVEL_TO_LABEL[$level] ?? 'Unknown';
    }

    private function getAuthenticatedUser()
    {
        $user = Auth::user();

        if (!$user) {
            abort(403, 'Unauthenticated.');
        }

        return $user;
    }

    private function approverColumnForLevel(int $level): ?string
    {
        return match ($level) {
            2 => 'reviewed_by',
            3 => 'checked_by',
            4 => 'endorsed_by',
            5 => 'confirmed_by',
            6 => 'approved_by',
            default => null,
        };
    }

    private function currentProjectAssignedToUser(RoiCurrentProject $project, int $userId): bool
    {
        $column = $this->approverColumnForLevel((int) $project->current_level);

        if (!$column) {
            return false;
        }

        return (int) ($project->{$column} ?? 0) === $userId;
    }

    private function applyCurrentVisibilityScope($query, $user)
    {
        $userId = (int) $user->id;

        return $query->where(function ($q) use ($userId) {
            $q->where('user_id', $userId)
                ->orWhere(function ($sub) use ($userId) {
                    $sub->where('current_level', 2)->where('reviewed_by', $userId);
                })
                ->orWhere(function ($sub) use ($userId) {
                    $sub->where('current_level', 3)->where('checked_by', $userId);
                })
                ->orWhere(function ($sub) use ($userId) {
                    $sub->where('current_level', 4)->where('endorsed_by', $userId);
                })
                ->orWhere(function ($sub) use ($userId) {
                    $sub->where('current_level', 5)->where('confirmed_by', $userId);
                })
                ->orWhere(function ($sub) use ($userId) {
                    $sub->where('current_level', 6)->where('approved_by', $userId);
                });
        });
    }

    private function ensureCanAct(RoiCurrentProject $project, $user): void
    {
        if (!$this->currentProjectAssignedToUser($project, (int) $user->id)) {
            abort(403, 'Project is not assigned to you.');
        }
    }

    private function ensureCanView(RoiCurrentProject $project, $user): void
    {
        $userId = (int) $user->id;

        $canView =
            (int) $project->user_id === $userId ||
            $this->currentProjectAssignedToUser($project, $userId);

        if (!$canView) {
            abort(403, 'Not allowed to view this project.');
        }
    }

    private function emailUserById(?int $userId): ?User
    {
        if (!$userId) {
            return null;
        }

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

    private function nextAssignedUserForLevel(RoiCurrentProject $project, int $level): ?User
    {
        $column = $this->approverColumnForLevel($level);

        if (!$column) {
            return null;
        }

        return $this->emailUserById((int) ($project->{$column} ?? 0));
    }

    private function notifyMoveNextOrBack(
        RoiCurrentProject $project,
        User $actor,
        int $fromLevel,
        int $toLevel,
        string $action
    ): void {
        $ref = $project->reference;

        $receiver = $toLevel >= 2 ? $this->nextAssignedUserForLevel($project, $toLevel) : null;

        if ($receiver) {
            $this->sendEmail(
                $receiver->email,
                "ROI Project Received: {$ref}",
                "You received ROI project {$ref}.\nAssigned level: Level {$toLevel} ({$this->levelLabel($toLevel)}).\n"
                . "Action: " . ($action === 'next' ? 'Sent to next level' : 'Sent back to previous level') . "\n"
                . "From: {$actor->name} (Level {$fromLevel})."
            );
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
            'user_id',
            'location_id',
            'project_uid',
            'reference',
            'version',
            'last_saved_at',
            'status',
            'reviewed_by',
            'checked_by',
            'endorsed_by',
            'confirmed_by',
            'company_name',
            'contract_years',
            'contract_type',
            'purpose',
            'bundled_std_ink',
            'annual_interest',
            'percent_margin',
            'mono_yield_monthly',
            'mono_yield_annual',
            'color_yield_monthly',
            'color_yield_annual',
            'mc_unit_cost',
            'mc_qty',
            'mc_total_cost',
            'mc_yields',
            'mc_cost_cpp',
            'mc_selling_price',
            'mc_total_sell',
            'mc_sell_cpp',
            'mc_total_bundled_price',
            'fees_total',
            'grand_total_cost',
            'grand_total_revenue',
            'grand_roi',
            'grand_roi_percentage',
            'yearly_breakdown',
            'notes',
            'comments',
        ]);

        $payload = array_merge($base, $archiveOverrides);

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
        $user = $this->getAuthenticatedUser();

        $query = RoiCurrentProject::with(['items', 'fees', 'user'])
            ->orderBy('last_saved_at', 'desc');

        $this->applyCurrentVisibilityScope($query, $user);

        $currentProjects = $query->paginate(10)
            ->through(function ($p) use ($user) {
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

                $p->viewer_is_preparer = (int) $p->user_id === (int) $user->id;
                $p->viewer_is_current_approver = $this->currentProjectAssignedToUser($p, (int) $user->id);

                return $p;
            });

        $statsQuery = RoiCurrentProject::query();
        $this->applyCurrentVisibilityScope($statsQuery, $user);

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
            'viewerId' => (int) $user->id,
        ]);
    }

    public function show($id)
    {
        $user = $this->getAuthenticatedUser();

        $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

        $this->ensureCanView($project, $user);

        $entryProject = RoiEntryProject::where('project_uid', $project->project_uid)->first();

        $userIds = collect([
            $project->user_id,
            $project->status_updated_by,
            $project->reviewed_by,
            $project->checked_by,
            $project->endorsed_by,
            $project->confirmed_by,
            $project->approved_by,
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
            'viewerLevel' => (int) $project->current_level,
            'usersById' => $usersById,
            'projectNotes' => $entryProject?->notes ?? [],
            'projectComments' => $entryProject?->comments ?? [],
        ]);
    }

    public function sendBack($id)
    {
        return DB::transaction(function () use ($id) {
            $user = $this->getAuthenticatedUser();

            $project = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

            $this->ensureCanAct($project, $user);

            $fromLevel = (int) $project->current_level;

            if ($fromLevel < 2) {
                return back()->withErrors(['level' => 'Cannot send back any further.']);
            }

            $toLevel = $fromLevel - 1;

            if ($toLevel === 1) {
                $projectData = $project->toArray();
                unset($projectData['id']);
                unset($projectData['roi_current_project_id']);
                unset($projectData['submitted_at']);
                unset($projectData['status_updated_at']);
                unset($projectData['status_updated_by']);
                unset($projectData['current_level']);
                unset($projectData['created_at']);
                unset($projectData['updated_at']);

                $entryProject = RoiEntryProject::create(array_merge($projectData, [
                    'status' => 'returned',
                    'last_saved_at' => now(),
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
                'status' => 'Sent Back',
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

            $user = $this->getAuthenticatedUser();

            $this->ensureCanAct($project, $user);

            $fromLevel = (int) $project->current_level;

            if ($fromLevel >= 6) {
                return back()->withErrors(['level' => 'Already at final level. Use Approve.']);
            }

            $toLevel = $fromLevel + 1;

            $nextStatus = match ($toLevel) {
                3 => 'For Checking',
                4 => 'For Endorsement',
                5 => 'For Confirmation',
                6 => 'For Approval',
                default => 'Pending',
            };

            $project->update([
                'current_level' => $toLevel,
                'status' => $nextStatus,
                'status_reason' => null,
                'status_updated_at' => now(),
                'status_updated_by' => $user->id,
                'last_saved_at' => now(),
            ]);

            $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'next');

            return to_route('roi.current')->with('success', 'Project moved to Level ' . $toLevel . '.');
        });
    }

    public function reject($id)
    {
        return DB::transaction(function () use ($id) {
            $current = RoiCurrentProject::with(['items', 'fees', 'user'])->findOrFail($id);

            $actor = $this->getAuthenticatedUser();

            $this->ensureCanAct($current, $actor);

            $actorLevel = (int) $current->current_level;
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

            $actor = $this->getAuthenticatedUser();

            $this->ensureCanAct($current, $actor);

            if ((int) $current->current_level !== 6 || (int) $current->approved_by !== (int) $actor->id) {
                abort(403, 'Only the assigned approver can approve.');
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