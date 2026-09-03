<?php

namespace App\Services\Roi\Entry;

use App\Models\CustomerInfo\PotentialCustomer;
use App\Models\Location;
use App\Models\LocationDepartment;
use App\Models\RoiArchiveProject;
use App\Models\RoiCurrentFee;
use App\Models\RoiCurrentItem;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryProject;
use App\Services\RoiActivityLogger;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Handles the multi-entry ROI group (one `reference`, many `RoiEntryProject`
 * rows, sequence 1..x). Single-entry (`sequence = 0`) is untouched and still
 * goes through RoiProjectService.
 *
 * Expected payload shape for $data, distinct from the single-entry shape:
 * [
 *   'companyInfo' => ['type' => .., 'companyName' => .., 'companySapCode' => .., 'reference' => ..],
 *   'entries' => [
 *       ['projectUid' => .. (null for a new entry), 'companyInfo' => ['contractType' => .., 'contractYears' => .., 'purpose' => ..],
 *        'interest' => .., 'yield' => .., 'entryRemarks' => .., 'machineConfiguration' => .., 'additionalFees' => ..],
 *       ...
 *   ],
 * ]
 */
class RoiMultiEntryService
{
    protected RoiProjectService $entryService;

    public function __construct(RoiProjectService $entryService)
    {
        $this->entryService = $entryService;
    }

    /**
     * Coordinate the database transaction for saving or updating a multi-entry group.
     * Returns the group's RoiEntryProject rows, ordered by sequence.
     */
    public function handleSaveGroupDraft(array $data, $user, Request $request)
    {
        $this->validateSharedCompanyInfo($data['companyInfo'] ?? []);

        $reference = $data['companyInfo']['reference'] ?? null;
        $entriesPayload = $data['entries'] ?? [];

        if (count($entriesPayload) < 1) {
            throw ValidationException::withMessages([
                'entries' => 'At least one entry is required.',
            ]);
        }

        $existingRows = $reference
            ? RoiEntryProject::where('user_id', $user->id)
                ->where('reference', $reference)
                ->orderBy('sequence')
                ->get()
                ->keyBy('project_uid')
            : collect();

        $reference ??= $this->generateGroupReference($user);

        $isSingleEntry = count($entriesPayload) === 1;

        // Delete rows the user removed *before* the loop below, so any sequence
        // slot they were occupying is actually free before a new/reordered row
        // tries to claim it (avoids colliding with a row that's about to be
        // deleted anyway).
        $incomingProjectUids = collect($entriesPayload)->pluck('projectUid')->filter()->all();
        $removed = $existingRows->reject(fn ($row) => in_array($row->project_uid, $incomingProjectUids, true));
        foreach ($removed as $row) {
            $row->items()->delete();
            $row->fees()->delete();
            $row->delete();
        }

        $savedRows = [];

        foreach (array_values($entriesPayload) as $index => $entryData) {
            $sequence = $isSingleEntry ? 0 : $index + 1;
            $projectUid = $entryData['projectUid'] ?? null;
            $row = $projectUid ? $existingRows->get($projectUid) : null;

            if (!$row) {
                $row = RoiEntryProject::create([
                    'user_id'     => $user->id,
                    'location_id' => $user->primary_location_id,
                    'project_uid' => (string) Str::ulid(),
                    'reference'   => $reference,
                    'sequence'    => $sequence,
                    'version'     => 1,
                    'status'      => 'draft',
                    'last_saved_at' => now(),
                    'company_name'     => (string) ($data['companyInfo']['companyName'] ?? ''),
                    'company_sap_code' => $data['companyInfo']['companySapCode'] ?? null,
                    'type'             => (int) ($data['companyInfo']['type'] ?? 0),
                    'contract_type'    => '',
                    'from_group'       => true,
                ]);
            } else {
                $row->increment('version');
                if ((int) $row->sequence !== $sequence) {
                    $row->update(['sequence' => $sequence]);
                }
            }

            // Existing rows still need the shared fields refreshed on every save (in case the user edited company name/sap code/type after the row existed).
            $row->update([
                'company_name'     => (string) ($data['companyInfo']['companyName'] ?? ''),
                'company_sap_code' => $data['companyInfo']['companySapCode'] ?? null,
                'type'             => (int) ($data['companyInfo']['type'] ?? 0),
            ]);

            // Per-entry calculation + fields reuse the existing single-entry logic untouched.
            $entryPayload = $entryData;
            $entryPayload['companyInfo'] = array_merge(
                $data['companyInfo'] ?? [],
                $entryData['companyInfo'] ?? []
            );

            $entryRequest = $request->duplicate();
            $attachmentFiles = $request->file("entries.$index.entry_remarks_attachments", []);

            $entryRequest->merge([
                'entryRemarks' => $entryData['entryRemarks'] ?? [],
            ]);

            $this->entryService->persistDraftData($entryRequest, $row, $entryPayload, $attachmentFiles);

            $savedRows[] = $row->fresh();
        }

        if ($removed->isNotEmpty()) {
            RoiActivityLogger::log(
                activityType: 'update_draft',
                moduleType: 'ROI Entry',
                details: 'Removed ' . $removed->count() . ' entr' . ($removed->count() === 1 ? 'y' : 'ies') . ' from ROI group #' . $reference,
                subject: null,
                oldValues: ['removed_project_uids' => $removed->pluck('project_uid')->all()],
                newValues: null
            );
        }

        return collect($savedRows)->sortBy('sequence')->values();
    }

    private function validateSharedCompanyInfo(array $company): void
    {
        $type        = isset($company['type']) ? (int) $company['type'] : null;
        $companyName = trim($company['companyName'] ?? '');
        $sapCode     = $company['companySapCode'] ?? null;

        if ($type === null) {
            throw ValidationException::withMessages([
                'companyInfo.type' => 'Please select whether the company is Existing or Potential.',
            ]);
        }

        if ($companyName === '') {
            throw ValidationException::withMessages([
                'companyInfo.companyName' => 'Company name is required.',
            ]);
        }

        if ($type === 1) {
            if (empty($sapCode)) {
                throw ValidationException::withMessages([
                    'companyInfo.companyName' =>
                        "\"{$companyName}\" was not selected from the list. Please search and select a valid existing company.",
                ]);
            }

            $existsByCode = DB::table('erms.tbl_company')->where('sap_code', $sapCode)->exists();

            if (!$existsByCode) {
                throw ValidationException::withMessages([
                    'companyInfo.companySapCode' =>
                        'The selected company could not be verified. Please re-select a valid company.',
                ]);
            }
        }

        if ($type === 0 && !empty($sapCode)) {
            throw ValidationException::withMessages([
                'companyInfo.companySapCode' =>
                    'A potential company should not have an SAP code. Please clear the selection and try again.',
            ]);
        }
    }

    /**
     * Same prefix + max-number scheme as RoiProjectService::createNewDraftRecord(),
     * duplicated here since that method is private on the single-entry service.
     */
    private function generateGroupReference($user): string
    {
        if (!$user?->primary_location_id) {
            abort(422, 'Your account has no primary location.');
        }
        $location = Location::find($user->primary_location_id);
        if (!$location || empty($location->code)) {
            abort(422, 'Primary location has no code.');
        }
        $prefix = strtoupper(trim($location->code));

        $tables = [
            (new RoiEntryProject)->getTable(),
            (new RoiCurrentProject)->getTable(),
            (new RoiArchiveProject)->getTable(),
        ];

        $maxNumber = 0;
        foreach ($tables as $table) {
            $highestRef = DB::table($table)
                ->where('reference', 'LIKE', $prefix . '-%')
                ->selectRaw("MAX(CAST(SUBSTRING_INDEX(reference, '-', -1) AS UNSIGNED)) as max_val")
                ->value('max_val');

            $maxNumber = max($maxNumber, (int) $highestRef);
        }

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $candidate = $prefix . '-' . str_pad((string) ($maxNumber + 1), 4, '0', STR_PAD_LEFT);

            $collides = collect($tables)->contains(
                fn ($table) => DB::table($table)->where('reference', $candidate)->exists()
            );

            if (!$collides) {
                return $candidate;
            }

            $maxNumber++;
        }

        throw new \RuntimeException('Failed to generate a unique group reference after 3 attempts due to concurrency.');
    }

    /**
     * Move an entire group (all rows sharing $reference) into "Current Production".
     * Only the master row (sequence 0 or 1) gets workflow routing columns
     * populated; sibling rows get null for those — except status/current_level,
     * which are NOT NULL columns and always start at 'For Review'/2 for every
     * row regardless of master/sibling. Company info is validated once off
     * the master row since it's kept identical across the group by
     * handleSaveGroupDraft().
     */
    public function handleSubmitMultiEntryProject(string $reference, $user, $submitter, LocationDepartment $matrix)
    {
        $projects = RoiEntryProject::where('user_id', $user->id)
            ->where('reference', $reference)
            ->orderBy('sequence')
            ->get();

        if ($projects->isEmpty()) {
            throw ValidationException::withMessages([
                'reference' => 'No entries found for this group.',
            ]);
        }

        $master = $projects->first(fn ($p) => (int) $p->sequence <= 1) ?? $projects->first();

        $this->validateSharedCompanyInfo([
            'type'           => $master->type,
            'companyName'    => $master->company_name,
            'companySapCode' => $master->company_sap_code,
        ]);

        $newRows = collect();

        foreach ($projects as $project) {
            $isMaster = (int) $project->sequence <= 1;

            $type = $project->type !== null ? (int) $project->type : null;
            $sapCode = $project->company_sap_code ?? null;
            $companyHasSap = !empty($sapCode) && $type === 1;

            $newProject = RoiCurrentProject::create([
                'user_id' => $project->user_id,
                'location_id' => $submitter->primary_location_id,
                'project_uid' => $project->project_uid,
                'reference' => $project->reference,
                'sequence' => $project->sequence,
                'version' => $project->version,
                'status' => 'For Review',
                'current_level' => 2,
                'submitted_at' => $isMaster ? now() : null,
                'last_saved_at' => now(),
                'reviewed_by' => $isMaster ? $matrix->reviewed_by : null,
                'checked_by' => $isMaster ? $matrix->checked_by : null,
                'endorsed_by' => $isMaster ? $matrix->endorsed_by : null,
                'confirmed_by' => $isMaster ? $matrix->confirmed_by : null,
                'approved_by' => $isMaster ? $matrix->approved_by : null,
                'comments' => $project->comments ?? [],
                'company_name' => $project->company_name,
                'company_sap_code' => $companyHasSap ? $project->company_sap_code : null,
                'company_id' => $companyHasSap
                    ? DB::table('erms.tbl_company')->where('sap_code', $project->company_sap_code)->value('id')
                    : null,
                'type' => $type,
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
            ]);

            if ($project->items->isNotEmpty()) {
                $now = now();
                RoiCurrentItem::insert($project->items->map(fn ($item) => [
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
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all());
            }

            if ($project->fees->isNotEmpty()) {
                $now = now();
                RoiCurrentFee::insert($project->fees->map(fn ($fee) => [
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
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all());
            }

            if (empty($project->company_sap_code)) {
                $companyName = trim($project->company_name ?? '');
                if ($companyName !== '') {
                    $potential = PotentialCustomer::firstOrCreate(
                        ['company_name' => $companyName],
                        [
                            'id_client_mngr' => $submitter->employee_id,
                            'status' => 1,
                            'address' => '',
                            'contact_no' => '',
                        ]
                    );
                    $newProject->company_id = $potential->id;
                    $newProject->save();
                }
            }

            $newRows->push($newProject);
        }

        RoiActivityLogger::log(
            activityType: 'submit_project',
            moduleType: 'ROI Entry',
            details: 'Submitted ROI group #' . $reference . ' (' . $projects->count() . ' entries)',
            subject: null,
            oldValues: null,
            newValues: ['reference' => $reference, 'entry_count' => $projects->count()]
        );

        foreach ($projects as $project) {
            $project->items()->delete();
            $project->fees()->delete();
            $project->delete();
        }

        return $newRows->sortBy('sequence')->values();
    }
}