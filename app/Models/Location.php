<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $fillable = ['name', 'code', 'phone_number', 'address', 'is_active'];
    
    protected $casts = [
        'is_active' => 'boolean',
    ];

}