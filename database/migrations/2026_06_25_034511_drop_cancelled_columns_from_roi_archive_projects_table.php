<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roi_archive_projects', function (Blueprint $table) {
            $table->dropColumn(['cancelled_by', 'cancelled_by_level']);
        });
    }

    public function down(): void
    {
        Schema::table('roi_archive_projects', function (Blueprint $table) {
            $table->unsignedBigInteger('cancelled_by')->nullable()->after('rejected_by_level');
            $table->unsignedTinyInteger('cancelled_by_level')->nullable()->default(1)->after('cancelled_at');
        });
    }
};