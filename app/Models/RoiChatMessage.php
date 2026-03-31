<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoiChatMessage extends Model
{
    protected $fillable = [
        'session_id',
        'role',
        'content',
    ];

    public function session()
    {
        return $this->belongsTo(RoiChatSession::class, 'session_id');
    }
}