<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('company_employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_code')->nullable()->unique();
            $table->string('name');

            $table->foreignId('position_id')
                ->constrained('company_positions')
                ->restrictOnDelete();

            $table->foreignId('primary_location_id')
                ->constrained('locations')
                ->restrictOnDelete();

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['position_id', 'is_active']);
            $table->index(['primary_location_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_employees');
    }
};