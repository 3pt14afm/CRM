<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sprf_archive_projects', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('entry_project_id')->nullable()->index();
            $table->unsignedBigInteger('current_project_id')->nullable()->index();
            $table->string('sprf_no')->nullable()->index();
            $table->timestamp('document_datetime')->nullable();

            $table->string('status')->default('approved');
            $table->unsignedTinyInteger('current_level')->default(3);
            $table->string('approval_level')->default('ESD_ONLY');

            $table->foreignId('prepared_by_user_id')->nullable();
            $table->foreignId('director_customer_engagement_user_id')->nullable();
            $table->foreignId('esd_director_user_id')->nullable();
            $table->foreignId('vp_ccto_user_id')->nullable();
            $table->foreignId('president_ceo_user_id')->nullable();
            $table->foreignId('current_approver_user_id')->nullable();
            $table->foreignId('approved_by_user_id')->nullable();
            $table->foreignId('rejected_by_user_id')->nullable();

            $table->foreign('prepared_by_user_id', 'sprf_arc_prep_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->foreign('director_customer_engagement_user_id', 'sprf_arc_dce_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->foreign('esd_director_user_id', 'sprf_arc_esd_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->foreign('vp_ccto_user_id', 'sprf_arc_vp_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->foreign('president_ceo_user_id', 'sprf_arc_pres_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->foreign('current_approver_user_id', 'sprf_arc_curr_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->foreign('approved_by_user_id', 'sprf_arc_appr_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->foreign('rejected_by_user_id', 'sprf_arc_rej_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->string('sub_category')->nullable();
            $table->string('account')->nullable();
            $table->string('account_manager')->nullable();

            $table->longText('remarks')->nullable();
            $table->text('rebate_justification')->nullable();
            $table->text('last_reject_note')->nullable();

            $table->decimal('revenue', 15, 2)->default(0);
            $table->decimal('cogs', 15, 2)->default(0);
            $table->decimal('other_expense_total', 15, 2)->default(0);
            $table->decimal('total_expense', 15, 2)->default(0);
            $table->decimal('gp_value', 15, 2)->default(0);
            $table->decimal('gp_percent', 8, 2)->default(0);

            $table->boolean('requires_vp_ccto')->default(false);
            $table->boolean('requires_president_ceo')->default(false);
            $table->boolean('requires_rebate_justification')->default(false);

            $table->timestamp('last_saved_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprf_archive_projects');
    }
};