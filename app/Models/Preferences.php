<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Preferences extends Model
{
    protected $table = 'preferences';

    protected $fillable = [
        'settings_id',
        'settings_key',
        'setting_value',
        'entity_attribute',
        'is_active',
    ];

    protected $casts = [
        'setting_value' => 'integer',
        'is_active' => 'boolean',
    ];
}