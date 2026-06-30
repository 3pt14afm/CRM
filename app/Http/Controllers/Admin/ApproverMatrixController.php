<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproverMatrix\StoreApproverMatrixRequest;
use App\Http\Requests\ApproverMatrix\UpdateApproverMatrixRequest;
use App\Models\SPRF\SprfApprovalMatrix;
use App\Models\CompanyDepartment;
use App\Models\Location;
use App\Models\LocationDepartment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ApproverMatrixController extends Controller
{
    // ─── Index ────────────────────────────────────────────────────────────────

    public function index()
    {
        $perPage = 10;

        $userNames = User::query()
            ->selectRaw("id, CONCAT(first_name, ' ', last_name) as full_name")
            ->pluck('full_name', 'id');

        // ── ROI matrices ──────────────────────────────────────────
        $matrices = LocationDepartment::query()
            ->with([
                'location:id,name',
                'department:id,name',
            ])
            ->orderBy('id')
            ->paginate($perPage)
            ->through(function (LocationDepartment $row) use ($userNames) {
                return [
                    'id'            => $row->id,
                    'location_id'   => $row->location_id,
                    'department_id' => $row->department_id,
                    'location_name' => $row->location?->name ?? '—',
                    'dept_name'     => $row->department?->name ?? '—',

                    'reviewed_by'  => $row->reviewed_by,
                    'checked_by'   => $row->checked_by,
                    'endorsed_by'  => $row->endorsed_by,
                    'confirmed_by' => $row->confirmed_by,
                    'approved_by'  => $row->approved_by,

                    'reviewed_by_name'  => $row->reviewed_by  ? ($userNames[$row->reviewed_by]  ?? 'Unknown') : null,
                    'checked_by_name'   => $row->checked_by   ? ($userNames[$row->checked_by]   ?? 'Unknown') : null,
                    'endorsed_by_name'  => $row->endorsed_by  ? ($userNames[$row->endorsed_by]  ?? 'Unknown') : null,
                    'confirmed_by_name' => $row->confirmed_by ? ($userNames[$row->confirmed_by] ?? 'Unknown') : null,
                    'approved_by_name'  => $row->approved_by  ? ($userNames[$row->approved_by]  ?? 'Unknown') : null,

                    'status' => $row->status ?? 'Inactive',
                ];
            })
            ->withQueryString();

        // ── SPRF matrices (flat table, keyed by location + department) ────────
        $sprfMatrices = SprfApprovalMatrix::query()
            ->with([
                'location:id,name',
                'department:id,name',
                'directorCustomerEngagement:id,first_name,last_name',
                'esdDirector:id,first_name,last_name',
                'vpCcto:id,first_name,last_name',
                'presidentCeo:id,first_name,last_name',
            ])
            ->orderBy('location_id')
            ->orderBy('department_id')
            ->orderByDesc('is_active')
            ->get()
            ->map(function (SprfApprovalMatrix $matrix) {
                return [
                    'id'              => $matrix->id,
                    'location_id'     => $matrix->location_id,
                    'location_name'   => $matrix->location?->name ?? '—',
                    'department_id'   => $matrix->department_id,
                    'department_name' => $matrix->department?->name ?? '—',
                    'is_active'       => $matrix->is_active,
                    'remarks'         => $matrix->remarks,

                    'director_customer_engagement_user_id'   => $matrix->director_customer_engagement_user_id,
                    'director_customer_engagement_user_name' => $matrix->directorCustomerEngagement
                        ? trim($matrix->directorCustomerEngagement->first_name . ' ' . $matrix->directorCustomerEngagement->last_name)
                        : null,

                    'esd_director_user_id'   => $matrix->esd_director_user_id,
                    'esd_director_user_name' => $matrix->esdDirector
                        ? trim($matrix->esdDirector->first_name . ' ' . $matrix->esdDirector->last_name)
                        : null,

                    'vp_ccto_user_id'   => $matrix->vp_ccto_user_id,
                    'vp_ccto_user_name' => $matrix->vpCcto
                        ? trim($matrix->vpCcto->first_name . ' ' . $matrix->vpCcto->last_name)
                        : null,

                    'president_ceo_user_id'   => $matrix->president_ceo_user_id,
                    'president_ceo_user_name' => $matrix->presidentCeo
                        ? trim($matrix->presidentCeo->first_name . ' ' . $matrix->presidentCeo->last_name)
                        : null,
                ];
            })
            ->values();

        // ── Shared lookup data ────────────────────────────────────────────────
        $stats = [
            'totalMatrices'    => LocationDepartment::count(),
            'activeMatrices'   => LocationDepartment::where('status', 'Active')->count(),
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
                ->map(fn ($user) => [
                    'id'                  => $user->id,
                    'name'                => trim($user->first_name . ' ' . $user->last_name),
                    'company_position_id' => $user->company_position_id,
                ])
                ->values(),
        ];

        return Inertia::render('Admin/ApproverMatrix', [
            'matrices'     => $matrices,
            'stats'        => $stats,
            'sprfMatrices' => $sprfMatrices,
        ]);
    }

    // ─── ROI: Store ───────────────────────────────────────────────

    public function store(StoreApproverMatrixRequest $request)
    {
        $data = $request->validated();

        LocationDepartment::updateOrCreate(
            [
                'location_id'   => $data['location_id'],
                'department_id' => $data['department_id'],
            ],
            [
                'reviewed_by'  => $data['reviewed_by']  ?? null,
                'checked_by'   => $data['checked_by']   ?? null,
                'endorsed_by'  => $data['endorsed_by']  ?? null,
                'confirmed_by' => $data['confirmed_by'] ?? null,
                'approved_by'  => $data['approved_by']  ?? null,
                'status'       => $data['status'],
            ]
        );

        return redirect()
            ->route('admin.approver-matrix.index')
            ->with('success', 'Approver matrix saved successfully.');
    }

    // ─── ROI: Update  ──────────────────────────────────────────────

    public function update(UpdateApproverMatrixRequest $request, LocationDepartment $locationDepartment)
    {
        $locationDepartment->update($request->validated());

        return redirect()
            ->route('admin.approver-matrix.index')
            ->with('success', 'Approver matrix updated successfully.');
    }

    // ─── SPRF: Store ─────────────────────────────────────────────────────────

    public function storeSprfMatrix(Request $request)
    {
        $data = $this->validateSprfMatrixRequest($request);

        // A new matrix may be created for this location + department only if
        // no ACTIVE matrix already exists for that combo. If one exists but
        // is inactive, admins are free to add a new one — they must
        // deactivate the existing active matrix first if there is one.
        $activeExists = SprfApprovalMatrix::query()
            ->where('location_id',   $data['location_id'])
            ->where('department_id', $data['department_id'])
            ->where('is_active', true)
            ->exists();

        if ($activeExists) {
            throw ValidationException::withMessages([
                'department_id' => 'An active SPRF approver matrix already exists for this location and department. Deactivate it before adding a new one for the same combination.',
            ]);
        }

        SprfApprovalMatrix::create([
            'location_id'                          => $data['location_id'],
            'department_id'                        => $data['department_id'],
            'director_customer_engagement_user_id' => $data['director_customer_engagement_user_id'],
            'esd_director_user_id'                 => $data['esd_director_user_id'],
            'vp_ccto_user_id'                      => $data['vp_ccto_user_id'],
            'president_ceo_user_id'                => $data['president_ceo_user_id'],
            'is_active'                            => $data['is_active'],
            'remarks'                              => $data['remarks'] ?? null,
            'created_by_user_id'                   => Auth::id(),
            'updated_by_user_id'                   => Auth::id(),
        ]);

        return redirect()
            ->route('admin.approver-matrix.index')
            ->with('success', 'SPRF approver matrix created successfully.');
    }

    // ─── SPRF: Update ────────────────────────────────────────────────────────

    public function updateSprfMatrix(Request $request, SprfApprovalMatrix $sprfApprovalMatrix)
    {
        // Once a matrix is saved, its location + department are permanent.
        // Only the approvers, active flag, and remarks may be edited, so we
        // validate just those fields here rather than reusing the "store"
        // validation (which requires location_id/department_id).
        $data = $request->validate([
            'director_customer_engagement_user_id' => ['required', 'integer', 'exists:users,id'],
            'esd_director_user_id'                 => ['required', 'integer', 'exists:users,id'],
            'vp_ccto_user_id'                      => ['required', 'integer', 'exists:users,id'],
            'president_ceo_user_id'                => ['required', 'integer', 'exists:users,id'],
            'is_active'                            => ['required', 'boolean'],
            'remarks'                              => ['nullable', 'string', 'max:1000'],
        ]);

        // If activating this matrix, ensure no other active matrix exists for
        // the same location + department (excluding self). location_id and
        // department_id are always read from the existing record, never the
        // request, so they can't be changed via this endpoint.
        if ($data['is_active']) {
            $conflict = SprfApprovalMatrix::query()
                ->where('location_id',   $sprfApprovalMatrix->location_id)
                ->where('department_id', $sprfApprovalMatrix->department_id)
                ->where('is_active', true)
                ->where('id', '!=', $sprfApprovalMatrix->id)
                ->exists();

            if ($conflict) {
                throw ValidationException::withMessages([
                    'is_active' => 'Another active SPRF matrix already exists for this location and department. Deactivate it first.',
                ]);
            }
        }

        $sprfApprovalMatrix->update([
            'director_customer_engagement_user_id' => $data['director_customer_engagement_user_id'],
            'esd_director_user_id'                 => $data['esd_director_user_id'],
            'vp_ccto_user_id'                      => $data['vp_ccto_user_id'],
            'president_ceo_user_id'                => $data['president_ceo_user_id'],
            'is_active'                            => $data['is_active'],
            'remarks'                              => $data['remarks'] ?? null,
            'updated_by_user_id'                   => Auth::id(),
        ]);

        return redirect()
            ->route('admin.approver-matrix.index')
            ->with('success', 'SPRF approver matrix updated successfully.');
    }

    // ─── SPRF: Validation ────────────────────────────────────────────────────

    private function validateSprfMatrixRequest(Request $request): array
    {
        return $request->validate([
            'location_id'                          => ['required', 'integer', 'exists:locations,id'],
            'department_id'                        => ['required', 'integer', 'exists:company_departments,id'],
            'director_customer_engagement_user_id' => ['required', 'integer', 'exists:users,id'],
            'esd_director_user_id'                 => ['required', 'integer', 'exists:users,id'],
            'vp_ccto_user_id'                      => ['required', 'integer', 'exists:users,id'],
            'president_ceo_user_id'                => ['required', 'integer', 'exists:users,id'],
            'is_active'                            => ['required', 'boolean'],
            'remarks'                              => ['nullable', 'string', 'max:1000'],
        ]);
    }
}