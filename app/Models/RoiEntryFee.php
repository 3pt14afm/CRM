<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoiEntryFee extends Model
{
    protected $table = 'roi_entry_fees';

    protected $fillable = [
        'roi_entry_project_id',
        'client_row_id',
        'payer',

        'label',
        'category',
        'remarks',

        'cost',
        'qty',
        'total',
        'is_machine',
    ];

    protected $casts = [
        'cost' => 'float',
        'qty' => 'float',
        'total' => 'float',
        'is_machine' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(RoiEntryProject::class, 'roi_entry_project_id');
    }
}
