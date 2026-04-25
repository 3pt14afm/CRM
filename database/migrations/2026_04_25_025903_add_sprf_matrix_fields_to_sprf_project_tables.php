<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'sprf_entry_projects',
        'sprf_current_projects',
        'sprf_archive_projects',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->foreignId('sprf_approval_matrix_id')
                    ->nullable()
                    ->after('approval_level')
                    ->constrained('sprf_approval_matrices')
                    ->nullOnDelete();

                $table->string('approval_condition_code', 50)
                    ->nullable()
                    ->after('sprf_approval_matrix_id');

                $table->index(
                    'approval_condition_code',
                    "{$tableName}_approval_condition_code_index"
                );
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropForeign(['sprf_approval_matrix_id']);
                $table->dropIndex("{$tableName}_approval_condition_code_index");

                $table->dropColumn([
                    'sprf_approval_matrix_id',
                    'approval_condition_code',
                ]);
            });
        }
    }
};