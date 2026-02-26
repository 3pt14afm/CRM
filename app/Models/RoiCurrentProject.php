<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoiCurrentProject extends Model
{
    protected $table = 'roi_current_projects';

    protected $fillable = [
        'user_id',
        'project_uid',
        'reference',
        'version',
        'last_saved_at',

        // workflow/status
        'status',
        'status_reason',
        'status_updated_at',
        'status_updated_by',
        'submitted_at',
        'current_level',

        // audit names (optional - you already have these columns)
        'reviewed_by',
        'checked_by',
        'endorsed_by',
        'confirmed_by',
        'approved_by',

        // company info
        'company_name',
        'contract_years',
        'contract_type',
        'bundled_std_ink',
        'purpose',

        // interest
        'annual_interest',
        'percent_margin',

        // yield
        'mono_yield_monthly',
        'mono_yield_annual',
        'color_yield_monthly',
        'color_yield_annual',

        // machine totals
        'mc_unit_cost',
        'mc_qty',
        'mc_total_cost',
        'mc_yields',
        'mc_cost_cpp',
        'mc_selling_price',
        'mc_total_sell',
        'mc_sell_cpp',
        'mc_total_bundled_price',

        // fees + grand totals
        'fees_total',
        'grand_total_cost',
        'grand_total_revenue',
        'grand_roi',
        'grand_roi_percentage',

        // snapshots / json
        'yearly_breakdown',
        'notes',
        'comments',
    ];

    protected $casts = [
        'last_saved_at' => 'datetime',
        'submitted_at' => 'datetime',
        'status_updated_at' => 'datetime',

        'bundled_std_ink' => 'boolean',
        'yearly_breakdown' => 'array',
        'notes' => 'array',
        'comments' => 'array',

        'current_level' => 'integer',
        'status_updated_by' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(RoiCurrentItem::class, 'roi_current_project_id');
    }

    public function fees(): HasMany
    {
        return $this->hasMany(RoiCurrentFee::class, 'roi_current_project_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}