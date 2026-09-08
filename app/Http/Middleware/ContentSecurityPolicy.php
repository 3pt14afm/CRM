<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentSecurityPolicy
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!$response->headers->has('Content-Security-Policy')) {
            $csp = implode('; ', [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' http://localhost:5173 http://127.0.0.1:5173",
                "style-src 'self' 'unsafe-inline' https://fonts.bunny.net https://fonts.googleapis.com",
                "font-src 'self' https://fonts.bunny.net https://fonts.gstatic.com http://localhost:5173 http://127.0.0.1:5173",
                "img-src 'self' data: blob:",
                "connect-src 'self' ws://localhost:5173 ws://127.0.0.1:5173",
                "frame-src 'self' https://maps.google.com/ https://www.google.com/",
            ]);

            $response->headers->set('Content-Security-Policy', $csp);
        }

        return $response;
    }
}