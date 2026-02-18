<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoiCurrentFee extends Model
{
    protected $table = 'roi_current_fees';

    protected $fillable = [
        'roi_current_project_id',
        'client_row_id',
        'payer',

        'label','category','remarks',
        'cost','qty','total',

        'is_machine',
    ];

    protected $casts = [
        'is_machine' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(RoiCurrentProject::class, 'roi_current_project_id');
    }
}
