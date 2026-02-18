<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roi_entry_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('roi_entry_project_id')
                ->constrained('roi_entry_projects')
                ->cascadeOnDelete();

            $table->string('client_row_id')->nullable();
            $table->string('kind'); // machine | consumable

            // inputs
            $table->string('sku');
            $table->decimal('qty', 12, 4)->default(0);
            $table->decimal('yields', 18, 4)->default(0);
            $table->string('mode')->nullable();
            $table->text('remarks')->nullable();

            $table->decimal('inputted_cost', 18, 6)->default(0);

            // computed per row
            $table->decimal('cost', 18, 6)->default(0);
            $table->decimal('price', 18, 6)->default(0);
            $table->decimal('base_per_year', 18, 6)->default(0);
            $table->decimal('total_cost', 18, 6)->default(0);
            $table->decimal('cost_cpp', 18, 10)->default(0);
            $table->decimal('total_sell', 18, 6)->default(0);
            $table->decimal('sell_cpp', 18, 10)->default(0);
            $table->decimal('machine_margin', 18, 6)->default(0);
            $table->decimal('machine_margin_total', 18, 6)->default(0);

            $table->timestamps();

            $table->index(['roi_entry_project_id', 'kind']);
            $table->index(['sku']);
            $table->index(['mode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roi_entry_items');
    }
};
