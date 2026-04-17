<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up(): void
{
    Schema::table('roi_entry_projects', function (Blueprint $table) {
        // Adding the column after company_name for better organization
        $table->string('company_sap_code')->nullable()->after('company_name');
    });
}

public function down(): void
{
    Schema::table('roi_entry_projects', function (Blueprint $table) {
        $table->dropColumn('company_sap_code');
    });
}
};
