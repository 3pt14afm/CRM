<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Entry Projects Table
        Schema::table('sprf_entry_projects', function (Blueprint $table) {
            $table->json('remarks_attachments')->nullable()->after('remarks');
        });

        // 2. Current/Active Projects Table
        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->json('remarks_attachments')->nullable()->after('remarks');
        });

        // 3. Archive/History Projects Table
        Schema::table('sprf_archive_projects', function (Blueprint $table) {
            $table->json('remarks_attachments')->nullable()->after('remarks');
        });
    }

    public function down(): void
    {
        Schema::table('sprf_entry_projects', function (Blueprint $table) { $table->dropColumn('remarks_attachments'); });
        Schema::table('sprf_current_projects', function (Blueprint $table) { $table->dropColumn('remarks_attachments'); });
        Schema::table('sprf_archive_projects', function (Blueprint $table) { $table->dropColumn('remarks_attachments'); });
    }
};

