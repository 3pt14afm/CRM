<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $toDrop = array_filter(
                ['approved_at', 'rejected_at'],
                fn($col) => Schema::hasColumn('sprf_current_projects', $col)
            );
            if (!empty($toDrop)) {
                $table->dropColumn(array_values($toDrop));
            }
        });

        Schema::table('sprf_archive_projects', function (Blueprint $table) {
            $toDrop = array_filter(
                ['requires_vp_ccto', 'requires_president_ceo'],
                fn($col) => Schema::hasColumn('sprf_archive_projects', $col)
            );
            if (!empty($toDrop)) {
                $table->dropColumn(array_values($toDrop));
            }
        });
    }

    public function down(): void
    {
        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
        });

        Schema::table('sprf_archive_projects', function (Blueprint $table) {
            $table->boolean('requires_vp_ccto')->default(false);
            $table->boolean('requires_president_ceo')->default(false);
        });
    }
};
