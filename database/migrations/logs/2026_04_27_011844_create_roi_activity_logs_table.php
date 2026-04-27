<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_logs';

    public function up(): void
    {
        Schema::connection('mysql_logs')->create('roi_activity_logs', function (Blueprint $table) {
            $table->id();

            // Boss/month filter: example 202604
            $table->string('yyyymm', 6)->index();

            // User details snapshot
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('employee_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable()->index();
            $table->unsignedBigInteger('location_id')->nullable()->index();

            $table->unsignedBigInteger('preparer_id')->nullable();
            $table->unsignedBigInteger('reviewer_id')->nullable();
            $table->unsignedBigInteger('checker_id')->nullable();
            $table->unsignedBigInteger('endorser_id')->nullable();
            $table->unsignedBigInteger('confirmer_id')->nullable();
            $table->unsignedBigInteger('approver_id')->nullable();

            $table->string('position')->nullable();
            $table->string('email')->nullable();

            // ROI activity log details
            $table->string('module_type')->default('ROI')->index();
            $table->string('activity_type')->nullable()->index();

            // subject_type + subject_id
            // Example: App\Models\Roi, 15
            $table->nullableMorphs('subject');

            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->longText('activity_details')->nullable();

            // Request details
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('route_name')->nullable();
            $table->text('url')->nullable();
            $table->string('method')->nullable();
            $table->string('status')->nullable();

            $table->timestamps();

            $table->index(['yyyymm', 'activity_type']);
            $table->index(['module_type', 'yyyymm']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_logs')->dropIfExists('roi_activity_logs');
    }
};