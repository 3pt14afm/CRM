<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $requiresPasswordChange =
            $user->must_change_password ||
            $user->isPasswordExpired();

        if ($requiresPasswordChange) {
            $nextCount = min(((int) $user->default_password_login_count) + 1, 3);

            $user->default_password_login_count = $nextCount;

            if ($nextCount >= 3) {
                $user->must_change_password = true;
            }

            $user->save();
        }

        $cookie = cookie(
            'user',
            $user->id,
            60,
            '/',
            null,
            false,
            true
        );

        return redirect()->route('customers.dashboard')->cookie($cookie);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('login');
    }
}