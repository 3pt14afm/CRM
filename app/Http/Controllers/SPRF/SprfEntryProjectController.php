<?php

namespace App\Http\Controllers\SPRF;

use App\Http\Controllers\Controller;
use App\Models\SPRF\SprfApprovalMatrix;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\SPRF\SprfEntryFee;
use App\Models\SPRF\SprfEntryItem;
use App\Models\SPRF\SprfEntryProject;
use App\Models\User;
use App\Services\SPRF\SprfNumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use App\Services\SprfActivityLogger;
use Illuminate\Support\Facades\Log;


class SprfEntryProjectController extends Controller
{
    public function show(SprfEntryProject $project)
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            abort(403);
        }

        $project->load(['items', 'fees', 'preparer:id,first_name,last_name,position,email']);

        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntry', [
            'approverUsers' => $this->mapApproverUsersFromProject($project),
            'initialProject' => $this->transformProjectForFrontend($project),
        ]);
    }

    public function print(SprfEntryProject $project)
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            abort(403);
        }

        $project->load(['items', 'fees', 'preparer:id,first_name,last_name,position,email']);

        return Inertia::render('CustomerManagement/ProjectSPRF/sprfEntryPrint', [
            'entryProject' => $this->transformProjectForPrint($project),
            'storageKey' => request('storageKey'),
            'autoprint' => (bool) request('autoprint', false),
            'showDraftWatermark' => (bool) request('draftWatermark', true),
        ]);
    }

public function saveDraft(Request $request, SprfNumberGenerator $sprfNumberGenerator)
{
    $payload = $this->validatePayload($request);

    $projectId = data_get($payload, 'project_id');

    $existingProject = $projectId
        ? SprfEntryProject::query()
            ->where('id', $projectId)
            ->where('prepared_by_user_id', Auth::id())
            ->firstOrFail()
        : null;

    $oldValues = $existingProject
        ? $existingProject->toArray()
        : null;

    $revenue = (float) data_get($payload, 'summary.revenue', 0);
    $cogs = (float) data_get($payload, 'summary.cogs', 0);
    $otherExpenseTotal = (float) data_get($payload, 'summary.otherExpense', 0);
    $totalExpense = (float) data_get($payload, 'summary.totalExpense', 0);
    $gpValue = (float) data_get($payload, 'summary.gpValue', 0);
    $gpPercent = (float) data_get($payload, 'summary.totalGpPercent', 0);

    $items = $this->mapItemsPayload((array) data_get($payload, 'items', []));
    $fees = $this->mapFeesPayload((array) data_get($payload, 'other_expenses', []));

    $hasRebate = $this->hasRebateValueFromMappedFees($fees);

    $approvalConditionCode = $this->resolveApprovalConditionCode(
        $payload,
        $revenue,
        $gpPercent,
        $hasRebate
    );

    $approval = $this->tryResolveActiveSprfApprovalMatrix($approvalConditionCode);

    $approverUsers = $approval['approver_users'] ?? $this->resolveApproverUsers();
    $flags = $approval['flags'] ?? $this->resolveApprovalFlags($revenue, $gpPercent, $hasRebate);
    $sprfApprovalMatrixId = $approval['matrix_id'] ?? null;

    $project = DB::transaction(function () use (
        $existingProject,
        $payload,
        $approverUsers,
        $revenue,
        $cogs,
        $otherExpenseTotal,
        $totalExpense,
        $gpValue,
        $gpPercent,
        $flags,
        $items,
        $fees,
        $sprfApprovalMatrixId,
        $approvalConditionCode,
        $sprfNumberGenerator
    ) {
        $project = $existingProject ?: new SprfEntryProject();

        $documentDatetime = $existingProject?->document_datetime
            ? Carbon::parse($existingProject->document_datetime)
            : now();

        $sprfNo = $existingProject?->sprf_no
            ?: $sprfNumberGenerator->generateForCreatedAt($documentDatetime);

        $companyInfo = (array) data_get($payload, 'company_info', []);

        $project->fill([
            'sprf_no' => $sprfNo,
            'document_datetime' => $documentDatetime,

            'status' => 'draft',
            'current_level' => 1,
            'approval_level' => $flags['approval_level'],
            'sprf_approval_matrix_id' => $sprfApprovalMatrixId,
            'approval_condition_code' => $approvalConditionCode,

            'prepared_by_user_id' => $existingProject?->prepared_by_user_id ?: Auth::id(),
            'director_customer_engagement_user_id' => data_get($approverUsers, 'directorCustomerEngagement.id'),
            'esd_director_user_id' => data_get($approverUsers, 'esdDirector.id'),
            'vp_ccto_user_id' => data_get($approverUsers, 'vpCcto.id'),
            'president_ceo_user_id' => data_get($approverUsers, 'presidentCeo.id'),
            'current_approver_user_id' => null,
            'approved_by_user_id' => null,
            'rejected_by_user_id' => null,

            'sub_category' => data_get($companyInfo, 'subCategory'),
            'account' => data_get($companyInfo, 'account'),
            'account_manager' => data_get($companyInfo, 'accountManager'),

            'remarks' => data_get($payload, 'remarks'),
            'rebate_justification' => data_get($payload, 'rebate_justification'),
            'last_reject_note' => null,

            'revenue' => $revenue,
            'cogs' => $cogs,
            'other_expense_total' => $otherExpenseTotal,
            'total_expense' => $totalExpense,
            'gp_value' => $gpValue,
            'gp_percent' => $gpPercent,

            'requires_vp_ccto' => $flags['requires_vp_ccto'],
            'requires_president_ceo' => $flags['requires_president_ceo'],
            'requires_rebate_justification' => $flags['requires_rebate_justification'],

            'last_saved_at' => now(),
            'submitted_at' => null,
            'approved_at' => null,
            'rejected_at' => null,
        ]);

        $project->save();

        $project->items()->delete();
        $project->fees()->delete();

        if (! empty($items)) {
            $project->items()->createMany($items);
        }

        if (! empty($fees)) {
            $project->fees()->createMany($fees);
        }

        return $project;
    });

    SprfActivityLogger::log(
        activityType: $existingProject ? 'update_draft' : 'create_draft',
        sprf: $project,
        details: $existingProject
            ? 'SPRF draft updated'
            : 'SPRF draft created',
        oldValues: $oldValues,
        newValues: $project->fresh()->toArray()
    );

    return redirect()
        ->route('sprf.entry.projects.show', $project)
        ->with('success', 'SPRF draft saved.');
}

public function submit(Request $request, SprfEntryProject $project, SprfNumberGenerator $sprfNumberGenerator)
{
    if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
        abort(403);
    }

    if ($project->status !== 'draft') {
        throw ValidationException::withMessages([
            'project' => 'Only draft SPRF projects can be submitted.',
        ]);
    }

    $oldValues = $project->toArray();

    $payload = $this->validatePayload($request);

    $revenue = (float) data_get($payload, 'summary.revenue', $project->revenue);
    $cogs = (float) data_get($payload, 'summary.cogs', $project->cogs);
    $otherExpenseTotal = (float) data_get($payload, 'summary.otherExpense', $project->other_expense_total);
    $totalExpense = (float) data_get($payload, 'summary.totalExpense', $project->total_expense);
    $gpValue = (float) data_get($payload, 'summary.gpValue', $project->gp_value);
    $gpPercent = (float) data_get($payload, 'summary.totalGpPercent', $project->gp_percent);

    $items = $this->mapItemsPayload((array) data_get($payload, 'items', []));
    $fees = $this->mapFeesPayload((array) data_get($payload, 'other_expenses', []));

    $hasRebate = $this->hasRebateValueFromMappedFees($fees);

    $approvalConditionCode = $this->resolveApprovalConditionCode(
        $payload,
        $revenue,
        $gpPercent,
        $hasRebate
    );

    $approval = $this->resolveActiveSprfApprovalMatrix($approvalConditionCode);

    $approverUsers = $approval['approver_users'];
    $flags = $approval['flags'];
    $sprfApprovalMatrixId = $approval['matrix_id'];

    $this->validateRequiredApprovers($approverUsers, $flags);

    $rebateJustification = (string) data_get(
        $payload,
        'rebate_justification',
        $project->rebate_justification ?? ''
    );

    if ($flags['requires_rebate_justification'] && blank($rebateJustification)) {
        throw ValidationException::withMessages([
            'rebate_justification' => 'Rebate justification is required for this SPRF condition.',
        ]);
    }

    $currentProject = DB::transaction(function () use (
        $project,
        $payload,
        $approverUsers,
        $revenue,
        $cogs,
        $otherExpenseTotal,
        $totalExpense,
        $gpValue,
        $gpPercent,
        $flags,
        $items,
        $fees,
        $rebateJustification,
        $sprfApprovalMatrixId,
        $approvalConditionCode,
        $sprfNumberGenerator
    ) {
        $companyInfo = (array) data_get($payload, 'company_info', []);

        $documentDatetime = $project->document_datetime
            ? Carbon::parse($project->document_datetime)
            : now();

        $sprfNo = $project->sprf_no
            ?: $sprfNumberGenerator->generateForCreatedAt($documentDatetime);

        $currentProject = SprfCurrentProject::create([
            'entry_project_id' => $project->id,
            'sprf_no' => $sprfNo,
            'document_datetime' => $documentDatetime,

            'status' => 'for_review',
            'current_level' => 2,
            'approval_level' => $flags['approval_level'],
            'sprf_approval_matrix_id' => $sprfApprovalMatrixId,
            'approval_condition_code' => $approvalConditionCode,

            'prepared_by_user_id' => $project->prepared_by_user_id ?: Auth::id(),
            'director_customer_engagement_user_id' => data_get($approverUsers, 'directorCustomerEngagement.id'),
            'esd_director_user_id' => data_get($approverUsers, 'esdDirector.id'),
            'vp_ccto_user_id' => data_get($approverUsers, 'vpCcto.id'),
            'president_ceo_user_id' => data_get($approverUsers, 'presidentCeo.id'),
            'current_approver_user_id' => data_get($approverUsers, 'directorCustomerEngagement.id'),
            'approved_by_user_id' => null,
            'rejected_by_user_id' => null,

            'sub_category' => data_get($companyInfo, 'subCategory'),
            'account' => data_get($companyInfo, 'account'),
            'account_manager' => data_get($companyInfo, 'accountManager'),

            'remarks' => data_get($payload, 'remarks', $project->remarks),
            'rebate_justification' => $rebateJustification,
            'last_reject_note' => null,

            'revenue' => $revenue,
            'cogs' => $cogs,
            'other_expense_total' => $otherExpenseTotal,
            'total_expense' => $totalExpense,
            'gp_value' => $gpValue,
            'gp_percent' => $gpPercent,

            'requires_vp_ccto' => $flags['requires_vp_ccto'],
            'requires_president_ceo' => $flags['requires_president_ceo'],
            'requires_rebate_justification' => $flags['requires_rebate_justification'],

            'last_saved_at' => now(),
            'submitted_at' => now(),
            'approved_at' => null,
            'rejected_at' => null,
        ]);

        if (! empty($items)) {
            $currentProject->items()->createMany($items);
        }

        if (! empty($fees)) {
            $currentProject->fees()->createMany($fees);
        }

        $project->items()->delete();
        $project->fees()->delete();
        $project->forceDelete();

        return $currentProject;
    });

    try {
        SprfActivityLogger::log(
            activityType: 'submitted',
            sprf: $currentProject,
            details: 'SPRF draft submitted',
            oldValues: $oldValues,
            newValues: $currentProject->fresh()->toArray()
        );
    } catch (\Throwable $e) {
        Log::error('SPRF submit activity log failed', [
            'message' => $e->getMessage(),
            'sprf_current_project_id' => $currentProject->id ?? null,
        ]);
    }

    return redirect()
        ->route('sprf.current')
        ->with('success', 'Draft successfully submitted.');
}

public function destroy(SprfEntryProject $project)
{
    if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
        abort(403);
    }

    if ($project->status !== 'draft') {
        throw ValidationException::withMessages([
            'project' => 'Only draft SPRF projects can be deleted.',
        ]);
    }

    $project->load(['items', 'fees']);

    $oldValues = [
        'project' => $project->toArray(),
        'items' => $project->items->map->toArray()->toArray(),
        'fees' => $project->fees->map->toArray()->toArray(),
    ];

    DB::transaction(function () use ($project) {
        $project->items()->delete();
        $project->fees()->delete();
        $project->forceDelete();
    });

    try {
        SprfActivityLogger::log(
            activityType: 'delete_draft',
            sprf: null,
            details: 'Deleted SPRF draft #' . ($oldValues['project']['sprf_no'] ?? $project->id),
            oldValues: $oldValues,
            newValues: null
        );
    } catch (\Throwable $e) {
        Log::error('SPRF delete activity log failed', [
            'message' => $e->getMessage(),
            'sprf_id' => $project->id,
        ]);
    }

    return redirect()->route('sprf.entry.list');
}
    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:sprf_entry_projects,id'],
            'approval_condition_code' => ['nullable', 'string', 'max:50'],

            'company_info' => ['nullable', 'array'],
            'company_info.subCategory' => ['nullable', 'string', 'max:255'],
            'company_info.account' => ['nullable', 'string', 'max:255'],
            'company_info.accountManager' => ['nullable', 'string', 'max:255'],

            'remarks' => ['nullable', 'string'],
            'rebate_justification' => ['nullable', 'string'],

            'items' => ['nullable', 'array'],
            'items.*.rowKey' => ['nullable', 'string', 'max:255'],
            'items.*.rowType' => ['nullable', 'string', 'in:item,bundle'],
            'items.*.parentRowKey' => ['nullable', 'string', 'max:255'],
            'items.*.productCode' => ['nullable', 'string', 'max:255'],
            'items.*.itemDescription' => ['nullable', 'string'],
            'items.*.qty' => ['nullable', 'integer', 'min:0'],
            'items.*.disty' => ['nullable', 'string', 'max:255'],
            'items.*.costPerUnit' => ['nullable', 'numeric'],
            'items.*.markupPercent' => ['nullable', 'numeric'],

            'other_expenses' => ['nullable', 'array'],
            'other_expenses.*.expenseKey' => ['nullable', 'string', 'max:255'],
            'other_expenses.*.isFixed' => ['nullable', 'boolean'],
            'other_expenses.*.productCode' => ['nullable', 'string', 'max:255'],
            'other_expenses.*.itemDescription' => ['nullable', 'string'],
            'other_expenses.*.qty' => ['nullable', 'integer', 'min:0'],
            'other_expenses.*.unitPrice' => ['nullable', 'numeric'],

            'summary' => ['nullable', 'array'],
            'summary.revenue' => ['nullable', 'numeric'],
            'summary.cogs' => ['nullable', 'numeric'],
            'summary.otherExpense' => ['nullable', 'numeric'],
            'summary.totalExpense' => ['nullable', 'numeric'],
            'summary.gpValue' => ['nullable', 'numeric'],
            'summary.totalGpPercent' => ['nullable', 'numeric'],
        ]);
    }

    private function isBlankValue($value): bool
    {
        return $value === null || $value === '';
    }

    private function toNullableFloat($value): ?float
    {
        return $this->isBlankValue($value) ? null : (float) $value;
    }

    private function mapItemsPayload(array $items): array
    {
        return collect($items)
            ->map(function ($row) {
                $qty = $this->toNullableFloat(data_get($row, 'qty'));
                $costPerUnit = $this->toNullableFloat(data_get($row, 'costPerUnit'));
                $markupPercent = $this->toNullableFloat(data_get($row, 'markupPercent'));

                $totalCost =
                    $qty === null || $costPerUnit === null
                        ? null
                        : $qty * $costPerUnit;

                $sellingPricePerUnitVatInc =
                    $costPerUnit === null || $markupPercent === null
                        ? null
                        : $costPerUnit * (1 + ($markupPercent / 100));

                $totalSellingPriceVatInc =
                    $qty === null || $sellingPricePerUnitVatInc === null
                        ? null
                        : $qty * $sellingPricePerUnitVatInc;

                $markupValue =
                    $totalSellingPriceVatInc === null || $totalCost === null
                        ? null
                        : $totalSellingPriceVatInc - $totalCost;

                return [
                    'row_key' => data_get($row, 'rowKey'),
                    'row_type' => data_get($row, 'rowType') === 'bundle' ? 'bundle' : 'item',
                    'parent_row_key' => data_get($row, 'parentRowKey'),
                    'product_code' => data_get($row, 'productCode'),
                    'item_description' => data_get($row, 'itemDescription'),
                    'qty' => $qty,
                    'disty' => data_get($row, 'disty'),
                    'cost_per_unit' => $costPerUnit,
                    'total_cost' => $totalCost,
                    'selling_price_per_unit_vat_inc' => $sellingPricePerUnitVatInc,
                    'total_selling_price_vat_inc' => $totalSellingPriceVatInc,
                    'markup_value' => $markupValue,
                    'markup_percent' => $markupPercent,
                ];
            })
            ->filter(function ($row) {
                return !(
                    blank($row['product_code']) &&
                    blank($row['item_description']) &&
                    blank($row['disty']) &&
                    $row['qty'] === null &&
                    $row['cost_per_unit'] === null &&
                    $row['markup_percent'] === null
                );
            })
            ->values()
            ->all();
    }

    private function mapFeesPayload(array $fees): array
    {
        return collect($fees)
            ->map(function ($row) {
                $qty = $this->toNullableFloat(data_get($row, 'qty'));
                $unitPrice = $this->toNullableFloat(data_get($row, 'unitPrice'));

                $total =
                    $qty === null || $unitPrice === null
                        ? null
                        : $qty * $unitPrice;

                return [
                    'expense_key' => data_get($row, 'expenseKey'),
                    'is_fixed' => (bool) data_get($row, 'isFixed', false),
                    'product_code' => data_get($row, 'productCode'),
                    'item_description' => data_get($row, 'itemDescription'),
                    'qty' => $qty,
                    'unit_price' => $unitPrice,
                    'total' => $total,
                ];
            })
            ->filter(function ($row) {
                return !(
                    blank($row['expense_key']) &&
                    blank($row['product_code']) &&
                    blank($row['item_description']) &&
                    $row['qty'] === null &&
                    $row['unit_price'] === null
                );
            })
            ->values()
            ->all();
    }

    private function hasRebateValueFromMappedFees(array $fees): bool
    {
        foreach ($fees as $row) {
            $expenseKey = (string) data_get($row, 'expense_key', '');
            $productCode = trim((string) data_get($row, 'product_code', ''));
            $total = (float) data_get($row, 'total', 0);

            if ($expenseKey === 'rebate' || strcasecmp($productCode, 'Rebate') === 0) {
                return $total > 0;
            }
        }

        return false;
    }

    private function resolveApprovalConditionCode(
        array $payload,
        float $revenue,
        float $gpPercent,
        bool $hasRebate
    ): string {
        $conditionCode = strtoupper(trim((string) data_get($payload, 'approval_condition_code', '')));

        $allowed = [
            'STANDARD_PRICING',
            'VALUE_GT_1M',
            'GP_GT_15',
            'GP_LTE_15',
            'REBATE_REQUEST',
        ];

        if (in_array($conditionCode, $allowed, true)) {
            return $conditionCode;
        }

        if ($hasRebate) {
            return 'REBATE_REQUEST';
        }

        if ($gpPercent <= 15) {
            return 'GP_LTE_15';
        }

        if ($revenue > 1000000) {
            return 'VALUE_GT_1M';
        }

        if ($gpPercent > 15) {
            return 'GP_GT_15';
        }

        return 'STANDARD_PRICING';
    }

    private function tryResolveActiveSprfApprovalMatrix(string $conditionCode): ?array
    {
        try {
            return $this->resolveActiveSprfApprovalMatrix($conditionCode);
        } catch (ValidationException $e) {
            return null;
        }
    }

    private function resolveActiveSprfApprovalMatrix(string $conditionCode): array
    {
        $matrix = SprfApprovalMatrix::query()
            ->with([
                'steps.position:id,name',
                'steps.approver:id,first_name,last_name,position,email,company_position_id,is_banned',
            ])
            ->where('condition_code', $conditionCode)
            ->where('is_active', true)
            ->first();

        if (! $matrix) {
            throw ValidationException::withMessages([
                'approvers' => "No active SPRF approver matrix found for {$conditionCode}.",
            ]);
        }

        $stepsByRole = $matrix->steps->keyBy('role');
        $requiredRoles = $this->requiredSprfRolesForCondition($conditionCode);

        foreach ($requiredRoles as $role) {
            if (! $stepsByRole->has($role)) {
                throw ValidationException::withMessages([
                    'approvers' => "The active SPRF approver matrix is missing role: {$role}.",
                ]);
            }

            $step = $stepsByRole->get($role);

            if (! $step->approver || $step->approver->is_banned) {
                throw ValidationException::withMessages([
                    'approvers' => "The active SPRF approver matrix has an invalid or inactive approver for role: {$role}.",
                ]);
            }

            if ((int) $step->approver->company_position_id !== (int) $step->position_id) {
                throw ValidationException::withMessages([
                    'approvers' => "The selected approver does not match the selected position for role: {$role}.",
                ]);
            }
        }

        return [
            'matrix_id' => $matrix->id,
            'condition_code' => $matrix->condition_code,
            'flags' => $this->resolveApprovalFlagsFromCondition($conditionCode),
            'approver_users' => [
                'directorCustomerEngagement' => $this->mapSprfStepApprover(
                    $stepsByRole->get('DIRECTOR_CUSTOMER_ENGAGEMENT')
                ),
                'esdDirector' => $this->mapSprfStepApprover(
                    $stepsByRole->get('ESD_DIRECTOR')
                ),
                'vpCcto' => $this->mapSprfStepApprover(
                    $stepsByRole->get('VP_CCTO')
                ),
                'presidentCeo' => $this->mapSprfStepApprover(
                    $stepsByRole->get('PRESIDENT_CEO')
                ),
            ],
        ];
    }

    private function mapSprfStepApprover($step): ?array
    {
        if (! $step?->approver) {
            return null;
        }

        return [
            'id' => $step->approver->id,
            'name' => $step->approver->name,
            'position' => $step->approver->position,
            'email' => $step->approver->email,
        ];
    }

    private function requiredSprfRolesForCondition(string $conditionCode): array
    {
        return match ($conditionCode) {
            'STANDARD_PRICING' => [
                'DIRECTOR_CUSTOMER_ENGAGEMENT',
                'ESD_DIRECTOR',
            ],

            'VALUE_GT_1M',
            'GP_GT_15' => [
                'DIRECTOR_CUSTOMER_ENGAGEMENT',
                'ESD_DIRECTOR',
                'VP_CCTO',
            ],

            'GP_LTE_15',
            'REBATE_REQUEST' => [
                'DIRECTOR_CUSTOMER_ENGAGEMENT',
                'ESD_DIRECTOR',
                'VP_CCTO',
                'PRESIDENT_CEO',
            ],

            default => throw ValidationException::withMessages([
                'approval_condition_code' => 'Invalid SPRF approval condition.',
            ]),
        };
    }

    private function resolveApprovalFlagsFromCondition(string $conditionCode): array
    {
        return match ($conditionCode) {
            'STANDARD_PRICING' => [
                'approval_level' => 'ESD_ONLY',
                'requires_vp_ccto' => false,
                'requires_president_ceo' => false,
                'requires_rebate_justification' => false,
                'final_level' => 3,
            ],

            'VALUE_GT_1M',
            'GP_GT_15' => [
                'approval_level' => 'VP_AND_CCTO',
                'requires_vp_ccto' => true,
                'requires_president_ceo' => false,
                'requires_rebate_justification' => false,
                'final_level' => 4,
            ],

            'GP_LTE_15' => [
                'approval_level' => 'PRESIDENT_AND_CEO',
                'requires_vp_ccto' => true,
                'requires_president_ceo' => true,
                'requires_rebate_justification' => false,
                'final_level' => 5,
            ],

            'REBATE_REQUEST' => [
                'approval_level' => 'PRESIDENT_AND_CEO',
                'requires_vp_ccto' => true,
                'requires_president_ceo' => true,
                'requires_rebate_justification' => true,
                'final_level' => 5,
            ],

            default => throw ValidationException::withMessages([
                'approval_condition_code' => 'Invalid SPRF approval condition.',
            ]),
        };
    }

    private function resolveApprovalFlags(float $revenue, float $gpPercent, bool $hasRebate): array
    {
        if ($hasRebate) {
            return [
                'approval_level' => 'PRESIDENT_AND_CEO',
                'requires_vp_ccto' => true,
                'requires_president_ceo' => true,
                'requires_rebate_justification' => true,
                'final_level' => 5,
            ];
        }

        if ($gpPercent <= 15) {
            return [
                'approval_level' => 'PRESIDENT_AND_CEO',
                'requires_vp_ccto' => true,
                'requires_president_ceo' => true,
                'requires_rebate_justification' => false,
                'final_level' => 5,
            ];
        }

        if ($gpPercent > 15 || $revenue > 1000000) {
            return [
                'approval_level' => 'VP_AND_CCTO',
                'requires_vp_ccto' => true,
                'requires_president_ceo' => false,
                'requires_rebate_justification' => false,
                'final_level' => 4,
            ];
        }

        return [
            'approval_level' => 'ESD_ONLY',
            'requires_vp_ccto' => false,
            'requires_president_ceo' => false,
            'requires_rebate_justification' => false,
            'final_level' => 3,
        ];
    }

    private function validateRequiredApprovers(array $approverUsers, array $flags): void
    {
        $missing = [];

        if (! data_get($approverUsers, 'directorCustomerEngagement.id')) {
            $missing[] = 'Director - Customer Engagement';
        }

        if (! data_get($approverUsers, 'esdDirector.id')) {
            $missing[] = 'ESD Director';
        }

        if ($flags['requires_vp_ccto'] && ! data_get($approverUsers, 'vpCcto.id')) {
            $missing[] = 'VP & CCTO';
        }

        if ($flags['requires_president_ceo'] && ! data_get($approverUsers, 'presidentCeo.id')) {
            $missing[] = 'President & CEO';
        }

        if (! empty($missing)) {
            throw ValidationException::withMessages([
                'approvers' => 'Missing required approver setup in SPRF Approver Matrix: ' . implode(', ', $missing) . '.',
            ]);
        }
    }

    private function resolveApproverUsers(): array
    {
        return [
            'directorCustomerEngagement' => $this->findActiveUserByPosition('Director - Customer Engagement'),
            'esdDirector' => $this->findActiveUserByPosition('Director - Enterprise Solutions'),
            'vpCcto' => $this->findActiveUserByPosition('VP & CCTO'),
            'presidentCeo' => $this->findActiveUserByPosition('President & CEO'),
        ];
    }

    private function findActiveUserByPosition(string $position): ?array
    {
        $user = User::query()
            ->where('position', $position)
            ->where('is_banned', false)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'position' => $user->position,
            'email' => $user->email,
        ];
    }

    private function mapApproverUsersFromProject(SprfEntryProject $project): array
    {
        return [
            'directorCustomerEngagement' => $this->findUserById($project->director_customer_engagement_user_id),
            'esdDirector' => $this->findUserById($project->esd_director_user_id),
            'vpCcto' => $this->findUserById($project->vp_ccto_user_id),
            'presidentCeo' => $this->findUserById($project->president_ceo_user_id),
        ];
    }

    private function findUserById(?int $id): ?array
    {
        if (! $id) {
            return null;
        }

        $user = User::query()
            ->whereKey($id)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'position' => $user->position,
            'email' => $user->email,
        ];
    }

    private function transformProjectForFrontend(SprfEntryProject $project): array
    {
        return [
            'id' => $project->id,
            'sprf_no' => $project->sprf_no,
            'status' => $project->status,
            'current_level' => $project->current_level,
            'approval_level' => $project->approval_level,
            'sprf_approval_matrix_id' => $project->sprf_approval_matrix_id,
            'approval_condition_code' => $project->approval_condition_code,
            'last_saved_at' => optional($project->last_saved_at)?->toISOString(),
            'submitted_at' => optional($project->submitted_at)?->toISOString(),
            'approved_at' => optional($project->approved_at)?->toISOString(),
            'rejected_at' => optional($project->rejected_at)?->toISOString(),
            'prepared_by_name' => $project->preparer?->name,

            'company_info' => [
                'subCategory' => $project->sub_category,
                'account' => $project->account,
                'accountManager' => $project->account_manager,
            ],

            'remarks' => $project->remarks,
            'rebate_justification' => $project->rebate_justification,

            'items' => $project->items
                ->map(function (SprfEntryItem $item) {
                    return [
                        'productCode' => $item->product_code,
                        'rowKey' => $item->row_key,
                        'rowType' => $item->row_type ?: 'item',
                        'parentRowKey' => $item->parent_row_key,
                        'itemDescription' => $item->item_description,
                        'qty' => $item->qty,
                        'disty' => $item->disty,
                        'costPerUnit' => $item->cost_per_unit,
                        'markupPercent' => $item->markup_percent,
                    ];
                })
                ->values()
                ->all(),

            'other_expenses' => $project->fees
                ->map(function (SprfEntryFee $fee) {
                    return [
                        'expenseKey' => $fee->expense_key,
                        'isFixed' => $fee->is_fixed,
                        'productCode' => $fee->product_code,
                        'itemDescription' => $fee->item_description,
                        'qty' => $fee->qty,
                        'unitPrice' => $fee->unit_price,
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    private function transformProjectForPrint(SprfEntryProject $project): array
    {
        return [
            'id' => $project->id,
            'sprf_no' => $project->sprf_no,
            'status' => $project->status,
            'approval_level' => $project->approval_level,
            'sprf_approval_matrix_id' => $project->sprf_approval_matrix_id,
            'approval_condition_code' => $project->approval_condition_code,
            'remarks' => $project->remarks,
            'rebate_justification' => $project->rebate_justification,

            'company_info' => [
                'subCategory' => $project->sub_category,
                'account' => $project->account,
                'accountManager' => $project->account_manager,
            ],

            'items' => $project->items
                ->map(function (SprfEntryItem $item) {
                    return [
                        'productCode' => $item->product_code,
                        'rowKey' => $item->row_key,
                        'rowType' => $item->row_type ?: 'item',
                        'parentRowKey' => $item->parent_row_key,
                        'itemDescription' => $item->item_description,
                        'qty' => $item->qty,
                        'disty' => $item->disty,
                        'costPerUnit' => $item->cost_per_unit,
                        'markupPercent' => $item->markup_percent,
                    ];
                })
                ->values()
                ->all(),

            'other_expenses' => $project->fees
                ->map(function (SprfEntryFee $fee) {
                    return [
                        'expenseKey' => $fee->expense_key,
                        'isFixed' => $fee->is_fixed,
                        'productCode' => $fee->product_code,
                        'itemDescription' => $fee->item_description,
                        'qty' => $fee->qty,
                        'unitPrice' => $fee->unit_price,
                    ];
                })
                ->values()
                ->all(),

            'approver_users' => $this->mapApproverUsersFromProject($project),
            'preparer' => [
                'id' => $project->preparer?->id,
                'name' => $project->preparer?->name,
                'position' => $project->preparer?->position,
                'email' => $project->preparer?->email,
            ],
        ];
    }
}
