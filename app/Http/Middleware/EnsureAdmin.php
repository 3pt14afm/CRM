<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!Auth::check() || Auth::user()->email !== 'admin@example.com') {
            abort(403, 'Super Admin access only.');
        }

        return $next($request);
    }
}