<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrinterSupplyPageSupply extends Model
{
    protected $fillable = [
        'supply_id',
        'status',
    ];

    public function supply(): BelongsTo
    {
        return $this->belongsTo(Supply::class);
    }
}