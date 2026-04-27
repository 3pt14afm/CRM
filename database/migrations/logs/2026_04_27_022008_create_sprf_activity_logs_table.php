<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_logs';

    public function up(): void
    {
   Schema::connection('mysql_logs')->create('sprf_activity_logs', function (Blueprint $table) {
    $table->id();

    $table->string('yyyymm', 6)->index();

    // User snapshot
    $table->unsignedBigInteger('user_id')->nullable()->index();
    $table->string('first_name')->nullable();
    $table->string('last_name')->nullable();
    $table->string('employee_id')->nullable();
    $table->unsignedBigInteger('department_id')->nullable();
    $table->unsignedBigInteger('location_id')->nullable();
    $table->string('position')->nullable();
    $table->string('email')->nullable();

    // SPRF reference
    $table->unsignedBigInteger('sprf_entry_project_id')->nullable()->index();
    $table->string('sprf_no')->nullable()->index();

    // SPRF workflow users
    $table->unsignedBigInteger('prepared_by_user_id')->nullable();
    $table->unsignedBigInteger('director_customer_engagement_user_id')->nullable();
    $table->unsignedBigInteger('esd_director_user_id')->nullable();
    $table->unsignedBigInteger('vp_ccto_user_id')->nullable();
    $table->unsignedBigInteger('president_ceo_user_id')->nullable();
    $table->unsignedBigInteger('current_approver_user_id')->nullable();
    $table->unsignedBigInteger('approved_by_user_id')->nullable();
    $table->unsignedBigInteger('rejected_by_user_id')->nullable();

    // SPRF status info
    $table->string('sprf_status')->nullable();
    $table->integer('current_level')->nullable();
    $table->integer('approval_level')->nullable();
    $table->string('approval_condition_code')->nullable();

    // SPRF business info
    $table->string('sub_category')->nullable();
    $table->string('account')->nullable();
    $table->string('account_manager')->nullable();

    // SPRF financial snapshot
    $table->decimal('revenue', 15, 2)->nullable();
    $table->decimal('cogs', 15, 2)->nullable();
    $table->decimal('other_expense_total', 15, 2)->nullable();
    $table->decimal('total_expense', 15, 2)->nullable();
    $table->decimal('gp_value', 15, 2)->nullable();
    $table->decimal('gp_percent', 8, 2)->nullable();

    // Activity info
    $table->string('module_type')->default('SPRF')->index();
    $table->string('activity_type')->nullable()->index();

    $table->json('old_values')->nullable();
    $table->json('new_values')->nullable();
    $table->longText('activity_details')->nullable();

    // Request info
    $table->string('ip_address')->nullable();
    $table->text('user_agent')->nullable();
    $table->string('route_name')->nullable();
    $table->text('url')->nullable();
    $table->string('method')->nullable();
    $table->string('status')->nullable();

    $table->timestamps();

    $table->index(['yyyymm', 'activity_type']);
    $table->index(['sprf_no', 'yyyymm']);
    $table->index(['sprf_entry_project_id', 'created_at']);
    $table->index(['user_id', 'created_at']);
 });
 
    }

    public function down(): void
    {
        Schema::connection('mysql_logs')->dropIfExists('sprf_activity_logs');
    }
};