<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Any record that has a SAP code is an existing company
        DB::table('roi_entry_projects')
            ->whereNotNull('company_sap_code')
            ->where('company_sap_code', '!=', '')
            ->update(['type' => 1]);

        DB::table('roi_current_projects')
            ->whereNotNull('company_sap_code')
            ->where('company_sap_code', '!=', '')
            ->update(['type' => 1]);

        DB::table('roi_archive_projects')
            ->whereNotNull('company_sap_code')
            ->where('company_sap_code', '!=', '')
            ->update(['type' => 1]);
    }

    public function down(): void
    {
        DB::table('roi_entry_projects')->update(['type' => 0]);
        DB::table('roi_current_projects')->update(['type' => 0]);
        DB::table('roi_archive_projects')->update(['type' => 0]);
    }
};