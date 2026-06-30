<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SPRF\SprfApprovalMatrix;
use App\Models\SPRF\SprfApprovalMatrixStep;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SprfApproverMatrixController extends Controller
{
    public function store(Request $request)
    {
        $validated = $this->validateMatrix($request);

        DB::transaction(function () use ($validated) {
            $nextVersion = SprfApprovalMatrix::where('condition_code', $validated['condition_code'])
                ->max('version');

            $matrix = SprfApprovalMatrix::create([
                'condition_code' => $validated['condition_code'],
                'version' => ((int) $nextVersion) + 1,
                'is_active' => false,
                'remarks' => $validated['remarks'] ?? null,
                'created_by_user_id' => Auth::id(),
                'updated_by_user_id' => Auth::id(),
            ]);

            foreach ($validated['steps'] as $step) {
                $this->validateStepApprover($step);

                SprfApprovalMatrixStep::create([
                    'sprf_approval_matrix_id' => $matrix->id,
                    'role' => $step['role'],
                    'sequence' => $step['sequence'],
                    'position_id' => $step['position_id'],
                    'approver_user_id' => $step['approver_user_id'],
                    'resolution_mode' => 'specific_user',
                ]);
            }
        });

        return back()->with('success', 'SPRF approver matrix created.');
    }

    public function update(Request $request, SprfApprovalMatrix $matrix)
    {
        if ($matrix->is_active) {
            throw ValidationException::withMessages([
                'matrix' => 'Active SPRF approver matrices cannot be edited. Please create a new version instead.',
            ]);
        }

        $validated = $this->validateMatrix($request);

        DB::transaction(function () use ($validated, $matrix) {
            $matrix->update([
                'condition_code' => $validated['condition_code'],
                'remarks' => $validated['remarks'] ?? null,
                'updated_by_user_id' => Auth::id(),
            ]);

            $matrix->steps()->delete();

            foreach ($validated['steps'] as $step) {
                $this->validateStepApprover($step);

                SprfApprovalMatrixStep::create([
                    'sprf_approval_matrix_id' => $matrix->id,
                    'role' => $step['role'],
                    'sequence' => $step['sequence'],
                    'position_id' => $step['position_id'],
                    'approver_user_id' => $step['approver_user_id'],
                    'resolution_mode' => 'specific_user',
                ]);
            }
        });

        return back()->with('success', 'SPRF approver matrix updated.');
    }

    public function activate(SprfApprovalMatrix $matrix)
    {
        DB::transaction(function () use ($matrix) {
            $matrix->load('steps');

            if ($matrix->steps->isEmpty()) {
                throw ValidationException::withMessages([
                    'matrix' => 'Cannot activate a matrix without approval steps.',
                ]);
            }

            foreach ($matrix->steps as $step) {
                $this->validateStepApprover($step->toArray());
            }

            SprfApprovalMatrix::where('condition_code', $matrix->condition_code)
                ->whereKeyNot($matrix->id)
                ->update(['is_active' => false]);

            $matrix->update([
                'is_active' => true,
                'updated_by_user_id' => Auth::id(),
            ]);
        }, 5);

        return back()->with('success', 'SPRF approver matrix activated.');
    }

    private function validateMatrix(Request $request): array
    {
        $validated = $request->validate([
            'condition_code' => [
                'required',
                'string',
                'max:50',
                Rule::in([
                    'STANDARD_PRICING',
                    'VALUE_GT_1M',
                    'GP_GT_15',
                    'GP_LTE_15',
                    'REBATE_REQUEST',
                ]),
            ],
            'remarks' => ['nullable', 'string', 'max:500'],

            'steps' => ['required', 'array', 'min:2'],
            'steps.*.role' => ['required', 'string', 'max:50'],
            'steps.*.sequence' => ['required', 'integer', 'min:1'],
            'steps.*.position_id' => [
                'required',
                Rule::exists('company_positions', 'id')->where('is_active', true),
            ],
            'steps.*.approver_user_id' => [
                'required',
                Rule::exists('users', 'id')->where('is_banned', false),
            ],
        ]);

        $this->validateRequiredRoles($validated['condition_code'], $validated['steps']);

        return $validated;
    }

    private function validateRequiredRoles(string $conditionCode, array $steps): void
    {
        $requiredRoles = match ($conditionCode) {
            'STANDARD_PRICING',
            'VALUE_GT_1M',
            'GP_GT_15',
            'GP_LTE_15' => [
                'ESD_DIRECTOR',
                'VP_CCTO',
                'PRESIDENT_CEO',
            ],

            'REBATE_REQUEST' => [
                'DIRECTOR_CUSTOMER_ENGAGEMENT',
                'ESD_DIRECTOR',
                'VP_CCTO',
                'PRESIDENT_CEO',
            ],
        };

        $submittedRoles = collect($steps)->pluck('role')->values();

        foreach ($requiredRoles as $role) {
            if (! $submittedRoles->contains($role)) {
                throw ValidationException::withMessages([
                    'steps' => "Missing required approver role: {$role}.",
                ]);
            }
        }

        if ($submittedRoles->count() !== count($requiredRoles)) {
            throw ValidationException::withMessages([
                'steps' => 'Invalid number of approver steps for this condition.',
            ]);
        }

        if ($submittedRoles->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages([
                'steps' => 'Duplicate approver roles are not allowed.',
            ]);
        }

        $invalidRoles = $submittedRoles->diff($requiredRoles);

        if ($invalidRoles->isNotEmpty()) {
            throw ValidationException::withMessages([
                'steps' => 'This condition has invalid approver roles.',
            ]);
        }
    }

    private function validateStepApprover(array $step): void
    {
        $positionId = (int) $step['position_id'];
        $userId = (int) $step['approver_user_id'];

        $belongsToPosition = User::query()
            ->where('id', $userId)
            ->where('is_banned', false)
            ->where('company_position_id', $positionId)
            ->exists();

        if (! $belongsToPosition) {
            throw ValidationException::withMessages([
                'steps' => 'The selected approver does not belong to the selected position.',
            ]);
        }
    }
}