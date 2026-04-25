<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('preparer_id')->nullable()->after('location_id');
            $table->unsignedBigInteger('reviewer_id')->nullable()->after('preparer_id');
            $table->unsignedBigInteger('checker_id')->nullable()->after('reviewer_id');
            $table->unsignedBigInteger('endorser_id')->nullable()->after('checker_id');
            $table->unsignedBigInteger('confirmer_id')->nullable()->after('endorser_id');
            $table->unsignedBigInteger('approver_id')->nullable()->after('confirmer_id');

            $table->index('preparer_id');
            $table->index('reviewer_id');
            $table->index('checker_id');
            $table->index('endorser_id');
            $table->index('confirmer_id');
            $table->index('approver_id');
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex(['preparer_id']);
            $table->dropIndex(['reviewer_id']);
            $table->dropIndex(['checker_id']);
            $table->dropIndex(['endorser_id']);
            $table->dropIndex(['confirmer_id']);
            $table->dropIndex(['approver_id']);

            $table->dropColumn([
                'preparer_id',
                'reviewer_id',
                'checker_id',
                'endorser_id',
                'confirmer_id',
                'approver_id',
            ]);
        });
    }
};