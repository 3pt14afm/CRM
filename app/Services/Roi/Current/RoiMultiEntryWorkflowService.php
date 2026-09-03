<?php

namespace App\Services\Roi\Current;

use App\Models\RoiArchiveProject;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryProject;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryFee;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Wraps RoiCurrentWorkflowService so a multi-entry group's sibling rows
 * (sequence 2+) move in lockstep with the master row (sequence 0/1) between
 * roi_current_projects / roi_archive_projects / roi_entry_projects.
 *
 * Siblings never carry workflow columns (current_level/status/approver
 * columns are null on them), so they never go through RoiCurrentWorkflowService's
 * routing logic directly — only the master does. This class only replicates
 * the master's table move (or lack of one) onto the siblings.
 */
class RoiMultiEntryWorkflowService
{
    public function __construct(private RoiCurrentWorkflowService $workflowService)
    {
    }

    public function levelLabel(int $level): string
    {
        return $this->workflowService->levelLabel($level);
    }

    public function getQueueLabelForLevel(int $level): string
    {
        return $this->workflowService->getQueueLabelForLevel($level);
    }

    public function sortTimelineEntries(?array $entries): array
    {
        return $this->workflowService->sortTimelineEntries($entries);
    }

    public function handleApprove(RoiCurrentProject $master, User $actor): void
    {
        $siblingIds = $this->siblingIds($master->reference, $master->id);

        DB::transaction(function () use ($master, $actor, $siblingIds) {
            $this->workflowService->handleApprove($master, $actor);
            // Field set mirrors archiveFromCurrent()'s real approve override in
            // RoiCurrentWorkflowService::handleApprove(), so sibling archive rows
            // carry the same approved_at/approved_by/rejected-cleared state as the master.
            $this->moveSiblingsToArchive($siblingIds, [
                'status'            => 'approved',
                'approved_at'       => now(),
                'approved_by'       => $actor->id,
                'rejected_at'       => null,
                'rejected_by'       => null,
                'rejected_by_level' => null,
            ]);
        });
    }

    public function handleReject(RoiCurrentProject $master, User $actor): void
    {
        $siblingIds = $this->siblingIds($master->reference, $master->id);
        $actorLevel = (int) $master->current_level;

        DB::transaction(function () use ($master, $actor, $siblingIds, $actorLevel) {
            $this->workflowService->handleReject($master, $actor);
            // Field set mirrors archiveFromCurrent()'s real reject override in
            // RoiCurrentWorkflowService::handleReject() — previously this only set
            // 'status', leaving sibling archive rows without rejected_at/rejected_by.
            $this->moveSiblingsToArchive($siblingIds, [
                'status'            => 'rejected',
                'rejected_at'       => now(),
                'rejected_by'       => $actor->id,
                'rejected_by_level' => $actorLevel,
                'approved_at'       => null,
            ]);
        });
    }

    public function handleCancel(RoiCurrentProject $master, User $actor): void
    {
        $siblingIds = $this->siblingIds($master->reference, $master->id);

        DB::transaction(function () use ($master, $actor, $siblingIds) {
            $this->workflowService->handleCancel($master, $actor);
            $this->moveSiblingsToArchive($siblingIds, [
                'status'            => 'cancelled',
                'cancelled_at'      => now(),
                'rejected_at'       => null,
                'rejected_by'       => null,
                'rejected_by_level' => null,
            ]);
        });
    }

    public function handleWithdraw(RoiCurrentProject $master, User $actor): void
    {
        $siblingIds = $this->siblingIds($master->reference, $master->id);

        DB::transaction(function () use ($master, $actor, $siblingIds) {
            $this->workflowService->handleWithdraw($master, $actor);
            $this->moveSiblingsToEntry($siblingIds, ['status' => 'withdrawn']);
        });
    }

    public function handleAdvance(RoiCurrentProject $master, User $user): string
    {
        $siblingIds = $this->siblingIds($master->reference, $master->id);

        return DB::transaction(function () use ($master, $user, $siblingIds) {
            $result = $this->workflowService->handleAdvance($master, $user);

            // handleAdvance only leaves roi_current_projects when a consecutive-
            // approver run reaches level 6, where it delegates internally to
            // handleApprove — the only case its return value is 'approved'.
            // Anything else is an in-place current_level update; siblings, which
            // don't track level, need no change.
            if ($result === 'approved') {
                $this->moveSiblingsToArchive($siblingIds, [
                    'status'            => 'approved',
                    'approved_at'       => now(),
                    'approved_by'       => $user->id,
                    'rejected_at'       => null,
                    'rejected_by'       => null,
                    'rejected_by_level' => null,
                ]);
            } else {
                $this->syncSiblingsWorkflowState($siblingIds, $master->fresh());
            }

            return $result;
        });
    }

    public function handleSendBack(RoiCurrentProject $master, User $user, array $validatedData): string
    {
        $siblingIds = $this->siblingIds($master->reference, $master->id);
        $targetId   = (int) ($validatedData['target_entry_id'] ?? $master->id);

        return DB::transaction(function () use ($master, $user, $validatedData, $siblingIds, $targetId) {
            // target_entry_id lets the sender attach the note/comment to a
            // specific sibling instead of always the master row — resolved
            // and scoped to this group's reference so a stray/foreign id
            // can't redirect the note elsewhere.
            $noteTarget = $targetId === (int) $master->id
                ? $master
                : RoiCurrentProject::where('id', $targetId)->where('reference', $master->reference)->firstOrFail();

            $result = $this->workflowService->handleSendBack($master, $user, $validatedData, $noteTarget);

            // 'entry_list' = reverted all the way to Draft (roi_entry_projects).
            // 'current_list' = moved back a level within roi_current_projects —
            // siblings stay in that table too, so sync their workflow columns
            // instead of leaving them stale. If the note landed on a sibling,
            // moveSiblingsToEntry() below re-reads it from the DB, so its saved
            // note travels with it automatically.
            if ($result === 'entry_list') {
                $this->moveSiblingsToEntry($siblingIds, ['status' => 'returned']);
            } else {
                $this->syncSiblingsWorkflowState($siblingIds, $master->fresh());
            }

            return $result;
        });
    }

    private function siblingIds(string $reference, int $masterId): array
    {
        return RoiCurrentProject::where('reference', $reference)
            ->where('id', '!=', $masterId)
            ->pluck('id')
            ->all();
    }

    // NOTE: no longer opens its own DB::transaction() — every public caller now
    // wraps its workflowService call + this move in a single outer transaction,
    // so master-move and sibling-move commit or roll back together.
    private function moveSiblingsToArchive(array $siblingIds, array $overrides): void
    {
        if (empty($siblingIds)) return;

        foreach (RoiCurrentProject::whereIn('id', $siblingIds)->get() as $sibling) {
            $base = $sibling->only([
                'user_id', 'location_id', 'project_uid', 'reference', 'sequence', 'version', 'last_saved_at',
                'status', 'submitted_at',
                'reviewed_by', 'reviewed_at', 'checked_by', 'checked_at', 'endorsed_by', 'endorsed_at', 'confirmed_by', 'confirmed_at',
                'entry_remarks', 'entry_remarks_attachments',
                'company_id', 'company_name', 'company_sap_code', 'type', 'contract_years', 'contract_type',
                'purpose', 'bundled_std_ink', 'annual_interest', 'percent_margin', 'mono_yield_monthly',
                'mono_yield_annual', 'color_yield_monthly', 'color_yield_annual', 'mc_unit_cost', 'mc_qty',
                'mc_total_cost', 'mc_yields', 'mc_cost_cpp', 'mc_selling_price', 'mc_total_sell', 'mc_sell_cpp',
                'mc_total_bundled_price', 'fees_total', 'grand_total_cost', 'grand_total_revenue', 'grand_roi',
                'grand_roi_percentage', 'yearly_breakdown', 'notes', 'comments',
            ]);

            $archived = RoiArchiveProject::create(array_merge($base, $overrides));
            $sibling->loadMissing(['items', 'fees']);

            foreach ($sibling->items as $item) {
                $itemData = $item->toArray();
                unset($itemData['id'], $itemData['roi_current_project_id'], $itemData['created_at'], $itemData['updated_at']);
                $archived->items()->create($itemData);
            }

            foreach ($sibling->fees as $fee) {
                $feeData = $fee->toArray();
                unset($feeData['id'], $feeData['roi_current_project_id'], $feeData['created_at'], $feeData['updated_at']);
                $archived->fees()->create($feeData);
            }

            $sibling->items()->delete();
            $sibling->fees()->delete();
            $sibling->delete();
        }
    }

    // NOTE: no longer opens its own DB::transaction() — see moveSiblingsToArchive().
    private function moveSiblingsToEntry(array $siblingIds, array $overrides): void
    {
        if (empty($siblingIds)) return;

        foreach (RoiCurrentProject::whereIn('id', $siblingIds)->get() as $sibling) {
            $sibling->refresh()->load(['items', 'fees']);

            $projectData = $sibling->toArray();
            unset(
                $projectData['id'], $projectData['roi_current_project_id'], $projectData['submitted_at'],
                $projectData['status_updated_at'], $projectData['status_updated_by'], $projectData['current_level'],
                $projectData['created_at'], $projectData['updated_at']
            );

            $entryProject = RoiEntryProject::create(array_merge($projectData, $overrides, [
                'last_saved_at' => now(),
            ]));

            foreach ($sibling->items as $item) {
                $itemData = $item->toArray();
                unset($itemData['id'], $itemData['roi_current_project_id']);
                $itemData['roi_entry_project_id'] = $entryProject->id;
                RoiEntryItem::create($itemData);
            }

            foreach ($sibling->fees as $fee) {
                $feeData = $fee->toArray();
                unset($feeData['id'], $feeData['roi_current_project_id']);
                $feeData['roi_entry_project_id'] = $entryProject->id;
                RoiEntryFee::create($feeData);
            }

            $sibling->items()->delete();
            $sibling->fees()->delete();
            $sibling->delete();
        }
    }

    // Keeps sibling rows' workflow columns (status/current_level/approver
    // assignments/timestamps) accurate even when the master stays inside
    // roi_current_projects (no table move) — otherwise siblings freeze at
    // whatever these columns were on creation and never get read, but the
    // DB itself drifts out of sync with the group's real state.
    private function syncSiblingsWorkflowState(array $siblingIds, RoiCurrentProject $master): void
    {
        if (empty($siblingIds)) return;

        RoiCurrentProject::whereIn('id', $siblingIds)->update(
            $master->only([
                'status', 'status_reason', 'status_updated_by', 'status_updated_at', 'current_level',
                'reviewed_by', 'reviewed_at', 'checked_by', 'checked_at', 'endorsed_by', 'endorsed_at',
                'confirmed_by', 'confirmed_at', 'approved_by', 'approved_at',
            ])
        );
    }

    public function handleAutoAdvanceOnSubmit(RoiCurrentProject $master): void
    {
        $siblingIds = $this->siblingIds($master->reference, $master->id);
        $masterId = $master->id;

        DB::transaction(function () use ($master, $masterId, $siblingIds) {
            $this->workflowService->handleAutoAdvanceOnSubmit($master);

            // Void method — detect an out-of-current move the same way handleApprove
            // does, by checking whether the master row still exists afterward.
            if (!RoiCurrentProject::find($masterId)) {
                $this->moveSiblingsToArchive($siblingIds, [
                    'status'            => 'approved',
                    'approved_at'       => now(),
                    'approved_by'       => $master->user_id,
                    'rejected_at'       => null,
                    'rejected_by'       => null,
                    'rejected_by_level' => null,
                ]);
            } else {
                $this->syncSiblingsWorkflowState($siblingIds, $master->fresh());
            }
        });
    }
}