<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    // Backfill entry projects
    DB::table('roi_entry_projects')
        ->whereNotNull('company_sap_code')
        ->whereNull('company_id')
        ->orderBy('id')
        ->each(function ($project) {
            $companyId = DB::table('erms.tbl_company')
                ->where('sap_code', $project->company_sap_code)
                ->value('id');
            if ($companyId) {
                DB::table('roi_entry_projects')
                    ->where('id', $project->id)
                    ->update(['company_id' => $companyId]);
            }
        });

    // Backfill current projects
    DB::table('roi_current_projects')
        ->whereNotNull('company_sap_code')
        ->whereNull('company_id')
        ->orderBy('id')
        ->each(function ($project) {
            $companyId = DB::table('erms.tbl_company')
                ->where('sap_code', $project->company_sap_code)
                ->value('id');
            if ($companyId) {
                DB::table('roi_current_projects')
                    ->where('id', $project->id)
                    ->update(['company_id' => $companyId]);
            }
        });

    // Backfill archive projects
    DB::table('roi_archive_projects')
        ->whereNotNull('company_sap_code')
        ->whereNull('company_id')
        ->orderBy('id')
        ->each(function ($project) {
            $companyId = DB::table('erms.tbl_company')
                ->where('sap_code', $project->company_sap_code)
                ->value('id');
            if ($companyId) {
                DB::table('roi_archive_projects')
                    ->where('id', $project->id)
                    ->update(['company_id' => $companyId]);
            }
        });
}
};
