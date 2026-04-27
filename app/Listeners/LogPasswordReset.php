<?php

namespace App\Listeners;

use App\Services\AuthActivityLogger;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Log;

class LogPasswordReset
{
    public function handle(PasswordReset $event): void
    {
        try {
            AuthActivityLogger::log(
                activityType: 'password_reset',
                details: 'User reset password',
                user: $event->user
            );
        } catch (\Throwable $e) {
            Log::error('Password reset activity log failed', [
                'message' => $e->getMessage(),
                'user_id' => $event->user?->id,
            ]);
        }
    }
}