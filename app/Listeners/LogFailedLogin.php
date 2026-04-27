<?php

namespace App\Listeners;

use App\Services\AuthActivityLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Support\Facades\Log;

class LogFailedLogin
{
    public function handle(Failed $event): void
    {
        try {
            AuthActivityLogger::log(
                activityType: 'failed_login',
                details: 'Failed login attempt',
                status: 'failed',
                user: $event->user,
                metadata: [
                    'email' => $event->credentials['email'] ?? null,
                ]
            );
        } catch (\Throwable $e) {
            Log::error('Failed login activity log failed', [
                'message' => $e->getMessage(),
            ]);
        }
    }
}