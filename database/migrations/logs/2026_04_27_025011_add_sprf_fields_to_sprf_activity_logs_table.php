<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_logs';

    public function up(): void
    {
        Schema::connection('mysql_logs')->table('sprf_activity_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('sprf_entry_project_id')->nullable()->index()->after('email');
            $table->string('sprf_no')->nullable()->index()->after('sprf_entry_project_id');

            $table->unsignedBigInteger('prepared_by_user_id')->nullable()->after('sprf_no');
            $table->unsignedBigInteger('director_customer_engagement_user_id')->nullable()->after('prepared_by_user_id');
            $table->unsignedBigInteger('esd_director_user_id')->nullable()->after('director_customer_engagement_user_id');
            $table->unsignedBigInteger('vp_ccto_user_id')->nullable()->after('esd_director_user_id');
            $table->unsignedBigInteger('president_ceo_user_id')->nullable()->after('vp_ccto_user_id');
            $table->unsignedBigInteger('current_approver_user_id')->nullable()->after('president_ceo_user_id');
            $table->unsignedBigInteger('approved_by_user_id')->nullable()->after('current_approver_user_id');
            $table->unsignedBigInteger('rejected_by_user_id')->nullable()->after('approved_by_user_id');

            $table->string('sprf_status')->nullable()->after('rejected_by_user_id');
            $table->integer('current_level')->nullable()->after('sprf_status');
            $table->string('approval_level')->nullable()->after('current_level');
            $table->string('approval_condition_code')->nullable()->after('approval_level');

            $table->string('sub_category')->nullable()->after('approval_condition_code');
            $table->string('account')->nullable()->after('sub_category');
            $table->string('account_manager')->nullable()->after('account');

            $table->decimal('revenue', 15, 2)->nullable()->after('account_manager');
            $table->decimal('cogs', 15, 2)->nullable()->after('revenue');
            $table->decimal('other_expense_total', 15, 2)->nullable()->after('cogs');
            $table->decimal('total_expense', 15, 2)->nullable()->after('other_expense_total');
            $table->decimal('gp_value', 15, 2)->nullable()->after('total_expense');
            $table->decimal('gp_percent', 8, 2)->nullable()->after('gp_value');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_logs')->table('sprf_activity_logs', function (Blueprint $table) {
            $table->dropColumn([
                'sprf_entry_project_id',
                'sprf_no',
                'prepared_by_user_id',
                'director_customer_engagement_user_id',
                'esd_director_user_id',
                'vp_ccto_user_id',
                'president_ceo_user_id',
                'current_approver_user_id',
                'approved_by_user_id',
                'rejected_by_user_id',
                'sprf_status',
                'current_level',
                'approval_level',
                'approval_condition_code',
                'sub_category',
                'account',
                'account_manager',
                'revenue',
                'cogs',
                'other_expense_total',
                'total_expense',
                'gp_value',
                'gp_percent',
            ]);
        });
    }
};