<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LocationController extends Controller
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
}