<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $passwordExpired = $user?->isPasswordExpired() ?? false;
        $mustChangePassword = $user?->must_change_password ?? false;
        $defaultPasswordLoginCount = $user?->default_password_login_count ?? 0;
        $isUsingDefaultPassword = $user?->is_using_default_password ?? false;

        return [
            ...parent::share($request),

            'auth' => [
                'user' => $user,
                'role' => $user?->role,
            ],

            'mustChangePassword' => $mustChangePassword,
            'defaultPasswordLoginCount' => $defaultPasswordLoginCount,
            'passwordExpired' => $passwordExpired,
            'isUsingDefaultPassword' => $isUsingDefaultPassword,
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