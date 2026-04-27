<?php

namespace App\Models\SPRF;

use Illuminate\Database\Eloquent\Model;

class SprfNumberSequence extends Model
{
    protected $fillable = [
        'period',
        'last_number',
    ];

    protected $casts = [
        'last_number' => 'integer',
    ];
}