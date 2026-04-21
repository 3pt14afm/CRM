<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sprf_current_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')->constrained('sprf_current_projects')->cascadeOnDelete();

            $table->string('product_code')->nullable();
            $table->text('item_description')->nullable();
            $table->decimal('qty', 15, 2)->default(0);
            $table->string('disty')->nullable();
            $table->decimal('cost_per_unit', 15, 2)->default(0);

            $table->decimal('total_cost', 15, 2)->default(0);
            $table->decimal('selling_price_per_unit_vat_inc', 15, 2)->default(0);
            $table->decimal('total_selling_price_vat_inc', 15, 2)->default(0);
            $table->decimal('markup_value', 15, 2)->default(0);
            $table->decimal('markup_percent', 8, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprf_current_items');
    }
};