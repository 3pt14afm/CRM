<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\User;
use App\Models\CompanyDepartment;
use App\Models\CompanyPosition;
use App\Models\CompanyEmployee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function userManagement(Request $request)
    {
        $locationLookup = Location::orderBy('name')->get(['id', 'name']);
        $departmentLookup = CompanyDepartment::orderBy('name')->get(['id', 'name']);

        $users = User::query()
            ->select(
                'id',
                'first_name',
                'last_name',
                'employee_id',
                'department_id',
                'position',
                'email',
                'primary_location_id',
                'is_banned',
                'created_at'
            )
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate(10)
            ->through(function ($u) use ($locationLookup, $departmentLookup) {
                $u->status = $u->is_banned ? 'Inactive' : 'Active';
                $u->created_display = optional($u->created_at)->format('m/d/y');
                $u->location_name = optional(
                    $locationLookup->firstWhere('id', (int) $u->primary_location_id)
                )->name;
                $u->department_name = optional(
                    $departmentLookup->firstWhere('id', (int) $u->department_id)
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
                'department_id',
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
            'first_name'          => ['required', 'string', 'max:255'],
            'last_name'           => ['required', 'string', 'max:255'],
            'employee_id'         => ['required', 'regex:/^\d{1,4}$/', 'unique:users,employee_id'],
            'department_id'       => ['required', 'integer', 'exists:company_departments,id'],
            'position'            => ['required', 'string', 'max:255'],
            'email'               => ['required', 'email', 'unique:users,email'],
            'primary_location_id' => ['required', 'integer', 'exists:locations,id'],
        ], [
            'employee_id.regex' => 'Employee ID must be 1 to 4 digits only.',
        ]);

        $validPosition = CompanyPosition::query()
            ->where('name', $request->position)
            ->where('department_id', (int) $request->department_id)
            ->where('is_active', true)
            ->exists();

        if (! $validPosition) {
            return back()->withErrors([
                'position' => 'Selected position does not belong to the chosen department.',
            ])->withInput();
        }

        User::create([
            'first_name'          => $request->first_name,
            'last_name'           => $request->last_name,
            'employee_id'         => $request->employee_id,
            'department_id'       => (int) $request->department_id,
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
            'first_name'          => ['required', 'string', 'max:255'],
            'last_name'           => ['required', 'string', 'max:255'],
            'employee_id'         => ['required', 'regex:/^\d{1,4}$/', 'unique:users,employee_id,' . $user->id],
            'department_id'       => ['required', 'integer', 'exists:company_departments,id'],
            'position'            => ['required', 'string', 'max:255'],
            'email'               => ['required', 'email', 'unique:users,email,' . $user->id],
            'primary_location_id' => ['required', 'integer', 'exists:locations,id'],
            'password'            => ['nullable', 'string', 'min:8'],
        ], [
            'employee_id.regex' => 'Employee ID must be 1 to 4 digits only.',
        ]);

        $validPosition = CompanyPosition::query()
            ->where('name', $request->position)
            ->where('department_id', (int) $request->department_id)
            ->where('is_active', true)
            ->exists();

        if (! $validPosition) {
            return back()->withErrors([
                'position' => 'Selected position does not belong to the chosen department.',
            ])->withInput();
        }

        $data = [
            'first_name'          => $request->first_name,
            'last_name'           => $request->last_name,
            'employee_id'         => $request->employee_id,
            'department_id'       => (int) $request->department_id,
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
            'employee_id'         => ['required', 'regex:/^\d{1,4}$/', 'unique:users,employee_id'],
            'department_id'       => ['required', 'integer', 'exists:company_departments,id'],
            'position'            => ['required', 'string', 'max:255'],
            'email'               => ['required', 'email', 'unique:users,email'],
            'primary_location_id' => ['required', 'integer', 'exists:locations,id'],
        ], [
            'employee_id.regex' => 'Employee ID must be 1 to 4 digits only.',
        ]);

        $validPosition = CompanyPosition::query()
            ->where('name', $request->position)
            ->where('department_id', (int) $request->department_id)
            ->where('is_active', true)
            ->exists();

        if (! $validPosition) {
            return back()->withErrors([
                'position' => 'Selected position does not belong to the chosen department.',
            ])->withInput();
        }

        User::create([
            'first_name'          => $request->first_name,
            'last_name'           => $request->last_name,
            'employee_id'         => $request->employee_id,
            'department_id'       => (int) $request->department_id,
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