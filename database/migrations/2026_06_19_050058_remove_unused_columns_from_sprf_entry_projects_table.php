<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * These columns are part of the shared SPRF project schema (also present
     * on sprf_current_projects and sprf_archive_projects) but are never
     * written or read while a project is in `sprf_entry_projects`:
     *
     * - An entry row only ever exists with status = 'draft'.
     * - On submit() it is force-deleted and recreated as a SprfCurrentProject.
     * - On send-back from current (level 2 -> 1), SprfCurrentWorkflowService
     *   ::revertToEntryProject() explicitly nulls out current_approver_user_id,
     *   submitted_at, and the four *_acted_at columns before recreating the
     *   entry row, and approved_by_user_id / rejected_by_user_id / last_reject_note
     *   are never relevant pre-submission (rejection only ever happens from
     *   sprf_current_projects, archiving directly — it never routes back to entry).
     *
     * Confirmed dead via full trace of SprfController, SprfEntryProjectController,
     * SprfCurrentProjectController, and SprfCurrentWorkflowService.
     *
     * NOTE: dce_acted_at / esd_acted_at / vp_ccto_acted_at / president_ceo_acted_at
     * were not present in the original 2026_04_21_060245_create_sprf_entry_projects_table
     * migration — they were added later in a migration not reviewed here. The down()
     * below recreates them as plain nullable timestamps, matching every other
     * timestamp column in this table.
     */
    private array $columns = [
        'current_approver_user_id',
        'approved_by_user_id',
        'rejected_by_user_id',
        'dce_acted_at',
        'esd_acted_at',
        'vp_ccto_acted_at',
        'president_ceo_acted_at',
        'last_reject_note',
        'submitted_at',
        'approved_at',
        'rejected_at',
    ];

    public function up(): void
    {
        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->dropForeign('sprf_ent_curr_fk'); // current_approver_user_id
            $table->dropForeign('sprf_ent_appr_fk'); // approved_by_user_id
            $table->dropForeign('sprf_ent_rej_fk');  // rejected_by_user_id

            $table->dropColumn($this->columns);
        });
    }

    public function down(): void
    {
        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->foreignId('current_approver_user_id')->nullable();
            $table->foreignId('approved_by_user_id')->nullable();
            $table->foreignId('rejected_by_user_id')->nullable();
            $table->text('last_reject_note')->nullable();
            $table->timestamp('submitted_at')->nullable();

            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('dce_acted_at')->nullable();
            $table->timestamp('esd_acted_at')->nullable();
            $table->timestamp('vp_ccto_acted_at')->nullable();
            $table->timestamp('president_ceo_acted_at')->nullable();
        });

        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->foreign('current_approver_user_id', 'sprf_ent_curr_fk')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by_user_id', 'sprf_ent_appr_fk')->references('id')->on('users')->nullOnDelete();
            $table->foreign('rejected_by_user_id', 'sprf_ent_rej_fk')->references('id')->on('users')->nullOnDelete();
        });
    }
};