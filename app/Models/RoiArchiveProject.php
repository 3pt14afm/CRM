<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoiArchiveProject extends Model
{
    protected $table = 'roi_archive_projects';

    protected $fillable = [
        'user_id','project_uid','reference','version','last_saved_at','status',

        // ✅ carry workflow signatories into archive (Level 2-5)
        'reviewed_by',
        'checked_by',
        'endorsed_by',
        'confirmed_by',

        // ✅ approve metadata
        'approved_at','approved_by',

        // ✅ reject metadata
        'rejected_at','rejected_by','rejected_by_level',

        'company_name','contract_years','contract_type','bundled_std_ink',

        'annual_interest','percent_margin',

        'mono_yield_monthly','mono_yield_annual','color_yield_monthly','color_yield_annual',

        'mc_unit_cost','mc_qty','mc_total_cost','mc_yields','mc_cost_cpp',
        'mc_selling_price','mc_total_sell','mc_sell_cpp','mc_total_bundled_price',

        'fees_total',

        'grand_total_cost','grand_total_revenue','grand_roi','grand_roi_percentage',

        'yearly_breakdown','notes','comments',
    ];

    protected $casts = [
        'last_saved_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',

        'bundled_std_ink' => 'boolean',
        'yearly_breakdown' => 'array',
        'notes' => 'array',
        'comments' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RoiArchiveItem::class, 'roi_archive_project_id');
    }

    public function fees(): HasMany
    {
        return $this->hasMany(RoiArchiveFee::class, 'roi_archive_project_id');
    }
}