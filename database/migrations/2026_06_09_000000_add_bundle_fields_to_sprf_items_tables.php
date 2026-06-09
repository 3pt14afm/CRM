<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['sprf_entry_items', 'sprf_current_items', 'sprf_archive_items'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('row_key')->nullable()->after('project_id');
                $table->string('row_type')->default('item')->after('row_key');
                $table->string('parent_row_key')->nullable()->after('row_type');
            });
        }
    }

    public function down(): void
    {
        foreach (['sprf_entry_items', 'sprf_current_items', 'sprf_archive_items'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn(['row_key', 'row_type', 'parent_row_key']);
            });
        }
    }
};
