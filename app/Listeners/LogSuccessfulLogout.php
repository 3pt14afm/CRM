<?php

namespace App\Listeners;

use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Log;

class LogSuccessfulLogout
{
    public function handle(Logout $event): void
    {
        try {
        ActivityLogger::log(
            activityType: 'logout',
            moduleType: 'Authentication',
            details: 'User logged out',
            oldValues: [
                'user_id' => $event->user?->id,
                'email' => $event->user?->email,
            ]
      );
        } catch (\Throwable $e) {
            Log::error('Logout activity log failed', [
                'message' => $e->getMessage(),
                'user_id' => $event->user?->id,
            ]);
        }
    }
}