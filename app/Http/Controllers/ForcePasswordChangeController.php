<?php

namespace App\Http\Controllers;

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

        $user->password = $request->password;
        $user->is_using_default_password = false;
        $user->default_password_login_count = 0;
        $user->must_change_password = false;
        $user->save();

        return back()->with('success', 'Password changed successfully.');
    }
}