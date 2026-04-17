<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up(): void
    {
        // Update Current Projects
        Schema::table('roi_current_projects', function (Blueprint $table) {
            $table->string('company_sap_code')->nullable()->after('company_name');
        });

        // Update Archive Projects
        Schema::table('roi_archive_projects', function (Blueprint $table) {
            $table->string('company_sap_code')->nullable()->after('company_name');
        });
    }

    public function down(): void
    {

        Schema::table('roi_current_projects', function (Blueprint $table) {
            $table->dropColumn('company_sap_code');
        });

        Schema::table('roi_archive_projects', function (Blueprint $table) {
            $table->dropColumn('company_sap_code');
        });
    }
};
