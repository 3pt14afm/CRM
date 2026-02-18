<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoiEntryItem extends Model
{
    protected $table = 'roi_entry_items';

    protected $fillable = [
        'roi_entry_project_id',
        'client_row_id',
        'kind',

        'sku',
        'qty',
        'yields',
        'mode',
        'remarks',

        'inputted_cost',

        'cost',
        'price',
        'base_per_year',
        'total_cost',
        'cost_cpp',
        'total_sell',
        'sell_cpp',
        'machine_margin',
        'machine_margin_total',
    ];

    protected $casts = [
        'qty' => 'float',
        'yields' => 'float',
        'inputted_cost' => 'float',
        'cost' => 'float',
        'price' => 'float',
        'base_per_year' => 'float',
        'total_cost' => 'float',
        'cost_cpp' => 'float',
        'total_sell' => 'float',
        'sell_cpp' => 'float',
        'machine_margin' => 'float',
        'machine_margin_total' => 'float',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(RoiEntryProject::class, 'roi_entry_project_id');
    }
}
