<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['roi_entry_projects', 'roi_current_projects', 'roi_archive_projects'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->boolean('from_group')->nullable()->default(false)->after('sequence');
            });
        }
    }

    public function down(): void
    {
        foreach (['roi_entry_projects', 'roi_current_projects', 'roi_archive_projects'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('from_group');
            });
        }
    }
};
