<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuthActivityLog extends Model
{
    protected $connection = 'mysql_logs';
    protected $table = 'auth_activity_logs';

  protected $fillable = [
    'yyyymm',
    'user_id',
    'email',
    'activity_type',
    'details',
    'metadata',
    'ip_address',
    'user_agent',
    'status',
];

protected $casts = [
    'metadata' => 'array',
];
}