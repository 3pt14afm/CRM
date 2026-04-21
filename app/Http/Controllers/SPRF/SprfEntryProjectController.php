<?php

namespace App\Http\Controllers\SPRF;

use App\Http\Controllers\Controller;
use App\Models\SPRF\SprfArchiveProject;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\SPRF\SprfEntryFee;
use App\Models\SPRF\SprfEntryItem;
use App\Models\SPRF\SprfEntryProject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

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

    public function saveDraft(Request $request)
    {
        $payload = $this->validatePayload($request);

        $projectId = data_get($payload, 'project_id');
        $existingProject = $projectId
            ? SprfEntryProject::query()
                ->where('id', $projectId)
                ->where('prepared_by_user_id', Auth::id())
                ->firstOrFail()
            : null;

        $approverUsers = $this->resolveApproverUsers();

        $revenue = (float) data_get($payload, 'summary.revenue', 0);
        $cogs = (float) data_get($payload, 'summary.cogs', 0);
        $otherExpenseTotal = (float) data_get($payload, 'summary.otherExpense', 0);
        $totalExpense = (float) data_get($payload, 'summary.totalExpense', 0);
        $gpValue = (float) data_get($payload, 'summary.gpValue', 0);
        $gpPercent = (float) data_get($payload, 'summary.totalGpPercent', 0);

        $items = $this->mapItemsPayload((array) data_get($payload, 'items', []));
        $fees = $this->mapFeesPayload((array) data_get($payload, 'other_expenses', []));

        $hasRebate = $this->hasRebateValueFromMappedFees($fees);
        $flags = $this->resolveApprovalFlags($revenue, $gpPercent, $hasRebate);

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
            $fees
        ) {
            $project = $existingProject ?: new SprfEntryProject();

            $companyInfo = (array) data_get($payload, 'company_info', []);

            $project->fill([
                'sprf_no' => data_get($payload, 'sprf_no') ?: ($existingProject?->sprf_no ?: $this->generateNextSprfNo()),
                'document_datetime' => $existingProject?->document_datetime ?: now(),

                'status' => 'draft',
                'current_level' => 1,
                'approval_level' => $flags['approval_level'],

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

        return redirect()
            ->route('sprf.entry.projects.show', $project)
            ->with('success', 'SPRF draft saved.');
    }

    public function submit(Request $request, SprfEntryProject $project)
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            abort(403);
        }

        if ($project->status !== 'draft') {
            throw ValidationException::withMessages([
                'project' => 'Only draft SPRF projects can be submitted.',
            ]);
        }

        $payload = $this->validatePayload($request);
        $approverUsers = $this->resolveApproverUsers();

        $revenue = (float) data_get($payload, 'summary.revenue', $project->revenue);
        $cogs = (float) data_get($payload, 'summary.cogs', $project->cogs);
        $otherExpenseTotal = (float) data_get($payload, 'summary.otherExpense', $project->other_expense_total);
        $totalExpense = (float) data_get($payload, 'summary.totalExpense', $project->total_expense);
        $gpValue = (float) data_get($payload, 'summary.gpValue', $project->gp_value);
        $gpPercent = (float) data_get($payload, 'summary.totalGpPercent', $project->gp_percent);

        $items = $this->mapItemsPayload((array) data_get($payload, 'items', []));
        $fees = $this->mapFeesPayload((array) data_get($payload, 'other_expenses', []));

        $hasRebate = $this->hasRebateValueFromMappedFees($fees);
        $flags = $this->resolveApprovalFlags($revenue, $gpPercent, $hasRebate);

        $this->validateRequiredApprovers($approverUsers, $flags);

        $rebateJustification = (string) data_get($payload, 'rebate_justification', $project->rebate_justification);

        if ($flags['requires_rebate_justification'] && trim($rebateJustification) === '') {
            throw ValidationException::withMessages([
                'rebate_justification' => 'Rebate justification is required when the Rebate row has a value.',
            ]);
        }

        DB::transaction(function () use (
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
            $rebateJustification
        ) {
            $companyInfo = (array) data_get($payload, 'company_info', []);

            $currentProject = SprfCurrentProject::create([
                'entry_project_id' => $project->id,
                'sprf_no' => $project->sprf_no ?: $this->generateNextSprfNo(),
                'document_datetime' => $project->document_datetime ?: now(),

                'status' => 'for_review',
                'current_level' => 2,
                'approval_level' => $flags['approval_level'],

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
        });

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

        DB::transaction(function () use ($project) {
            $project->items()->delete();
            $project->fees()->delete();
            $project->forceDelete();
        });

        return redirect()->route('sprf.entry.list');
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:sprf_entry_projects,id'],
            'sprf_no' => ['nullable', 'string', 'max:50'],

            'company_info' => ['nullable', 'array'],
            'company_info.subCategory' => ['nullable', 'string', 'max:255'],
            'company_info.account' => ['nullable', 'string', 'max:255'],
            'company_info.accountManager' => ['nullable', 'string', 'max:255'],

            'remarks' => ['nullable', 'string'],
            'rebate_justification' => ['nullable', 'string'],

            'items' => ['nullable', 'array'],
            'items.*.productCode' => ['nullable', 'string', 'max:255'],
            'items.*.itemDescription' => ['nullable', 'string'],
            'items.*.qty' => ['nullable', 'numeric'],
            'items.*.disty' => ['nullable', 'string', 'max:255'],
            'items.*.costPerUnit' => ['nullable', 'numeric'],

            'other_expenses' => ['nullable', 'array'],
            'other_expenses.*.expenseKey' => ['nullable', 'string', 'max:255'],
            'other_expenses.*.isFixed' => ['nullable', 'boolean'],
            'other_expenses.*.productCode' => ['nullable', 'string', 'max:255'],
            'other_expenses.*.itemDescription' => ['nullable', 'string'],
            'other_expenses.*.qty' => ['nullable', 'numeric'],
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

    private function mapItemsPayload(array $items): array
    {
        return collect($items)
            ->map(function ($row) {
                $qty = (float) data_get($row, 'qty', 0);
                $costPerUnit = (float) data_get($row, 'costPerUnit', 0);

                $totalCost = $qty * $costPerUnit;
                $sellingPricePerUnitVatInc = $costPerUnit * 1.15;
                $totalSellingPriceVatInc = $qty * $sellingPricePerUnitVatInc;
                $markupValue = $totalSellingPriceVatInc - $totalCost;
                $markupPercent = $costPerUnit > 0
                    ? (($sellingPricePerUnitVatInc / $costPerUnit) - 1) * 100
                    : 0;

                return [
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
                    (float) $row['qty'] === 0.0 &&
                    (float) $row['cost_per_unit'] === 0.0
                );
            })
            ->values()
            ->all();
    }

    private function mapFeesPayload(array $fees): array
    {
        return collect($fees)
            ->map(function ($row) {
                $qty = (float) data_get($row, 'qty', 0);
                $unitPrice = (float) data_get($row, 'unitPrice', 0);

                return [
                    'expense_key' => data_get($row, 'expenseKey'),
                    'is_fixed' => (bool) data_get($row, 'isFixed', false),
                    'product_code' => data_get($row, 'productCode'),
                    'item_description' => data_get($row, 'itemDescription'),
                    'qty' => $qty,
                    'unit_price' => $unitPrice,
                    'total' => $qty * $unitPrice,
                ];
            })
            ->filter(function ($row) {
                return !(
                    blank($row['expense_key']) &&
                    blank($row['product_code']) &&
                    blank($row['item_description']) &&
                    (float) $row['qty'] === 0.0 &&
                    (float) $row['unit_price'] === 0.0
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

        if ($gpPercent < 8) {
            return [
                'approval_level' => 'PRESIDENT_AND_CEO',
                'requires_vp_ccto' => true,
                'requires_president_ceo' => true,
                'requires_rebate_justification' => false,
                'final_level' => 5,
            ];
        }

        if ($gpPercent < 10 || $revenue > 1000000) {
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
            $missing[] = 'Director - Enterprise Solutions';
        }

        if ($flags['requires_vp_ccto'] && ! data_get($approverUsers, 'vpCcto.id')) {
            $missing[] = 'VP & CCTO';
        }

        if ($flags['requires_president_ceo'] && ! data_get($approverUsers, 'presidentCeo.id')) {
            $missing[] = 'President & CEO';
        }

        if (! empty($missing)) {
            throw ValidationException::withMessages([
                'approvers' => 'Missing required approver setup in User Management: ' . implode(', ', $missing) . '.',
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
                        'itemDescription' => $item->item_description,
                        'qty' => $item->qty,
                        'disty' => $item->disty,
                        'costPerUnit' => $item->cost_per_unit,
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
                        'itemDescription' => $item->item_description,
                        'qty' => $item->qty,
                        'disty' => $item->disty,
                        'costPerUnit' => $item->cost_per_unit,
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

    private function generateNextSprfNo(): string
    {
        $allNumbers = collect()
            ->merge(SprfEntryProject::query()->pluck('sprf_no'))
            ->merge(SprfCurrentProject::query()->pluck('sprf_no'))
            ->merge(SprfArchiveProject::query()->pluck('sprf_no'))
            ->filter()
            ->map(function ($sprfNo) {
                if (preg_match('/(\d+)$/', (string) $sprfNo, $matches)) {
                    return (int) $matches[1];
                }

                return 0;
            });

        $nextNumber = ((int) $allNumbers->max()) + 1;

        return 'SPRFIT-' . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }
}