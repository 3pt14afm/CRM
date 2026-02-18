<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoiArchiveItem extends Model
{
    protected $table = 'roi_archive_items';

    protected $fillable = [
        'roi_archive_project_id',
        'client_row_id',
        'kind',

        'sku','qty','yields','mode','remarks',
        'inputted_cost',

        'cost','price','base_per_year','total_cost','cost_cpp',
        'total_sell','sell_cpp','machine_margin','machine_margin_total',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(RoiArchiveProject::class, 'roi_archive_project_id');
    }
}
