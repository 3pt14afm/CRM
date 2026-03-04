<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyEmployee extends Model
{
    protected $table = 'company_employees';

    protected $fillable = [
        'employee_code',
        'name',
        'position_id',
        'primary_location_id',
        'is_active',
    ];
}