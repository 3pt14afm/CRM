<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproverMatrix\StoreApproverMatrixRequest;
use App\Http\Requests\ApproverMatrix\UpdateApproverMatrixRequest;
use App\Models\CompanyDepartment;
use App\Models\Location;
use App\Models\LocationDepartment;
use App\Models\User;
use Inertia\Inertia;

class ApproverMatrixController extends Controller
{
    public function index()
    {
        $perPage = 10;

        $userNames = User::query()
            ->selectRaw("id, CONCAT(first_name, ' ', last_name) as full_name")
            ->pluck('full_name', 'id');

        $matrices = LocationDepartment::query()
            ->with([
                'location:id,name',
                'department:id,name',
            ])
            ->orderBy('id')
            ->paginate($perPage)
            ->through(function (LocationDepartment $row) use ($userNames) {
                return [
                    'id' => $row->id,
                    'location_id' => $row->location_id,
                    'department_id' => $row->department_id,
                    'location_name' => $row->location?->name ?? '—',
                    'dept_name' => $row->department?->name ?? '—',

                    'reviewed_by' => $row->reviewed_by,
                    'checked_by' => $row->checked_by,
                    'endorsed_by' => $row->endorsed_by,
                    'confirmed_by' => $row->confirmed_by,
                    'approved_by' => $row->approved_by,

                    'reviewed_by_name' => $row->reviewed_by ? ($userNames[$row->reviewed_by] ?? 'Unknown') : null,
                    'checked_by_name' => $row->checked_by ? ($userNames[$row->checked_by] ?? 'Unknown') : null,
                    'endorsed_by_name' => $row->endorsed_by ? ($userNames[$row->endorsed_by] ?? 'Unknown') : null,
                    'confirmed_by_name' => $row->confirmed_by ? ($userNames[$row->confirmed_by] ?? 'Unknown') : null,
                    'approved_by_name' => $row->approved_by ? ($userNames[$row->approved_by] ?? 'Unknown') : null,

                    'status' => $row->status ?? 'Inactive',
                ];
            })
            ->withQueryString();

        $stats = [
            'totalMatrices' => LocationDepartment::count(),
            'activeMatrices' => LocationDepartment::where('status', 'Active')->count(),
            'inactiveMatrices' => LocationDepartment::where('status', 'Inactive')->count(),
            'locations' => Location::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
            'departments' => CompanyDepartment::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
            'users' => User::query()
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name'])
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => trim($user->first_name . ' ' . $user->last_name),
                    ];
                })
                ->values(),
        ];

        return Inertia::render('Admin/ApproverMatrix', [
            'matrices' => $matrices,
            'stats' => $stats,
        ]);
    }

    public function store(StoreApproverMatrixRequest $request)
    {
        $data = $request->validated();

        LocationDepartment::updateOrCreate(
            [
                'location_id' => $data['location_id'],
                'department_id' => $data['department_id'],
            ],
            [
                'reviewed_by' => $data['reviewed_by'] ?? null,
                'checked_by' => $data['checked_by'] ?? null,
                'endorsed_by' => $data['endorsed_by'] ?? null,
                'confirmed_by' => $data['confirmed_by'] ?? null,
                'approved_by' => $data['approved_by'] ?? null,
                'status' => $data['status'],
            ]
        );

        return redirect()
            ->route('admin.approver-matrix.index')
            ->with('success', 'Approver matrix saved successfully.');
    }

    public function update(UpdateApproverMatrixRequest $request, LocationDepartment $locationDepartment)
    {
        $locationDepartment->update($request->validated());

        return redirect()
            ->route('admin.approver-matrix.index')
            ->with('success', 'Approver matrix updated successfully.');
    }
}