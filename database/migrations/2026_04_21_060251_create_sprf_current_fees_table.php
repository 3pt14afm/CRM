<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sprf_current_fees', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')->constrained('sprf_current_projects')->cascadeOnDelete();

            $table->string('expense_key')->nullable();
            $table->boolean('is_fixed')->default(false);

            $table->string('product_code')->nullable();
            $table->text('item_description')->nullable();

            $table->unsignedInteger('qty')->nullable();
            $table->decimal('unit_price', 15, 2)->nullable();
            $table->decimal('total', 15, 2)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprf_current_fees');
    }
};