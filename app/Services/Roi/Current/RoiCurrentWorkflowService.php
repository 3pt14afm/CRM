<?php

namespace App\Services\Roi\Current;

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

            $this->notifyMoveNextOrBack($project, $user, $fromLevel, 1, 'back');
            return 'entry_list';
        }

        // If the receiving approver owns consecutive levels, revert to their FIRST level and clear ALL their timestamps — they approved as one action and must re-approve as one.
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

        $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'back');
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

        $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'next');

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

        $this->notifyDecision('rejected', $reference, $preparer, $actor, $actorLevel);
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

        $this->notifyDecision('approved', $reference, $preparer, $actor, 6);
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

    public function emailUserById(?int $userId): ?User { return $userId ? User::query()->find($userId) : null; }

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
            'confirmed_by', 'confirmed_at', 'approved_by', 'entry_remarks', 'entry_remarks_attachments',
            'company_name', 'company_sap_code', 'contract_years', 'contract_type', 'purpose', 'bundled_std_ink',
            'annual_interest', 'percent_margin', 'mono_yield_monthly', 'mono_yield_annual', 'color_yield_monthly',
            'color_yield_annual', 'mc_unit_cost', 'mc_qty', 'mc_total_cost', 'mc_yields', 'mc_cost_cpp',
            'mc_selling_price', 'mc_total_sell', 'mc_sell_cpp', 'mc_total_bundled_price', 'fees_total',
            'grand_total_cost', 'grand_total_revenue', 'grand_roi', 'grand_roi_percentage', 'yearly_breakdown', 'notes', 'comments',
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

    private function notifyMoveNextOrBack(RoiCurrentProject $project, User $actor, int $fromLevel, int $toLevel, string $action): void
    {
        $ref = $project->reference;
        $receiver = $toLevel >= 2 ? $this->emailUserById((int) ($project->{match($toLevel){2=>'reviewed_by',3=>'checked_by',4=>'endorsed_by',5=>'confirmed_by',6=>'approved_by'}} ?? 0)) : null;

        if ($receiver) {
            $this->sendEmail($receiver->email, "ROI Project Received: {$ref}", "You received ROI project {$ref}.\nAssigned level: Level {$toLevel} ({$this->levelLabel($toLevel)}).\nAction: " . ($action === 'next' ? 'Sent to next level' : 'Sent back to previous level') . "\nFrom: {$actor->name} (Level {$fromLevel}).");
        }

        if ($preparer = $this->emailUserById((int) $project->user_id)) {
            $this->sendEmail($preparer->email, "ROI Project Update: {$ref}", "Your ROI project {$ref} moved.\nFrom: Level {$fromLevel} ({$this->levelLabel($fromLevel)})\nTo: Level {$toLevel} ({$this->levelLabel($toLevel)})\nAction by: {$actor->name}");
        }

        $this->sendEmail($actor->email, "ROI Action Successful: {$ref}", "Success!\nYou " . ($action === 'next' ? 'sent' : 'sent back') . " ROI project {$ref}.\nFrom level: {$fromLevel}\nTo level: {$toLevel}");
    }

    private function notifyDecision(string $decision, string $reference, ?User $preparer, User $actor, int $actorLevel): void
    {
        if ($preparer) {
            $this->sendEmail($preparer->email, "ROI Project {$decision}: {$reference}", "Your ROI project {$reference} was {$decision}.\n" . ucfirst($decision) . " by: {$actor->name} (Level {$actorLevel} — {$this->levelLabel($actorLevel)})");
        }
        $this->sendEmail($actor->email, "ROI Action Successful: {$reference}", "Success!\nYou {$decision} ROI project {$reference}.");
    }

    private function sendEmail(?string $to, string $subject, string $body): void
    {
        if (!$to) { Log::warning('[ROI Mail] skipped: missing recipient', ['subject' => $subject]); return; }
        try {
            Mail::raw($body, function ($message) use ($to, $subject) { $message->to($to)->subject($subject); });
        } catch (\Throwable $e) { report($e); }
    }

  private function logActivity(string $type, string $details, $subject, ?array $old, ?array $new, array $wf): void
    {
        try {
            // Using explicit named arguments matches the method definition keys directly
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