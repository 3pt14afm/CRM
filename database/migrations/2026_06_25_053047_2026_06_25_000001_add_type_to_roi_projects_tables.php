<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roi_entry_projects', function (Blueprint $table) {
            $table->tinyInteger('type')->default(0)->after('status')->comment('0 = potential, 1 = existing');
        });

        Schema::table('roi_current_projects', function (Blueprint $table) {
            $table->tinyInteger('type')->default(0)->after('status')->comment('0 = potential, 1 = existing');
        });

        Schema::table('roi_archive_projects', function (Blueprint $table) {
            $table->tinyInteger('type')->default(0)->after('status')->comment('0 = potential, 1 = existing');
        });
    }

    public function down(): void
    {
        Schema::table('roi_entry_projects', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('roi_current_projects', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('roi_archive_projects', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};