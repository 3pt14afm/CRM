<?php

namespace App\Services;

use App\Models\AuthActivityLog;
use Illuminate\Support\Facades\Auth;

class AuthActivityLogger
{
    public static function log(
        string $activityType,
        ?string $details = null,
        string $status = 'success',
        $user = null,
        ?array $metadata = null
    ): void {
        $user = $user ?? Auth::user();

        AuthActivityLog::create([
            'yyyymm' => now()->format('Ym'),
            'user_id' => $user?->id,
            'email' => $user?->email,

            'activity_type' => $activityType,
            'details' => $details,
            'metadata' => $metadata,

            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'status' => $status,
        ]);
    }
}