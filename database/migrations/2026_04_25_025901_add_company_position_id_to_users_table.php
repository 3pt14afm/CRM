<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_position_id')
                ->nullable()
                ->after('department_id')
                ->constrained('company_positions')
                ->nullOnDelete();

            $table->index(
                ['company_position_id', 'is_banned'],
                'users_company_position_id_is_banned_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['company_position_id']);
            $table->dropIndex('users_company_position_id_is_banned_index');
            $table->dropColumn('company_position_id');
        });
    }
};