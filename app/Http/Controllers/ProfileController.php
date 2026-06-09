<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Services\AuthActivityLogger; // <-- Updated import here
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        // 1. Capture original values before they change
        $oldValues = $user->only(array_keys($request->validated()));

        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        // 2. CRITICAL: Get dirty changes BEFORE saving
        $changes = $user->getDirty();

        $user->save();

        // 3. Log using your real AuthActivityLogger
        try {
            AuthActivityLogger::log(
                activityType: 'update_profile',
                details: 'User updated profile info',
                status: 'success',
                user: $user,
                metadata: [
                    'module' => 'Profile',
                    'old_values' => array_intersect_key($oldValues, $changes),
                    'new_values' => $changes
                ]
            );
        } catch (\Throwable $e) {
            Log::error('Profile update activity log failed', [
                'message' => $e->getMessage(),
                'user_id' => $user->id,
            ]);
        }

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        // Log the event BEFORE logging the user out or deleting them
        try {
            AuthActivityLogger::log(
                activityType: 'delete_account',
                details: 'User voluntarily deleted their account',
                status: 'success',
                user: $user,
                metadata: [
                    'module' => 'Profile'
                ]
            );
        } catch (\Throwable $e) {
            Log::error('Account deletion activity log failed', [
                'message' => $e->getMessage(),
                'user_id' => $user->id,
            ]);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}