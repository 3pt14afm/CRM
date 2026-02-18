<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoiCurrentItem extends Model
{
    protected $table = 'roi_current_items';

    protected $fillable = [
        'roi_current_project_id',
        'client_row_id',
        'kind',

        'sku','qty','yields','mode','remarks',
        'inputted_cost',

        'cost','price','base_per_year','total_cost','cost_cpp',
        'total_sell','sell_cpp','machine_margin','machine_margin_total',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(RoiCurrentProject::class, 'roi_current_project_id');
    }
}
