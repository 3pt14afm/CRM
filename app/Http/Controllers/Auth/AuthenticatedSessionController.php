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
        // Example: create a cookie named 'user'
            $cookie = cookie(
                'user',                 // Cookie name
                Auth::user()->id,       // Cookie value (user ID, safer than username)
                60,                     // Expiration in minutes (1 hour)
                '/',                    // Path
                null,                   // Domain (default)
                false,                  // Secure (true if using HTTPS)
                true                    // HttpOnly
            );

            // Redirect to dashboard with cookie attached
            // return redirect()->intended(route('dashboard', absolute: false))
            //                 ->cookie($cookie);

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

        return redirect('/');
    }
}
