<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoiChatSession extends Model
{
    protected $fillable = [
        'user_id',
        'stage',
        'state',
    ];

    protected $casts = [
        'state' => 'array',
    ];

    public function messages()
    {
        return $this->hasMany(RoiChatMessage::class, 'session_id');
    }
}