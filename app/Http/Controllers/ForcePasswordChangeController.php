<?php

namespace App\Http\Controllers;

use App\Support\PreferenceHelper;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

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

        return back()->with('success', 'Password changed successfully.');
    }
}