<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        $passwordExpired = $user?->isPasswordExpired() ?? false;
        $mustChangePassword = $user?->must_change_password ?? false;
        $defaultPasswordLoginCount = $user?->default_password_login_count ?? 0;

        // Check if the user has a profile avatar stored
        $hasAvatar = false;
        if ($user) {
            foreach (['png', 'jpg', 'jpeg', 'webp'] as $ext) {
                if (Storage::exists('profileimg/' . $user->employee_id . '.' . $ext)) {
                    $hasAvatar = true;
                    break;
                }
            }
        }

        return [
            ...parent::share($request),

            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    'hasAvatar' => $hasAvatar,
                ]) : null,
                'role' => $user?->role,
            ],

            'mustChangePassword' => $mustChangePassword,
            'defaultPasswordLoginCount' => $defaultPasswordLoginCount,
            'passwordExpired' => $passwordExpired,
            'requiresPasswordChange' => $mustChangePassword || $defaultPasswordLoginCount > 0 || $passwordExpired,

            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],

            'ziggy' => fn () => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
        ];
    }
}