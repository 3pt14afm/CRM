<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\User;
use App\Models\CompanyPosition;
use App\Models\CompanyEmployee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class AdminController extends Controller
{
    /**
     * Admin Panel (Locations + Users in one page)
     * GET /admin/panel
     */
    public function locationMaster(Request $request)
    {
        $locations = Location::query()
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($location) {
                $location->users_count = User::whereJsonContains('location', (int) $location->id)->count();
                $location->approvers_count = User::whereJsonContains('location', (int) $location->id)
                    ->where('role', 'approver')
                    ->count();
                $location->status = 'Active';
                return $location;
            })
            ->withQueryString();

        $stats = [
            'totalLocations'    => Location::count(),
            'activeUsers'       => User::where('is_banned', false)->count(),
            'newLocationsLabel' => '+ new',
        ];

        return Inertia::render('Admin/LocationMaster', [
            'locations' => $locations,
            'stats'     => $stats,
        ]);
    }

    public function userManagement(Request $request)
    {
        $locationNameById = Location::pluck('name', 'id');
        $locationLookup = Location::orderBy('name')->get(['id', 'name']);

        $users = User::query()
            ->select('id', 'name', 'email', 'role', 'primary_location_id', 'location', 'is_banned', 'created_at')
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($u) use ($locationNameById) {
                $u->status = $u->is_banned ? 'Inactive' : 'Active';
                $u->created_display = optional($u->created_at)->format('m/d/y');

                $ids = is_array($u->location) ? $u->location : (array) $u->location;

                $u->assigned_locations = collect($ids)
                    ->map(fn ($id) => $locationNameById[(int) $id] ?? null)
                    ->filter()
                    ->values()
                    ->all();

                return $u;
            })
            ->withQueryString();

        // UserManagement.jsx expects locations.data to exist
        $locations = Location::query()
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($location) {
                $location->users_count = User::whereJsonContains('location', (int) $location->id)->count();
                $location->approvers_count = User::whereJsonContains('location', (int) $location->id)
                    ->where('role', 'approver')
                    ->count();
                $location->status = 'Active';
                return $location;
            })
            ->withQueryString();

        $stats = [
            'totalUsers'         => User::count(),
            'recentlyAddedToday' => User::whereDate('created_at', now()->toDateString())->count(),
            'activeUsers'        => User::where('is_banned', false)->count(),
            'pendingApprovals'   => User::where('role', 'approver')->count(),
        ];

        return Inertia::render('Admin/UserManagement', [
            'users'          => $users,
            'locations'      => $locations,
            'locationLookup' => $locationLookup,
            'stats'          => $stats,
        ]);
    }

    public function positionMaster()
    {
        return Inertia::render('Admin/PositionMaster');
    }

    public function approverMatrix()
    {
        return Inertia::render('Admin/ApproverMatrix');
    }

    public function userGroupAccessRights()
    {
        return Inertia::render('Admin/UserGroupAccessRights');
    }

    public function userAccessRights()
    {
        return Inertia::render('Admin/UserAccessRights');
    }

    public function auditLogs()
    {
        return Inertia::render('Admin/AuditLogs');
    }

    // ─────────────────────────────────────────
    // LOCATIONS
    // ─────────────────────────────────────────

    public function locationIndex(Request $request)
    {
        $search = $request->input('search');

        $locations = Location::query()
            ->when($search, fn ($q) =>
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($location) {
                $location->users_count = User::whereJsonContains('location', (int) $location->id)->count();
                $location->approvers_count = User::whereJsonContains('location', (int) $location->id)
                    ->where('role', 'approver')
                    ->count();
                $location->status = 'Active';
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

    public function locationUpdate(Request $request, Location $location)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:locations,name,' . $location->id,
            'code' => 'nullable|string|max:20|unique:locations,code,' . $location->id,
        ]);

        $location->update([
            'name' => $request->name,
            'code' => $request->code ? strtoupper($request->code) : $location->code,
        ]);

        // no user updates needed (users store ids, not names)
        return back()->with('success', 'Location updated.');
    }

    public function locationDestroy(Location $location)
    {
        // remove this location ID from all users JSON arrays
        $affected = User::whereJsonContains('location', (int) $location->id)->get();
        foreach ($affected as $user) {
            $current = is_array($user->location) ? $user->location : (array) $user->location;
            $updated = array_values(array_filter(
                $current,
                fn ($id) => (int) $id !== (int) $location->id
            ));
            $user->update(['location' => $updated]);
        }

        $location->delete();

        return back()->with('success', 'Location deleted and removed from all users.');
    }

    public function locationUsers(Request $request, Location $location)
    {
        // ✅ map once for UI conversion
        $locationNameById = Location::pluck('name', 'id');

        $users = User::query()
            ->whereJsonContains('location', (int) $location->id)
            ->when($request->role && $request->role !== 'all', fn ($q) =>
                $q->where('role', $request->role)
            )
            ->when($request->status === 'active', fn ($q) =>
                $q->where('is_banned', false)
            )
            ->when($request->status === 'banned', fn ($q) =>
                $q->where('is_banned', true)
            )
            ->when($request->search, fn ($q) =>
                $q->where(fn ($inner) =>
                    $inner->where('name', 'like', "%{$request->search}%")
                          ->orWhere('email', 'like', "%{$request->search}%")
                )
            )
            ->select('id', 'name', 'email', 'role', 'location', 'is_banned')
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($u) use ($locationNameById) {
                $ids = is_array($u->location) ? $u->location : (array) $u->location;
                $u->assigned_locations = collect($ids)
                    ->map(fn ($id) => $locationNameById[(int) $id] ?? null)
                    ->filter()
                    ->values()
                    ->all();
                return $u;
            })
            ->withQueryString();

        return Inertia::render('Admin/Locations/Users', [
            'location' => $location,
            'users'    => $users,
            'filters'  => $request->only(['search', 'role', 'status']),
        ]);
    }

    // ─────────────────────────────────────────
    // USERS
    // ─────────────────────────────────────────

    public function userIndex(Request $request)
    {
        $locationNameById = Location::pluck('name', 'id');

        $users = User::query()
            ->when($request->search, fn ($q) =>
                $q->where(fn ($inner) =>
                    $inner->where('name', 'like', "%{$request->search}%")
                          ->orWhere('email', 'like', "%{$request->search}%")
                )
            )
            ->when($request->role && $request->role !== 'all', fn ($q) =>
                $q->where('role', $request->role)
            )
            ->when($request->status === 'active', fn ($q) =>
                $q->where('is_banned', false)
            )
            ->when($request->status === 'banned', fn ($q) =>
                $q->where('is_banned', true)
            )
            ->when($request->location, fn ($q) =>
                $q->whereJsonContains('location', (int) $request->location)
            )
            ->select('id', 'name', 'email', 'role', 'location', 'is_banned', 'created_at')
            ->orderBy('name')
            ->paginate(15)
            ->through(function ($u) use ($locationNameById) {
                $ids = is_array($u->location) ? $u->location : (array) $u->location;
                $u->assigned_locations = collect($ids)
                    ->map(fn ($id) => $locationNameById[(int) $id] ?? null)
                    ->filter()
                    ->values()
                    ->all();
                return $u;
            })
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users'     => $users,
            'locations' => Location::orderBy('name')->get(['id', 'name']),
            'filters'   => $request->only(['search', 'role', 'status', 'location']),
        ]);
    }

    public function userStore(Request $request)
    {

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:preparer,reviewer,checker,endorser,confirmer,approver,admin,user',
            'password' => 'required|string|min:8',

            'primary_location_id' => 'required|integer|exists:locations,id',

            'location' => 'nullable|array',
            'location.*' => 'integer|exists:locations,id',
        ]);

        $allowed = $request->location ?? [];
        $primary = (int) $request->primary_location_id;

        if (!in_array($primary, $allowed, true)) {
            $allowed[] = $primary;
        }

        User::create([
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
            'password' => Hash::make($request->password),

            'primary_location_id' => $primary,
            'location' => array_values(array_unique($allowed)),

            'is_banned' => false,
            'email_verified_at' => now(),
        ]);

        return back()->with('success', 'User created.');
    }

    public function userUpdate(Request $request, User $user)
    {

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'role' => 'required|in:preparer,reviewer,checker,endorser,confirmer,approver,admin,user',
            'password' => 'nullable|string|min:8',

            'primary_location_id' => 'required|integer|exists:locations,id',

            'location' => 'nullable|array',
            'location.*' => 'integer|exists:locations,id',
        ]);

        $allowed = $request->location ?? [];
        $primary = (int) $request->primary_location_id;

        if (!in_array($primary, $allowed, true)) {
            $allowed[] = $primary;
        }

        $data = [
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,

            'primary_location_id' => $primary,
            'location' => array_values(array_unique($allowed)),
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return back()->with('success', 'User updated.');
    }

    public function userAssignLocations(Request $request, User $user)
    {
        $request->validate([
            'location' => 'required|array',
            'location.*' => 'integer|exists:locations,id',
        ]);

        $user->update(['location' => $request->location]);

        return back()->with('success', 'Locations assigned to ' . $user->name . '.');
    }

    public function userBan(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['ban' => 'You cannot ban yourself.']);
        }

        $user->update(['is_banned' => true]);

        return back()->with('success', $user->name . ' has been banned.');
    }

    public function userUnban(User $user)
    {
        $user->update(['is_banned' => false]);

        return back()->with('success', $user->name . ' has been unbanned.');
    }

    public function userDestroy(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['delete' => 'You cannot delete yourself.']);
        }

        $user->delete();

        return back()->with('success', 'User deleted.');
    }

    public function positions()
    {
        return response()->json(
            CompanyPosition::query()
                ->orderBy('name')
                ->get(['id', 'name'])
        );
    }

    public function employeesByPosition(Request $request)
    {
        $request->validate([
            'position_id' => ['required', 'integer', 'exists:company_positions,id'],
        ]);

        $employees = CompanyEmployee::query()
            ->where('position_id', (int) $request->position_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'employee_code', 'name', 'position_id', 'primary_location_id']);

        // return with main location name for UI
        $locNames = \App\Models\Location::pluck('name', 'id');

        $employees = $employees->map(function ($e) use ($locNames) {
            return [
                'id' => $e->id,
                'employee_code' => $e->employee_code,
                'name' => $e->name,
                'position_id' => $e->position_id,
                'primary_location_id' => $e->primary_location_id,
                'primary_location_name' => $locNames[(int)$e->primary_location_id] ?? null,
            ];
        });

        return response()->json($employees);
    }

    public function assignEmployeeUser(Request $request)
    {
        $request->validate([
            'employee_id' => ['required', 'integer', 'exists:company_employees,id'],
            'role' => ['required', 'in:preparer,reviewer,checker,endorser,confirmer,approver,admin,user'],
            'location' => ['nullable', 'array'],
            'location.*' => ['integer', 'exists:locations,id'],
        ]);

        $employee = CompanyEmployee::query()->findOrFail((int) $request->employee_id);

        $primary = (int) $employee->primary_location_id;
        $allowed = $request->location ?? [];

        // always include main location
        if (!in_array($primary, $allowed, true)) {
            $allowed[] = $primary;
        }

        // email: auto-generate placeholder
        $email = 'emp' . $employee->id . '@local.company';

        // create/update system user linked to this employee
        $user = User::updateOrCreate(
            ['employee_id' => $employee->id],
            [
                'name' => $employee->name,
                'email' => $email,
                'role' => $request->role,
                'primary_location_id' => $primary,
                'location' => array_values(array_unique($allowed)),
                'is_banned' => false,
                'email_verified_at' => now(),
                // password: optional — for now set default if empty
                'password' => Hash::make('password'),
            ]
        );

        return back()->with('success', 'Employee assigned as user: ' . $user->name);
    }
}