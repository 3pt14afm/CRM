<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proposals', function (Blueprint $table) {
            $table->foreignId('sprf_archive_project_id')
                ->nullable()
                ->after('roi_archive_project_id')
                ->constrained('sprf_archive_projects')
                ->nullOnDelete();

            // Discriminator so we always know which project type a proposal belongs to,
            // without guessing based on which FK is non-null.
            $table->string('project_type')->default('roi')->after('sprf_archive_project_id');
        });

        // roi_archive_project_id must become nullable now that a proposal can
        // belong to an SPRF project instead. Requires doctrine/dbal.
        Schema::table('proposals', function (Blueprint $table) {
            $table->unsignedBigInteger('roi_archive_project_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('proposals', function (Blueprint $table) {
            $table->dropForeign(['sprf_archive_project_id']);
            $table->dropColumn(['sprf_archive_project_id', 'project_type']);
            $table->unsignedBigInteger('roi_archive_project_id')->nullable(false)->change();
        });
    }
};