<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Log;


class PasswordController extends Controller
{
    /**
     * Update the user's password.
     */
public function update(Request $request): RedirectResponse
{
    $validated = $request->validate([
        'current_password' => ['required', 'current_password'],
        'password' => ['required', Password::defaults(), 'confirmed'],
    ]);

    $user = $request->user();

    $user->update([
        'password' => Hash::make($validated['password']),
    ]);

    try {
        ActivityLogger::log(
            activityType: 'update_password',
            moduleType: 'Authentication',
            details: 'User changed password',
            newValues: [
                'user_id' => $user->id,
                'email' => $user->email,
            ]
        );
    } catch (\Throwable $e) {
        Log::error('Password update activity log failed', [
            'message' => $e->getMessage(),
            'user_id' => $user->id,
        ]);
    }

    return back();
}
}
