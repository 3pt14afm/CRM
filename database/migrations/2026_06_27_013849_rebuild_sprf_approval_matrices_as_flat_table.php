<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // -----------------------------------------------------------------
        // Remove old approval matrix references (if they still exist)
        // -----------------------------------------------------------------

        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            if (Schema::hasColumn('sprf_entry_projects', 'sprf_approval_matrix_id')) {
                $table->dropColumn('sprf_approval_matrix_id');
            }
        });

        Schema::table('sprf_current_projects', function (Blueprint $table) {
            if (Schema::hasColumn('sprf_current_projects', 'sprf_approval_matrix_id')) {
                $table->dropColumn('sprf_approval_matrix_id');
            }
        });

        Schema::table('sprf_archive_projects', function (Blueprint $table) {
            if (Schema::hasColumn('sprf_archive_projects', 'sprf_approval_matrix_id')) {
                $table->dropForeign(['sprf_approval_matrix_id']);
                $table->dropColumn('sprf_approval_matrix_id');
            }
        });

        Schema::dropIfExists('sprf_approval_matrix_steps');
        Schema::dropIfExists('sprf_approval_matrices');

        // create new table...

        // ── 2. Create new flat approval matrix table ─────────────────────────

        Schema::create('sprf_approval_matrices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('location_id')->constrained('locations');
            $table->foreignId('department_id')->constrained('company_departments');

            $table->foreignId('director_customer_engagement_user_id')->nullable();
            $table->foreignId('esd_director_user_id')->nullable();
            $table->foreignId('vp_ccto_user_id')->nullable();
            $table->foreignId('president_ceo_user_id')->nullable();

            $table->foreignId('created_by_user_id')->nullable();
            $table->foreignId('updated_by_user_id')->nullable();

            $table->foreign(
                'director_customer_engagement_user_id',
                'sprf_matrix_dce_fk'
            )->references('id')->on('users')->nullOnDelete();

            $table->foreign(
                'esd_director_user_id',
                'sprf_matrix_esd_fk'
            )->references('id')->on('users')->nullOnDelete();

            $table->foreign(
                'vp_ccto_user_id',
                'sprf_matrix_vp_fk'
            )->references('id')->on('users')->nullOnDelete();

            $table->foreign(
                'president_ceo_user_id',
                'sprf_matrix_pres_fk'
            )->references('id')->on('users')->nullOnDelete();

            $table->foreign(
                'created_by_user_id',
                'sprf_matrix_created_fk'
            )->references('id')->on('users')->nullOnDelete();

            $table->foreign(
                'updated_by_user_id',
                'sprf_matrix_updated_fk'
            )->references('id')->on('users')->nullOnDelete();

            $table->boolean('is_active')->default(false);

            $table->string('active_location_department', 100)
                ->nullable()
                ->storedAs("
                    CASE
                        WHEN is_active = 1
                        THEN CONCAT(location_id, '_', department_id)
                        ELSE NULL
                    END
                ");

            $table->text('remarks')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                'active_location_department',
                'sprf_matrix_one_active_per_location_dept_unique'
            );
        });

        // ── 3. Add location_id + department_id to sprf_entry_projects ────────

        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->foreignId('location_id')
                ->nullable()
                ->after('approval_condition_code')
                ->constrained('locations')
                ->nullOnDelete();

            $table->foreignId('department_id')
                ->nullable()
                ->after('location_id')
                ->constrained('company_departments')
                ->nullOnDelete();
        });

        // ── 4. Add location_id + department_id to sprf_current_projects ──────

        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->foreignId('location_id')
                ->nullable()
                ->after('approval_condition_code')
                ->constrained('locations')
                ->nullOnDelete();

            $table->foreignId('department_id')
                ->nullable()
                ->after('location_id')
                ->constrained('company_departments')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->dropForeign(['location_id']);
            $table->dropForeign(['department_id']);

            $table->dropColumn([
                'location_id',
                'department_id',
            ]);
        });

        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->dropForeign(['location_id']);
            $table->dropForeign(['department_id']);

            $table->dropColumn([
                'location_id',
                'department_id',
            ]);
        });

        Schema::dropIfExists('sprf_approval_matrices');
    }
};