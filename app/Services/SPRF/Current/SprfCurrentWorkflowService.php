<?php

namespace App\Services\SPRF\Current;

use App\Models\SPRF\SprfArchiveProject;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\SPRF\SprfEntryProject;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SprfCurrentWorkflowService
{
    /**
     * Handles moving the project forward one step.
     */
    public function handleAdvance(SprfCurrentProject $project, int $nextLevel, int $nextApproverId): SprfCurrentProject
    {
        if ((int) $project->current_level === 2 && $project->requires_rebate_justification && blank($project->rebate_justification)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'rebate_justification' => 'Rebate justification must be provided.',
            ]);
        }

        $timestampColumn = $this->timestampColumnForLevel($project->current_level);

        $updateData = [
            'current_level'            => $nextLevel,
            'current_approver_user_id' => $nextApproverId,
            'status'                   => 'under_review',
        ];

        // Stamp the current time for the level we are leaving
        if ($timestampColumn) {
            $updateData[$timestampColumn] = now();
        }

        $project->update($updateData);

        return $project;
    }

    /**
     * Handles sending the project back exactly one step.
     */
    public function handleSendBack(SprfCurrentProject $project, string $message, int $userId)
    {
        return DB::transaction(function () use ($project, $message, $userId) {
            $currentLevel = (int) $project->current_level;

            // 1. Append the send-back message to the JSON arrays
            $this->appendMessage($project, $message, $userId, $currentLevel);

            // 2. Handle Return to Preparer (Level 2 -> 1)
            if ($currentLevel === 2) {
                return $this->revertToEntryProject($project);
            }

            // 3. Handle strict 1-step back for Levels 3, 4, 5
            $prevLevel = $currentLevel - 1;

            // Determine who the assigned approver was for the previous level
            $prevApproverId = match ($prevLevel) {
                4       => $project->vp_ccto_user_id,
                3       => $project->esd_director_user_id,
                2       => $project->director_customer_engagement_user_id,
                default => null,
            };

            // Identify the timestamp column of the level we are returning to
            $clearColumn = $this->timestampColumnForLevel($prevLevel);

            $updateData = [
                'current_level'            => $prevLevel,
                'current_approver_user_id' => $prevApproverId,
                'status'                   => 'under_review',
            ];

            // Reset their stamp to null so they get a fresh timestamp when they advance it again
            if ($clearColumn) {
                $updateData[$clearColumn] = null;
            }

            $project->update($updateData);

            return $project;
        });
    }

    /**
     * Handles final approval and archives the project.
     */
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

            return $archiveProject;
        });
    }

    /**
     * Handles rejection and archives the project.
     */
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

            return $archiveProject;
        });
    }

    /**
     * Appends a message to the appropriate JSON column based on the actor's level.
     */
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

        // Levels 3, 4, 5 use Comments. Levels 1, 2 use Notes.
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

    /**
     * Converts a current project back into an entry project (Draft).
     */
    private function revertToEntryProject(SprfCurrentProject $project): SprfEntryProject
    {
        $entryData = $project->toArray();

        // Strip out the ID and current approver so it creates a new entry record
        unset($entryData['id']);
        unset($entryData['current_approver_user_id']);

        $entryData['status']                   = 'draft';
        $entryData['current_level']            = 1;
        $entryData['submitted_at']             = null;

        // Clear all forward stamps
        $entryData['dce_acted_at'] = null;
        $entryData['esd_acted_at'] = null;
        $entryData['vp_ccto_acted_at'] = null;
        $entryData['president_ceo_acted_at'] = null;

        $entryProject = SprfEntryProject::create($entryData);

        // Duplicate Items and Subitems
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

        // Duplicate Fees
        foreach ($project->fees as $fee) {
            $feeData = $fee->toArray();
            unset($feeData['id'], $feeData['project_id']);
            $entryProject->fees()->create($feeData);
        }

        // Delete the current project and its children
        $project->items()->delete();
        $project->fees()->delete();
        $project->forceDelete();

        return $entryProject;
    }

    /**
     * Moves a project from the current pipeline to the archive table.
     */
    private function archiveFromCurrent(SprfCurrentProject $project, array $overrides): SprfArchiveProject
    {
        $data = $project->toArray();
        unset($data['id']);
        unset($data['current_approver_user_id']);

        $data = array_merge($data, $overrides);

        $archiveProject = SprfArchiveProject::create($data);

        // Duplicate Items and Subitems
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

        // Duplicate Fees
        foreach ($project->fees as $fee) {
            $feeData = $fee->toArray();
            unset($feeData['id'], $feeData['project_id']);
            $archiveProject->fees()->create($feeData);
        }

        // Delete the current project and its children
        $project->items()->delete();
        $project->fees()->delete();
        $project->forceDelete();

        return $archiveProject;
    }

    // Helper to sort notes and comments by created_at descending (newest first).
    private function sortTimelineEntries(?array $entries): array
    {
        $rows = is_array($entries) ? $entries : [];
        usort($rows, fn ($a, $b) => (strtotime($b['created_at'] ?? '') ?: 0) <=> (strtotime($a['created_at'] ?? '') ?: 0));
        return array_values($rows);
    }

    // Helper to map a given level to its corresponding timestamp column.
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
}