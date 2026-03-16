<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
   public function handle(Request $request, Closure $next): Response
{
    if (!Auth::check() || Auth::user()->email !== 'admin@example.com') {
        if ($request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Super Admin access only.',
            ], 403);
        }

        return redirect()->back()->with('error', 'Super Admin access only.');
    }

    return $next($request);
}
}