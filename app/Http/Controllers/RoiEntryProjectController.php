<?php

namespace App\Http\Controllers;

use App\Models\RoiEntryProject;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryFee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RoiEntryProjectController extends Controller
{
    /**
     * Open an existing draft project page.
     * GET /customer-management/roi/entry/projects/{project}
     */
    public function show(RoiEntryProject $project)
    {
        abort_unless($project->user_id === Auth::id(), 403);

        $project->load([
            'items' => fn ($q) => $q->orderBy('id'),
            'fees'  => fn ($q) => $q->orderBy('id'),
        ]);

        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab'    => 'Machine Configuration',
            'entryProject' => $project,
        ]);
    }

    /**
     * Save Draft (create if first time, update if exists).
     * POST /customer-management/roi/entry/draft
     */
    public function saveDraft(Request $request)
    {
        // ✅ Allow partial drafts:
        // Only require reference. Everything else can be missing while user is still typing.
        $data = $request->validate([
            'companyInfo.reference' => ['required', 'string', 'max:255'],

            // header (nullable for partial draft)
            'companyInfo.companyName' => ['nullable', 'string', 'max:255'],
            'companyInfo.contractYears' => ['nullable', 'integer', 'min:0'],
            'companyInfo.contractType' => ['nullable', 'string', 'max:255'],
            'companyInfo.bundledStdInk' => ['nullable', 'boolean'],

            // interest
            'interest.annualInterest' => ['nullable'],
            'interest.percentMargin' => ['nullable'],

            // yield
            'yield.monoAmvpYields.monthly' => ['nullable'],
            'yield.colorAmvpYields.monthly' => ['nullable'],

            // machine config
            'machineConfiguration.machine' => ['nullable', 'array'],
            // ✅ important: your frontend uses machineConfiguration.consumable (not consumables)
            'machineConfiguration.consumable' => ['nullable', 'array'],
            'machineConfiguration.totals' => ['nullable', 'array'],

            // fees
            'additionalFees.company' => ['nullable', 'array'],
            'additionalFees.customer' => ['nullable', 'array'],
            'additionalFees.total' => ['nullable'],

            // totals
            'totalProjectCost' => ['nullable', 'array'],

            // snapshot json
            'yearlyBreakdown' => ['nullable', 'array'],
        ]);

        $userId = Auth::id();
        $reference = $data['companyInfo']['reference'];

        $project = DB::transaction(function () use ($data, $userId, $reference) {

            // ✅ 1 draft per reference per user
            $project = RoiEntryProject::where('user_id', $userId)
                ->where('reference', $reference)
                ->first();

            if (!$project) {
                $company = $data['companyInfo'];
                $interest = $data['interest'] ?? [];
                $yield = $data['yield'] ?? [];

                $monoMonthly  = (int) ($yield['monoAmvpYields']['monthly'] ?? 0);
                $colorMonthly = (int) ($yield['colorAmvpYields']['monthly'] ?? 0);

                $project = RoiEntryProject::create([
                    'user_id' => $userId,
                    'project_uid' => (string) Str::ulid(),
                    'reference' => $reference,
                    'version' => 1,
                    'status' => 'draft',

                    // ✅ required columns (no defaults)
                    'company_name' => (string) ($company['companyName'] ?? ''),
                    'contract_years' => (int) ($company['contractYears'] ?? 0),
                    'contract_type' => (string) ($company['contractType'] ?? ''),
                    'bundled_std_ink' => (bool) ($company['bundledStdInk'] ?? false),

                    // ✅ safe defaults
                    'annual_interest' => (float) ($interest['annualInterest'] ?? 0),
                    'percent_margin' => (float) ($interest['percentMargin'] ?? 0),

                    'mono_yield_monthly' => $monoMonthly,
                    'mono_yield_annual' => $monoMonthly * 12,
                    'color_yield_monthly' => $colorMonthly,
                    'color_yield_annual' => $colorMonthly * 12,

                    'last_saved_at' => now(),
                ]);
            } else {
                // optional: bump version on each saveDraft
                $project->increment('version');
            }

            $company  = $data['companyInfo'] ?? [];
            $interest = $data['interest'] ?? [];
            $yield    = $data['yield'] ?? [];

            $monoMonthly  = (int) ($yield['monoAmvpYields']['monthly'] ?? 0);
            $colorMonthly = (int) ($yield['colorAmvpYields']['monthly'] ?? 0);

            $mcTotals = $data['machineConfiguration']['totals'] ?? [];
            $feesTotal = (float) ($data['additionalFees']['total'] ?? 0);
            $grand = $data['totalProjectCost'] ?? [];

            // ✅ Update project header + computed totals (safe defaults)
            $project->update([
                'company_name'    => (string) ($company['companyName'] ?? ''),
                'contract_years'  => (int) ($company['contractYears'] ?? 0),
                'contract_type'   => (string) ($company['contractType'] ?? ''),
                'bundled_std_ink' => (bool) ($company['bundledStdInk'] ?? false),

                'annual_interest' => (float) ($interest['annualInterest'] ?? 0),
                'percent_margin'  => (float) ($interest['percentMargin'] ?? 0),

                'mono_yield_monthly'  => $monoMonthly,
                'mono_yield_annual'   => $monoMonthly * 12,
                'color_yield_monthly' => $colorMonthly,
                'color_yield_annual'  => $colorMonthly * 12,

                'mc_unit_cost'           => (float) ($mcTotals['unitCost'] ?? 0),
                'mc_qty'                 => (float) ($mcTotals['qty'] ?? 0),
                'mc_total_cost'          => (float) ($mcTotals['totalCost'] ?? 0),
                'mc_yields'              => (float) ($mcTotals['yields'] ?? 0),
                'mc_cost_cpp'            => (float) ($mcTotals['costCpp'] ?? 0),
                'mc_selling_price'       => (float) ($mcTotals['sellingPrice'] ?? 0),
                'mc_total_sell'          => (float) ($mcTotals['totalSell'] ?? 0),
                'mc_sell_cpp'            => (float) ($mcTotals['sellCpp'] ?? 0),
                'mc_total_bundled_price' => (float) ($mcTotals['totalBundledPrice'] ?? 0),

                'fees_total' => $feesTotal,

                'grand_total_cost'       => (float) ($grand['grandTotalCost'] ?? 0),
                'grand_total_revenue'    => (float) ($grand['grandTotalRevenue'] ?? 0),
                'grand_roi'              => (float) ($grand['grandROI'] ?? 0),
                'grand_roi_percentage'   => (float) ($grand['grandROIPercentage'] ?? 0),

                'yearly_breakdown' => $data['yearlyBreakdown'] ?? null,

                'last_saved_at' => now(),
            ]);

            // ✅ Replace items
            RoiEntryItem::where('roi_entry_project_id', $project->id)->delete();

            $machines    = $data['machineConfiguration']['machine'] ?? [];
            // ✅ critical: your key is "consumable"
            $consumables = $data['machineConfiguration']['consumable'] ?? [];

            $itemRows = [];
            foreach ($machines as $row) {
                $itemRows[] = $this->mapItemRow($project->id, $row, 'machine');
            }
            foreach ($consumables as $row) {
                $itemRows[] = $this->mapItemRow($project->id, $row, 'consumable');
            }

            if (!empty($itemRows)) {
                RoiEntryItem::insert($itemRows);
            }

            // ✅ Replace fees
            RoiEntryFee::where('roi_entry_project_id', $project->id)->delete();

            $feeCompany  = $data['additionalFees']['company'] ?? [];
            $feeCustomer = $data['additionalFees']['customer'] ?? [];

            $feeRows = [];
            foreach ($feeCompany as $row) {
                $feeRows[] = $this->mapFeeRow($project->id, $row, 'company');
            }
            foreach ($feeCustomer as $row) {
                $feeRows[] = $this->mapFeeRow($project->id, $row, 'customer');
            }

            if (!empty($feeRows)) {
                RoiEntryFee::insert($feeRows);
            }

            return $project;
        });

        // ✅ Go to project page after saving draft
        return redirect()->route('roi.entry.projects.show', $project->id);
    }

    /**
     * Submit (draft -> submitted).
     * PATCH /customer-management/roi/entry/projects/{project}/submit
     */
    public function submit(RoiEntryProject $project)
    {
        abort_unless($project->user_id === Auth::id(), 403);

        // Optional: block submit if still empty fields
        // (You can remove these checks if you want to allow submit anytime.)
        if (empty($project->company_name) || empty($project->contract_type)) {
            return back()->with('error', 'Please complete Company Name and Contract Type before submitting.');
        }

        $project->update([
            'status' => 'submitted',
            'last_saved_at' => now(),
        ]);

        // for now: stay on the same page
        // later: redirect to /roi/current
        return back()->with('success', 'Submitted! (Current module not implemented yet)');
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
}
