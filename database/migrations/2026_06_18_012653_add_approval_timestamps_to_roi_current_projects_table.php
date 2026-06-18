<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roi_current_projects', function (Blueprint $table) {
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            $table->timestamp('checked_at')->nullable()->after('checked_by');
            $table->timestamp('endorsed_at')->nullable()->after('endorsed_by');
            $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('roi_current_projects', function (Blueprint $table) {
            $table->dropColumn([
                'reviewed_at',
                'checked_at',
                'endorsed_at',
                'confirmed_at',
                'approved_at',
            ]);
        });
    }
};