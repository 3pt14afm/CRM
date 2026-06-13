<?php

namespace App\Services\Roi\Entry;

use App\Models\RoiEntryProject;
use App\Models\Location;
use App\Models\RoiCurrentProject;
use App\Models\RoiArchiveProject;
use App\Models\RoiCurrentItem;
use App\Models\RoiCurrentFee;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryFee;
use App\Models\LocationDepartment;
use App\Services\RoiActivityLogger;
use App\Services\Roi\Entry\RoiCalculator;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RoiProjectService
{
    protected RoiCalculator $calculator;

    public function __construct(RoiCalculator $calculator)
    {
        $this->calculator = $calculator;
    }

    /**
     * Coordinate the database transaction for saving or updating an entry draft.
     */
    public function handleSaveDraft(array $data, $user, Request $request): RoiEntryProject
    {
        $projectUid = $data['companyInfo']['projectUid'] ?? null;
        $reference = $data['companyInfo']['reference'] ?? null;

        return DB::transaction(function () use ($data, $user, $projectUid, $reference, $request) {
            $project = null;
            $isNewProject = false;
            $oldSnapshot = [];

            if (!empty($projectUid)) {
                $project = RoiEntryProject::where('user_id', $user->id)->where('project_uid', $projectUid)->first();
            }
            if (!$project && !empty($reference)) {
                $project = RoiEntryProject::where('user_id', $user->id)->where('reference', $reference)->first();
            }

            if (!$project) {
                $isNewProject = true;
                $project = $this->createNewDraftRecord($data, $user);
            } else {
                $oldSnapshot = $this->getRoiEntrySnapshot($project->fresh());
                $project->increment('version');
            }

            $this->persistDraftData($request, $project, $data);
            $project = $project->fresh();

            $newSnapshot = $this->getRoiEntrySnapshot($project);
            $changes = $isNewProject ? ['old' => null, 'new' => $newSnapshot] : $this->getChangedValues($oldSnapshot, $newSnapshot);

            RoiActivityLogger::log(
                activityType: $isNewProject ? 'save_draft' : 'update_draft',
                moduleType: 'ROI Entry',
                details: ($isNewProject ? 'Saved new ROI draft #' : 'Updated ROI draft #') . $project->reference,
                subject: $project,
                oldValues: $changes['old'],
                newValues: $changes['new']
            );

            return $project;
        });
    }

    /**
     * Handle moving data into the "Current Production" tables and cleaning up the staging draft tables.
     */
    public function handleSubmitProject(RoiEntryProject $project, $submitter, LocationDepartment $matrix, array $oldValues): RoiCurrentProject
    {
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
                'company_sap_code' => $project->company_sap_code,
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
                'entry_remarks' => $project->entry_remarks,
                'entry_remarks_attachments' => $project->entry_remarks_attachments ?? [],
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
                    'auto_added' => $item->auto_added,
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

            return $newProject;
        });
    }

    /**
     * Map payload calculations, attach files, and overwrite items/fees records.
     */
    public function persistDraftData(Request $request, RoiEntryProject $project, array $data): void
    {
        $company = $data['companyInfo'] ?? [];
        $interest = $data['interest'] ?? [];
        $yield = $data['yield'] ?? [];
        $entryRemarks = $data['entryRemarks'] ?? [];

        $monoMonthly = (int) ($yield['monoAmvpYields']['monthly'] ?? 0);
        $colorMonthly = (int) ($yield['colorAmvpYields']['monthly'] ?? 0);

        $attachments = $this->storeEntryRemarkAttachments($request, $project);

        // 1. Calculations performed via the Backend Calculator engine
        $calculated = $this->calculator->calculateAll($data);

        // 2. Map payload calculations safely
        $project->update([
            'company_name' => (string) ($company['companyName'] ?? ''),
            'company_sap_code' => $company['companySapCode'] ?? null,
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
            'entry_remarks' => (string) ($entryRemarks['remarks'] ?? ''),
            'entry_remarks_attachments' => $attachments,
            
            'mc_unit_cost' => 0,
            'mc_qty' => 0,
            'mc_total_cost' => (float) ($calculated['breakdown']['machine']      ?? 0),
            'mc_total_sell' => (float) ($calculated['firstYear']['totalMachineSales'] ?? 0),
            'fees_total' => (float) ($calculated['feesTotal']                    ?? 0),
            'grand_total_cost' => (float) ($calculated['grandTotalCost']         ?? 0),
            'grand_total_revenue' => (float) ($calculated['grandTotalRevenue']   ?? 0),
            'grand_roi' => (float) ($calculated['grandRoi']                      ?? 0),
            'grand_roi_percentage' => (float) ($calculated['grandRoiPercentage'] ?? 0),

            'yearly_breakdown' => $calculated['yearlyBreakdown'] ?? null,
            'last_saved_at' => now(),
        ]);

        // 3. PERSIST ITEM ROWS (Bypasses input verification failure drops)
        if (array_key_exists('machineConfiguration', $data)) {
            RoiEntryItem::where('roi_entry_project_id', $project->id)->delete();
            $itemRows = [];
            foreach ($data['machineConfiguration']['machine'] ?? [] as $row) { $itemRows[] = $this->mapItemRow($project->id, $row, 'machine'); }
            foreach ($data['machineConfiguration']['consumable'] ?? [] as $row) { $itemRows[] = $this->mapItemRow($project->id, $row, 'consumable'); }
            if (!empty($itemRows)) { RoiEntryItem::insert($itemRows); }
        }

        // 4. PERSIST FEE ROWS
        if (array_key_exists('additionalFees', $data)) {
            RoiEntryFee::where('roi_entry_project_id', $project->id)->delete();
            $feeRows = [];
            foreach ($data['additionalFees']['company'] ?? [] as $row) { $feeRows[] = $this->mapFeeRow($project->id, $row, 'company'); }
            foreach ($data['additionalFees']['customer'] ?? [] as $row) { $feeRows[] = $this->mapFeeRow($project->id, $row, 'customer'); }
            if (!empty($feeRows)) { RoiEntryFee::insert($feeRows); }
        }
    }

    /**
     * Generate sequential prefix identifiers safely using efficient database queries.
     */
    private function createNewDraftRecord(array $data, $user): RoiEntryProject
    {
        $company      = $data['companyInfo'] ?? [];
        $yield        = $data['yield']       ?? [];
        $monoMonthly  = (int) ($yield['monoAmvpYields']['monthly']  ?? 0);
        $colorMonthly = (int) ($yield['colorAmvpYields']['monthly'] ?? 0);

        if (!$user?->primary_location_id) {
            abort(422, 'Your account has no primary location.');
        }
        $location = Location::find($user->primary_location_id);
        if (!$location || empty($location->code)) {
            abort(422, 'Primary location has no code.');
        }
        $prefix = strtoupper(trim($location->code));

        // OPTIMIZED: Handled sequence calculations down at database level using regular extraction expression matching
        $tables = [
            (new RoiEntryProject)->getTable(),
            (new RoiCurrentProject)->getTable(),
            (new RoiArchiveProject)->getTable(),
        ];

        $maxNumber = 0;
        foreach ($tables as $table) {
            // Extracts raw trailing integers natively out of the text schemas
            $highestRef = DB::table($table)
                ->where('reference', 'LIKE', $prefix . '-%')
                ->selectRaw("MAX(CAST(SUBSTRING_INDEX(reference, '-', -1) AS UNSIGNED)) as max_val")
                ->value('max_val');

            $maxNumber = max($maxNumber, (int) $highestRef);
        }

        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                return RoiEntryProject::create([
                    'user_id'            => $user->id,
                    'location_id'        => $user->primary_location_id,
                    'project_uid'        => (string) Str::ulid(),
                    'reference'          => $this->generateDraftReference($user->id, $prefix, $maxNumber),
                    'version'            => 1,
                    'status'             => 'draft',
                    'company_name'       => (string) ($company['companyName']    ?? ''),
                    'company_sap_code'   => $company['companySapCode']            ?? null,
                    'contract_years'     => (int)    ($company['contractYears']  ?? 0),
                    'contract_type'      => (string) ($company['contractType']   ?? ''),
                    'purpose'            => (string) ($company['purpose']        ?? ''),
                    'bundled_std_ink'    => (bool)   ($company['bundledStdInk']  ?? false),
                    'mono_yield_monthly' => $monoMonthly,
                    'mono_yield_annual'  => $monoMonthly  * 12,
                    'color_yield_monthly'=> $colorMonthly,
                    'color_yield_annual' => $colorMonthly * 12,
                    'last_saved_at'      => now(),
                ]);
            } catch (QueryException $e) {
                $errorInfo  = $e->errorInfo;
                $sqlState   = $errorInfo[0] ?? null;
                $driverCode = $errorInfo[1] ?? null;
                $message    = strtolower($errorInfo[2] ?? $e->getMessage());

                $isDuplicateKey = $sqlState === '23000'
                    || $sqlState === '23505'
                    || in_array($driverCode, [1062, 1555, 2067], true);

                if (!($isDuplicateKey && str_contains($message, 'reference')) || $attempt === 2) {
                    throw $e;
                }

                $maxNumber++;
            }
        }

        throw new \RuntimeException('Failed to generate a unique project reference after 3 attempts due to concurrency.');
    }

    /**
     * Generate a unique reference ID for new draft projects.
     */
    private function generateDraftReference(int $userId, string $prefix = null, int $maxNumber = null): string
    {
        if ($prefix && $maxNumber !== null) {
            return $prefix . '-' . str_pad((string) ($maxNumber + 1), 4, '0', STR_PAD_LEFT);
        }

        $date = now()->format('Ymd');
        $randomStr = strtoupper(Str::random(4));
        
        return "DRAFT-{$userId}-{$date}-{$randomStr}";
    }

    /**
     * Synchronize and clean up uploaded files for remark attachments.
     */
    private function storeEntryRemarkAttachments(Request $request, RoiEntryProject $project): array
    {
        $existing = is_array($project->entry_remarks_attachments) ? $project->entry_remarks_attachments : [];
        $keptIds = collect($request->input('entryRemarks.attachments', []))
            ->map(fn ($item) => is_array($item) ? ($item['id'] ?? null) : null)
            ->filter()->values()->all();

        $kept = collect($existing)->filter(fn ($item) => in_array($item['id'] ?? null, $keptIds, true))->values()->all();
        $removed = collect($existing)->filter(fn ($item) => !in_array($item['id'] ?? null, $keptIds, true))->values()->all();

        foreach ($removed as $item) {
            if (!empty($item['path']) && Storage::disk('local')->exists($item['path'])) {
                Storage::disk('local')->delete($item['path']);
            }
        }

        $uploaded = $request->file('entry_remarks_attachments', []);
        $uploadedLogs = [];

        foreach ($uploaded as $file) {
            $id = (string) Str::ulid();
            $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
            $storedName = "{$id}.{$extension}";
            $path = $file->storeAs('roi-entry-remarks', $storedName, 'local');

            $newAttachment = [
                'id' => $id,
                'original_name' => $file->getClientOriginalName(),
                'stored_name' => $storedName,
                'path' => $path,
                'size' => $file->getSize(),
            ];

            $kept[] = $newAttachment;
            $uploadedLogs[] = $newAttachment;
        }

        if (count($kept) > 3) {
            throw ValidationException::withMessages(['entry_remarks_attachments' => 'You may attach up to 3 files only.']);
        }

        if (!empty($uploadedLogs) || !empty($removed)) {
            try {
                RoiActivityLogger::log(
                    activityType: 'update_attachments',
                    moduleType: 'ROI Entry',
                    details: 'Updated entry remark attachments for ROI #' . $project->reference,
                    subject: $project,
                    oldValues: ['removed_attachments' => collect($removed)->map(fn ($item) => ['id' => $item['id'] ?? null, 'original_name' => $item['original_name'] ?? null])->all()],
                    newValues: ['uploaded_attachments' => collect($uploadedLogs)->map(fn ($item) => ['id' => $item['id'] ?? null, 'original_name' => $item['original_name'] ?? null])->all(), 'kept_attachments_count' => count($kept)]
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('ROI attachment activity log failed', ['message' => $e->getMessage()]);
            }
        }

        return array_values($kept);
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
            'auto_added' => isset($row['autoAdded']) ? (bool) $row['autoAdded'] : false,
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
            'created_at' => now(), 'updated_at' => now(),
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
            'created_at' => now(), 'updated_at' => now(),
        ];
    }

    private function getRoiEntrySnapshot(RoiEntryProject $project): array
    {
        return $project->only([
            'company_name', 'company_sap_code', 'contract_years', 'contract_type', 'purpose',
            'bundled_std_ink', 'annual_interest', 'percent_margin', 'mono_yield_monthly',
            'color_yield_monthly', 'entry_remarks', 'mc_unit_cost', 'mc_qty', 'mc_total_cost',
            'mc_selling_price', 'mc_total_sell', 'fees_total', 'grand_total_cost',
            'grand_total_revenue', 'grand_roi', 'grand_roi_percentage'
        ]);
    }

    private function getChangedValues(array $oldData, array $newData): array
    {
        $oldValues = []; $newValues = [];
        foreach ($newData as $key => $newValue) {
            if (($oldData[$key] ?? null) != $newValue) {
                $oldValues[$key] = $oldData[$key] ?? null;
                $newValues[$key] = $newValue;
            }
        }
        return ['old' => $oldValues, 'new' => $newValues];
    }
}