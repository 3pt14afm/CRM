<?php

namespace App\Models\SPRF;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SprfApprovalMatrix extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'condition_code',
        'version',
        'is_active',
        'remarks',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function steps()
    {
        return $this->hasMany(SprfApprovalMatrixStep::class)
            ->orderBy('sequence');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function getConditionLabelAttribute(): string
    {
        return match ($this->condition_code) {
            'STANDARD_PRICING' => 'Standard Pricing',
            'VALUE_GT_1M' => 'Value > 1M',
            'GP_GT_15' => 'GP > 15%',
            'GP_LTE_15' => 'GP <= 15%',
            'REBATE_REQUEST' => 'Rebate Request',
            default => $this->condition_code,
        };
    }
}