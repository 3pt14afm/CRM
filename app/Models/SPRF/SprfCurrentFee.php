<?php

namespace App\Models\SPRF;

use Illuminate\Database\Eloquent\Model;

class SprfCurrentFee extends Model
{
    protected $table = 'sprf_current_fees';

    protected $fillable = [
        'project_id',
        'expense_key',
        'is_fixed',
        'product_code',
        'item_description',
        'qty',
        'unit_price',
        'total',
    ];

    protected $casts = [
        'is_fixed' => 'boolean',
        'qty' => 'integer',
        'unit_price' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function project()
    {
        return $this->belongsTo(SprfCurrentProject::class, 'project_id');
    }
}