<?php

namespace App\Models\SPRF;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SprfEntryItemSubitem extends Model
{
    protected $table = 'sprf_entry_item_subitems';

    protected $fillable = [
        'item_id',
        'row_key',
        'sort_order',
        'product_code',
        'item_description',
        'qty',
        'disty',
        'cost_per_unit',
        'total_cost',
        'markup_percent',
    ];

    protected $casts = [
        'qty'            => 'integer',
        'cost_per_unit'  => 'decimal:2',
        'total_cost'     => 'decimal:2',
        'markup_percent' => 'decimal:4',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(SprfEntryItem::class, 'item_id');
    }
}