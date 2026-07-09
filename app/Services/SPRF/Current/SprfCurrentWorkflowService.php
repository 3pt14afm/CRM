<?php

namespace App\Services\SPRF\Current;

use App\Mail\SPRF\SprfActorConfirmation;
use App\Mail\SPRF\SprfApproverQueueNotification;
use App\Mail\SPRF\SprfPmNotification;
use App\Models\SPRF\SprfArchiveProject;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\SPRF\SprfEntryProject;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SprfCurrentWorkflowService
{
    // -------------------------------------------------------------------------
    // Workflow – Advance
    // -------------------------------------------------------------------------

    public function handleAdvance(SprfCurrentProject $project, int $actingUserId): SprfCurrentProject|SprfArchiveProject
    {
        if ((int) $project->current_level === 2
            && $project->requires_rebate_justification
            && blank($project->rebate_justification)
        ) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'rebate_justification' => 'Rebate justification must be provided.',
            ]);
        }

        $terminalLevel = $this->getTerminalLevel($project);
        $autoLevels    = $this->collectAutoAdvanceLevels($project, $actingUserId, (int) $project->current_level);
        $lastLevel     = end($autoLevels);

        // User's consecutive run reaches terminal level → archive as approved.
        if ($lastLevel >= $terminalLevel) {
            $intermediateData = [];

            foreach ($autoLevels as $level) {
                if ($level < $terminalLevel) {
                    $col = $this->timestampColumnForLevel($level);
                    if ($col) {
                        $intermediateData[$col] = now();
                    }
                }
            }

            $intermediateData['current_level'] = $terminalLevel;

            if (!empty($intermediateData)) {
                $project->update($intermediateData);
            }

            return $this->handleApprove($project->fresh(), $actingUserId);
        }

        // Normal / multi-level advance
        $nextLevel      = $lastLevel + 1;
        $nextApproverId = $this->approverUserIdForLevel($project, $nextLevel);

        $updateData = [
            'current_level'            => $nextLevel,
            'current_approver_user_id' => $nextApproverId,
            'status'                   => 'under_review',
        ];

        foreach ($autoLevels as $level) {
            $col = $this->timestampColumnForLevel($level);
            if ($col) {
                $updateData[$col] = now();
            }
        }

        $project->update($updateData);

        // Emails: Template 3 → PM, Template 4 → actor, Template 2 → next approver
        $this->notifyAdvanced($project->fresh(), $actingUserId, $lastLevel, $nextLevel);

        return $project->fresh();
    }

    // -------------------------------------------------------------------------
    // Workflow – Auto-advance on submit
    // -------------------------------------------------------------------------

    public function handleAutoAdvanceOnSubmit(SprfCurrentProject $project): void
    {
        $preparerId = (int) $project->prepared_by_user_id;
        $startLevel = $project->requires_rebate_justification ? 2 : 3;

        if ($this->approverUserIdForLevel($project, $startLevel) !== $preparerId) return;

        $autoLevels    = $this->collectAutoAdvanceLevels($project, $preparerId, $startLevel);
        $lastLevel     = end($autoLevels);
        $terminalLevel = $this->getTerminalLevel($project);

        if ($lastLevel >= $terminalLevel) {
            $updates = ['current_level' => $terminalLevel];
            foreach ($autoLevels as $l) {
                if ($l < $terminalLevel) {
                    $col = $this->timestampColumnForLevel($l);
                    if ($col) $updates[$col] = now();
                }
            }
            $project->update($updates);
            $this->handleApprove($project->fresh(), $preparerId);
            return;
        }

        $nextLevel = $lastLevel + 1;

        $updates = [
            'current_level'            => $nextLevel,
            'current_approver_user_id' => $this->approverUserIdForLevel($project, $nextLevel),
            'status'                   => 'under_review',
        ];

        foreach ($autoLevels as $l) {
            $col = $this->timestampColumnForLevel($l);
            if ($col) $updates[$col] = now();
        }

        $project->update($updates);
    }

    // -------------------------------------------------------------------------
    // Workflow – Send back
    // -------------------------------------------------------------------------

    public function handleSendBack(SprfCurrentProject $project, string $message, int $userId)
    {
        return DB::transaction(function () use ($project, $message, $userId) {
            $currentLevel = (int) $project->current_level;

            $this->appendMessage($project, $message, $userId, $currentLevel);

            if ($currentLevel === 2) {
                $entryProject = $this->revertToEntryProject($project);
                // Emails: Template 7 → PM, Template 8 → actor
                $this->notifyReturnedToPreparer($project, $userId, $entryProject);
                return $entryProject;
            }

            $prevLevel = $currentLevel - 1;

            // DCE (level 2) is only part of the pipeline when rebate justification
            // is required. Otherwise, sending back from ESD (level 3) should go
            // straight to the preparer, not to DCE.
            if ($prevLevel === 2 && !$project->requires_rebate_justification) {
                $entryProject = $this->revertToEntryProject($project);
                // Emails: Template 7 → PM, Template 8 → actor
                $this->notifyReturnedToPreparer($project, $userId, $entryProject);
                return $entryProject;
            }

            $firstLevel = $this->findFirstConsecutiveLevelForApprover($project, $prevLevel);

            if ($this->approverUserIdForLevel($project, $firstLevel) === (int) $project->prepared_by_user_id) {
                $entryProject = $this->revertToEntryProject($project);
                // Emails: Template 7 → PM, Template 8 → actor
                $this->notifyReturnedToPreparer($project, $userId, $entryProject);
                return $entryProject;
            }

            $updateData = [
                'current_level'            => $firstLevel,
                'current_approver_user_id' => $this->approverUserIdForLevel($project, $firstLevel),
                'status'                   => 'Sent Back',
            ];

            for ($level = $firstLevel; $level <= $prevLevel; $level++) {
                $col = $this->timestampColumnForLevel($level);
                if ($col) $updateData[$col] = null;
            }

            $project->update($updateData);

            // Emails: Template 9 → previous approver, Template 10 → actor, Template 7 → PM (informational)
            $this->notifyPipelineSendBack($project->fresh(), $userId, $firstLevel, $message);

            return $project->fresh();
        });
    }

    // -------------------------------------------------------------------------
    // Workflow – Final approve
    // -------------------------------------------------------------------------

    public function handleApprove(SprfCurrentProject $project, int $userId): SprfArchiveProject
    {
        return DB::transaction(function () use ($project, $userId) {
            $timestampColumn = $this->timestampColumnForLevel($project->current_level);

            $archiveProject = $this->archiveFromCurrent($project, [
                'status'                   => 'approved',
                'approved_by_user_id'      => $userId,
                'rejected_by_user_id'      => null,
                'approved_at'              => now(),
                'rejected_at'              => null,
                $timestampColumn           => now(),
            ]);

            // Emails: Template 3 → PM ("approved"), Template 4 → actor ("approved")
            $this->notifyApproved($archiveProject, $userId);

            return $archiveProject;
        });
    }

    // -------------------------------------------------------------------------
    // Workflow – Reject
    // -------------------------------------------------------------------------

    public function handleReject(SprfCurrentProject $project, int $userId, ?string $note): SprfArchiveProject
    {
        return DB::transaction(function () use ($project, $userId, $note) {
            $archiveProject = $this->archiveFromCurrent($project, [
                'status'              => 'rejected',
                'rejected_by_user_id' => $userId,
                'last_reject_note'    => $note,
                'approved_at'         => null,
                'rejected_at'         => now(),
            ]);

            // Emails: Template 5 → PM, Template 6 → actor
            $this->notifyRejected($archiveProject, $userId);

            return $archiveProject;
        });
    }

    // -------------------------------------------------------------------------
    // Workflow – Withdraw
    // Preparer pulls the project out of the approval pipeline and it returns
    // to their entry list as a 'withdrawn' SprfEntryProject. Reuses the same
    // item/fee duplication + deletion logic as send-back's revert path.
    // -------------------------------------------------------------------------

    public function handleWithdraw(SprfCurrentProject $project, int $actorId): SprfEntryProject
    {
        return DB::transaction(function () use ($project, $actorId) {
            // Capture the interrupted approver BEFORE revertToEntryProject deletes $project
            $projectBeforeDeletion = clone $project;

            $entryProject = $this->revertToEntryProject($project, [
                'status' => 'withdrawn',
            ]);

            // Emails: Template 11 → PM, Template 12 → interrupted approver
            $this->notifyWithdraw($entryProject, $actorId);
            $this->notifyWithdrawInterruptedApprover($projectBeforeDeletion, $actorId);

            return $entryProject;
        });
    }

    // -------------------------------------------------------------------------
    // Workflow – Cancel
    // Preparer permanently archives the project with a 'cancelled' status.
    // Reuses the same archive-and-delete logic as reject/approve.
    // -------------------------------------------------------------------------

    public function handleCancel(SprfCurrentProject $project, int $actorId): SprfArchiveProject
    {
        return DB::transaction(function () use ($project, $actorId) {
            // Capture the interrupted approver BEFORE archiveFromCurrent deletes $project
            $interruptedApproverId = (int) ($project->current_approver_user_id ?? 0);

            $archiveProject = $this->archiveFromCurrent($project, [
                'status'               => 'cancelled',
                'cancelled_by_user_id' => $actorId,
                'cancelled_at'         => now(),
                'approved_at'          => null,
                'rejected_at'          => null,
            ]);

            // Emails: Template 11 → PM, Template 12 → interrupted approver
            $this->notifyCancel($archiveProject, $actorId, $interruptedApproverId);

            return $archiveProject;
        });
    }

    // -------------------------------------------------------------------------
    // Public notification entry-point called from SprfEntryProjectController::submit
    // Sends Template 1 → PM, Template 2 → DCE (initial queue)
    // -------------------------------------------------------------------------

    public function notifySubmit(SprfCurrentProject $project): void
    {
        $preparerId = (int) $project->prepared_by_user_id;
        $dceId      = (int) ($project->director_customer_engagement_user_id ?? 0);
        $approverId = (int) ($project->current_approver_user_id ?? 0);

        // Single batched lookup — $approverId is looked up once and reused
        // below for both "first approver" and "current approver" (they are
        // always the same id; the original code queried it twice).
        $users = $this->usersByIds([$preparerId, $dceId, $approverId]);

        $preparer = $users->get($preparerId);
        if (!$preparer?->email) return;

        $dce     = $users->get($dceId);
        $dceRole = 'Director – Customer Engagement';
        $projectUrl = $this->buildProjectUrl('current', $project->id);

        $firstApprover = $users->get($approverId);
        $firstApproverRole = $project->requires_rebate_justification ? $dceRole : 'ESD Director';

        // Template 1 — PM
        $this->dispatchMail(
            $preparer->email,
            new SprfPmNotification(
                type: 'submitted',
                referenceNo: $project->sprf_no,
                data: [
                    'approverName' => $firstApprover?->name ?? $dce?->name ?? '—',
                    'approverRole' => $firstApproverRole,
                ],
                projectLink: $projectUrl,
            )
        );

        // Template 2 — DCE (first approver in queue)
        // Only send if the DCE is still the current_approver (auto-advance may have moved it)
        $currentApprover = $firstApprover;
        if ($currentApprover?->email && $currentApprover->id !== $preparer->id) {
            $isTerminal = (int) $project->current_level === $this->getTerminalLevel($project);
            $this->dispatchMail(
                $currentApprover->email,
                new SprfApproverQueueNotification(
                    type: 'queued',
                    referenceNo: $project->sprf_no,
                    data: [
                        'senderName' => $preparer->name,
                        'action'     => $isTerminal ? 'approval' : 'review',
                    ],
                    projectLink: $projectUrl,
                )
            );
        }
    }

    // -------------------------------------------------------------------------
    // Workflow – Withdraw / Cancel  (called from whatever controller handles these)
    // Template 11 → PM, Template 12 → interrupted approver
    // -------------------------------------------------------------------------

    public function notifyWithdraw(SprfEntryProject $entryProject, int $actorId): void
    {
        $preparer = $this->userById($actorId); // actor IS the preparer for withdraw

        // Template 11 (withdrawn) — PM / preparer; no link
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new SprfPmNotification(
                    type: 'withdrawn',
                    referenceNo: $entryProject->sprf_no,
                    data: [],
                    projectLink: null,
                )
            );
        }
    }

    public function notifyWithdrawInterruptedApprover(SprfCurrentProject $projectBeforeDeletion, int $actorId): void
    {
        $holderId = (int) ($projectBeforeDeletion->current_approver_user_id ?? 0);

        $users  = $this->usersByIds([$actorId, $holderId]);
        $actor  = $users->get($actorId);
        $holder = $users->get($holderId);
        $pmName = $actor?->name ?? '—';

        // Template 12 (withdrawn) — interrupted approver; no link
        if ($holder?->email && $holder->id !== $actorId) {
            $this->dispatchMail(
                $holder->email,
                new SprfApproverQueueNotification(
                    type: 'withdrawn',
                    referenceNo: $projectBeforeDeletion->sprf_no,
                    data: ['pmName' => $pmName],
                    projectLink: null,
                )
            );
        }
    }

    public function notifyCancel(SprfArchiveProject $archiveProject, int $actorId, int $interruptedApproverId): void
    {
        $preparerId = (int) $archiveProject->prepared_by_user_id;

        $users    = $this->usersByIds([$actorId, $preparerId, $interruptedApproverId]);
        $actor    = $users->get($actorId);
        $preparer = $users->get($preparerId);
        $holder   = $users->get($interruptedApproverId);
        $pmName   = $actor?->name ?? '—';
        $archiveUrl = $this->buildProjectUrl('archive', $archiveProject->id);

        // Template 11 (cancelled) — PM
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new SprfPmNotification(
                    type: 'cancelled',
                    referenceNo: $archiveProject->sprf_no,
                    data: [],
                    projectLink: $archiveUrl,
                )
            );
        }

        // Template 12 (cancelled) — interrupted approver
        if ($holder?->email && $holder->id !== $actorId) {
            $this->dispatchMail(
                $holder->email,
                new SprfApproverQueueNotification(
                    type: 'cancelled',
                    referenceNo: $archiveProject->sprf_no,
                    data: ['pmName' => $pmName],
                    projectLink: $archiveUrl,
                )
            );
        }
    }

    // -------------------------------------------------------------------------
    // Private notification helpers
    // -------------------------------------------------------------------------

    /**
     * Fires on a normal advance (not the terminal approve).
     * Template 3 → PM
     * Template 4 → actor
     * Template 2 → next approver
     */
    private function notifyAdvanced(SprfCurrentProject $project, int $actorId, int $fromLevel, int $toLevel): void
    {
        $preparerId = (int) $project->prepared_by_user_id;
        $nextUserId = $this->approverUserIdForLevel($project, $toLevel);

        $users = $this->usersByIds([$actorId, $preparerId, $nextUserId ?? 0]);

        $actor      = $users->get($actorId);
        $preparer   = $users->get($preparerId);
        $nextUser   = $nextUserId ? $users->get($nextUserId) : null;
        $projectUrl = $this->buildProjectUrl('current', $project->id);

        $isTerminal  = $toLevel === $this->getTerminalLevel($project);
        $action      = 'reviewed'; // DCE / intermediate approvers always "review"
        $statusDetail = $isTerminal
            ? 'Routed to ' . ($nextUser?->name ?? '—') . ' (Final Approver)'
            : 'Routed to ' . ($nextUser?->name ?? '—');

        // Template 3 — PM
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new SprfPmNotification(
                    type: 'advanced',
                    referenceNo: $project->sprf_no,
                    data: [
                        'approverName' => $actor?->name ?? '—',
                        'action'       => $action,
                        'statusDetail' => $statusDetail,
                    ],
                    projectLink: $projectUrl,
                )
            );
        }

        // Template 4 — actor (self-confirmation)
        if ($actor?->email) {
            $this->dispatchMail(
                $actor->email,
                new SprfActorConfirmation(
                    type: 'advanced',
                    referenceNo: $project->sprf_no,
                    data: [
                        'action'       => $action,
                        'statusDetail' => $statusDetail,
                    ],
                    projectLink: $projectUrl,
                )
            );
        }

        // Template 2 — next approver in queue
        if ($nextUser?->email) {
            $this->dispatchMail(
                $nextUser->email,
                new SprfApproverQueueNotification(
                    type: 'queued',
                    referenceNo: $project->sprf_no,
                    data: [
                        'senderName' => $actor?->name ?? '—',
                        'action'     => $isTerminal ? 'approval' : 'review',
                    ],
                    projectLink: $projectUrl,
                )
            );
        }
    }

    /**
     * Fires when the project is fully approved (terminal level).
     * Template 3 → PM  (action = "approved", statusDetail = "Approved & Archived")
     * Template 4 → actor
     */
    private function notifyApproved(SprfArchiveProject $archiveProject, int $actorId): void
    {
        $preparerId = (int) $archiveProject->prepared_by_user_id;

        $users    = $this->usersByIds([$actorId, $preparerId]);
        $actor    = $users->get($actorId);
        $preparer = $users->get($preparerId);
        $archiveUrl = $this->buildProjectUrl('archive', $archiveProject->id);

        // Template 3 — PM
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new SprfPmNotification(
                    type: 'advanced',
                    referenceNo: $archiveProject->sprf_no,
                    data: [
                        'approverName' => $actor?->name ?? '—',
                        'action'       => 'approved',
                        'statusDetail' => 'Approved & Archived',
                    ],
                    projectLink: $archiveUrl,
                )
            );
        }

        // Template 4 — actor
        if ($actor?->email) {
            $this->dispatchMail(
                $actor->email,
                new SprfActorConfirmation(
                    type: 'advanced',
                    referenceNo: $archiveProject->sprf_no,
                    data: [
                        'action'       => 'approved',
                        'statusDetail' => 'Approved & Archived',
                    ],
                    projectLink: $archiveUrl,
                )
            );
        }
    }

    /**
     * Fires when an approver rejects the project.
     * Template 5 → PM
     * Template 6 → actor
     */
    private function notifyRejected(SprfArchiveProject $archiveProject, int $actorId): void
    {
        $preparerId = (int) $archiveProject->prepared_by_user_id;

        $users    = $this->usersByIds([$actorId, $preparerId]);
        $actor    = $users->get($actorId);
        $preparer = $users->get($preparerId);
        $archiveUrl = $this->buildProjectUrl('archive', $archiveProject->id);

        // Template 5 — PM
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new SprfPmNotification(
                    type: 'rejected',
                    referenceNo: $archiveProject->sprf_no,
                    data: ['rejectorName' => $actor?->name ?? '—'],
                    projectLink: $archiveUrl,
                )
            );
        }

        // Template 6 — actor
        if ($actor?->email) {
            $this->dispatchMail(
                $actor->email,
                new SprfActorConfirmation(
                    type: 'rejected',
                    referenceNo: $archiveProject->sprf_no,
                    data: [],
                    projectLink: $archiveUrl,
                )
            );
        }
    }

    /**
     * Fires when a send-back reverts to an entry project (back to the PM).
     * Template 7 → PM
     * Template 8 → actor
     */
    private function notifyReturnedToPreparer(SprfCurrentProject $project, int $actorId, SprfEntryProject $entryProject): void
    {
        $preparerId = (int) $project->prepared_by_user_id;

        $users    = $this->usersByIds([$actorId, $preparerId]);
        $actor    = $users->get($actorId);
        $preparer = $users->get($preparerId);
        $entryUrl = $this->buildProjectUrl('entry', $entryProject->id);

        // Template 7 — PM
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new SprfPmNotification(
                    type: 'returned',
                    referenceNo: $project->sprf_no,
                    data: ['approverName' => $actor?->name ?? '—'],
                    projectLink: $entryUrl,
                )
            );
        }

        // Template 8 — actor
        if ($actor?->email) {
            $this->dispatchMail(
                $actor->email,
                new SprfActorConfirmation(
                    type: 'returned_to_entry',
                    referenceNo: $project->sprf_no,
                    data: ['pmName' => $preparer?->name ?? '—'],
                    projectLink: $entryUrl,
                )
            );
        }
    }

    /**
     * Fires when a send-back keeps the project inside the pipeline.
     * Template 9  → previous approver (receiver)
     * Template 10 → actor
     * Template 7  → PM (informational)
     */
    private function notifyPipelineSendBack(SprfCurrentProject $project, int $actorId, int $receiverLevel, string $message = ''): void
    {
        $preparerId = (int) $project->prepared_by_user_id;
        $receiverId = $this->approverUserIdForLevel($project, $receiverLevel);

        $users      = $this->usersByIds([$actorId, $preparerId, $receiverId ?? 0]);
        $actor      = $users->get($actorId);
        $preparer   = $users->get($preparerId);
        $receiver   = $receiverId ? $users->get($receiverId) : null;
        $projectUrl = $this->buildProjectUrl('current', $project->id);

        // Template 9 — previous approver / receiver
        if ($receiver?->email) {
            $this->dispatchMail(
                $receiver->email,
                new SprfApproverQueueNotification(
                    type: 'sent_back',
                    referenceNo: $project->sprf_no,
                    data: ['actorName' => $actor?->name ?? '—', 'message' => $message],
                    projectLink: $projectUrl,
                )
            );
        }

        // Template 10 — actor
        if ($actor?->email) {
            $this->dispatchMail(
                $actor->email,
                new SprfActorConfirmation(
                    type: 'sent_back',
                    referenceNo: $project->sprf_no,
                    data: ['receiverName' => $receiver?->name ?? '—', 'message' => $message],
                    projectLink: $projectUrl,
                )
            );
        }

        // Template 7 — PM (informational, same "returned" type)
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new SprfPmNotification(
                    type: 'sent_back_inform',
                    referenceNo: $project->sprf_no,
                    data: [
                        'actorName'    => $actor?->name ?? '—',
                        'receiverName' => $receiver?->name ?? '—',
                    ],
                    projectLink: $projectUrl,
                )
            );
        }
    }

    // -------------------------------------------------------------------------
    // Mail dispatch wrapper — mail failures never break the workflow
    // -------------------------------------------------------------------------

    private function dispatchMail(string $to, \Illuminate\Mail\Mailable $mailable): void
    {
        try {
            Mail::to($to)->send($mailable);
        } catch (\Throwable $e) {
            Log::error('[SPRF Mail] Failed to send ' . get_class($mailable), [
                'to'      => $to,
                'message' => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Route builder
    // -------------------------------------------------------------------------

    private function buildProjectUrl(string $table, int $id): string
    {
        try {
            return match ($table) {
                'current' => route('sprf.current.show', $id),
                'archive' => route('sprf.archive.show', $id),
                'entry'   => route('sprf.entry.projects.show', $id),
                default   => url('/'),
            };
        } catch (\Throwable) {
            return url('/');
        }
    }

    // -------------------------------------------------------------------------
    // User loader
    // -------------------------------------------------------------------------

    public function userById(?int $userId): ?User
    {
        return $userId ? User::find($userId) : null;
    }

    /**
     * Batched version of userById — fetches all given ids in a single query
     * instead of one query per id. Falsy ids (0/null) are dropped before the
     * query, matching userById's "no id → no lookup" behavior. Returns a
     * Collection keyed by id; ->get($id) on a missing/falsy id yields null,
     * same as userById would.
     */
    private function usersByIds(array $ids): Collection
    {
        $ids = array_values(array_unique(array_filter($ids)));

        if (empty($ids)) return collect();

        return User::query()->whereIn('id', $ids)->get()->keyBy('id');
    }

    // -------------------------------------------------------------------------
    // Existing helpers (unchanged)
    // -------------------------------------------------------------------------

    public function appendMessage(SprfCurrentProject $project, string $message, int $userId, int $level): void
    {
        $user = \App\Models\User::find($userId);

        $newEntry = [
            'id'         => (string) Str::ulid(),
            'body'       => trim($message),
            'created_at' => now()->toIso8601String(),
            'author'     => [
                'id'   => $userId,
                'name' => $user?->name ?? 'Unknown',
                'role' => $user?->role,
            ],
        ];

        if (in_array($level, [3, 4, 5])) {
            $comments   = is_array($project->comments) ? $project->comments : [];
            $comments[] = $newEntry;
            $project->comments = $this->sortTimelineEntries($comments);
        } else {
            $notes   = is_array($project->notes) ? $project->notes : [];
            $notes[] = $newEntry;
            $project->notes = $this->sortTimelineEntries($notes);
        }

        $project->save();
    }

    private function revertToEntryProject(SprfCurrentProject $project, array $overrides = []): SprfEntryProject
    {
        $entryData = $project->toArray();

        unset($entryData['id']);
        unset($entryData['current_approver_user_id']);

        $entryData['status']        = 'returned';
        $entryData['current_level'] = 1;
        $entryData['submitted_at']  = null;

        $entryData['dce_acted_at']           = null;
        $entryData['esd_acted_at']           = null;
        $entryData['vp_ccto_acted_at']       = null;
        $entryData['president_ceo_acted_at'] = null;

        $entryData = array_merge($entryData, $overrides);

        $entryProject = SprfEntryProject::create($entryData);

        foreach ($project->items as $currentItem) {
            $itemData = $currentItem->toArray();
            unset($itemData['id'], $itemData['project_id']);

            $entryItem = $entryProject->items()->create($itemData);

            foreach ($currentItem->subitems as $subitem) {
                $subData = $subitem->toArray();
                unset($subData['id'], $subData['item_id']);
                $entryItem->subitems()->create($subData);
            }
        }

        foreach ($project->fees as $fee) {
            $feeData = $fee->toArray();
            unset($feeData['id'], $feeData['project_id']);
            $entryProject->fees()->create($feeData);
        }

        $project->items()->delete();
        $project->fees()->delete();
        $project->forceDelete();

        return $entryProject;
    }

    private function archiveFromCurrent(SprfCurrentProject $project, array $overrides): SprfArchiveProject
    {
        $data = $project->toArray();
        unset($data['id']);
        unset($data['current_approver_user_id']);

        $data = array_merge($data, $overrides);

        $archiveProject = SprfArchiveProject::create($data);

        foreach ($project->items as $currentItem) {
            $itemData = $currentItem->toArray();
            unset($itemData['id'], $itemData['project_id']);

            $archiveItem = $archiveProject->items()->create($itemData);

            foreach ($currentItem->subitems as $subitem) {
                $subData = $subitem->toArray();
                unset($subData['id'], $subData['item_id']);
                $archiveItem->subitems()->create($subData);
            }
        }

        foreach ($project->fees as $fee) {
            $feeData = $fee->toArray();
            unset($feeData['id'], $feeData['project_id']);
            $archiveProject->fees()->create($feeData);
        }

        $project->items()->delete();
        $project->fees()->delete();
        $project->forceDelete();

        return $archiveProject;
    }

    private function sortTimelineEntries(?array $entries): array
    {
        $rows = is_array($entries) ? $entries : [];
        usort($rows, fn ($a, $b) => (strtotime($b['created_at'] ?? '') ?: 0) <=> (strtotime($a['created_at'] ?? '') ?: 0));
        return array_values($rows);
    }

    public function timestampColumnForLevel(int $level): ?string
    {
        return match ($level) {
            2 => 'dce_acted_at',
            3 => 'esd_acted_at',
            4 => 'vp_ccto_acted_at',
            5 => 'president_ceo_acted_at',
            default => null,
        };
    }

    public function getQueueLabelForLevel(int $level): string
    {
        return match ($level) {
            2 => 'For DCE Review',
            3 => 'For ESD Director Review',
            4 => 'For VP CCTO Review',
            5 => 'For President/CEO Review',
            default => 'Under Review',
        };
    }

    private function getTerminalLevel(SprfCurrentProject $project): int
    {
        if ($project->requires_president_ceo) return 5;
        if ($project->requires_vp_ccto)       return 4;
        return 3;
    }

    private function approverUserIdForLevel(SprfCurrentProject $project, int $level): ?int
    {
        $id = match ($level) {
            2 => $project->director_customer_engagement_user_id,
            3 => $project->esd_director_user_id,
            4 => $project->vp_ccto_user_id,
            5 => $project->president_ceo_user_id,
            default => null,
        };

        return $id ? (int) $id : null;
    }

    private function collectAutoAdvanceLevels(SprfCurrentProject $project, int $actingUserId, int $fromLevel): array
    {
        $terminalLevel = $this->getTerminalLevel($project);
        $levels        = [];

        for ($level = $fromLevel; $level <= $terminalLevel; $level++) {
            if ($this->approverUserIdForLevel($project, $level) === $actingUserId) {
                $levels[] = $level;
            } else {
                break;
            }
        }

        return $levels;
    }

    private function findFirstConsecutiveLevelForApprover(SprfCurrentProject $project, int $toLevel): int
    {
        $approverId = $this->approverUserIdForLevel($project, $toLevel);
        if (!$approverId) return $toLevel;

        $firstLevel = $toLevel;
        for ($level = $toLevel - 1; $level >= 2; $level--) {
            if ($this->approverUserIdForLevel($project, $level) === $approverId) {
                $firstLevel = $level;
            } else {
                break;
            }
        }

        return $firstLevel;
    }

    // -------------------------------------------------------------------------
    // Workflow – Effective final-approver check (for UI button state)
    // -------------------------------------------------------------------------

    /**
     * True when clicking "advance" for this user will actually resolve the
     * project (archive-as-approved) rather than move it to a genuinely new
     * approver. This happens when the acting user is also the approver for
     * one or more consecutive levels ahead, up to and including the terminal
     * level (e.g. same person is both ESD Director and VP/CCTO). Mirrors the
     * consecutive-run logic in handleAdvance() so "Approve" vs "Submit to
     * Next Level" always matches what will actually happen.
     */
    public function willResolveOnAdvance(SprfCurrentProject $project, int $actingUserId): bool
    {
        $terminalLevel = $this->getTerminalLevel($project);
        $autoLevels    = $this->collectAutoAdvanceLevels($project, $actingUserId, (int) $project->current_level);
        $lastLevel     = end($autoLevels);

        return $lastLevel !== false && $lastLevel >= $terminalLevel;
    }
}