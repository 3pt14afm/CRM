<?php

namespace App\Http\Controllers;

use App\Support\PreferenceHelper;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\Log;

class ForcePasswordChangeController extends Controller
{
public function store(Request $request)
{
    $request->validate([
        'password' => ['required', 'string', 'confirmed', Password::defaults()],
    ]);

    /** @var \App\Models\User|null $user */
    $user = $request->user();

    if (! $user) {
        abort(403);
    }

    $nextExpiry = PreferenceHelper::passwordExpiryDate();

    $user->password = $request->password;
    $user->password_expiry = $nextExpiry->toDateString();
    $user->default_password_login_count = 0;
    $user->must_change_password = false;
    $user->save();

    try {
        ActivityLogger::log(
            activityType: 'force_password_change',
            moduleType: 'Authentication',
            details: 'User changed password after forced password reset',
            newValues: [
                'user_id' => $user->id,
                'email' => $user->email,
                'password_expiry' => $user->password_expiry,
                'must_change_password' => false,
            ]
        );
    } catch (\Throwable $e) {
        Log::error('Forced password change activity log failed', [
            'message' => $e->getMessage(),
            'user_id' => $user->id,
        ]);
    }

    return back()->with('success', 'Password changed successfully.');
}
}