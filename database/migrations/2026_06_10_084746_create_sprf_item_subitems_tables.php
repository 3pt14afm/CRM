<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $pairs = [
        'sprf_entry_item_subitems'   => 'sprf_entry_items',
        'sprf_current_item_subitems' => 'sprf_current_items',
        'sprf_archive_item_subitems' => 'sprf_archive_items',
    ];

    public function up(): void
    {
        // Remove columns that don't belong on parent item tables
        foreach (array_values($this->pairs) as $parentTable) {
            Schema::table($parentTable, function (Blueprint $table) use ($parentTable) {
                if (Schema::hasColumn($parentTable, 'row_type')) {
                    $table->dropColumn('row_type');
                }
                if (Schema::hasColumn($parentTable, 'parent_row_key')) {
                    $table->dropColumn('parent_row_key');
                }
            });
        }

        // Create subitem tables
        foreach ($this->pairs as $subTable => $parentTable) {
            Schema::dropIfExists($subTable);
            Schema::create($subTable, function (Blueprint $table) use ($parentTable) {
                $table->id();

                $table->foreignId('item_id')
                      ->constrained($parentTable)
                      ->cascadeOnDelete();

                $table->string('row_key')->nullable();
                $table->unsignedSmallInteger('sort_order')->default(0);

                $table->string('product_code')->nullable();
                $table->text('item_description')->nullable();
                $table->unsignedInteger('qty')->nullable();
                $table->string('disty')->nullable();
                $table->decimal('cost_per_unit', 15, 2)->nullable();
                $table->decimal('total_cost', 15, 2)->nullable();
                $table->decimal('markup_percent', 8, 2)->nullable();

                $table->timestamps();

                $table->index(['item_id', 'sort_order']);
            });
        }
    }

    public function down(): void
    {
        foreach (array_keys($this->pairs) as $subTable) {
            Schema::dropIfExists($subTable);
        }

        foreach (array_values($this->pairs) as $parentTable) {
            Schema::table($parentTable, function (Blueprint $table) {
                $table->string('row_type')->default('item')->after('row_key');
                $table->string('parent_row_key')->nullable()->after('row_type');
            });
        }
    }
};