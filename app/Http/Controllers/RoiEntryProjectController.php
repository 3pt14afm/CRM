<?php

namespace App\Http\Controllers;

use App\Models\LocationDepartment;
use App\Models\RoiCurrentFee;
use App\Models\RoiCurrentItem;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryFee;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RoiEntryProjectController extends Controller
{
    public function show(RoiEntryProject $project)
    {
        abort_unless($project->user_id === Auth::id(), 403);

        $project->load([
            'items' => fn ($q) => $q->orderBy('id'),
            'fees'  => fn ($q) => $q->orderBy('id'),
            'user',
        ]);

        $notes = $project->notes ?? [];
        if (!is_array($notes)) {
            $notes = [];
        }

        usort($notes, fn ($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
        $project->notes = array_values($notes);

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
            'activeTab'    => 'Machine Configuration',
            'entryProject' => $project,
            'project'      => $project,
            'createdBy'    => $project->user->name,
        ]);
    }

    public function saveDraft(Request $request)
    {
        $data = $this->validateDraftPayload($request);

        $user = Auth::user();
        $userId = $user->id;
        $reference = $data['companyInfo']['reference'];

        DB::transaction(function () use ($data, $user, $userId, $reference, $request) {
            $project = RoiEntryProject::where('user_id', $userId)
                ->where('reference', $reference)
                ->first();

            if (!$project) {
                $company = $data['companyInfo'];
                $interest = $data['interest'] ?? [];
                $yield = $data['yield'] ?? [];

                $monoMonthly = (int) ($yield['monoAmvpYields']['monthly'] ?? 0);
                $colorMonthly = (int) ($yield['colorAmvpYields']['monthly'] ?? 0);

                $project = RoiEntryProject::create([
                    'user_id' => $userId,
                    'location_id' => $user->primary_location_id,
                    'project_uid' => (string) Str::ulid(),
                    'reference' => $reference,
                    'version' => 1,
                    'status' => 'draft',
                    'company_name' => (string) ($company['companyName'] ?? ''),
                    'contract_years' => (int) ($company['contractYears'] ?? 0),
                    'contract_type' => (string) ($company['contractType'] ?? ''),
                    'purpose' => (string) ($company['purpose'] ?? ''),
                    'bundled_std_ink' => (bool) ($company['bundledStdInk'] ?? false),
                    'annual_interest' => (float) ($interest['annualInterest'] ?? 0),
                    'percent_margin' => (float) ($interest['percentMargin'] ?? 0),
                    'mono_yield_monthly' => $monoMonthly,
                    'mono_yield_annual' => $monoMonthly * 12,
                    'color_yield_monthly' => $colorMonthly,
                    'color_yield_annual' => $colorMonthly * 12,
                    'last_saved_at' => now(),
                ]);
            } else {
                $project->increment('version');
            }

            $this->persistDraft($request, $project, $data);
        });

        return redirect()->route('roi.entry.list');
    }

    public function submit(Request $request, RoiEntryProject $project)
    {
        abort_unless($project->user_id === Auth::id(), 403);

        if ($request->has('companyInfo')) {
            $data = $this->validateDraftPayload($request);
            $this->persistDraft($request, $project, $data);
            $project->refresh()->load(['items', 'fees']);
        }

        if (empty($project->company_name) || empty($project->contract_type)) {
            return back()->with('error', 'Please complete Company Name and Contract Type before submitting.');
        }

        $submitter = Auth::user();

        if (!$submitter?->primary_location_id || !$submitter?->department_id) {
            return back()->with('error', 'Your account must have both a primary location and department before submitting.');
        }

        $matrix = LocationDepartment::query()
            ->where('location_id', $submitter->primary_location_id)
            ->where('department_id', $submitter->department_id)
            ->first();

        if (!$matrix) {
            return back()->with('error', 'No approver matrix found for your location and department.');
        }

        return DB::transaction(function () use ($project, $submitter, $matrix) {
            $newProject = RoiCurrentProject::create([
                'user_id' => $project->user_id,
                'location_id' => $submitter->primary_location_id,
                'project_uid' => $project->project_uid,
                'reference' => $project->reference,
                'version' => $project->version,
                'status' => 'For Review',
                'current_level' => 2,
                'submitted_at' => now(),
                'last_saved_at' => now(),
                'reviewed_by' => $matrix->reviewed_by,
                'checked_by' => $matrix->checked_by,
                'endorsed_by' => $matrix->endorsed_by,
                'confirmed_by' => $matrix->confirmed_by,
                'approved_by' => $matrix->approved_by,
                'company_name' => $project->company_name,
                'contract_years' => $project->contract_years,
                'contract_type' => $project->contract_type,
                'purpose' => $project->purpose,
                'bundled_std_ink' => $project->bundled_std_ink,
                'annual_interest' => $project->annual_interest,
                'percent_margin' => $project->percent_margin,
                'mono_yield_monthly' => $project->mono_yield_monthly,
                'mono_yield_annual' => $project->mono_yield_annual,
                'color_yield_monthly' => $project->color_yield_monthly,
                'color_yield_annual' => $project->color_yield_annual,
                'mc_unit_cost' => $project->mc_unit_cost,
                'mc_qty' => $project->mc_qty,
                'mc_total_cost' => $project->mc_total_cost,
                'mc_yields' => $project->mc_yields,
                'mc_cost_cpp' => $project->mc_cost_cpp,
                'mc_selling_price' => $project->mc_selling_price,
                'mc_total_sell' => $project->mc_total_sell,
                'mc_sell_cpp' => $project->mc_sell_cpp,
                'mc_total_bundled_price' => $project->mc_total_bundled_price,
                'fees_total' => $project->fees_total,
                'grand_total_cost' => $project->grand_total_cost,
                'grand_total_revenue' => $project->grand_total_revenue,
                'grand_roi' => $project->grand_roi,
                'grand_roi_percentage' => $project->grand_roi_percentage,
                'yearly_breakdown' => $project->yearly_breakdown,
                'notes' => $project->notes ?? [],
                'comments' => $project->comments ?? [],
            ]);

            foreach ($project->items as $item) {
                RoiCurrentItem::create([
                    'roi_current_project_id' => $newProject->id,
                    'client_row_id' => $item->client_row_id,
                    'kind' => $item->kind,
                    'sku' => $item->sku,
                    'qty' => $item->qty,
                    'yields' => $item->yields,
                    'mode' => $item->mode,
                    'remarks' => $item->remarks,
                    'inputted_cost' => $item->inputted_cost,
                    'cost' => $item->cost,
                    'price' => $item->price,
                    'base_per_year' => $item->base_per_year,
                    'total_cost' => $item->total_cost,
                    'cost_cpp' => $item->cost_cpp,
                    'total_sell' => $item->total_sell,
                    'sell_cpp' => $item->sell_cpp,
                    'machine_margin' => $item->machine_margin,
                    'machine_margin_total' => $item->machine_margin_total,
                ]);
            }

            foreach ($project->fees as $fee) {
                RoiCurrentFee::create([
                    'roi_current_project_id' => $newProject->id,
                    'client_row_id' => $fee->client_row_id,
                    'payer' => $fee->payer,
                    'label' => $fee->label,
                    'category' => $fee->category,
                    'remarks' => $fee->remarks,
                    'cost' => $fee->cost,
                    'qty' => $fee->qty,
                    'total' => $fee->total,
                    'is_machine' => $fee->is_machine,
                ]);
            }

            $project->items()->delete();
            $project->fees()->delete();
            $project->delete();

            return redirect()->route('roi.current')->with('success', 'Project submitted successfully.');
        });
    }

    public function destroy(RoiEntryProject $project)
    {
        abort_unless($project->user_id === Auth::id(), 403);

        $allowedStatuses = ['draft', 'returned'];

        if (!in_array($project->status, $allowedStatuses, true)) {
            return back()->with('error', 'Only drafts or returned projects can be deleted.');
        }

        DB::transaction(function () use ($project) {
            RoiEntryItem::where('roi_entry_project_id', $project->id)->delete();
            RoiEntryFee::where('roi_entry_project_id', $project->id)->delete();
            $project->delete();
        });

        return redirect()->route('roi.entry.list')->with('success', 'Project deleted.');
    }

    private function validateDraftPayload(Request $request): array
    {
        return $request->validate([
            'companyInfo.reference' => ['required', 'string', 'max:255'],
            'companyInfo.companyName' => ['required', 'string', 'max:255'],
            'companyInfo.contractYears' => ['required', 'integer', 'min:0'],
            'companyInfo.contractType' => ['required', 'string', 'max:255'],
            'companyInfo.purpose' => ['nullable', 'string', 'max:5000'],
            'companyInfo.bundledStdInk' => ['nullable', 'boolean'],
            'interest.annualInterest' => ['nullable'],
            'interest.percentMargin' => ['nullable'],
            'yield.monoAmvpYields.monthly' => ['nullable'],
            'yield.colorAmvpYields.monthly' => ['nullable'],
            'machineConfiguration.machine' => ['nullable', 'array'],
            'machineConfiguration.consumable' => ['nullable', 'array'],
            'machineConfiguration.totals' => ['nullable', 'array'],
            'additionalFees.company' => ['nullable', 'array'],
            'additionalFees.customer' => ['nullable', 'array'],
            'additionalFees.total' => ['nullable'],
            'totalProjectCost' => ['nullable', 'array'],
            'yearlyBreakdown' => ['nullable', 'array'],
        ]);
    }

    private function persistDraft(Request $request, RoiEntryProject $project, ?array $data = null): void
    {
        $data = $data ?? $this->validateDraftPayload($request);

        $company = $data['companyInfo'] ?? [];
        $interest = $data['interest'] ?? [];
        $yield = $data['yield'] ?? [];

        $monoMonthly = (int) ($yield['monoAmvpYields']['monthly'] ?? 0);
        $colorMonthly = (int) ($yield['colorAmvpYields']['monthly'] ?? 0);

        $mcTotals = $data['machineConfiguration']['totals'] ?? [];
        $feesTotal = (float) ($data['additionalFees']['total'] ?? 0);
        $grand = $data['totalProjectCost'] ?? [];

        $project->update([
            'company_name' => (string) ($company['companyName'] ?? ''),
            'contract_years' => (int) ($company['contractYears'] ?? 0),
            'contract_type' => (string) ($company['contractType'] ?? ''),
            'purpose' => (string) ($company['purpose'] ?? ''),
            'bundled_std_ink' => (bool) ($company['bundledStdInk'] ?? false),
            'annual_interest' => (float) ($interest['annualInterest'] ?? 0),
            'percent_margin' => (float) ($interest['percentMargin'] ?? 0),
            'mono_yield_monthly' => $monoMonthly,
            'mono_yield_annual' => $monoMonthly * 12,
            'color_yield_monthly' => $colorMonthly,
            'color_yield_annual' => $colorMonthly * 12,
            'mc_unit_cost' => (float) ($mcTotals['unitCost'] ?? 0),
            'mc_qty' => (float) ($mcTotals['qty'] ?? 0),
            'mc_total_cost' => (float) ($mcTotals['totalCost'] ?? 0),
            'mc_yields' => (float) ($mcTotals['yields'] ?? 0),
            'mc_cost_cpp' => (float) ($mcTotals['costCpp'] ?? 0),
            'mc_selling_price' => (float) ($mcTotals['sellingPrice'] ?? 0),
            'mc_total_sell' => (float) ($mcTotals['totalSell'] ?? 0),
            'mc_sell_cpp' => (float) ($mcTotals['sellCpp'] ?? 0),
            'mc_total_bundled_price' => (float) ($mcTotals['totalBundledPrice'] ?? 0),
            'fees_total' => $feesTotal,
            'grand_total_cost' => (float) ($grand['grandTotalCost'] ?? 0),
            'grand_total_revenue' => (float) ($grand['grandTotalRevenue'] ?? 0),
            'grand_roi' => (float) ($grand['grandROI'] ?? 0),
            'grand_roi_percentage' => (float) ($grand['grandROIPercentage'] ?? 0),
            'yearly_breakdown' => $data['yearlyBreakdown'] ?? null,
            'last_saved_at' => now(),
        ]);

        $hasMachinePayload =
            $request->exists('machineConfiguration.machine') ||
            $request->exists('machineConfiguration.consumable');

        if ($hasMachinePayload) {
            RoiEntryItem::where('roi_entry_project_id', $project->id)->delete();

            $itemRows = [];
            foreach ($data['machineConfiguration']['machine'] ?? [] as $row) {
                $itemRows[] = $this->mapItemRow($project->id, $row, 'machine');
            }
            foreach ($data['machineConfiguration']['consumable'] ?? [] as $row) {
                $itemRows[] = $this->mapItemRow($project->id, $row, 'consumable');
            }

            if (!empty($itemRows)) {
                RoiEntryItem::insert($itemRows);
            }
        }

        $hasFeePayload =
            $request->exists('additionalFees.company') ||
            $request->exists('additionalFees.customer');

        if ($hasFeePayload) {
            RoiEntryFee::where('roi_entry_project_id', $project->id)->delete();

            $feeRows = [];
            foreach ($data['additionalFees']['company'] ?? [] as $row) {
                $feeRows[] = $this->mapFeeRow($project->id, $row, 'company');
            }
            foreach ($data['additionalFees']['customer'] ?? [] as $row) {
                $feeRows[] = $this->mapFeeRow($project->id, $row, 'customer');
            }

            if (!empty($feeRows)) {
                RoiEntryFee::insert($feeRows);
            }
        }
    }

    private function mapItemRow(int $projectId, array $row, string $kind): array
    {
        return [
            'roi_entry_project_id' => $projectId,
            'client_row_id' => isset($row['id']) ? (string) $row['id'] : null,
            'kind' => $kind,
            'sku' => (string) ($row['sku'] ?? ''),
            'qty' => (float) ($row['qty'] ?? 0),
            'yields' => (float) ($row['yields'] ?? 0),
            'mode' => $row['mode'] ?? null,
            'remarks' => $row['remarks'] ?? null,
            'inputted_cost' => (float) ($row['inputtedCost'] ?? 0),
            'cost' => (float) ($row['cost'] ?? 0),
            'price' => (float) ($row['price'] ?? 0),
            'base_per_year' => (float) ($row['basePerYear'] ?? 0),
            'total_cost' => (float) ($row['totalCost'] ?? 0),
            'cost_cpp' => (float) ($row['costCpp'] ?? 0),
            'total_sell' => (float) ($row['totalSell'] ?? 0),
            'sell_cpp' => (float) ($row['sellCpp'] ?? 0),
            'machine_margin' => (float) ($row['machineMargin'] ?? 0),
            'machine_margin_total' => (float) ($row['machineMarginTotal'] ?? 0),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function mapFeeRow(int $projectId, array $row, string $payer): array
    {
        return [
            'roi_entry_project_id' => $projectId,
            'client_row_id' => isset($row['id']) ? (string) $row['id'] : null,
            'payer' => $payer,
            'label' => (string) ($row['label'] ?? ''),
            'category' => $row['category'] ?? null,
            'remarks' => $row['remarks'] ?? null,
            'cost' => (float) ($row['cost'] ?? 0),
            'qty' => (float) ($row['qty'] ?? 0),
            'total' => (float) ($row['total'] ?? 0),
            'is_machine' => (bool) ($row['isMachine'] ?? false),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function storeNote(Request $request, RoiEntryProject $project)
    {
        abort_unless((int) $project->user_id === (int) Auth::id(), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $notes = $project->notes ?? [];
        if (!is_array($notes)) {
            $notes = [];
        }

        array_unshift($notes, [
            'id' => (string) Str::ulid(),
            'body' => trim($validated['body']),
            'created_at' => now()->toISOString(),
            'author' => [
                'id' => Auth::id(),
                'name' => Auth::user()?->name ?? 'Unknown',
            ],
        ]);

        $project->update([
            'notes' => $notes,
            'last_saved_at' => now(),
        ]);

        return back()->with('success', 'Note added.');
    }

    public function storeComment(Request $request, RoiCurrentProject $project)
    {
        abort_unless($this->canCommentOnCurrentProject($project), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $comments = $project->comments ?? [];
        if (!is_array($comments)) {
            $comments = [];
        }

        array_unshift($comments, [
            'id' => (string) Str::ulid(),
            'body' => trim($validated['body']),
            'created_at' => now()->toISOString(),
            'author' => [
                'id' => Auth::id(),
                'name' => Auth::user()?->name ?? 'Unknown',
            ],
        ]);

        $project->update([
            'comments' => $comments,
            'last_saved_at' => now(),
        ]);

        return back()->with('success', 'Comment added.');
    }

    private function canCommentOnCurrentProject(RoiCurrentProject $project): bool
    {
        $userId = (int) Auth::id();
        $currentLevel = (int) $project->current_level;

        return match ($currentLevel) {
            5 => (int) $project->confirmed_by === $userId,
            6 => (int) $project->approved_by === $userId,
            default => false,
        };
    }
}