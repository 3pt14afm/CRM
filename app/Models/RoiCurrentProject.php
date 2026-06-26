<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RoiCurrentProject extends Model
{
    protected $table = 'roi_current_projects';

    protected $fillable = [
        'user_id',
        'location_id',
        'project_uid',
        'reference',
        'version',
        'last_saved_at',
        'status',
        'type',
        'company_id',
        'status_reason',
        'status_updated_at',
        'status_updated_by',
        'submitted_at',
        'current_level',
        'reviewed_by',
        'reviewed_at',
        'checked_by',
        'checked_at',
        'endorsed_by',
        'endorsed_at',
        'confirmed_by',
        'confirmed_at',
        'approved_by',
        'approved_at',
        'company_name',
        'company_sap_code',
        'contract_years',
        'contract_type',
        'bundled_std_ink',
        'purpose',
        'annual_interest',
        'percent_margin',
        'mono_yield_monthly',
        'mono_yield_annual',
        'color_yield_monthly',
        'color_yield_annual',
        'entry_remarks',
        'entry_remarks_attachments',
        'mc_unit_cost',
        'mc_qty',
        'mc_total_cost',
        'mc_yields',
        'mc_cost_cpp',
        'mc_selling_price',
        'mc_total_sell',
        'mc_sell_cpp',
        'mc_total_bundled_price',
        'fees_total',
        'grand_total_cost',
        'grand_total_revenue',
        'grand_roi',
        'grand_roi_percentage',
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
        'entry_remarks_attachments' => 'array',
        'notes' => 'array',
        'comments' => 'array',
        'user_id' => 'integer',
        'location_id' => 'integer',
        'current_level' => 'integer',
        'status_updated_by' => 'integer',
        'reviewed_by' => 'integer',
        'reviewed_at' => 'datetime',
        'checked_by' => 'integer',
        'checked_at' => 'datetime',
        'endorsed_by' => 'integer',
        'endorsed_at' => 'datetime',
        'confirmed_by' => 'integer',
        'confirmed_at' => 'datetime',
        'approved_by' => 'integer',
        'approved_at' => 'datetime',
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

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function reviewedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function checkedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }

    public function endorsedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'endorsed_by');
    }

    public function confirmedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function statusUpdatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'status_updated_by');
    }
}