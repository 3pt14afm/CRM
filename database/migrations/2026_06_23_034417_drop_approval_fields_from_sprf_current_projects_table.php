<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->dropForeign('sprf_cur_appr_fk');
            $table->dropForeign('sprf_cur_rej_fk');

            $table->dropColumn([
                'approved_by_user_id',
                'rejected_by_user_id',
                'last_reject_note',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('sprf_current_projects', function (Blueprint $table) {
            $table->foreignId('approved_by_user_id')->nullable();
            $table->foreignId('rejected_by_user_id')->nullable();
            $table->text('last_reject_note')->nullable();

            $table->foreign('approved_by_user_id', 'sprf_cur_appr_fk')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('rejected_by_user_id', 'sprf_cur_rej_fk')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }
};