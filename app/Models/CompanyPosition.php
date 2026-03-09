<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyPosition extends Model
{
    protected $table = 'company_positions';
    protected $fillable = [
        'code',
        'name',
        'department',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

}