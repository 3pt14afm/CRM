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
    public function locationMaster(Request $request)
    {
        $locations = Location::query()
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($location) {
                $location->users_count = User::where('primary_location_id', (int) $location->id)->count();
                $location->status = $location->is_active ? 'Active' : 'Inactive';
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
        $locationLookup = Location::orderBy('name')->get(['id', 'name']);

        $users = User::query()
            ->select(
                'id',
                'first_name',
                'last_name',
                'employee_id',
                'position',
                'email',
                'primary_location_id',
                'is_banned',
                'created_at'
            )
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate(10)
            ->through(function ($u) use ($locationLookup) {
                $u->status = $u->is_banned ? 'Inactive' : 'Active';
                $u->created_display = optional($u->created_at)->format('m/d/y');
                $u->location_name = optional(
                    $locationLookup->firstWhere('id', (int) $u->primary_location_id)
                )->name;

                return $u;
            })
            ->withQueryString();

        $locations = Location::query()
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($location) {
                $location->users_count = User::where('primary_location_id', (int) $location->id)->count();
                $location->status = $location->is_active ? 'Active' : 'Inactive';
                return $location;
            })
            ->withQueryString();

        $stats = [
            'totalUsers'         => User::count(),
            'recentlyAddedToday' => User::whereDate('created_at', now()->toDateString())->count(),
            'activeUsers'        => User::where('is_banned', false)->count(),
        ];

        return Inertia::render('Admin/UserManagement', [
            'users'          => $users,
            'locations'      => $locations,
            'locationLookup' => $locationLookup,
            'stats'          => $stats,
        ]);
    }

    public function positionMaster(Request $request)
    {
        $positions = CompanyPosition::query()
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($position) {
                $position->status = $position->is_active ? 'Active' : 'Inactive';
                return $position;
            })
            ->withQueryString();

        $stats = [
            'totalPositions'  => CompanyPosition::count(),
            'activePositions' => CompanyPosition::where('is_active', true)->count(),
        ];

        return Inertia::render('Admin/PositionMaster', [
            'positions' => $positions,
            'stats'     => $stats,
        ]);
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

    // LOCATIONS

    public function locationIndex(Request $request)
    {
        $search = $request->input('search');

        $locations = Location::query()
            ->when($search, fn ($q) =>
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone_number', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($location) {
                $location->users_count = User::where('primary_location_id', (int) $location->id)->count();
                $location->status = $location->is_active ? 'Active' : 'Inactive';
                return $location;
            })
            ->withQueryString();

        $stats = [
            'totalLocations' => Location::count(),
            'activeUsers'    => User::where('is_banned', false)->count(),
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
            'phone_number' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
        ]);

        Location::create([
            'name' => $request->name,
            'code' => $request->code ? strtoupper($request->code) : null,
            'phone_number' => $request->phone_number,
            'address' => $request->address,
            'is_active' => true,
        ]);

        return back()->with('success', 'Location created.');
    }

    public function locationUpdate(Request $request, Location $location)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:locations,name,' . $location->id,
            'code' => 'nullable|string|max:20|unique:locations,code,' . $location->id,
            'phone_number' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
        ]);

        $location->update([
            'name' => $request->name,
            'code' => $request->code ? strtoupper($request->code) : null,
            'phone_number' => $request->phone_number,
            'address' => $request->address,
        ]);

        return back()->with('success', 'Location updated.');
    }

    public function locationActivate(Location $location)
    {
        $location->update(['is_active' => true]);

        return back()->with('success', 'Location activated.');
    }

    public function locationDeactivate(Location $location)
    {
        $location->update(['is_active' => false]);

        return back()->with('success', 'Location deactivated.');
    }

    public function locationDestroy(Location $location)
    {
        User::where('primary_location_id', (int) $location->id)
            ->update(['primary_location_id' => null]);

        $location->delete();

        return back()->with('success', 'Location deleted.');
    }

    public function locationUsers(Request $request, Location $location)
    {
        $users = User::query()
            ->where('primary_location_id', (int) $location->id)
            ->when($request->status === 'active', fn ($q) =>
                $q->where('is_banned', false)
            )
            ->when($request->status === 'banned', fn ($q) =>
                $q->where('is_banned', true)
            )
            ->when($request->search, fn ($q) =>
                $q->where(function ($inner) use ($request) {
                    $inner->where('first_name', 'like', "%{$request->search}%")
                          ->orWhere('last_name', 'like', "%{$request->search}%")
                          ->orWhere('email', 'like', "%{$request->search}%")
                          ->orWhere('position', 'like', "%{$request->search}%");
                })
            )
            ->select(
                'id',
                'first_name',
                'last_name',
                'employee_id',
                'position',
                'email',
                'primary_location_id',
                'is_banned'
            )
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Locations/Users', [
            'location' => $location,
            'users'    => $users,
            'filters'  => $request->only(['search', 'status']),
        ]);
    }

    // POSITIONS

    public function positionIndex(Request $request)
    {
        $search = $request->input('search');

        $positions = CompanyPosition::query()
            ->when($search, fn ($q) =>
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($position) {
                $position->status = $position->is_active ? 'Active' : 'Inactive';
                return $position;
            })
            ->withQueryString();

        return response()->json($positions);
    }

    public function positionStore(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:50|unique:company_positions,code',
            'name' => 'required|string|max:255|unique:company_positions,name',
            'department' => 'required|string|max:255',
        ]);

        CompanyPosition::create([
            'code' => strtoupper($request->code),
            'name' => $request->name,
            'department' => $request->department,
            'is_active' => true,
        ]);

        return back()->with('success', 'Position created.');
    }

    public function positionUpdate(Request $request, CompanyPosition $position)
    {
        $request->validate([
            'code' => 'required|string|max:50|unique:company_positions,code,' . $position->id,
            'name' => 'required|string|max:255|unique:company_positions,name,' . $position->id,
            'department' => 'required|string|max:255',
        ]);

        $position->update([
            'code' => strtoupper($request->code),
            'name' => $request->name,
            'department' => $request->department,
        ]);

        return back()->with('success', 'Position updated.');
    }

    public function positionActivate(CompanyPosition $position)
    {
        $position->update(['is_active' => true]);

        return back()->with('success', 'Position activated.');
    }

    public function positionDeactivate(CompanyPosition $position)
    {
        $position->update(['is_active' => false]);

        return back()->with('success', 'Position deactivated.');
    }

    // USERS

    public function userIndex(Request $request)
    {
        $users = User::query()
            ->when($request->search, fn ($q) =>
                $q->where(function ($inner) use ($request) {
                    $inner->where('first_name', 'like', "%{$request->search}%")
                          ->orWhere('last_name', 'like', "%{$request->search}%")
                          ->orWhere('email', 'like', "%{$request->search}%")
                          ->orWhere('position', 'like', "%{$request->search}%");
                })
            )
            ->when($request->status === 'active', fn ($q) =>
                $q->where('is_banned', false)
            )
            ->when($request->status === 'banned', fn ($q) =>
                $q->where('is_banned', true)
            )
            ->when($request->location, fn ($q) =>
                $q->where('primary_location_id', (int) $request->location)
            )
            ->select(
                'id',
                'first_name',
                'last_name',
                'employee_id',
                'position',
                'email',
                'primary_location_id',
                'is_banned',
                'created_at'
            )
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users'     => $users,
            'locations' => Location::orderBy('name')->get(['id', 'name']),
            'filters'   => $request->only(['search', 'status', 'location']),
        ]);
    }

    public function userStore(Request $request)
    {
        $request->validate([
            'first_name'          => 'required|string|max:255',
            'last_name'           => 'required|string|max:255',
            'employee_id'         => 'required|integer|unique:users,employee_id',
            'position'            => 'required|string|max:255',
            'email'               => 'required|email|unique:users,email',
            'primary_location_id' => 'required|integer|exists:locations,id',
        ]);

        User::create([
            'first_name'          => $request->first_name,
            'last_name'           => $request->last_name,
            'employee_id'         => $request->employee_id,
            'position'            => $request->position,
            'email'               => $request->email,
            'primary_location_id' => (int) $request->primary_location_id,
            'password'            => Hash::make('P@ssw0rd'),
            'is_banned'           => false,
            'email_verified_at'   => now(),
        ]);

        return back()->with('success', 'User created.');
    }

    public function userUpdate(Request $request, User $user)
    {
        $request->validate([
            'first_name'          => 'required|string|max:255',
            'last_name'           => 'required|string|max:255',
            'employee_id'         => 'required|integer|unique:users,employee_id,' . $user->id,
            'position'            => 'required|string|max:255',
            'email'               => 'required|email|unique:users,email,' . $user->id,
            'primary_location_id' => 'required|integer|exists:locations,id',
            'password'            => 'nullable|string|min:8',
        ]);

        $data = [
            'first_name'          => $request->first_name,
            'last_name'           => $request->last_name,
            'employee_id'         => $request->employee_id,
            'position'            => $request->position,
            'email'               => $request->email,
            'primary_location_id' => (int) $request->primary_location_id,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return back()->with('success', 'User updated.');
    }

    public function userAssignLocations(Request $request, User $user)
    {
        return back()->withErrors([
            'location' => 'Multiple user locations are not used in the current setup.',
        ]);
    }

    public function userBan(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['ban' => 'You cannot ban yourself.']);
        }

        $fullName = trim($user->first_name . ' ' . $user->last_name);

        $user->update(['is_banned' => true]);

        return back()->with('success', $fullName . ' has been banned.');
    }

    public function userUnban(User $user)
    {
        $fullName = trim($user->first_name . ' ' . $user->last_name);

        $user->update(['is_banned' => false]);

        return back()->with('success', $fullName . ' has been unbanned.');
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
                ->where('is_active', true)
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

        $locNames = Location::pluck('name', 'id');
        $positionNames = CompanyPosition::pluck('name', 'id');

        $employees = $employees->map(function ($e) use ($locNames, $positionNames) {
            $nameParts = preg_split('/\s+/', trim((string) $e->name), 2);

            return [
                'id'                    => $e->id,
                'employee_code'         => $e->employee_code,
                'first_name'            => $nameParts[0] ?? '',
                'last_name'             => $nameParts[1] ?? '',
                'position'              => $positionNames[(int) $e->position_id] ?? null,
                'primary_location_id'   => $e->primary_location_id,
                'primary_location_name' => $locNames[(int) $e->primary_location_id] ?? null,
            ];
        });

        return response()->json($employees);
    }

    public function assignEmployeeUser(Request $request)
    {
        $request->validate([
            'first_name'          => ['required', 'string', 'max:255'],
            'last_name'           => ['required', 'string', 'max:255'],
            'employee_id'         => ['required', 'integer', 'unique:users,employee_id'],
            'position'            => ['required', 'string', 'max:255'],
            'email'               => ['required', 'email', 'unique:users,email'],
            'primary_location_id' => ['required', 'integer', 'exists:locations,id'],
        ]);

        User::create([
            'first_name'          => $request->first_name,
            'last_name'           => $request->last_name,
            'employee_id'         => $request->employee_id,
            'position'            => $request->position,
            'email'               => $request->email,
            'primary_location_id' => (int) $request->primary_location_id,
            'password'            => Hash::make('P@ssw0rd'),
            'is_banned'           => false,
            'email_verified_at'   => now(),
        ]);

        return back()->with('success', 'User created successfully.');
    }
}