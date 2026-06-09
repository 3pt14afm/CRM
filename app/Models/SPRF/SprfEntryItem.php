<?php

namespace App\Models\SPRF;

use Illuminate\Database\Eloquent\Model;

class SprfEntryItem extends Model
{
    protected $table = 'sprf_entry_items';

    protected $fillable = [
        'project_id',
        'row_key',
        'row_type',
        'parent_row_key',
        'product_code',
        'item_description',
        'qty',
        'disty',
        'cost_per_unit',
        'total_cost',
        'selling_price_per_unit_vat_inc',
        'total_selling_price_vat_inc',
        'markup_value',
        'markup_percent',
    ];

    protected $casts = [
        'qty' => 'integer',
        'cost_per_unit' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'selling_price_per_unit_vat_inc' => 'decimal:2',
        'total_selling_price_vat_inc' => 'decimal:2',
        'markup_value' => 'decimal:2',
        'markup_percent' => 'decimal:2',
    ];

    public function project()
    {
        return $this->belongsTo(SprfEntryProject::class, 'project_id');
    }
}
