<?php

namespace App\Models\CustomerInfo;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $table = 'erms.tbl_location';

    protected $casts = [
        'status' => 'integer',
    ];
}