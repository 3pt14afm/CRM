<?php

namespace App\Services;

use App\Models\Location;
use App\Models\RoiArchiveProject;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryFee;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryProject;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RoiExistingDraftService
{
    public function saveDraftFromPayload(array $data, ?Request $request = null): RoiEntryProject
    {
        $user = Auth::user();
        $userId = $user->id;

        $projectUid = $data['companyInfo']['projectUid'] ?? null;
        $reference = $data['companyInfo']['reference'] ?? null;

        return DB::transaction(function () use ($data, $user, $userId, $projectUid, $reference, $request) {
            $project = null;

            if (!empty($projectUid)) {
                $project = RoiEntryProject::where('user_id', $userId)
                    ->where('project_uid', $projectUid)
                    ->first();
            }

            if (!$project && !empty($reference)) {
                $project = RoiEntryProject::where('user_id', $userId)
                    ->where('reference', $reference)
                    ->first();
            }

            if (!$project) {
                $company = $data['companyInfo'] ?? [];
                $interest = $data['interest'] ?? [];
                $yield = $data['yield'] ?? [];

                $monoMonthly = (int) ($yield['monoAmvpYields']['monthly'] ?? 0);
                $colorMonthly = (int) ($yield['colorAmvpYields']['monthly'] ?? 0);

                $created = false;

                for ($attempt = 0; $attempt < 3 && !$created; $attempt++) {
                    try {
                        $generatedReference = $this->generateReferenceForUser($user);
                        $generatedProjectUid = (string) Str::ulid();

                        $project = RoiEntryProject::create([
                            'user_id' => $userId,
                            'location_id' => $user->primary_location_id,
                            'project_uid' => $generatedProjectUid,
                            'reference' => $generatedReference,
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

                        $created = true;
                    } catch (QueryException $e) {
                        $errorInfo = $e->errorInfo;
                        $sqlState = $errorInfo[0] ?? null;
                        $driverCode = $errorInfo[1] ?? null;
                        $message = strtolower($errorInfo[2] ?? $e->getMessage());

                        $isDuplicateKey =
                            $sqlState === '23000' ||
                            $sqlState === '23505' ||
                            in_array($driverCode, [1062, 1555, 2067], true);

                        $isReferenceConflict = str_contains($message, 'reference');

                        if (!($isDuplicateKey && $isReferenceConflict) || $attempt === 2) {
                            throw $e;
                        }
                    }
                }
            } else {
                $project->increment('version');
            }

            $this->persistDraft($request ?? new Request(), $project, $data);

            return $project->fresh();
        });
    }

    public function persistDraft(Request $request, RoiEntryProject $project, array $data): void
    {
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
            $request->exists('machineConfiguration.consumable') ||
            array_key_exists('machineConfiguration', $data);

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
            $request->exists('additionalFees.customer') ||
            array_key_exists('additionalFees', $data);

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

    public function mapItemRow(int $projectId, array $row, string $kind): array
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

    public function mapFeeRow(int $projectId, array $row, string $payer): array
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

    protected function generateReferenceForUser($user): string
    {
        if (!$user?->primary_location_id) {
            abort(422, 'Your account has no primary location.');
        }

        $location = Location::find($user->primary_location_id);

        if (!$location || empty($location->code)) {
            abort(422, 'Primary location has no code.');
        }

        $prefix = strtoupper(trim($location->code));

        return $this->generateNextReferenceFromPrefix($prefix);
    }

    protected function generateNextReferenceFromPrefix(string $prefix): string
    {
        $allReferences = RoiEntryProject::query()
            ->where('reference', 'like', $prefix . '-%')
            ->pluck('reference')
            ->merge(
                RoiCurrentProject::query()
                    ->where('reference', 'like', $prefix . '-%')
                    ->pluck('reference')
            )
            ->merge(
                RoiArchiveProject::query()
                    ->where('reference', 'like', $prefix . '-%')
                    ->pluck('reference')
            );

        $maxNumber = 0;

        foreach ($allReferences as $reference) {
            if (preg_match('/^' . preg_quote($prefix, '/') . '-(\d+)$/', $reference, $matches)) {
                $maxNumber = max($maxNumber, (int) $matches[1]);
            }
        }

        $nextNumber = $maxNumber + 1;

        return $prefix . '-' . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }
}