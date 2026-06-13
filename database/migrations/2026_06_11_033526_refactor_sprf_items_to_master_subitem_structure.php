<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $tables = ['sprf_entry_items', 'sprf_current_items', 'sprf_archive_items'];

    private array $pairs = [
        'sprf_entry_items'   => 'sprf_entry_item_subitems',
        'sprf_current_items' => 'sprf_current_item_subitems',
        'sprf_archive_items' => 'sprf_archive_item_subitems',
    ];

    public function up(): void
    {
        // 1. Migrate existing parent-row item data into subitems
        foreach ($this->pairs as $masterTable => $subTable) {
            $rows = DB::table($masterTable)->get();

            foreach ($rows as $row) {
                $hasItemData = !blank($row->product_code)
                    || !blank($row->item_description)
                    || $row->qty !== null
                    || $row->cost_per_unit !== null
                    || $row->markup_percent !== null;

                if (!$hasItemData) {
                    continue;
                }

                // Shift existing subitems' sort_order up by 1 to make room at position 1
                DB::table($subTable)
                    ->where('item_id', $row->id)
                    ->increment('sort_order');

                DB::table($subTable)->insert([
                    'item_id'          => $row->id,
                    'row_key'          => $row->row_key . '-migrated',
                    'sort_order'       => 1,
                    'product_code'     => $row->product_code,
                    'item_description' => $row->item_description,
                    'qty'              => $row->qty,
                    'disty'            => $row->disty,
                    'cost_per_unit'    => $row->cost_per_unit,
                    'total_cost'       => $row->total_cost,
                    'markup_percent'   => $row->markup_percent,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
            }
        }

        // 2. Strip product-level columns from master tables
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                foreach (['product_code', 'item_description', 'qty', 'disty', 'cost_per_unit', 'markup_percent'] as $col) {
                    if (Schema::hasColumn($table, $col)) {
                        $t->dropColumn($col);
                    }
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                $t->string('product_code')->nullable()->after('row_key');
                $t->text('item_description')->nullable()->after('product_code');
                $t->unsignedInteger('qty')->nullable()->after('item_description');
                $t->string('disty')->nullable()->after('qty');
                $t->decimal('cost_per_unit', 15, 2)->nullable()->after('disty');
                $t->decimal('markup_percent', 8, 2)->nullable()->after('markup_value');
            });
        }

        // Note: migrated subitem rows are NOT moved back automatically.
    }
};