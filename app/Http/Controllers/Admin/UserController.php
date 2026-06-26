<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\Admin\PasswordResetMail;
use App\Models\Location;
use App\Models\User;
use App\Models\CompanyDepartment;
use App\Models\CompanyPosition;
use App\Models\CompanyEmployee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;

class UserController extends Controller
{
    public function userManagement(Request $request)
    {
        $locationLookup = Location::orderBy('name')->get(['id', 'name']);
        $departmentLookup = CompanyDepartment::orderBy('name')->get(['id', 'name']);

        $users = $this->getUserManagementUsers($request, $locationLookup, $departmentLookup);

        if ($request->header('X-User-Search') === 'true' && ! $request->header('X-Inertia')) {
            return response()->json([
                'users' => $users,
                'filters' => $request->only([
                    'search',
                    'status',
                    'location',
                    'department',
                    'position',
                    'perPage',
                    'sortBy',
                    'sortDirection',
                ]),
            ]);
        }

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
            'totalUsers' => User::count(),
            'recentlyAddedToday' => User::whereDate('created_at', now()->toDateString())->count(),
            'activeUsers' => User::where('is_banned', false)->count(),
        ];

        return Inertia::render('Admin/UserManagement', [
            'users' => $users,
            'locations' => $locations,
            'departments' => $departmentLookup,
            'locationLookup' => $locationLookup,
            'stats' => $stats,
            'filters' => $request->only([
                'search',
                'status',
                'location',
                'department',
                'position',
                'perPage',
                'sortBy',
                'sortDirection',
            ]),
        ]);
    }



    private function getUserManagementUsers(Request $request, $locationLookup, $departmentLookup)
    {
        $perPageInput = strtolower(trim((string) $request->input('perPage', '10')));

        $usersQuery = User::query()
            ->leftJoin('company_departments as sort_departments', 'users.department_id', '=', 'sort_departments.id')
            ->leftJoin('locations as sort_locations', 'users.primary_location_id', '=', 'sort_locations.id')
            ->when($request->filled('search'), function ($q) use ($request) {
                $this->applyUserListSearch($q, (string) $request->search);
            })
            ->when($request->status === 'active', fn ($q) =>
                $q->where('users.is_banned', false)
            )
            ->when($request->status === 'banned', fn ($q) =>
                $q->where('users.is_banned', true)
            )
            ->when($request->location, fn ($q) =>
                $q->where('users.primary_location_id', (int) $request->location)
            )
            ->when($request->department, fn ($q) =>
                $q->where('users.department_id', (int) $request->department)
            )
            ->when($request->position, fn ($q) =>
                $q->where('users.position', $request->position)
            )
            ->select(
                'users.id',
                'users.first_name',
                'users.last_name',
                'users.employee_id',
                'users.department_id',
                'users.company_position_id',
                'users.position',
                'users.email',
                'users.primary_location_id',
                'users.is_banned',
                'users.created_at',
                'users.updated_at' 
            );

        $this->applyUserSorting(
            $usersQuery,
            (string) $request->input('sortBy', ''),
            (string) $request->input('sortDirection', 'asc')
        );

        if ($perPageInput === 'all') {
            $perPage = max((clone $usersQuery)->count(), 1);
        } else {
            $perPage = (int) $perPageInput;

            if ($perPage <= 0) {
                $perPage = 10;
            }
        }

        return $usersQuery
            ->paginate($perPage)
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
    }

    public function userIndex(Request $request)
    {
        $perPageInput = strtolower(trim((string) $request->input('perPage', '10')));

        $usersQuery = User::query()
            ->leftJoin('company_departments as sort_departments', 'users.department_id', '=', 'sort_departments.id')
            ->leftJoin('locations as sort_locations', 'users.primary_location_id', '=', 'sort_locations.id')
            ->when($request->filled('search'), function ($q) use ($request) {
                $this->applyUserListSearch($q, (string) $request->search);
            })
            ->when($request->status === 'active', fn ($q) =>
                $q->where('users.is_banned', false)
            )
            ->when($request->status === 'banned', fn ($q) =>
                $q->where('users.is_banned', true)
            )
            ->when($request->location, fn ($q) =>
                $q->where('users.primary_location_id', (int) $request->location)
            )
            ->when($request->department, fn ($q) =>
                $q->where('users.department_id', (int) $request->department)
            )
            ->when($request->position, fn ($q) =>
                $q->where('users.position', $request->position)
            )
            ->select(
                'users.id',
                'users.first_name',
                'users.last_name',
                'users.employee_id',
                'users.department_id',
                'users.company_position_id',
                'users.position',
                'users.email',
                'users.primary_location_id',
                'users.is_banned',
                'users.created_at'
            );

        $this->applyUserSorting(
            $usersQuery,
            (string) $request->input('sortBy', ''),
            (string) $request->input('sortDirection', 'asc')
        );

        if ($perPageInput === 'all') {
            $perPage = max((clone $usersQuery)->count(), 1);
        } else {
            $perPage = (int) $perPageInput;

            if ($perPage <= 0) {
                $perPage = 10;
            }
        }

        $users = $usersQuery
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users'       => $users,
            'locations'   => Location::orderBy('name')->get(['id', 'name']),
            'departments' => CompanyDepartment::orderBy('name')->get(['id', 'name']),
            'filters'     => $request->only([
                'search',
                'status',
                'location',
                'department',
                'position',
                'perPage',
                'sortBy',
                'sortDirection',
            ]),
        ]);
    }

    public function userStore(Request $request)
    {
        $request->validate([
            'first_name'          => ['required', 'string', 'max:255'],
            'last_name'           => ['required', 'string', 'max:255'],
            'employee_id'         => ['required', 'regex:/^\d{1,4}$/', 'unique:users,employee_id'],
            'department_id'       => ['required', 'integer', 'exists:company_departments,id'],
            'company_position_id' => ['required', 'integer', 'exists:company_positions,id'],
            'position'            => ['nullable', 'string', 'max:255'],
            'email'               => ['required', 'email', 'unique:users,email'],
            'primary_location_id' => ['required', 'integer', 'exists:locations,id'],
        ], [
            'employee_id.regex' => 'Employee ID must be 1 to 4 digits only.',
        ]);

        $selectedPosition = CompanyPosition::query()
            ->whereKey((int) $request->company_position_id)
            ->where('department_id', (int) $request->department_id)
            ->where('is_active', true)
            ->first();

        if (! $selectedPosition) {
            return back()->withErrors([
                'company_position_id' => 'Selected position does not belong to the chosen department.',
                'position' => 'Selected position does not belong to the chosen department.',
            ])->withInput();
        }

        User::create([
            'first_name'                   => $request->first_name,
            'last_name'                    => $request->last_name,
            'employee_id'                  => $request->employee_id,
            'department_id'                => (int) $request->department_id,
            'company_position_id'          => $selectedPosition->id,
            'position'                     => $selectedPosition->name,
            'email'                        => $request->email,
            'primary_location_id'          => (int) $request->primary_location_id,
            'password'                     => Hash::make('P@ssw0rd'),
            'password_expiry'              => now()->subDay()->toDateString(),
            'default_password_login_count' => 0,
            'must_change_password'         => true,
            'is_banned'                    => false,
            'email_verified_at'            => now(),
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
            'company_position_id' => ['required', 'integer', 'exists:company_positions,id'],
            'position'            => ['nullable', 'string', 'max:255'],
            'email'               => ['required', 'email', 'unique:users,email,' . $user->id],
            'primary_location_id' => ['required', 'integer', 'exists:locations,id'],
            'password'            => ['nullable', 'string', 'min:8'],
        ], [
            'employee_id.regex' => 'Employee ID must be 1 to 4 digits only.',
        ]);

        $selectedPosition = CompanyPosition::query()
            ->whereKey((int) $request->company_position_id)
            ->where('department_id', (int) $request->department_id)
            ->where('is_active', true)
            ->first();

        if (! $selectedPosition) {
            return back()->withErrors([
                'company_position_id' => 'Selected position does not belong to the chosen department.',
                'position' => 'Selected position does not belong to the chosen department.',
            ])->withInput();
        }

        $data = [
            'first_name'          => $request->first_name,
            'last_name'           => $request->last_name,
            'employee_id'         => $request->employee_id,
            'department_id'       => (int) $request->department_id,
            'company_position_id' => $selectedPosition->id,
            'position'            => $selectedPosition->name,
            'email'               => $request->email,
            'primary_location_id' => (int) $request->primary_location_id,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
            $data['default_password_login_count'] = 0;
            $data['must_change_password'] = false;
        }

        $user->update($data);

        return back()->with('success', 'User updated.');
    }

    public function userResetPassword(User $user)
    {
        $defaultPassword = 'P@ssw0rd';

        $user->update([
            'password'                     => Hash::make($defaultPassword),
            'password_expiry'              => now()->subDay()->toDateString(),
            'default_password_login_count' => 0,
            'must_change_password'         => false,
        ]);

        if ($user->email) {
            try {
                Mail::to($user->email)->send(new PasswordResetMail(
                    userName: trim($user->first_name . ' ' . $user->last_name),
                    defaultPassword: $defaultPassword,
                    loginUrl: route('login'),
                    resetByAdmin: true,
                ));
            } catch (\Throwable $e) {
                Log::error('[Admin Mail] Failed to send PasswordResetMail', [
                    'to'      => $user->email,
                    'user_id' => $user->id,
                    'message' => $e->getMessage(),
                ]);

                report($e);
            }
        }

        $fullName = trim($user->first_name . ' ' . $user->last_name);

        return back()->with('success', "Password for {$fullName} has been reset to default.");
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
            'company_position_id' => ['required', 'integer', 'exists:company_positions,id'],
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

        $selectedPosition = CompanyPosition::query()
            ->whereKey((int) $request->company_position_id)
            ->where('department_id', (int) $request->department_id)
            ->where('is_active', true)
            ->first();

        if (! $selectedPosition) {
            return back()->withErrors([
                'company_position_id' => 'Selected position does not belong to the chosen department.',
                'position' => 'Selected position does not belong to the chosen department.',
            ])->withInput();
        }

        User::create([
            'first_name'                   => $request->first_name,
            'last_name'                    => $request->last_name,
            'employee_id'                  => $request->employee_id,
            'department_id'                => (int) $request->department_id,
            'company_position_id' => $selectedPosition->id,
            'position' => $selectedPosition->name,
            'email'                        => $request->email,
            'primary_location_id'          => (int) $request->primary_location_id,
            'password'                     => Hash::make('P@ssw0rd'),
            'password_expiry'              => now()->subDay()->toDateString(),
            'is_banned'                    => false,
            'email_verified_at'            => now(),
        ]);

        return back()->with('success', 'User created successfully.');
    }

    public function userManagementSuggestions(Request $request)
    {
        $search = $this->normalizeSearch((string) $request->get('search', ''));

        if ($search === '') {
            return response()->json([]);
        }

        $cacheKey = 'admin_user_suggestions_prefix_v3:' . Str::lower($search);

        $users = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($search) {
            $query = User::query();

            $this->applyUserSuggestionSearch($query, $search);
            $this->applyUserSuggestionOrdering($query, $search);

            return $query
                ->select(
                    'users.id',
                    'users.first_name',
                    'users.last_name',
                    'users.email',
                    'users.employee_id',
                    'users.position'
                )
                ->limit(8)
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'label' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: '—',
                        'subLabel' => $user->email ?: ($user->employee_id ?: '—'),
                        'value' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
                        'employee_id' => $user->employee_id,
                        'email' => $user->email,
                        'position' => $user->position,
                    ];
                })
                ->values();
        });

        return response()->json($users);
    }

    private function normalizeSearch(string $value): string
    {
        $normalized = preg_replace('/\s+/', ' ', trim($value));

        return trim((string) $normalized);
    }

    private function applyUserListSearch($query, string $search): void
    {
        $normalized = $this->normalizeSearch($search);

        if ($normalized === '') {
            return;
        }

        $prefix = $normalized . '%';
        $terms = preg_split('/\s+/', $normalized) ?: [];

        $query->where(function ($q) use ($prefix, $terms) {
            $q->where('users.first_name', 'like', $prefix)
                ->orWhere('users.last_name', 'like', $prefix)
                ->orWhere('users.employee_id', 'like', $prefix)
                ->orWhere('users.email', 'like', $prefix)
                ->orWhereRaw(
                    "TRIM(CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))) like ?",
                    [$prefix]
                );

            if (count($terms) >= 2) {
                $firstTerm = array_shift($terms);
                $lastTerm = implode(' ', $terms);

                $q->orWhere(function ($nameQuery) use ($firstTerm, $lastTerm) {
                    $nameQuery->where('users.first_name', 'like', $firstTerm . '%')
                        ->where('users.last_name', 'like', $lastTerm . '%');
                });

                $q->orWhere(function ($nameQuery) use ($firstTerm, $lastTerm) {
                    $nameQuery->where('users.first_name', 'like', $lastTerm . '%')
                        ->where('users.last_name', 'like', $firstTerm . '%');
                });
            }
        });
    }

    private function applyUserSuggestionSearch($query, string $search): void
    {
        $normalized = $this->normalizeSearch($search);

        if ($normalized === '') {
            return;
        }

        $prefix = $normalized . '%';
        $terms = preg_split('/\s+/', $normalized) ?: [];

        $query->where(function ($q) use ($prefix, $terms) {
            $q->where('users.first_name', 'like', $prefix)
                ->orWhere('users.last_name', 'like', $prefix)
                ->orWhere('users.employee_id', 'like', $prefix)
                ->orWhere('users.email', 'like', $prefix)
                ->orWhereRaw(
                    "TRIM(CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))) like ?",
                    [$prefix]
                );

            if (count($terms) >= 2) {
                $firstTerm = array_shift($terms);
                $lastTerm = implode(' ', $terms);

                $q->orWhere(function ($nameQuery) use ($firstTerm, $lastTerm) {
                    $nameQuery->where('users.first_name', 'like', $firstTerm . '%')
                        ->where('users.last_name', 'like', $lastTerm . '%');
                });

                $q->orWhere(function ($nameQuery) use ($firstTerm, $lastTerm) {
                    $nameQuery->where('users.first_name', 'like', $lastTerm . '%')
                        ->where('users.last_name', 'like', $firstTerm . '%');
                });
            }
        });
    }

    private function applyUserSuggestionOrdering($query, string $search): void
    {
        $normalized = $this->normalizeSearch($search);

        if ($normalized === '') {
            $query->orderBy('users.first_name')->orderBy('users.last_name');
            return;
        }

        $prefix = $normalized . '%';
        $terms = preg_split('/\s+/', $normalized) ?: [];

        if (count($terms) >= 2) {
            $firstTerm = array_shift($terms);
            $lastTerm = implode(' ', $terms);

            $query->orderByRaw(
                "CASE
                    WHEN TRIM(CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))) LIKE ? THEN 1
                    WHEN (users.first_name LIKE ? AND users.last_name LIKE ?) THEN 2
                    WHEN (users.first_name LIKE ? AND users.last_name LIKE ?) THEN 3
                    WHEN users.first_name LIKE ? THEN 4
                    WHEN users.last_name LIKE ? THEN 5
                    WHEN users.email LIKE ? THEN 6
                    WHEN users.employee_id LIKE ? THEN 7
                    ELSE 8
                END",
                [
                    $prefix,
                    $firstTerm . '%',
                    $lastTerm . '%',
                    $lastTerm . '%',
                    $firstTerm . '%',
                    $prefix,
                    $prefix,
                    $prefix,
                ]
            );
        } else {
            $query->orderByRaw(
                "CASE
                    WHEN TRIM(CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))) LIKE ? THEN 1
                    WHEN users.first_name LIKE ? THEN 2
                    WHEN users.last_name LIKE ? THEN 3
                    WHEN users.email LIKE ? THEN 4
                    WHEN users.employee_id LIKE ? THEN 5
                    ELSE 6
                END",
                [$prefix, $prefix, $prefix, $prefix, $prefix]
            );
        }

        $query->orderBy('users.first_name')->orderBy('users.last_name');
    }

    private function applyUserSorting($query, string $sortBy, string $sortDirection): void
    {
        $direction = Str::lower($sortDirection) === 'desc' ? 'desc' : 'asc';

        switch ($sortBy) {
            case 'first_name':
                $query->orderBy('users.first_name', $direction)
                    ->orderBy('users.last_name', $direction);
                break;

            case 'last_name':
                $query->orderBy('users.last_name', $direction)
                    ->orderBy('users.first_name', $direction);
                break;

            case 'employee_id':
                $query->orderByRaw("CAST(users.employee_id AS UNSIGNED) {$direction}")
                    ->orderBy('users.first_name', 'asc')
                    ->orderBy('users.last_name', 'asc');
                break;

            default:
                $query->orderBy('users.first_name', 'asc')
                    ->orderBy('users.last_name', 'asc');
                break;
        }
    }

public function updateSignatureForUser(Request $request, $id)
{
    $request->validate([
        'signature' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:3072'],
    ]);

    $user = \App\Models\User::findOrFail($id);

    // Force the extension to be .png so it matches your frontend
    $filename = $user->employee_id . '.png';

    // Delete old signature files with any extension to avoid duplicates
    foreach (['png', 'jpg', 'jpeg', 'webp'] as $oldExt) {
        $oldPath = storage_path('storage/app/public/signatures/' . $user->employee_id . '.' . $oldExt);
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }

    $request->file('signature')->storeAs('signatures', $filename, 'public');

    return back()->with('success', 'Signature updated for ' . trim($user->first_name . ' ' . $user->last_name) . '.');
}
           
}