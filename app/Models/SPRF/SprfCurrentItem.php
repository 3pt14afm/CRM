<?php

namespace App\Models\SPRF;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SprfCurrentItem extends Model
{
    protected $table = 'sprf_current_items';

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
        return $this->belongsTo(SprfCurrentProject::class, 'project_id');
    }

    public function subitems(): HasMany
    {
        return $this->hasMany(SprfCurrentItemSubitem::class, 'item_id')
                    ->orderBy('sort_order');
    }
}