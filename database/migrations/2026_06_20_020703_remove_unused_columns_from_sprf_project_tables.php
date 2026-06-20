<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $toDrop = array_filter(
                ['last_saved_at', 'deleted_at'],
                fn($col) => Schema::hasColumn('sprf_entry_projects', $col)
            );
            if (!empty($toDrop)) {
                $table->dropColumn(array_values($toDrop));
            }
        });

        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $toDrop = array_filter(
                ['last_saved_at', 'deleted_at', 'entry_project_id'],
                fn($col) => Schema::hasColumn('sprf_current_projects', $col)
            );
            if (!empty($toDrop)) {
                $table->dropColumn(array_values($toDrop));
            }
        });

        Schema::table('sprf_archive_projects', function (Blueprint $table) {
            if (Schema::hasColumn('sprf_archive_projects', 'current_project_id')) {
                $table->dropForeign('sprf_arc_curr_fk');
            }

            $toDrop = array_filter(
                ['last_saved_at', 'updated_at', 'deleted_at', 'entry_project_id', 'current_project_id', 'current_approver_user_id'],
                fn($col) => Schema::hasColumn('sprf_archive_projects', $col)
            );
            if (!empty($toDrop)) {
                $table->dropColumn(array_values($toDrop));
            }
        });
    }

    public function down(): void
    {
        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->timestamp('last_saved_at')->nullable();
            $table->softDeletes();
        });

        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->timestamp('last_saved_at')->nullable();
            $table->softDeletes();
            $table->unsignedBigInteger('entry_project_id')->nullable();
        });

        Schema::table('sprf_archive_projects', function (Blueprint $table) {
            $table->timestamp('last_saved_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();
            $table->unsignedBigInteger('entry_project_id')->nullable();
            $table->unsignedBigInteger('current_project_id')->nullable();
            $table->unsignedBigInteger('current_approver_user_id')->nullable();
        });
    }
};
