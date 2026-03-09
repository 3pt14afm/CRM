<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyDepartment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function departmentMaster(Request $request)
    {
        $departments = CompanyDepartment::query()
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($department) {
                $department->status = $department->is_active ? 'Active' : 'Inactive';
                return $department;
            })
            ->withQueryString();

        $stats = [
            'totalDepartments'  => CompanyDepartment::count(),
            'activeDepartments' => CompanyDepartment::where('is_active', true)->count(),
        ];

        return Inertia::render('Admin/DepartmentMaster', [
            'departments' => $departments,
            'stats'       => $stats,
        ]);
    }

    public function departmentIndex(Request $request)
    {
        $search = $request->input('search');

        $departments = CompanyDepartment::query()
            ->when($search, fn ($q) =>
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($department) {
                $department->status = $department->is_active ? 'Active' : 'Inactive';
                return $department;
            })
            ->withQueryString();

        return response()->json($departments);
    }

    public function departmentStore(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:50|unique:company_departments,code',
            'name' => 'required|string|max:255|unique:company_departments,name',
        ]);

        CompanyDepartment::create([
            'code' => strtoupper($request->code),
            'name' => $request->name,
            'is_active' => true,
        ]);

        return back()->with('success', 'Department created.');
    }

    public function departmentUpdate(Request $request, CompanyDepartment $department)
    {
        $request->validate([
            'code' => 'required|string|max:50|unique:company_departments,code,' . $department->id,
            'name' => 'required|string|max:255|unique:company_departments,name,' . $department->id,
        ]);

        $department->update([
            'code' => strtoupper($request->code),
            'name' => $request->name,
        ]);

        return back()->with('success', 'Department updated.');
    }

    public function departmentActivate(CompanyDepartment $department)
    {
        $department->update(['is_active' => true]);

        return back()->with('success', 'Department activated.');
    }

    public function departmentDeactivate(CompanyDepartment $department)
    {
        $department->update(['is_active' => false]);

        return back()->with('success', 'Department deactivated.');
    }

    public function departments()
    {
        return response()->json(
            CompanyDepartment::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
        );
    }
}