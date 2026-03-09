<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyPosition;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionController extends Controller
{
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

    public function positions()
    {
        return response()->json(
            CompanyPosition::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
        );
    }
}