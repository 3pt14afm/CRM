<?php

namespace App\Models\SPRF;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class SprfCurrentProject extends Model
{
    protected $table = 'sprf_current_projects';

    protected $fillable = [
        'sprf_no',
        'document_datetime',
        'status',
        'current_level',
        'approval_level',

        'approval_condition_code',
        'location_id',
        'department_id',

        'prepared_by_user_id',
        'director_customer_engagement_user_id',
        'dce_acted_at',
        'esd_director_user_id',
        'esd_acted_at',
        'vp_ccto_user_id',
        'vp_ccto_acted_at',
        'president_ceo_user_id',
        'president_ceo_acted_at',
        'current_approver_user_id',

        'sub_category',
        'account',
        'account_manager',

        'remarks',
        'rebate_justification',
        'notes',
        'comments',
        
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
        'dce_acted_at' => 'datetime',
        'esd_acted_at' => 'datetime',
        'vp_ccto_acted_at' => 'datetime',
        'president_ceo_acted_at' => 'datetime',
        'notes' => 'array',
        'comments' => 'array',
    ];

    public function items()
    {
        return $this->hasMany(SprfCurrentItem::class, 'project_id');
    }

    public function fees()
    {
        return $this->hasMany(SprfCurrentFee::class, 'project_id');
    }

    public function preparer()
    {
        return $this->belongsTo(User::class, 'prepared_by_user_id');
    }

    public function currentApprover()
    {
        return $this->belongsTo(User::class, 'current_approver_user_id');
    }

    public function scopeQueue($query)
    {
        return $query->whereIn('status', ['submitted', 'under_review']);
    }
}