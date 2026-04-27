<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SprfActivityLog extends Model
{
    protected $connection = 'mysql_logs';
    protected $table = 'sprf_activity_logs';

    protected $fillable = [
    'yyyymm',

    'user_id',
    'first_name',
    'last_name',
    'employee_id',
    'department_id',
    'location_id',
    'position',
    'email',

    'sprf_entry_project_id',
    'sprf_no',

    'prepared_by_user_id',
    'director_customer_engagement_user_id',
    'esd_director_user_id',
    'vp_ccto_user_id',
    'president_ceo_user_id',
    'current_approver_user_id',
    'approved_by_user_id',
    'rejected_by_user_id',

    'sprf_status',
    'current_level',
    'approval_level',
    'approval_condition_code',

    'sub_category',
    'account',
    'account_manager',

    'revenue',
    'cogs',
    'other_expense_total',
    'total_expense',
    'gp_value',
    'gp_percent',

    'module_type',
    'activity_type',
    'old_values',
    'new_values',
    'activity_details',
    'ip_address',
    'user_agent',
    'route_name',
    'url',
    'method',
    'status',
];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function subject()
    {
        return $this->morphTo();
    }
}