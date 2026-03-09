<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyDepartment;
use App\Models\CompanyPosition;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionController extends Controller
{
    public function positionMaster(Request $request)
    {
        $positions = CompanyPosition::query()
            ->with('department:id,name')
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($position) {
                $position->status = $position->is_active ? 'Active' : 'Inactive';
                $position->department_name = $position->department?->name;
                return $position;
            })
            ->withQueryString();

        $departments = CompanyDepartment::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $stats = [
            'totalPositions'  => CompanyPosition::count(),
            'activePositions' => CompanyPosition::where('is_active', true)->count(),
        ];

        return Inertia::render('Admin/PositionMaster', [
            'positions'   => $positions,
            'departments' => $departments,
            'stats'       => $stats,
        ]);
    }

    public function positionIndex(Request $request)
    {
        $search = $request->input('search');

        $positions = CompanyPosition::query()
            ->with('department:id,name')
            ->when($search, function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhereHas('department', function ($dq) use ($search) {
                        $dq->where('name', 'like', "%{$search}%");
                    });
            })
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($position) {
                $position->status = $position->is_active ? 'Active' : 'Inactive';
                $position->department_name = $position->department?->name;
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
            'department_id' => 'required|exists:company_departments,id',
        ]);

        CompanyPosition::create([
            'code' => strtoupper($request->code),
            'name' => $request->name,
            'department_id' => $request->department_id,
            'is_active' => true,
        ]);

        return back()->with('success', 'Position created.');
    }

    public function positionUpdate(Request $request, CompanyPosition $position)
    {
        $request->validate([
            'code' => 'required|string|max:50|unique:company_positions,code,' . $position->id,
            'name' => 'required|string|max:255|unique:company_positions,name,' . $position->id,
            'department_id' => 'required|exists:company_departments,id',
        ]);

        $position->update([
            'code' => strtoupper($request->code),
            'name' => $request->name,
            'department_id' => $request->department_id,
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

    public function positions()
    {
        return response()->json(
            CompanyPosition::query()
                ->with('department:id,name')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'department_id'])
                ->map(function ($position) {
                    return [
                        'id' => $position->id,
                        'name' => $position->name,
                        'department_id' => $position->department_id,
                        'department_name' => $position->department?->name,
                    ];
                })
                ->values()
        );
    }
}