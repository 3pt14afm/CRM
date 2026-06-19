<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'sprf_entry_projects',
            'sprf_current_projects',
            'sprf_archive_projects',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                // 1. Forward action timestamps
                $table->timestamp('dce_acted_at')->nullable()->after('director_customer_engagement_user_id');
                $table->timestamp('esd_acted_at')->nullable()->after('esd_director_user_id');
                $table->timestamp('vp_ccto_acted_at')->nullable()->after('vp_ccto_user_id');
                $table->timestamp('president_ceo_acted_at')->nullable()->after('president_ceo_user_id');

                // 2. JSON arrays for Notes and Comments
                $table->json('notes')->nullable()->after('rebate_justification');
                $table->json('comments')->nullable()->after('notes');
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'sprf_entry_projects',
            'sprf_current_projects',
            'sprf_archive_projects',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn([
                    'dce_acted_at',
                    'esd_acted_at',
                    'vp_ccto_acted_at',
                    'president_ceo_acted_at',
                    'notes',
                    'comments',
                ]);
            });
        }
    }
};