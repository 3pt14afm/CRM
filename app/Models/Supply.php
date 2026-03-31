<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supply extends Model
{
    protected $fillable = [
        'item_code',
        'category',
        'print_type',
        'supply_name',
        'yield',
        'unit_cost',
        'selling_price',
        'status',
    ];

    public function printerModelSupplies(): HasMany
    {
        return $this->hasMany(PrinterModelSupply::class);
    }

    public function printerModels(): BelongsToMany
    {
        return $this->belongsToMany(
            PrinterModel::class,
            'printer_model_supplies',
            'supply_id',
            'printer_model_id'
        )->withPivot('status')->withTimestamps();
    }
}