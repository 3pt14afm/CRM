<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'employee_id',
        'department_id',
        'location_id',
        'preparer_id',
        'reviewer_id',
        'checker_id',
        'endorser_id',
        'confirmer_id',
        'approver_id',
        'position',
        'email',

        'module_type',
        'activity_type',
        'subject_type',
        'subject_id',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subject()
    {
        return $this->morphTo();
    }
}