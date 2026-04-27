<?php

namespace App\Listeners;

use App\Services\AuthActivityLogger;
use App\Services\RoiActivityLogger;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Log;

class LogSuccessfulLogout
{
    public function handle(Logout $event): void
    {
        try {
            AuthActivityLogger::log(
                activityType: 'logout',
                details: 'User logged out successfully'
            );
        } catch (\Throwable $e) {
            Log::error('Logout activity log failed', [
                'message' => $e->getMessage(),
                'user_id' => $event->user?->id,
            ]);
        }
    }
}