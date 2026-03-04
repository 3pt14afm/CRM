<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyPosition extends Model
{
    protected $table = 'company_positions';
    protected $fillable = ['name'];
}