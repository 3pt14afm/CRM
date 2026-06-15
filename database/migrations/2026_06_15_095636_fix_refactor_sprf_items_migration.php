<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $pairs = [
        'sprf_entry_items'   => 'sprf_entry_item_subitems',
        'sprf_current_items' => 'sprf_current_item_subitems',
        'sprf_archive_items' => 'sprf_archive_item_subitems',
    ];

    private array $columnsToDrop = [
        'product_code', 'item_description', 'qty',
        'disty', 'cost_per_unit', 'markup_percent'
    ];

    public function up(): void
    {
        DB::transaction(function () {

            // Step 1: Fix any data that didn't migrate due to crash
            foreach ($this->pairs as $masterTable => $subTable) {

                // Check if columns still exist — if not, skip data migration entirely
                $hasColumns = Schema::hasColumn($masterTable, 'product_code');

                if (!$hasColumns) {
                    continue;
                }

                DB::table($masterTable)
                    ->orderBy('id')
                    ->chunk(500, function ($rows) use ($subTable) {

                        $rowIds = $rows->pluck('id')->all();

                        // ✅ One query per chunk instead of one per row
                        $alreadyMigratedIds = DB::table($subTable)
                            ->whereIn('item_id', $rowIds)
                            ->where('row_key', 'like', '%-migrated')
                            ->pluck('item_id')
                            ->all();

                        $inserts = [];
                        $itemIds = [];

                        foreach ($rows as $row) {

                            // Skip if already migrated
                            if (in_array($row->id, $alreadyMigratedIds)) {
                                continue;
                            }

                            // Safe blank check without using blank()
                            $hasItemData = ($row->product_code !== null && $row->product_code !== '')
                                || ($row->item_description !== null && $row->item_description !== '')
                                || $row->qty !== null
                                || $row->cost_per_unit !== null
                                || $row->markup_percent !== null;

                            if (!$hasItemData) {
                                continue;
                            }

                            $itemIds[] = $row->id;
                            $inserts[] = [
                                'item_id'          => $row->id,
                                'row_key'          => $row->row_key . '-migrated',
                                'sort_order'       => 1,
                                'product_code'     => $row->product_code,
                                'item_description' => $row->item_description,
                                'qty'              => $row->qty,
                                'disty'            => $row->disty ?? null,
                                'cost_per_unit'    => $row->cost_per_unit,
                                'total_cost'       => $row->total_cost ?? null,
                                'markup_percent'   => $row->markup_percent,
                                'created_at'       => now(),
                                'updated_at'       => now(),
                            ];
                        }

                        if (!empty($itemIds)) {
                            DB::table($subTable)
                                ->whereIn('item_id', $itemIds)
                                ->increment('sort_order');
                        }

                        if (!empty($inserts)) {
                            DB::table($subTable)->insert($inserts);
                        }
                    });
            }

            // Step 2: Drop remaining columns safely (all at once, not in a loop)
            foreach ($this->pairs as $masterTable => $_) {
                $existingColumns = array_filter(
                    $this->columnsToDrop,
                    fn($col) => Schema::hasColumn($masterTable, $col)
                );

                if (!empty($existingColumns)) {
                    Schema::table($masterTable, function (Blueprint $t) use ($existingColumns) {
                        $t->dropColumn(array_values($existingColumns));
                    });
                }
            }
        });
    }

    public function down(): void
    {
        foreach (array_values($this->pairs) as $subTable) {
            DB::table($subTable)
                ->where('row_key', 'like', '%-migrated')
                ->delete();
        }
    }
};