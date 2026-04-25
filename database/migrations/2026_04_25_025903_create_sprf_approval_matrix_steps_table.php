<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sprf_approval_matrix_steps', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sprf_approval_matrix_id')
                ->constrained('sprf_approval_matrices')
                ->cascadeOnDelete();

            $table->string('role', 50);
            $table->unsignedTinyInteger('sequence');

            $table->foreignId('position_id')
                ->constrained('company_positions')
                ->restrictOnDelete();

            $table->foreignId('approver_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('resolution_mode', 30)->default('position');

            $table->timestamps();

            $table->unique(
                ['sprf_approval_matrix_id', 'role'],
                'sprf_matrix_steps_matrix_role_unique'
            );

            $table->index(['role', 'sequence'], 'sprf_matrix_steps_role_sequence_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprf_approval_matrix_steps');
    }
};