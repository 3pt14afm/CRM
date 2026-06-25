<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roi_archive_projects', function (Blueprint $table) {
            $table->unsignedBigInteger('cancelled_by')->nullable()->after('rejected_by_level');
            $table->timestamp('cancelled_at')->nullable()->after('cancelled_by');
            $table->unsignedTinyInteger('cancelled_by_level')->nullable()->default(1)->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('roi_archive_projects', function (Blueprint $table) {
            $table->dropColumn(['cancelled_by', 'cancelled_at', 'cancelled_by_level']);
        });
    }
};