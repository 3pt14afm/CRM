<?php

namespace App\Models\SPRF;

use App\Models\User;
use App\Models\CompanyPosition;
use Illuminate\Database\Eloquent\Model;

class SprfApprovalMatrixStep extends Model
{
    protected $fillable = [
        'sprf_approval_matrix_id',
        'role',
        'sequence',
        'position_id',
        'approver_user_id',
        'resolution_mode',
    ];

    protected $casts = [
        'sequence' => 'integer',
    ];

    public function matrix()
    {
        return $this->belongsTo(SprfApprovalMatrix::class, 'sprf_approval_matrix_id');
    }

    public function position()
    {
        return $this->belongsTo(CompanyPosition::class, 'position_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approver_user_id');
    }

    public function getRoleLabelAttribute(): string
    {
        return match ($this->role) {
            'DIRECTOR_CUSTOMER_ENGAGEMENT' => 'Director - Customer Engagement',
            'ESD_DIRECTOR' => 'ESD Director',
            'VP_CCTO' => 'VP & CCTO',
            'PRESIDENT_CEO' => 'President & CEO',
            default => $this->role,
        };
    }
}