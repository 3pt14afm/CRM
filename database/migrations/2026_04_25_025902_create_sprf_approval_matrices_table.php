<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sprf_approval_matrices', function (Blueprint $table) {
            $table->id();

            $table->string('condition_code', 50);
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_active')->default(false);

            /*
             * Allows many inactive matrices per condition,
             * but only one active matrix per condition.
             */
            $table->string('active_condition_code', 50)
                ->nullable()
                ->storedAs("case when is_active = 1 then condition_code else null end");

            $table->text('remarks')->nullable();

            $table->foreignId('created_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('updated_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['condition_code', 'version'], 'sprf_matrix_condition_version_unique');
            $table->unique('active_condition_code', 'sprf_matrix_one_active_per_condition_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprf_approval_matrices');
    }
};