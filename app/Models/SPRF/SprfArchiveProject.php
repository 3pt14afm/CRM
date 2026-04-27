<?php

namespace App\Models\SPRF;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SprfArchiveProject extends Model
{
    use SoftDeletes;

    protected $table = 'sprf_archive_projects';

    protected $fillable = [
        'entry_project_id',
        'current_project_id',
        'sprf_no',
        'document_datetime',
        'status',
        'current_level',
        'approval_level',

        'sprf_approval_matrix_id',
        'approval_condition_code',

        'prepared_by_user_id',
        'director_customer_engagement_user_id',
        'esd_director_user_id',
        'vp_ccto_user_id',
        'president_ceo_user_id',
        'current_approver_user_id',
        'approved_by_user_id',
        'rejected_by_user_id',

        'sub_category',
        'account',
        'account_manager',

        'remarks',
        'rebate_justification',
        'last_reject_note',

        'revenue',
        'cogs',
        'other_expense_total',
        'total_expense',
        'gp_value',
        'gp_percent',

        'requires_vp_ccto',
        'requires_president_ceo',
        'requires_rebate_justification',

        'last_saved_at',
        'submitted_at',
        'approved_at',
        'rejected_at',
    ];

    protected $casts = [
        'document_datetime' => 'datetime',
        'revenue' => 'decimal:2',
        'cogs' => 'decimal:2',
        'other_expense_total' => 'decimal:2',
        'total_expense' => 'decimal:2',
        'gp_value' => 'decimal:2',
        'gp_percent' => 'decimal:2',
        'requires_vp_ccto' => 'boolean',
        'requires_president_ceo' => 'boolean',
        'requires_rebate_justification' => 'boolean',
        'last_saved_at' => 'datetime',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(SprfArchiveItem::class, 'project_id');
    }

    public function fees()
    {
        return $this->hasMany(SprfArchiveFee::class, 'project_id');
    }

    public function preparer()
    {
        return $this->belongsTo(User::class, 'prepared_by_user_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function rejectedBy()
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function scopeFinalized($query)
    {
        return $query->whereIn('status', ['approved', 'rejected']);
    }
}