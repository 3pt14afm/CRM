<?php

namespace App\Listeners;

use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Log;

class LogSuccessfulLogin
{
    public function handle(Login $event): void
    {
        try {
        ActivityLogger::log(
        activityType: 'login',
        moduleType: 'Authentication',
        details: 'User logged in successfully',
        newValues: [
            'user_id' => $event->user->id,
            'email' => $event->user->email,
        ]
    );
        } catch (\Throwable $e) {
            Log::error('Login activity log failed', [
                'message' => $e->getMessage(),
                'user_id' => $event->user->id ?? null,
            ]);
        }
    }
}