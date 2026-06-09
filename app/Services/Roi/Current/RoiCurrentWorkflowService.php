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
            'status' => $project->status,
            'current_level' => $fromLevel,
            'note_or_comment_type' => $validatedData['type'],
            'note_or_comment_body' => trim($validatedData['body']),
        ];

        $this->appendSendBackEntry($project, $user, $validatedData['type'], $validatedData['body']);
        $toLevel = $fromLevel - 1;
        $backStatus = $this->getBackStatusLabel($toLevel);

        if ($toLevel === 1) {
            $project->save();
            $project->refresh()->load(['items', 'fees', 'user']);

            $projectData = $project->toArray();
            $this->cleanArrayKeys($projectData);

            $entryProject = RoiEntryProject::create(array_merge($projectData, [
                'status' => 'returned',
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

            $this->logActivity('send_back', 'Sent back ROI #' . $project->reference . ' to ' . $backStatus, $entryProject, $oldValues, [
                'status' => 'returned',
                'current_level' => 1,
                'entry_project_id' => $entryProject->id,
            ], $workflow);

            $project->items()->delete();
            $project->fees()->delete();
            $project->delete();

            $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'back');
            return 'entry_list';
        }

        $project->update([
            'status' => 'Sent Back',
            'status_reason' => null,
            'status_updated_at' => now(),
            'status_updated_by' => $user->id,
            'last_saved_at' => now(),
            'current_level' => $toLevel,
        ]);

        $this->logActivity('send_back', 'Sent back ROI #' . $project->reference . ' to ' . $backStatus, $project, $oldValues, [
            'status' => $project->status,
            'current_level' => $project->current_level,
            'status_updated_by' => $project->status_updated_by,
            'status_updated_at' => $project->status_updated_at,
        ], $workflow);

        $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'back');
        return 'current_list';
    }

    public function handleAdvance(RoiCurrentProject $project, User $user): string
    {
        $fromLevel = (int) $project->current_level;
        $toLevel = $fromLevel + 1;
        $nextStatus = $this->getQueueLabelForLevel($toLevel);

        $oldValues = ['current_level' => $fromLevel, 'status' => $project->status];
        $workflow = $this->getRoiWorkflow($project);

        $project->update([
            'current_level' => $toLevel,
            'status' => $nextStatus,
            'status_reason' => null,
            'status_updated_at' => now(),
            'status_updated_by' => $user->id,
            'last_saved_at' => now(),
        ]);

        $this->logActivity('advance', 'Advanced ROI #' . $project->reference . ' to ' . $nextStatus, $project, $oldValues, [
            'current_level' => $project->current_level,
            'status' => $project->status,
            'status_updated_by' => $project->status_updated_by,
            'status_updated_at' => $project->status_updated_at,
        ], $workflow);

        $this->notifyMoveNextOrBack($project, $user, $fromLevel, $toLevel, 'next');
        return $nextStatus;
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
            'approved_by' => null,
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
            'user_id', 'location_id', 'project_uid', 'reference', 'version', 'last_saved_at', 'status',
            'reviewed_by', 'checked_by', 'endorsed_by', 'confirmed_by', 'entry_remarks', 'entry_remarks_attachments',
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