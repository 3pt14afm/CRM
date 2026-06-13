<?php

namespace App\Models\SPRF;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SprfEntryItem extends Model
{
    protected $table = 'sprf_entry_items';

    protected $fillable = [
        'project_id',
        'row_key',
        'sort_order',
        'total_cost',
        'selling_price_per_unit_vat_inc',
        'total_selling_price_vat_inc',
        'markup_value',
    ];

    protected $casts = [
        'total_cost'                     => 'decimal:2',
        'selling_price_per_unit_vat_inc' => 'decimal:2',
        'total_selling_price_vat_inc'    => 'decimal:2',
        'markup_value'                   => 'decimal:2',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(SprfEntryProject::class, 'project_id');
    }

    public function subitems(): HasMany
    {
        return $this->hasMany(SprfEntryItemSubitem::class, 'item_id')
                    ->orderBy('sort_order');
    }
}