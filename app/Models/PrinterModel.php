<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PrinterModel extends Model
{
    protected $fillable = [
        'printer_name',
        'unit_cost',
        'selling_price',
        'status',
    ];

    public function printerModelSupplies(): HasMany
    {
        return $this->hasMany(PrinterModelSupply::class);
    }

    public function supplies(): BelongsToMany
    {
        return $this->belongsToMany(
            Supply::class,
            'printer_model_supplies',
            'printer_model_id',
            'supply_id'
        )->withPivot('status')->withTimestamps();
    }
}