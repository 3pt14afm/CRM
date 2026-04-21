<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sprf_entry_fees', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')->constrained('sprf_entry_projects')->cascadeOnDelete();

            $table->string('expense_key')->nullable();
            $table->boolean('is_fixed')->default(false);

            $table->string('product_code')->nullable();
            $table->text('item_description')->nullable();

            $table->decimal('qty', 15, 2)->default(0);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprf_entry_fees');
    }
};