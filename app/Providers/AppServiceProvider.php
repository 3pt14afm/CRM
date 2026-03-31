<?php

namespace App\Providers;

use App\Models\RoiChatSession;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Inertia::share('roiChat', function () {
            $user = Auth::user();

            if (!$user) {
                return [
                    'sessionId' => null,
                    'stage' => 'collecting',
                    'messages' => [],
                ];
            }

            $session = RoiChatSession::with('messages')
                ->where('user_id', $user->id)
                ->latest()
                ->first();

            if (!$session) {
            return [
            'sessionId' => null,
            'stage' => 'collecting',
            'messages' => [],
            'printerOptions' => [],
        ];
            }

            return [
                'sessionId' => $session->id,
                'stage' => $session->stage,
                'messages' => $session->messages->map(function ($message) {
                    return [
                        'role' => $message->role,
                        'content' => $message->content,
                    ];
                })->values()->all(),
                'printerOptions' => $session->state['printer_options'] ?? [],
            ];
        });
    }
}