<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    $tables = [
        'roi_entry_projects',
        'roi_current_projects',
        'roi_archive_projects',
    ];

    foreach ($tables as $table) {
        DB::table($table)
            ->whereNotNull('company_sap_code')
            ->whereNull('company_id')
            ->orderBy('id')
            ->each(function ($project) use ($table) {
                $companyId = DB::table('erms.tbl_company')
                    ->where('sap_code', $project->company_sap_code)
                    ->orderBy('id', 'asc')
                    ->value('id');

                if ($companyId) {
                    DB::table($table)
                        ->where('id', $project->id)
                        ->update(['company_id' => $companyId]);
                }
            });
    }
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
