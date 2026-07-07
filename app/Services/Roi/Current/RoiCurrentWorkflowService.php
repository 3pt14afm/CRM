<?php

namespace App\Services\Roi\Current;

use App\Mail\Roi\RoiActionConfirmedMail;
use App\Mail\Roi\RoiAdvancedMail;
use App\Mail\Roi\RoiPipelineReturnNoticeMail;
use App\Mail\Roi\RoiRejectedMail;
use App\Mail\Roi\RoiReturnedToApproverMail;
use App\Mail\Roi\RoiReturnedToPreparerMail;
use App\Mail\Roi\RoiSubmittedMail;
use App\Mail\Roi\RoiNewAssignmentMail;
use App\Mail\Roi\RoiWithdrawCancelApproverMail;
use App\Mail\Roi\RoiWithdrawCancelPreparerMail;
use App\Models\RoiArchiveProject;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryFee;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryProject;
use App\Models\User;
use App\Services\RoiActivityLogger;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class RoiCurrentWorkflowService
{
    private const LEVEL_TO_LABEL = [
        1 => 'Prepared By',
        2 => 'Reviewed By',
        3 => 'Checked By',
        4 => 'Endorsed By',
        5 => 'Confirmed By',
        6 => 'Approved By',
    ];

    public function handleSendBack(RoiCurrentProject $project, User $user, array $validatedData): string
    {
        $fromLevel = (int) $project->current_level;
        $workflow = $this->getRoiWorkflow($project);
        $oldValues = [
            'status'               => $project->status,
            'current_level'        => $fromLevel,
            'note_or_comment_type' => $validatedData['type'],
            'note_or_comment_body' => trim($validatedData['body']),
        ];

        $this->appendSendBackEntry($project, $user, $validatedData['type'], $validatedData['body']);
        $toLevel    = $fromLevel - 1;
        $backStatus = $this->getBackStatusLabel($toLevel);

        // Resolve the effective first level for the receiver (consecutive approver block)
        $firstLevel = ($toLevel >= 2) ? $this->findFirstConsecutiveLevelForApprover($project, $toLevel) : $toLevel;

        // Revert to entry if:
        // 1. Natural send-back from level 2 → level 1, OR
        // 2. The receiver at firstLevel is also the preparer
        $receiverIsAlsoPreparer = $firstLevel >= 2 && $this->approverForLevel($project, $firstLevel) === (int) $project->user_id;

        if ($toLevel === 1 || $receiverIsAlsoPreparer) {
            $project->save();
            $project->refresh()->load(['items', 'fees', 'user']);

            $projectData = $project->toArray();
            $this->cleanArrayKeys($projectData);

            $entryProject = RoiEntryProject::create(array_merge($projectData, [
                'status'       => 'returned',
                'last_saved_at' => now(),
            ]));

            foreach ($project->items as $item) {
                $itemData = $item->toArray();
                unset($itemData['id'], $itemData['roi_current_project_id']);
                $itemData['roi_entry_project_id'] = $entryProject->id;
                RoiEntryItem::create($itemData);
            }

            foreach ($project->fees as $fee) {
                $feeData = $fee->toArray();
                unset($feeData['id'], $feeData['roi_current_project_id']);
                $feeData['roi_entry_project_id'] = $entryProject->id;
                RoiEntryFee::create($feeData);
            }

            $this->logActivity('send_back', 'Sent back ROI #' . $project->reference . ' to Draft (Preparer)', $entryProject, $oldValues, [
                'status'           => 'returned',
                'current_level'    => 1,
                'entry_project_id' => $entryProject->id,
            ], $workflow);

            $project->items()->delete();
            $project->fees()->delete();
            $project->delete();

            // Template 3 — returned all the way to the preparer
            $this->notifyReturnedToPreparer($project, $user, $entryProject->id, $validatedData['body']);

            return 'entry_list';
        }

        // If the receiving approver owns consecutive levels, revert to their FIRST level and clear ALL their timestamps
        $firstLevel = $this->findFirstConsecutiveLevelForApprover($project, $toLevel);

        $updates = [
            'status'            => 'Sent Back',
            'status_reason'     => null,
            'status_updated_at' => now(),
            'status_updated_by' => $user->id,
            'last_saved_at'     => now(),
            'current_level'     => $firstLevel,
        ];

        for ($level = $firstLevel; $level <= $toLevel; $level++) {
            $col = $this->approvalTimestampColumnForLevel($level);
            if ($col) {
                $updates[$col] = null;
            }
        }

        $project->update($updates);

        $this->logActivity('send_back', 'Sent back ROI #' . $project->reference . ' to ' . $backStatus, $project, $oldValues, [
            'status'             => $project->status,
            'current_level'      => $project->current_level,
            'status_updated_by'  => $project->status_updated_by,
            'status_updated_at'  => $project->status_updated_at,
        ], $workflow);

        // Template 4 (preparer) + Template 6 (receiving approver) + Template 5 (actor)
        $this->notifyPipelineSendBack($project, $user, $fromLevel, $firstLevel, $validatedData['body']);

        return 'current_list';
    }

    public function handleAdvance(RoiCurrentProject $project, User $user): string
    {
        $fromLevel = (int) $project->current_level;
        $workflow  = $this->getRoiWorkflow($project);
        $oldValues = ['current_level' => $fromLevel, 'status' => $project->status];

        // Collect all consecutive levels this user controls starting from fromLevel
        $autoLevels = $this->collectAutoAdvanceLevels($project, $user->id, $fromLevel);
        $lastLevel  = end($autoLevels);

        // If the user's consecutive run reaches the final level, delegate to handleApprove.
        // Only stamp intermediate levels here (< 6); handleApprove owns approved_at.
        if ($lastLevel >= 6) {
            $intermediateUpdates = [
                'status_updated_at' => now(),
                'status_updated_by' => $user->id,
                'last_saved_at'     => now(),
            ];

            foreach ($autoLevels as $l) {
                if ($l < 6) {
                    $col = $this->approvalTimestampColumnForLevel($l);
                    if ($col) {
                        $intermediateUpdates[$col] = now();
                    }
                }
            }

            $project->update($intermediateUpdates);
            $this->handleApprove($project->fresh(), $user);

            return 'approved';
        }

        // Normal / multi-level advance (user does NOT reach the final level)
        $toLevel    = $lastLevel + 1;
        $nextStatus = $this->getQueueLabelForLevel($toLevel);

        $updates = [
            'current_level'     => $toLevel,
            'status'            => $nextStatus,
            'status_reason'     => null,
            'status_updated_at' => now(),
            'status_updated_by' => $user->id,
            'last_saved_at'     => now(),
        ];

        foreach ($autoLevels as $l) {
            $col = $this->approvalTimestampColumnForLevel($l);
            if ($col) {
                $updates[$col] = now();
            }
        }

        $project->update($updates);

        $newValues = [
            'current_level'      => $project->current_level,
            'status'             => $project->status,
            'status_updated_by'  => $project->status_updated_by,
            'status_updated_at'  => $project->status_updated_at,
        ];

        foreach ($autoLevels as $l) {
            $col = $this->approvalTimestampColumnForLevel($l);
            if ($col) {
                $newValues[$col] = $project->{$col};
            }
        }

        $levelNote = count($autoLevels) > 1
            ? ' (auto-advanced ' . count($autoLevels) . ' levels: ' . implode('→', $autoLevels) . ')'
            : '';

        $this->logActivity(
            'advance',
            'Advanced ROI #' . $project->reference . ' to ' . $nextStatus . $levelNote,
            $project, $oldValues, $newValues, $workflow
        );

        // Template 2 (preparer) + Template 5 (actor)
        $this->notifyAdvanced($project, $user, $fromLevel, $toLevel);

        return $nextStatus;
    }

    public function handleAutoAdvanceOnSubmit(RoiCurrentProject $project): void
    {
        $preparerId = (int) $project->user_id;

        // If preparer isn't also the level 2 approver, nothing to do
        if ($this->approverForLevel($project, 2) !== $preparerId) return;

        $autoLevels = $this->collectAutoAdvanceLevels($project, $preparerId, 2);

        if (empty($autoLevels)) return;

        $lastLevel = end($autoLevels);

        // If their run reaches the final level, stamp intermediates then approve
        if ($lastLevel >= 6) {
            $updates = ['current_level' => 6];
            foreach ($autoLevels as $l) {
                if ($l < 6) {
                    $col = $this->approvalTimestampColumnForLevel($l);
                    if ($col) $updates[$col] = now();
                }
            }
            $project->update($updates);

            $actor = User::find($preparerId);
            if ($actor) $this->handleApprove($project->fresh(), $actor);
            return;
        }

        $updates = [
            'current_level' => $lastLevel + 1,
            'status'        => $this->getQueueLabelForLevel($lastLevel + 1),
        ];

        foreach ($autoLevels as $l) {
            $col = $this->approvalTimestampColumnForLevel($l);
            if ($col) $updates[$col] = now();
        }

        $project->update($updates);
    }

    public function handleReject(RoiCurrentProject $current, User $actor): void
    {
        $actorLevel = (int) $current->current_level;
        $reference = $current->reference;
        $preparer = $this->emailUserById((int) $current->user_id);

        $oldValues = ['status' => $current->status, 'current_level' => $current->current_level];
        $workflow = $this->getRoiWorkflow($current);

        $archived = $this->archiveFromCurrent($current, [
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejected_by' => $actor->id,
            'rejected_by_level' => $actorLevel,
            'approved_at' => null,
        ]);

        $this->logActivity('reject', 'Rejected ROI #' . $reference, $archived, $oldValues, [
            'status' => 'rejected',
            'archive_project_id' => $archived->id,
            'rejected_by' => $actor->id,
            'rejected_by_level' => $actorLevel,
            'rejected_at' => $archived->rejected_at,
        ], $workflow);

        // Template 9 (preparer) + Template 5 (actor)
        $this->notifyRejected($archived, $actor, $actorLevel, $preparer);
    }

    public function handleApprove(RoiCurrentProject $current, User $actor): void
    {
        $reference = $current->reference;
        $preparer = $this->emailUserById((int) $current->user_id);

        $oldValues = ['status' => $current->status, 'current_level' => $current->current_level];
        $workflow = $this->getRoiWorkflow($current);

        $archived = $this->archiveFromCurrent($current, [
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $actor->id,
            'rejected_at' => null,
            'rejected_by' => null,
            'rejected_by_level' => null,
        ]);

        $this->logActivity('approve', 'Approved ROI #' . $reference, $archived, $oldValues, [
            'status' => 'approved',
            'archive_project_id' => $archived->id,
            'approved_by' => $actor->id,
            'approved_at' => $archived->approved_at,
        ], $workflow);

        // Template 2 (preparer, "Approved") + Template 5 (actor)
        $this->notifyApproved($archived, $actor, $preparer);
    }

    // -------------------------------------------------------------------------
    // Public helper called from RoiEntryProjectController::submit
    // Sends Template 1 — Initial Submission Confirmation to the preparer
    // -------------------------------------------------------------------------

    public function notifySubmit(RoiCurrentProject $project): void
    {
        $preparer = $this->emailUserById((int) $project->user_id);
        if (!$preparer || !$preparer->email) return;

        $reviewer = $this->emailUserById((int) ($project->reviewed_by ?? 0));

        // 1. Notify Preparer (Initial Confirmation)
        $this->dispatchMail(
            $preparer->email,
            new RoiSubmittedMail(
                preparerName: $preparer->name,
                reference:    $project->reference,
                reviewerName: $reviewer?->name ?? '—',
                projectUrl:   $this->buildProjectUrl('current', $project->id),
            )
        );

        // 2. Notify Level 2 Reviewer (New Assignment)
        if ($reviewer && $reviewer->email) {
            $this->dispatchMail(
                $reviewer->email,
                new RoiNewAssignmentMail(
                    project:        $project,
                    nextActorName:  $reviewer->name,
                    actorName:      $preparer->name,
                    requiredAction: 'Review',
                    projectUrl:     $this->buildProjectUrl('current', $project->id)
                )
            );
        }
    }

    // -------------------------------------------------------------------------
    // Private notification helpers
    // -------------------------------------------------------------------------

    /**
     * Fires on a normal advance (not approve).
     * Template 2 → preparer
     * Template 5 → actor
     */
    private function notifyAdvanced(RoiCurrentProject $project, User $actor, int $fromLevel, int $toLevel): void
    {
        $preparer  = $this->emailUserById((int) $project->user_id);
        $nextUser  = $this->emailUserById((int) ($project->{$this->approverColumnForLevel($toLevel)} ?? 0));
        $projectUrl = $this->buildProjectUrl('current', $project->id);

        $actionTaken = $this->levelActionPastTense($fromLevel);
        $nextStatus  = $project->status;
        $nextName    = $nextUser?->name ?? '—';

        // Template 2 — preparer
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new RoiAdvancedMail(
                    preparerName:  $preparer->name,
                    reference:     $project->reference,
                    actionTaken:   $actionTaken,
                    actorName:     $actor->name,
                    nextStatus:    $nextStatus,
                    nextActorName: $nextName,
                    projectUrl:    $projectUrl,
                )
            );
        }

        // Template 5 — actor
        if ($actor->email) {
            $this->dispatchMail(
                $actor->email,
                new RoiActionConfirmedMail(
                    approverName: $actor->name,
                    reference:    $project->reference,
                    actionTaken:  $actionTaken,
                    newStatus:    $nextStatus,
                    routedTo:     $nextName,
                    projectUrl:   $projectUrl,
                )
            );
        }

        // Notification to Next Approver (New Assignment)
        if ($nextUser && $nextUser->email) {
            $this->dispatchMail(
                $nextUser->email,
                new RoiNewAssignmentMail(
                    project:        $project,
                    nextActorName:  $nextUser->name,
                    actorName:      $actor->name,
                    requiredAction: $this->actionSubject($toLevel),
                    projectUrl:     $projectUrl
                )
            );
        }
    }

    /**
     * Fires when a send-back returns the project all the way to the preparer's entry queue.
     * Template 3 → preparer
     * Template 5 → actor (send-back actor)
     *
     * NOTE: At this point the current project is already deleted; $project still holds
     * the in-memory data. $entryProjectId is the newly created entry project's id.
     */
    private function notifyReturnedToPreparer(RoiCurrentProject $project, User $actor, int $entryProjectId, string $comment): void
    {
        $preparer   = $this->emailUserById((int) $project->user_id);
        $entryUrl   = $this->buildProjectUrl('entry', $entryProjectId);
        $currentUrl = $this->buildProjectUrl('current', $project->id);

        // Template 3 — preparer
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new RoiReturnedToPreparerMail(
                    preparerName: $preparer->name,
                    reference:    $project->reference,
                    reviewerName: $actor->name,
                    comment:      $comment,
                    projectUrl:   $entryUrl,
                )
            );
        }

        // Template 5 — actor
        if ($actor->email) {
            $this->dispatchMail(
                $actor->email,
                new RoiActionConfirmedMail(
                    approverName: $actor->name,
                    reference:    $project->reference,
                    actionTaken:  'Returned',
                    newStatus:    'Returned for Revision',
                    routedTo:     $preparer?->name ?? '—',
                    projectUrl:   $currentUrl,
                )
            );
        }
    }

    /**
     * Fires when a send-back keeps the project inside the Current pipeline (fromLevel ≥ 3).
     * Template 4 → preparer (informational)
     * Template 6 → receiving approver
     * Template 5 → actor (send-back actor)
     *
     * @param int $toLevel  The effective first level the project lands on (after consecutive-level resolution)
     */
    private function notifyPipelineSendBack(RoiCurrentProject $project, User $actor, int $fromLevel, int $toLevel, string $comment): void
    {
        $preparer    = $this->emailUserById((int) $project->user_id);
        $receiverCol = $this->approverColumnForLevel($toLevel);
        $receiver    = $receiverCol ? $this->emailUserById((int) ($project->{$receiverCol} ?? 0)) : null;
        $projectUrl  = $this->buildProjectUrl('current', $project->id);
        $currentStatus = $this->getBackStatusLabel($toLevel);

        // Template 4 — preparer
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new RoiPipelineReturnNoticeMail(
                    preparerName:    $preparer->name,
                    reference:       $project->reference,
                    higherActorName: $actor->name,
                    lowerActorName:  $receiver?->name ?? '—',
                    currentStatus:   $currentStatus,
                    comment:         $comment,
                    projectUrl:      $projectUrl,
                )
            );
        }

        // Template 6 — receiving approver
        if ($receiver?->email) {
            $this->dispatchMail(
                $receiver->email,
                new RoiReturnedToApproverMail(
                    approverName:    $receiver->name,
                    reference:       $project->reference,
                    pendingAction:   $this->levelPendingActionLabel($toLevel),
                    pending2Action:   $this->levelPendingAction2Label($toLevel),
                    higherActorName: $actor->name,
                    comment:         $comment,
                    projectUrl:      $projectUrl,
                )
            );
        }

        // Template 5 — actor
        if ($actor->email) {
            $this->dispatchMail(
                $actor->email,
                new RoiActionConfirmedMail(
                    approverName: $actor->name,
                    reference:    $project->reference,
                    actionTaken:  'Sent Back',
                    newStatus:    $currentStatus,
                    routedTo:     $receiver?->name ?? '—',
                    projectUrl:   $projectUrl,
                )
            );
        }
    }

    /**
     * Fires when any approver rejects the project.
     * Template 9 → preparer
     * Template 5 → actor (rejection actor)
     */
    private function notifyRejected(RoiArchiveProject $archived, User $actor, int $actorLevel, ?User $preparer): void
    {
        $archiveUrl = $this->buildProjectUrl('archive', $archived->id);

        // Template 9 — preparer
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new RoiRejectedMail(
                    preparerName:     $preparer->name,
                    reference:        $archived->reference,
                    actorName:        $actor->name,
                    stageOfRejection: $this->actionSubject($actorLevel),
                    projectUrl:       $archiveUrl,
                )
            );
        }

        // Template 5 — actor
        if ($actor->email) {
            $this->dispatchMail(
                $actor->email,
                new RoiActionConfirmedMail(
                    approverName: $actor->name,
                    reference:    $archived->reference,
                    actionTaken:  'Rejected',
                    newStatus:    'Rejected',
                    routedTo:     'System Archive',
                    projectUrl:   $archiveUrl,
                )
            );
        }
    }

    /**
     * Fires when the project is fully approved (Level 6).
     * Template 2 → preparer (with "Approved" as next status)
     * Template 5 → actor
     */
    private function notifyApproved(RoiArchiveProject $archived, User $actor, ?User $preparer): void
    {
        $archiveUrl = $this->buildProjectUrl('archive', $archived->id);

        // Template 2 — preparer
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new RoiAdvancedMail(
                    preparerName:  $preparer->name,
                    reference:     $archived->reference,
                    actionTaken:   'Approved',
                    actorName:     $actor->name,
                    nextStatus:    'Approved',
                    nextActorName: 'N/A',
                    projectUrl:    $archiveUrl,
                )
            );
        }

        // Template 5 — actor
        if ($actor->email) {
            $this->dispatchMail(
                $actor->email,
                new RoiActionConfirmedMail(
                    approverName: $actor->name,
                    reference:    $archived->reference,
                    actionTaken:  'Approved',
                    newStatus:    'Approved',
                    routedTo:     'System Archive',
                    projectUrl:   $archiveUrl,
                )
            );
        }
    }

    /**
     * Fires when the preparer withdraws or cancels a project.
     * Template 7 → preparer (action confirmed)
     * Template 8 → interrupted approver (courtesy notice), skipped if they're the same person
     *
     * @param string $actionType  "Withdrawn" | "Cancelled"
     * @param string $projectUrl  Entry URL for withdraw; archive URL for cancel
     */
    private function notifyWithdrawOrCancel(
        User    $actor,
        string  $reference,
        string  $actionType,
        ?User   $preparer,
        ?User   $holder,
        string  $projectUrl,
    ): void {
        // Template 7 — preparer
        if ($preparer?->email) {
            $this->dispatchMail(
                $preparer->email,
                new RoiWithdrawCancelPreparerMail(
                    preparerName: $preparer->name,
                    reference:    $reference,
                    actionType:   $actionType,
                    projectUrl:   $projectUrl,
                )
            );
        }

        // Template 8 — interrupted approver (skip if they're the same person as the actor)
        if ($holder && $holder->email && $holder->id !== $actor->id) {
            $this->dispatchMail(
                $holder->email,
                new RoiWithdrawCancelApproverMail(
                    approverName: $holder->name,
                    reference:    $reference,
                    actionType:   $actionType,
                )
            );
        }
    }

    // -------------------------------------------------------------------------
    // Mail dispatch wrapper — catches exceptions so workflow never breaks on mail failure
    // -------------------------------------------------------------------------

    private function dispatchMail(string $to, \Illuminate\Mail\Mailable $mailable): void
    {
        try {
            Mail::to($to)->send($mailable);
        } catch (\Throwable $e) {
            Log::error('[ROI Mail] Failed to send ' . get_class($mailable), [
                'to'      => $to,
                'message' => $e->getMessage(),
            ]);
            report($e);
        }
    }

    // -------------------------------------------------------------------------
    // Label helpers
    // -------------------------------------------------------------------------

    /** ACTIONTAKEN "Reviewed", "Checked", "Endorsed", "Confirmed", "Approved" */
    private function levelActionPastTense(int $level): string
    {
        return match ($level) {
            2 => 'Reviewed',
            3 => 'Checked',
            4 => 'Endorsed',
            5 => 'Confirmed',
            6 => 'Approved',
            default => 'Processed',
        };
    }

    /** PENDING ACTION "Review", "Check", "Endorsement", "Confirmation" — used in Template 6 */
    private function levelPendingActionLabel(int $level): string
    {
        return match ($level) {
            2 => 'Review',
            3 => 'Check',
            4 => 'Endorse',
            5 => 'Confirm',
            default => 'Review',
        };
    }

    private function levelPendingAction2Label(int $level): string
    {
        return match ($level) {
            2 => 'Review',
            3 => 'Checking',
            4 => 'Endorsement',
            5 => 'Confirmation',
            default => 'Review',
        };
    }

    /** REJECTTION STAGE and REQUIRED ACTION — used in Template 9 */
    private function actionSubject(int $level): string
    {
        return match ($level) {
            2 => 'Review',
            3 => 'Checking',
            4 => 'Endorsement',
            5 => 'Confirmation',
            6 => 'Approval',
            default => 'Review',
        };
    }

    /** Returns the column name for a given approver level */
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

    /**
     * Builds a project URL based on which table it currently lives in.
     * Verify these route names against your web.php.
     */
    private function buildProjectUrl(string $table, int $id): string
    {
        try {
            return match ($table) {
                'current' => route('roi.current.show', $id),
                'archive' => route('roi.archive.show', $id),
                'entry'   => route('roi.entry.projects.show', $id),
                default   => url('/'),
            };
        } catch (\Throwable) {
            // Fallback if route name doesn't exist yet
            return url('/');
        }
    }

    // -------------------------------------------------------------------------
    // All existing methods below — unchanged
    // -------------------------------------------------------------------------

    private function getBackStatusLabel(int $toLevel): string
    {
        return match ($toLevel) {
            1 => 'Draft (Preparer)', 2 => 'For Review', 3 => 'For Checking',
            4 => 'For Endorsement', 5 => 'For Confirmation', default => 'Unknown',
        };
    }

    private function approvalTimestampColumnForLevel(int $level): ?string
    {
        return match ($level) {
            2 => 'reviewed_at', 3 => 'checked_at', 4 => 'endorsed_at', 5 => 'confirmed_at', 6 => 'approved_at', default => null,
        };
    }

    public function getRoiWorkflow(RoiCurrentProject $project): array
    {
        return [
            'preparer_id'  => $project->user_id,
            'reviewer_id'  => $project->reviewed_by,
            'checker_id'   => $project->checked_by,
            'endorser_id'  => $project->endorsed_by,
            'confirmer_id' => $project->confirmed_by,
            'approver_id'  => $project->approved_by,
        ];
    }

    private function approverForLevel(RoiCurrentProject $project, int $level): ?int
    {
        $id = match ($level) {
            2 => $project->reviewed_by,
            3 => $project->checked_by,
            4 => $project->endorsed_by,
            5 => $project->confirmed_by,
            6 => $project->approved_by,
            default => null,
        };

        return $id ? (int) $id : null;
    }

    private function collectAutoAdvanceLevels(RoiCurrentProject $project, int $userId, int $fromLevel): array
    {
        $levels = [];
        for ($level = $fromLevel; $level <= 6; $level++) {
            if ($this->approverForLevel($project, $level) === $userId) {
                $levels[] = $level;
            } else {
                break;
            }
        }
        return $levels;
    }

    private function findFirstConsecutiveLevelForApprover(RoiCurrentProject $project, int $toLevel): int
    {
        $approverId = $this->approverForLevel($project, $toLevel);
        if (!$approverId) return $toLevel;

        $firstLevel = $toLevel;
        for ($level = $toLevel - 1; $level >= 2; $level--) {
            if ($this->approverForLevel($project, $level) === $approverId) {
                $firstLevel = $level;
            } else {
                break;
            }
        }

        return $firstLevel;
    }

    public function emailUserById(?int $userId): ?User
    {
        return $userId ? User::query()->find($userId) : null;
    }

    private function appendSendBackEntry(RoiCurrentProject $project, User $user, string $type, string $body): void
    {
        $entry = [
            'id' => (string) Str::ulid(), 'body' => trim($body), 'created_at' => now()->toISOString(),
            'author' => ['id' => $user->id, 'name' => $user->name, 'role' => $user->role],
        ];

        if ($type === 'note') {
            $notes = is_array($project->notes) ? $project->notes : [];
            $notes[] = $entry;
            $project->notes = $this->sortTimelineEntries($notes);
        } else {
            $comments = is_array($project->comments) ? $project->comments : [];
            $comments[] = $entry;
            $project->comments = $this->sortTimelineEntries($comments);
        }
    }

    private function archiveFromCurrent(RoiCurrentProject $current, array $archiveOverrides): RoiArchiveProject
        {
            $base = $current->only([
                'user_id', 'location_id', 'project_uid', 'reference', 'version', 'last_saved_at', 'status', 'submitted_at',
                'reviewed_by', 'reviewed_at', 'checked_by', 'checked_at', 'endorsed_by', 'endorsed_at',
                'confirmed_by', 'confirmed_at', 'approved_by','approved_at', 'entry_remarks', 'entry_remarks_attachments',
                'company_name', 'company_sap_code', 'type', 'contract_years', 'contract_type', 'purpose', 'bundled_std_ink',
                'annual_interest', 'percent_margin', 'mono_yield_monthly', 'mono_yield_annual', 'color_yield_monthly',
                'color_yield_annual', 'mc_unit_cost', 'mc_qty', 'mc_total_cost', 'mc_yields', 'mc_cost_cpp',
                'mc_selling_price', 'mc_total_sell', 'mc_sell_cpp', 'mc_total_bundled_price', 'fees_total',
                'grand_total_cost', 'grand_total_revenue', 'grand_roi', 'grand_roi_percentage', 'yearly_breakdown', 
                'notes', 'comments', 'cancelled_at', // <-- ADDED THIS FIELD
            ]);

            $archived = RoiArchiveProject::create(array_merge($base, $archiveOverrides));
            $current->loadMissing(['items', 'fees']);

            if ($current->items) {
                foreach ($current->items as $item) {
                    $itemData = $item->toArray();
                    unset($itemData['id'], $itemData['roi_current_project_id'], $itemData['created_at'], $itemData['updated_at']);
                    $archived->items()->create($itemData);
                }
            }

            if ($current->fees) {
                foreach ($current->fees as $fee) {
                    $feeData = $fee->toArray();
                    unset($feeData['id'], $feeData['roi_current_project_id'], $feeData['created_at'], $feeData['updated_at']);
                    $archived->fees()->create($feeData);
                }
            }

            $current->delete();
            return $archived;
        }

    public function handleCancel(RoiCurrentProject $current, User $actor): void
    {
        $reference    = $current->reference;
        $preparer     = $this->emailUserById((int) $current->user_id);
        $oldValues    = ['status' => $current->status, 'current_level' => $current->current_level];
        $workflow     = $this->getRoiWorkflow($current);

        // Capture the currently-active holder BEFORE archiveFromCurrent wipes/deletes $current
        $holderLevel = (int) $current->current_level;
        $holderCol   = $this->approverColumnForLevel($holderLevel);
        $holder      = $holderCol ? $this->emailUserById((int) ($current->{$holderCol} ?? 0)) : null;

        $archived = $this->archiveFromCurrent($current, [
            'status'            => 'cancelled',
            'cancelled_at'      => now(),
            'rejected_at'       => null,
            'rejected_by'       => null,
            'rejected_by_level' => null,
        ]);

        $this->logActivity('cancel', 'Cancelled ROI #' . $reference, $archived, $oldValues, [
            'status'             => 'cancelled',
            'archive_project_id' => $archived->id,
            'cancelled_by'       => $actor->id,
        ], $workflow);

        // Template 7 (preparer) + Template 8 (interrupted approver)
        $this->notifyWithdrawOrCancel(
            actor:      $actor,
            reference:  $reference,
            actionType: 'Cancelled',
            preparer:   $preparer,
            holder:     $holder,
            projectUrl: $this->buildProjectUrl('archive', $archived->id),
        );
    }

    public function handleWithdraw(RoiCurrentProject $current, User $actor): void
    {
        $reference = $current->reference;
        $oldValues = ['status' => $current->status, 'current_level' => $current->current_level];
        $workflow  = $this->getRoiWorkflow($current);

        // Capture the currently-active holder BEFORE $current is deleted
        $holderLevel = (int) $current->current_level;
        $holderCol   = $this->approverColumnForLevel($holderLevel);
        $holder      = $holderCol ? $this->emailUserById((int) ($current->{$holderCol} ?? 0)) : null;

        $current->save();
        $current->refresh()->load(['items', 'fees', 'user']);

        $projectData = $current->toArray();
        $this->cleanArrayKeys($projectData);

        $entryProject = RoiEntryProject::create(array_merge($projectData, [
            'status'        => 'withdrawn',
            'last_saved_at' => now(),
        ]));

        foreach ($current->items as $item) {
            $itemData = $item->toArray();
            unset($itemData['id'], $itemData['roi_current_project_id']);
            $itemData['roi_entry_project_id'] = $entryProject->id;
            RoiEntryItem::create($itemData);
        }

        foreach ($current->fees as $fee) {
            $feeData = $fee->toArray();
            unset($feeData['id'], $feeData['roi_current_project_id']);
            $feeData['roi_entry_project_id'] = $entryProject->id;
            RoiEntryFee::create($feeData);
        }

        $this->logActivity('withdraw', 'Withdrew ROI #' . $reference, $entryProject, $oldValues, [
            'status'           => 'withdrawn',
            'current_level'    => 1,
            'entry_project_id' => $entryProject->id,
            'withdrawn_by'     => $actor->id,
        ], $workflow);

        $current->items()->delete();
        $current->fees()->delete();
        $current->delete();

        // Template 7 (preparer/actor) + Template 8 (interrupted approver)
        $this->notifyWithdrawOrCancel(
            actor:      $actor,
            reference:  $reference,
            actionType: 'Withdrawn',
            preparer:   $actor,   // actor IS the preparer for withdraw
            holder:     $holder,
            projectUrl: $this->buildProjectUrl('entry', $entryProject->id),
        );
    }

    // Helper Architecture Methods

    public function levelLabel(int $level): string { return self::LEVEL_TO_LABEL[$level] ?? 'Unknown'; }

    public function getQueueLabelForLevel(int $level): string
    {
        return match ($level) {
            1 => 'For Revision', 2 => 'For Review', 3 => 'For Checking',
            4 => 'For Endorsement', 5 => 'For Confirmation', 6 => 'For Approval', default => 'Pending',
        };
    }

    private function logActivity(string $type, string $details, $subject, ?array $old, ?array $new, array $wf): void
    {
        try {
            RoiActivityLogger::log(
                activityType: $type,
                moduleType: 'ROI Current',
                details: $details,
                subject: $subject,
                oldValues: $old,
                newValues: $new,
                workflow: $wf
            );
        } catch (\Throwable $e) {
            Log::error("ROI {$type} activity log failed", ['message' => $e->getMessage()]);
        }
    }

    private function cleanArrayKeys(array &$data): void
    {
        unset($data['id'], $data['roi_current_project_id'], $data['submitted_at'], $data['status_updated_at'], $data['status_updated_by'], $data['current_level'], $data['created_at'], $data['updated_at']);
    }

    public function sortTimelineEntries(?array $entries): array
    {
        $rows = is_array($entries) ? $entries : [];
        usort($rows, fn($a, $b) => (strtotime($b['created_at'] ?? '') ?: 0) <=> (strtotime($a['created_at'] ?? '') ?: 0));
        return array_values($rows);
    }
}