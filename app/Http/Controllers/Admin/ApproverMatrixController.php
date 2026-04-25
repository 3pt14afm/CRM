<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproverMatrix\StoreApproverMatrixRequest;
use App\Http\Requests\ApproverMatrix\UpdateApproverMatrixRequest;
use App\Models\SPRF\SprfApprovalMatrix;
use App\Models\CompanyPosition;
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

        $sprfMatrices = SprfApprovalMatrix::query()
            ->with([
                'steps.position:id,name',
                'steps.approver:id,first_name,last_name',
            ])
            ->orderBy('condition_code')
            ->orderByDesc('is_active')
            ->orderByDesc('version')
            ->get()
            ->map(function (SprfApprovalMatrix $matrix) {
                return [
                    'id' => $matrix->id,
                    'condition_code' => $matrix->condition_code,
                    'condition_label' => $matrix->condition_label,
                    'version' => $matrix->version,
                    'is_active' => $matrix->is_active,
                    'remarks' => $matrix->remarks,

                    'steps' => $matrix->steps->map(function ($step) {
                        $approverName = $step->approver
                            ? trim($step->approver->first_name . ' ' . $step->approver->last_name)
                            : null;

                        return [
                            'id' => $step->id,
                            'role' => $step->role,
                            'role_label' => $step->role_label,
                            'sequence' => $step->sequence,

                            'position_id' => $step->position_id,
                            'position_name' => $step->position?->name,

                            'approver_user_id' => $step->approver_user_id,
                            'approver_user_name' => $approverName,

                            'resolution_mode' => $step->resolution_mode,
                        ];
                    })->values(),
                ];
            })
            ->values();

        $sprfConditions = [
            [
                'code' => 'STANDARD_PRICING',
                'label' => 'Standard Pricing',
            ],
            [
                'code' => 'VALUE_GT_1M',
                'label' => 'Value > 1M',
            ],
            [
                'code' => 'GP_GT_15',
                'label' => 'GP > 15%',
            ],
            [
                'code' => 'GP_LTE_15',
                'label' => 'GP <= 15%',
            ],
            [
                'code' => 'REBATE_REQUEST',
                'label' => 'Rebate Request',
            ],
        ];

        $positions = CompanyPosition::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($position) => [
                'id' => $position->id,
                'name' => $position->name,
            ])
            ->values();

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
                ->where('is_banned', false)
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name', 'company_position_id'])
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => trim($user->first_name . ' ' . $user->last_name),
                        'company_position_id' => $user->company_position_id,
                    ];
                })
                ->values(),
        ];

        return Inertia::render('Admin/ApproverMatrix', [
            'matrices' => $matrices,
            'stats' => $stats,

            'sprfMatrices' => $sprfMatrices,
            'sprfConditions' => $sprfConditions,
            'positions' => $positions,
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