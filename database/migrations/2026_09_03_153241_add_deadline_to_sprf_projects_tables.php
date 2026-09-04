<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['sprf_entry_projects', 'sprf_current_projects', 'sprf_archive_projects'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->date('deadline')->nullable()->after('document_datetime');
            });
        }
    }

    public function down(): void
    {
        foreach (['sprf_entry_projects', 'sprf_current_projects', 'sprf_archive_projects'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('deadline');
            });
        }
    }
};
