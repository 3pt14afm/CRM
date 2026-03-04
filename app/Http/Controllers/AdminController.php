<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class AdminController extends Controller
{
    // ═════════════════════════════════════════
    // LOCATIONS
    // ═════════════════════════════════════════

    /**
     * List all locations with user + approver counts.
     * GET /admin/locations
     */
    public function locationIndex(Request $request)
    {
        $search = $request->input('search');

        $locations = Location::query()
            ->when($search, fn($q) =>
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($location) {
                $location->users_count = User::whereJsonContains('location', $location->name)->count();
                $location->approvers_count = User::whereJsonContains('location', $location->name)
                    ->where('role', 'approver')
                    ->count();
                return $location;
            })
            ->withQueryString();

        $stats = [
            'totalLocations'   => Location::count(),
            'activeUsers'      => User::where('is_banned', false)->count(),
            'pendingApprovals' => User::where('role', 'approver')->count(),
        ];

        return Inertia::render('Admin/Locations/Index', [
            'locations' => $locations,
            'stats'     => $stats,
            'filters'   => ['search' => $search],
        ]);
    }

    /**
     * Store a new location.
     * POST /admin/locations
     */
    public function locationStore(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:locations,name',
            'code' => 'nullable|string|max:20|unique:locations,code',
        ]);

        Location::create([
            'name' => $request->name,
            'code' => $request->code ? strtoupper($request->code) : null,
        ]);

        return back()->with('success', 'Location created.');
    }

    /**
     * Update a location name/code.
     * PUT /admin/locations/{location}
     */
    public function locationUpdate(Request $request, Location $location)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:locations,name,' . $location->id,
            'code' => 'nullable|string|max:20|unique:locations,code,' . $location->id,
        ]);

        $oldName = $location->name;

        $location->update([
            'name' => $request->name,
            'code' => $request->code ? strtoupper($request->code) : $location->code,
        ]);

        // if name changed, update all users who have the old name
        if ($oldName !== $request->name) {
            $affected = User::whereJsonContains('location', $oldName)->get();
            foreach ($affected as $user) {
                $updated = array_map(
                    fn($loc) => $loc === $oldName ? $request->name : $loc,
                    (array) $user->location
                );
                $user->update(['location' => $updated]);
            }
        }

        return back()->with('success', 'Location updated.');
    }

    /**
     * Delete a location and remove it from all users.
     * DELETE /admin/locations/{location}
     */
    public function locationDestroy(Location $location)
    {
        $affected = User::whereJsonContains('location', $location->name)->get();
        foreach ($affected as $user) {
            $updated = array_values(array_filter(
                (array) $user->location,
                fn($loc) => $loc !== $location->name
            ));
            $user->update(['location' => $updated]);
        }

        $location->delete();

        return back()->with('success', 'Location deleted and removed from all users.');
    }

    /**
     * List users belonging to a specific location.
     * GET /admin/locations/{location}/users
     */
    public function locationUsers(Request $request, Location $location)
    {
        $users = User::query()
            ->whereJsonContains('location', $location->name)
            ->when($request->role && $request->role !== 'all', fn($q) =>
                $q->where('role', $request->role))
            ->when($request->status === 'active', fn($q) =>
                $q->where('is_banned', false))
            ->when($request->status === 'banned', fn($q) =>
                $q->where('is_banned', true))
            ->when($request->search, fn($q) =>
                $q->where(fn($inner) =>
                    $inner->where('name', 'like', "%{$request->search}%")
                          ->orWhere('email', 'like', "%{$request->search}%")
                ))
            ->select('id', 'name', 'email', 'role', 'location', 'is_banned')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Locations/Users', [
            'location' => $location,
            'users'    => $users,
            'filters'  => $request->only(['search', 'role', 'status']),
        ]);
    }

    // ═════════════════════════════════════════
    // USERS
    // ═════════════════════════════════════════

    /**
     * List all users with filters.
     * GET /admin/users
     */
    public function userIndex(Request $request)
    {
        $users = User::query()
            ->when($request->search, fn($q) =>
                $q->where(fn($inner) =>
                    $inner->where('name', 'like', "%{$request->search}%")
                          ->orWhere('email', 'like', "%{$request->search}%")
                ))
            ->when($request->role && $request->role !== 'all', fn($q) =>
                $q->where('role', $request->role))
            ->when($request->status === 'active', fn($q) =>
                $q->where('is_banned', false))
            ->when($request->status === 'banned', fn($q) =>
                $q->where('is_banned', true))
            ->when($request->location, fn($q) =>
                $q->whereJsonContains('location', $request->location))
            ->select('id', 'name', 'email', 'role', 'location', 'is_banned', 'created_at')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users'     => $users,
            'locations' => Location::orderBy('name')->get(['id', 'name']),
            'filters'   => $request->only(['search', 'role', 'status', 'location']),
        ]);
    }

    /**
     * Create a new user with location assignment.
     * POST /admin/users
     */
    public function userStore(Request $request)
    {
        $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'role'       => 'required|in:preparer,reviewer,checker,endorser,confirmer,approver,admin',
            'password'   => 'required|string|min:8',
            'location'   => 'nullable|array',
            'location.*' => 'string|exists:locations,name',
        ]);

        User::create([
            'name'              => $request->name,
            'email'             => $request->email,
            'role'              => $request->role,
            'password'          => Hash::make($request->password),
            'location'          => $request->location ?? [],
            'is_banned'         => false,
            'email_verified_at' => now(),
        ]);

        return back()->with('success', 'User created.');
    }

    /**
     * Update user info, role, and location.
     * PUT /admin/users/{user}
     */
    public function userUpdate(Request $request, User $user)
    {
        $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email,' . $user->id,
            'role'       => 'required|in:preparer,reviewer,checker,endorser,confirmer,approver,admin',
            'location'   => 'nullable|array',
            'location.*' => 'string|exists:locations,name',
            'password'   => 'nullable|string|min:8',
        ]);

        $data = [
            'name'     => $request->name,
            'email'    => $request->email,
            'role'     => $request->role,
            'location' => $request->location ?? [],
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return back()->with('success', 'User updated.');
    }

    /**
     * Assign locations to a user only.
     * PATCH /admin/users/{user}/locations
     */
    public function userAssignLocations(Request $request, User $user)
    {
        $request->validate([
            'location'   => 'required|array',
            'location.*' => 'string|exists:locations,name',
        ]);

        $user->update(['location' => $request->location]);

        return back()->with('success', 'Locations assigned to ' . $user->name . '.');
    }

    /**
     * Ban a user.
     * PATCH /admin/users/{user}/ban
     */
    public function userBan(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['ban' => 'You cannot ban yourself.']);
        }

        $user->update(['is_banned' => true]);

        return back()->with('success', $user->name . ' has been banned.');
    }

    /**
     * Unban a user.
     * PATCH /admin/users/{user}/unban
     */
    public function userUnban(User $user)
    {
        $user->update(['is_banned' => false]);

        return back()->with('success', $user->name . ' has been unbanned.');
    }

    /**
     * Delete a user permanently.
     * DELETE /admin/users/{user}
     */
    public function userDestroy(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['delete' => 'You cannot delete yourself.']);
        }

        $user->delete();

        return back()->with('success', 'User deleted.');
    }
}