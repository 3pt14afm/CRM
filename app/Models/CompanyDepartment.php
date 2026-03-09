<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyDepartment extends Model
{
    protected $table = 'company_departments';

    protected $fillable = [
        'code',
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function positions()
    {
        return $this->hasMany(CompanyPosition::class, 'department_id');
    }
}