<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProfileUpdateRequest;
use App\Services\AuthActivityLogger;
use App\Support\PreferenceHelper;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;

class ProfileController extends Controller
{
    // Display the user's profile page.
    public function edit(Request $request): Response
    {
        $user = $request->user()->load(['department', 'location']);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            // Explicit allow-list of display-only fields for the
            // read-only "Personal Information" card. Nothing here is
            // ever written back — this page only ever submits a
            // password via updatePassword() below.
            'profile' => [
                'name'       => $user->name,
                'employeeId' => $user->employee_id,
                'email'      => $user->email,
                'position'   => $user->position,
                'department' => optional($user->department)->name,
                'location'   => optional($user->location)->name,
            ],
        ]);
    }

    // Update the user's profile information.
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
     * Update the password for the CURRENTLY AUTHENTICATED user only.
     *
     * SECURITY NOTES (read before modifying):
     *
     * 1. The target user is always $request->user() — the authenticated
     *    user resolved by the auth middleware. There is no route-model
     *    binding and no user id accepted from the payload, so a
     *    tampered request body can never redirect this write to a
     *    different account.
     *
     * 2. We never call $request->all() and never mass-assign the raw
     *    request payload. Exactly two fields are pulled out of
     *    validated input — current_password and new_password — and
     *    nothing else from the request body is ever read.
     *
     * 3. The 'current_password' validation rule below checks the
     *    submitted value against the authenticated user's actual stored
     *    hash (same approach already used in destroy() further down),
     *    so a client can't bypass verification by sending a precomputed
     *    hash or any other value.
     *
     * 4. The write itself is a hand-built array containing only the
     *    four columns this action is allowed to touch: password,
     *    password_expiry, default_password_login_count, and
     *    must_change_password. Extra keys in the request body
     *    (email, role, is_banned, employee_id, etc.) are simply never
     *    read, so they cannot reach the database through this method.
     *
     * 5. Unlike admin's "reset to default" flow, which backdates
     *    password_expiry to force an immediate re-change, this is a
     *    real password the user just chose, so password_expiry is
     *    pushed forward using PreferenceHelper::passwordExpiryDate() —
     *    the same admin-configurable validity window used by
     *    ForcePasswordChangeController, so both flows stay in sync if
     *    the preference value ever changes.
     */
    public function updatePassword(Request $request): RedirectResponse
    {
        $user = $request->user();

        try {
            $validated = $request->validate([
                'current_password' => ['required', 'current_password'],
                'new_password'      => [
                    'required',
                    'string',
                    'confirmed', // expects new_password_confirmation
                    'different:current_password',
                    Password::defaults(),
                ],
            ], [
                'new_password.different' => 'Your new password must be different from your current password.',
            ]);
        } catch (ValidationException $e) {
            // Deliberately back()->withErrors() with NO withInput() call —
            // this guarantees current_password/new_password/
            // new_password_confirmation are never written into the
            // session as "old input," regardless of what the global
            // $dontFlash list in the exception handler does or doesn't
            // cover for these field names.
            return back()->withErrors($e->errors());
        }

        $newExpiry = PreferenceHelper::passwordExpiryDate()->toDateString();

        $user->forceFill([
            'password'                     => Hash::make($validated['new_password']),
            'password_expiry'              => $newExpiry,
            'default_password_login_count' => 0,
            'must_change_password'         => false,
        ])->save();

        try {
            AuthActivityLogger::log(
                activityType: 'update_password',
                details: 'User changed their own password',
                status: 'success',
                user: $user,
                metadata: [
                    'module' => 'Profile',
                    'new_password_expiry' => $newExpiry,
                ]
            );
        } catch (\Throwable $e) {
            Log::error('Password update activity log failed', [
                'message' => $e->getMessage(),
                'user_id' => $user->id,
            ]);
        }

        return Redirect::route('profile.edit')->with('success', 'Your password has been updated successfully.');
    }

    // Delete the user's account.
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