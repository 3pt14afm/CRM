<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected array $tables = [
        'sprf_archive_projects',
        'sprf_current_projects',
        'sprf_entry_projects',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                if (!Schema::hasColumn($table, 'type')) {
                    $blueprint->unsignedTinyInteger('type')->nullable()->after('account_manager');
                }
                if (!Schema::hasColumn($table, 'company_id')) {
                    $blueprint->unsignedBigInteger('company_id')->nullable()->after('type');
                }
                if (!Schema::hasColumn($table, 'company_sap_code')) {
                    $blueprint->string('company_sap_code')->nullable()->after('company_id');
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                foreach (['company_sap_code', 'company_id', 'type'] as $column) {
                    if (Schema::hasColumn($table, $column)) {
                        $blueprint->dropColumn($column);
                    }
                }
            });
        }
    }
};