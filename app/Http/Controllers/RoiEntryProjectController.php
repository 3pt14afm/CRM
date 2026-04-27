<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\LocationDepartment;
use App\Models\PrinterSupplyPagePrinter;
use App\Models\RoiArchiveProject;
use App\Models\RoiCurrentFee;
use App\Models\RoiCurrentItem;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryFee;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryProject;
use App\Models\Supply;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Concerns\StreamsEntryRemarkAttachments;
use Illuminate\Validation\ValidationException;
use App\Services\RoiActivityLogger;
use Illuminate\Support\Facades\Log;

class RoiEntryProjectController extends Controller
{
    use StreamsEntryRemarkAttachments;

   public function getCompanySuggestions(Request $request)
{
    $search = strtolower(trim($request->query('search')));

    if (!$search || strlen($search) < 1) {
        return response()->json([]);
    }

    $cacheKey = 'company_search_' . $search;

    $suggestions = Cache::remember($cacheKey, now()->addDay(), function () use ($search) {
        return DB::table('erms.tbl_company')
            ->where('status', 1)
            ->where('company_name', 'LIKE', $search . '%')
            ->select('company_name', 'sap_code as company_sap_code') // Fetches the SAP code
            ->limit(20)
            ->get();
    });

    return response()->json($suggestions);
}

private function requestHasRoiDraftPayload(Request $request): bool
{
    return $request->hasAny([
        'companyInfo',
        'interest',
        'yield',
        'entryRemarks',
        'machineConfiguration',
        'additionalFees',
        'totalProjectCost',
        'yearlyBreakdown',
    ]);
}

private function getRoiWorkflow(RoiCurrentProject $project): array
{
    return [
        'preparer_id' => $project->user_id,
        'reviewer_id' => $project->reviewed_by,
        'checker_id' => $project->checked_by,
        'endorser_id' => $project->endorsed_by,
        'confirmer_id' => $project->confirmed_by,
        'approver_id' => $project->approved_by,
    ];
}

    public function show(RoiEntryProject $project, Request $request)
{
    abort_unless($project->user_id === Auth::id(), 403);

    $search = $request->query('company_search');
    $companySuggestions = [];

    if ($search && strlen($search) >= 2) {
        $companySuggestions = DB::table('erms.tbl_company')
            ->where('company_name', 'LIKE', "{$search}%")
            // Updated: Added sap_code to the selection
            ->select('company_name', 'sap_code as company_sap_code') 
            ->limit(10)
            ->get();
    }

    $project->load([
        'items' => fn ($q) => $q->orderBy('id'),
        'fees'  => fn ($q) => $q->orderBy('id'),
        'user',
    ]);

    $userIds = collect([
        $project->user_id,
        $project->reviewed_by,
        $project->checked_by,
        $project->endorsed_by,
        $project->confirmed_by,
        $project->approved_by,
        $project->rejected_by,
    ])->filter()->unique()->values();

    $usersById = \App\Models\User::query()
        ->whereIn('id', $userIds)
        ->get(['id', 'first_name', 'last_name', 'position'])
        ->keyBy(fn ($u) => (string) $u->id)
        ->map(fn ($u) => [
            'id' => $u->id,
            'name' => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')),
            'position' => $u->position ?? '—',
        ]);

    $project->notes = $this->sortTimelineEntries($project->notes);
    $project->comments = $this->sortTimelineEntries($project->comments);

    $projectItems = $project->items->map(function ($item) {
        return [
            'id' => $item->client_row_id ?? (string) $item->id,
            'type' => $item->kind,
            'sku' => $item->sku,
            'qty' => (float) $item->qty,
            'yields' => (string) $item->yields,
            'mode' => $item->mode,
            'remarks' => $item->remarks,
            'inputtedCost' => $item->inputted_cost,
            'cost' => $item->cost,
            'price' => $item->price,
            'basePerYear' => $item->base_per_year,
            'totalCost' => $item->total_cost,
            'costCpp' => $item->cost_cpp,
            'totalSell' => $item->total_sell,
            'sellCpp' => $item->sell_cpp,
            'machineMargin' => $item->machine_margin,
            'machineMarginTotal' => $item->machine_margin_total,
            'autoAdded' => (bool) $item->auto_added,
        ];
    });

    $machineCatalog = \App\Models\PrinterModel::query()
        ->with(['printerModelSupplies.supply'])
        ->where('status', 'Active')
        ->orderBy('printer_name')
        ->get()
        ->map(function ($printer) {
            return [
                'id' => (string) $printer->id,
                'name' => $printer->printer_name,
                'unitCost' => number_format((float) ($printer->unit_cost ?? 0), 2, '.', ''),
                'sellingPrice' => number_format((float) ($printer->selling_price ?? 0), 2, '.', ''),
                'consumables' => $printer->printerModelSupplies
                    ->filter(fn ($link) => $link->supply && $link->supply->status === 'Active')
                    ->map(function ($link) {
                        $supply = $link->supply;
                        $mode = strtolower($supply->category ?? '') === 'part'
                            ? 'others'
                            : (strtolower($supply->print_type ?? '') === 'mono' ? 'mono' : 'color');

                        return [
                            'id' => (string) $supply->id,
                            'mode' => $mode,
                            'name' => $supply->supply_name,
                            'unitCost' => number_format((float) ($supply->unit_cost ?? 0), 2, '.', ''),
                            'sellingPrice' => number_format((float) ($supply->selling_price ?? 0), 2, '.', ''),
                            'yields' => (string) ($supply->yield ?? ''),
                        ];
                    })->values(),
            ];
        })->values();

    $consumableCatalog = ['mono' => [], 'color' => [], 'others' => []];
    $supplies = \App\Models\Supply::where('status', 'Active')->orderBy('supply_name')->get();

    foreach ($supplies as $supply) {
        $mode = strtolower($supply->category ?? '') === 'part'
            ? 'others'
            : (strtolower($supply->print_type ?? '') === 'mono' ? 'mono' : 'color');

        $consumableCatalog[$mode][] = [
            'id' => (string) $supply->id,
            'name' => $supply->supply_name,
            'unitCost' => number_format((float) ($supply->unit_cost ?? 0), 2, '.', ''),
            'sellingPrice' => number_format((float) ($supply->selling_price ?? 0), 2, '.', ''),
            'yields' => (string) ($supply->yield ?? ''),
        ];
    }

    return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
        'activeTab' => 'Machine Configuration',
        'entryProject' => $project,
        'project' => $project,
        'projectItems' => $projectItems,
        'createdBy' => $project->user->name,
        'machineCatalog' => $machineCatalog,
        'consumableCatalog' => $consumableCatalog,
        'companySuggestions' => $companySuggestions,
        'usersById' => $usersById,
    ]);
}



public function saveDraft(Request $request)
{
    $data = $this->validateDraftPayload($request);

    $user = Auth::user();
    $userId = $user->id;

    $projectUid = $data['companyInfo']['projectUid'] ?? null;
    $reference = $data['companyInfo']['reference'] ?? null;

    $result = DB::transaction(function () use ($data, $user, $userId, $projectUid, $reference, $request) {
        $project = null;
        $isNewProject = false;
        $oldSnapshot = [];

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
            $isNewProject = true;

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
                        'last_saved_at' => now(),
                    ]);

                    $created = true;
                } catch (QueryException $e) {
                    $errorInfo = $e->errorInfo;
                    $sqlState = $errorInfo[0] ?? null;
                    $driverCode = $errorInfo[1] ?? null;
                    $message = strtolower($errorInfo[2] ?? $e->getMessage());

                    $isDuplicateKey = $sqlState === '23000'
                        || $sqlState === '23505'
                        || in_array($driverCode, [1062, 1555, 2067], true);

                    $isReferenceConflict = str_contains($message, 'reference');

                    if (!($isDuplicateKey && $isReferenceConflict) || $attempt === 2) {
                        throw $e;
                    }
                }
            }
        } else {
            $oldSnapshot = $this->getRoiEntrySnapshot($project->fresh());
            $project->increment('version');
        }

        $this->persistDraft($request, $project, $data);

        $project = $project->fresh();

        $newSnapshot = $this->getRoiEntrySnapshot($project);

        $changes = $isNewProject
            ? [
                'old' => null,
                'new' => $newSnapshot,
            ]
            : $this->getChangedValues($oldSnapshot, $newSnapshot);

        RoiActivityLogger::log(
            activityType: $isNewProject ? 'save_draft' : 'update_draft',
            moduleType: 'ROI Entry',
            details: $isNewProject
                ? 'Saved new ROI draft #' . $project->reference
                : 'Updated ROI draft #' . $project->reference,
            subject: $project,
            oldValues: $changes['old'],
            newValues: $changes['new']
        );

        return $project;
    });

    return redirect()->route('roi.entry.projects.show', $result);
}


 public function submit(Request $request, RoiEntryProject $project)
{
    abort_unless($project->user_id === Auth::id(), 403);

    if ($this->requestHasRoiDraftPayload($request)) {
        $data = $this->validateDraftPayload($request);
        $this->persistDraft($request, $project, $data);
    }

    $project->refresh()->load(['items', 'fees']);

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

    $oldValues = [
        'status' => $project->status,
        'table' => 'roi_entry_projects',
        'reference' => $project->reference,
    ];

    $newProject = DB::transaction(function () use ($project, $submitter, $matrix) {
        $project->loadMissing(['items', 'fees']);

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

    try {
        RoiActivityLogger::log(
            activityType: 'submit',
            moduleType: 'ROI Entry',
            details: 'Submitted ROI #' . $newProject->reference,
            subject: $newProject,
            oldValues: $oldValues,
            newValues: [
                'status' => $newProject->status,
                'table' => 'roi_current_projects',
                'reference' => $newProject->reference,
                'current_level' => $newProject->current_level,
                'submitted_at' => $newProject->submitted_at,
            ],
            workflow: [
                'preparer_id' => $newProject->user_id,
                'reviewer_id' => $newProject->reviewed_by,
                'checker_id' => $newProject->checked_by,
                'endorser_id' => $newProject->endorsed_by,
                'confirmer_id' => $newProject->confirmed_by,
                'approver_id' => $newProject->approved_by,
                ]
        );
    } catch (\Throwable $e) {
        Log::error('ROI submit activity log failed', [
            'message' => $e->getMessage(),
            'reference' => $newProject->reference ?? null,
        ]);
    }

    return redirect()->route('roi.entry.list')->with('success', 'Draft successfully submitted.');
}

    
    public function destroy(RoiEntryProject $project)
{
        abort_unless($project->user_id === Auth::id(), 403);

        $allowedStatuses = ['draft', 'returned'];
        if (!in_array($project->status, $allowedStatuses, true)) {
            return back()->with('error', 'Only drafts or returned projects can be deleted.');
        }

        // 🔥 Load everything before deleting
        $project->load(['items', 'fees']);

        // 🔥 FULL SNAPSHOT
        $oldValues = [
            'project' => $project->toArray(),
            'items' => $project->items->map->toArray()->toArray(),
            'fees' => $project->fees->map->toArray()->toArray(),
        ];

        DB::transaction(function () use ($project) {
            RoiEntryItem::where('roi_entry_project_id', $project->id)->delete();
            RoiEntryFee::where('roi_entry_project_id', $project->id)->delete();
            $project->delete();
        });

        // 🔥 Log AFTER delete (safe)
        try {
            RoiActivityLogger::log(
                activityType: 'delete',
                moduleType: 'ROI Entry',
                details: 'Deleted ROI draft #' . ($oldValues['project']['reference'] ?? ''),
                subject: null, // already deleted
                oldValues: $oldValues,
                newValues: null
            );
        } catch (\Throwable $e) {
            Log::error('ROI delete activity log failed', [
                'message' => $e->getMessage(),
                'project_id' => $project->id,
            ]);
        }

    return redirect()->route('roi.entry.list');
}

private function validateDraftPayload(Request $request): array
{
    $data = $request->validate([
        'companyInfo.reference' => ['nullable', 'string', 'max:255'],
        'companyInfo.projectUid' => ['nullable', 'string', 'max:255'],
        'companyInfo.companyName' => ['required', 'string', 'max:255'],
        'companyInfo.companySapCode' => ['nullable', 'string', 'max:255'], // Added this line
        'companyInfo.contractYears' => ['required', 'integer', 'min:0'],
        'companyInfo.contractType' => ['required', 'string', 'max:255'],
        'companyInfo.purpose' => ['nullable', 'string', 'max:5000'],
        'companyInfo.bundledStdInk' => ['nullable'],

        'interest.annualInterest' => ['nullable'],
        'interest.percentMargin' => ['nullable'],

        'yield.monoAmvpYields.monthly' => ['nullable'],
        'yield.colorAmvpYields.monthly' => ['nullable'],

        'entryRemarks' => ['nullable', 'array'],
        'entryRemarks.remarks' => ['nullable', 'string', 'max:5000'],
        'entryRemarks.attachments' => ['nullable', 'array'],

        'entry_remarks_attachments' => ['nullable', 'array', 'max:3'],
        'entry_remarks_attachments.*' => [
            'file',
            'max:10240',
            'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png',
        ],

        'machineConfiguration.machine' => ['nullable', 'array'],
        'machineConfiguration.consumable' => ['nullable', 'array'],
        'machineConfiguration.totals' => ['nullable', 'array'],

        'additionalFees.company' => ['nullable', 'array'],
        'additionalFees.customer' => ['nullable', 'array'],
        'additionalFees.total' => ['nullable'],

        'totalProjectCost' => ['nullable', 'array'],
        'yearlyBreakdown' => ['nullable', 'array'],
    ]);

    $monoMonthly = (float) data_get($data, 'yield.monoAmvpYields.monthly', 0);
    $colorMonthly = (float) data_get($data, 'yield.colorAmvpYields.monthly', 0);

    $requiresRemarksAttachment = $monoMonthly > 5000 || $colorMonthly > 2500;

    if ($requiresRemarksAttachment) {
        $remarks = trim((string) data_get($data, 'entryRemarks.remarks', ''));
        $keptAttachmentsCount = collect($request->input('entryRemarks.attachments', []))
            ->filter(fn ($item) => is_array($item) && !empty($item['id']))
            ->count();
        $newAttachmentsCount = count($request->file('entry_remarks_attachments', []) ?? []);
        $totalAttachmentsCount = $keptAttachmentsCount + $newAttachmentsCount;

        $errors = [];
        if ($remarks === '') {
            $errors['entryRemarks.remarks'] = 'Remarks are required when Mono AMVP is more than 5,000 or Color AMVP is more than 2,500.';
        }
        if ($totalAttachmentsCount < 1) {
            $errors['entry_remarks_attachments'] = 'At least one attachment is required when Mono AMVP is more than 5,000 or Color AMVP is more than 2,500.';
        }
        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    return $data;
}

    public function persistDraft(Request $request, RoiEntryProject $project, ?array $data = null): void
{
    $data = $data ?? $this->validateDraftPayload($request);

    $company = $data['companyInfo'] ?? [];
    $interest = $data['interest'] ?? [];
    $yield = $data['yield'] ?? [];
    $entryRemarks = $data['entryRemarks'] ?? [];

    $monoMonthly = (int) ($yield['monoAmvpYields']['monthly'] ?? 0);
    $colorMonthly = (int) ($yield['colorAmvpYields']['monthly'] ?? 0);

    $mcTotals = $data['machineConfiguration']['totals'] ?? [];
    $feesTotal = (float) ($data['additionalFees']['total'] ?? 0);
    $grand = $data['totalProjectCost'] ?? [];

    $attachments = $this->storeEntryRemarkAttachments($request, $project);

    $project->update([
        'company_name' => (string) ($company['companyName'] ?? ''),
        'company_sap_code' => $company['companySapCode'] ?? null, // Added this line
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

    // Handle items and fees (no changes needed here as they relate to separate tables)
    $hasMachinePayload = $request->exists('machineConfiguration.machine') || $request->exists('machineConfiguration.consumable');
    if ($hasMachinePayload) {
        RoiEntryItem::where('roi_entry_project_id', $project->id)->delete();
        $itemRows = [];
        foreach ($data['machineConfiguration']['machine'] ?? [] as $row) { $itemRows[] = $this->mapItemRow($project->id, $row, 'machine'); }
        foreach ($data['machineConfiguration']['consumable'] ?? [] as $row) { $itemRows[] = $this->mapItemRow($project->id, $row, 'consumable'); }
        if (!empty($itemRows)) { RoiEntryItem::insert($itemRows); }
    }

    $hasFeePayload = $request->exists('additionalFees.company') || $request->exists('additionalFees.customer');
    if ($hasFeePayload) {
        RoiEntryFee::where('roi_entry_project_id', $project->id)->delete();
        $feeRows = [];
        foreach ($data['additionalFees']['company'] ?? [] as $row) { $feeRows[] = $this->mapFeeRow($project->id, $row, 'company'); }
        foreach ($data['additionalFees']['customer'] ?? [] as $row) { $feeRows[] = $this->mapFeeRow($project->id, $row, 'customer'); }
        if (!empty($feeRows)) { RoiEntryFee::insert($feeRows); }
    }
}

   private function storeEntryRemarkAttachments(Request $request, RoiEntryProject $project): array
    {
        $existing = is_array($project->entry_remarks_attachments)
            ? $project->entry_remarks_attachments
            : [];

        $keptIds = collect($request->input('entryRemarks.attachments', []))
            ->map(fn ($item) => is_array($item) ? ($item['id'] ?? null) : null)
            ->filter()
            ->values()
            ->all();

        $kept = collect($existing)
            ->filter(fn ($item) => in_array($item['id'] ?? null, $keptIds, true))
            ->values()
            ->all();

        $removed = collect($existing)
            ->filter(fn ($item) => !in_array($item['id'] ?? null, $keptIds, true))
            ->values()
            ->all();

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
            throw ValidationException::withMessages([
                'entry_remarks_attachments' => 'You may attach up to 3 files only.',
            ]);
        }

        if (!empty($uploadedLogs) || !empty($removed)) {
            try {
                RoiActivityLogger::log(
                    activityType: 'update_attachments',
                    moduleType: 'ROI Entry',
                    details: 'Updated entry remark attachments for ROI #' . $project->reference,
                    subject: $project,
                    oldValues: [
                        'removed_attachments' => collect($removed)->map(fn ($item) => [
                            'id' => $item['id'] ?? null,
                            'original_name' => $item['original_name'] ?? null,
                            'stored_name' => $item['stored_name'] ?? null,
                            'size' => $item['size'] ?? null,
                        ])->values()->all(),
                    ],
                    newValues: [
                        'uploaded_attachments' => collect($uploadedLogs)->map(fn ($item) => [
                            'id' => $item['id'] ?? null,
                            'original_name' => $item['original_name'] ?? null,
                            'stored_name' => $item['stored_name'] ?? null,
                            'size' => $item['size'] ?? null,
                        ])->values()->all(),
                        'kept_attachments_count' => count($kept),
                    ]
                );
            } catch (\Throwable $e) {
                Log::error('ROI attachment activity log failed', [
                    'message' => $e->getMessage(),
                    'project_id' => $project->id,
                    'reference' => $project->reference,
                ]);
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
            abort_unless($this->canNoteOnEntryProject($project), 403);

            $validated = $request->validate([
                'body' => ['required', 'string', 'max:5000']
            ]);

            $user = Auth::user();
            $notes = is_array($project->notes) ? $project->notes : [];

            $note = [
                'id' => (string) Str::ulid(),
                'body' => trim($validated['body']),
                'created_at' => now()->toISOString(),
                'author' => [
                    'id' => Auth::id(),
                    'name' => $user?->name ?? 'Unknown',
                    'role' => $user?->role,
                ],
            ];

            $notes[] = $note;

            $project->update([
                'notes' => $this->sortTimelineEntries($notes),
                'last_saved_at' => now(),
            ]);

            // ✅ LOG
            try {
                RoiActivityLogger::log(
                    activityType: 'add_note',
                    moduleType: 'ROI Entry',
                    details: 'Added note to ROI #' . $project->reference,
                    subject: $project,
                    newValues: [
                        'note_id' => $note['id'],
                        'body' => $note['body'],
                    ]
                );
            } catch (\Throwable $e) {
                Log::error('ROI note log failed', [
                    'message' => $e->getMessage(),
                    'project_id' => $project->id,
                ]);
            }

        return back()->with('success', 'Note added.');
    }

  public function storeComment(Request $request, RoiCurrentProject $project)
    {
            abort_unless($this->canCommentOnCurrentProject($project), 403);

            $validated = $request->validate([
                'body' => ['required', 'string', 'max:5000']
            ]);

            $user = Auth::user();
            $comments = is_array($project->comments) ? $project->comments : [];

            $comment = [
                'id' => (string) Str::ulid(),
                'body' => trim($validated['body']),
                'created_at' => now()->toISOString(),
                'author' => [
                    'id' => Auth::id(),
                    'name' => $user?->name ?? 'Unknown',
                    'role' => $user?->role,
                ],
            ];

            $comments[] = $comment;

            $project->update([
                'comments' => $this->sortTimelineEntries($comments),
                'last_saved_at' => now(),
            ]);

            // ✅ LOG
            try {
                RoiActivityLogger::log(
                    activityType: 'add_comment',
                    moduleType: 'ROI Current',
                    details: 'Added comment to ROI #' . $project->reference,
                    subject: $project,
                    newValues: [
                        'comment_id' => $comment['id'],
                        'body' => $comment['body'],
                    ]
                );
            } catch (\Throwable $e) {
                Log::error('ROI comment log failed', [
                    'message' => $e->getMessage(),
                    'project_id' => $project->id,
                ]);
        }

        return back()->with('success', 'Comment added.');
    }

    private function canNoteOnEntryProject(RoiEntryProject $project): bool
    {
        $user = Auth::user();
        if (!$user) return false;
        if (!in_array($project->status, ['draft', 'returned'], true)) return false;

        $userId = (int) $user->id;
        if ((int) $project->user_id === $userId) return true;

        $currentProject = RoiCurrentProject::where('project_uid', $project->project_uid)->first();
        if (!$currentProject) return false;

        return (int) $currentProject->reviewed_by === $userId
            || (int) $currentProject->checked_by === $userId
            || (int) $currentProject->endorsed_by === $userId;
    }

    private function canCommentOnCurrentProject(RoiCurrentProject $project): bool
    {
        $user = Auth::user();
        if (!$user) return false;

        $userId = (int) $user->id;

        return (int) $project->confirmed_by === $userId
            || (int) $project->approved_by === $userId;
    }

    private function generateReferenceForUser($user): string
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

    private function generateNextReferenceFromPrefix(string $prefix): string
    {
        $allReferences = RoiEntryProject::where('reference', 'like', $prefix . '-%')->pluck('reference')
            ->merge(RoiCurrentProject::where('reference', 'like', $prefix . '-%')->pluck('reference'))
            ->merge(RoiArchiveProject::where('reference', 'like', $prefix . '-%')->pluck('reference'));

        $maxNumber = 0;

        foreach ($allReferences as $reference) {
            if (preg_match('/^' . preg_quote($prefix, '/') . '-(\d+)$/', $reference, $matches)) {
                $maxNumber = max($maxNumber, (int) $matches[1]);
            }
        }

        $nextNumber = $maxNumber + 1;

        return $prefix . '-' . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }

    private function sortTimelineEntries(?array $entries): array
    {
        $rows = is_array($entries) ? $entries : [];

        usort($rows, function ($a, $b) {
            $aTime = strtotime($a['created_at'] ?? '') ?: 0;
            $bTime = strtotime($b['created_at'] ?? '') ?: 0;
            return $bTime <=> $aTime;
        });

        return array_values($rows);
    }

    public function showAttachment(RoiEntryProject $project, int $attachmentIndex)
    {
        abort_unless((int) $project->user_id === (int) Auth::id(), 403);

        $attachments = is_array($project->entry_remarks_attachments)
            ? array_values($project->entry_remarks_attachments)
            : [];

        abort_unless(array_key_exists($attachmentIndex, $attachments), 404);

        $attachment = $attachments[$attachmentIndex];

        abort_unless(!empty($attachment['path']), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return response()->file(Storage::disk('local')->path($attachment['path']));
    }

    private function getChangedValues(array $oldData, array $newData): array
    {
        $oldValues = [];
        $newValues = [];

        foreach ($newData as $key => $newValue) {
            $oldValue = $oldData[$key] ?? null;

            if ($oldValue != $newValue) {
                $oldValues[$key] = $oldValue;
                $newValues[$key] = $newValue;
            }
        }

        return [
            'old' => $oldValues,
            'new' => $newValues,
        ];
    }

    private function getRoiEntrySnapshot(RoiEntryProject $project): array
    {
        return [
            'company_name' => $project->company_name,
            'company_sap_code' => $project->company_sap_code,
            'contract_years' => $project->contract_years,
            'contract_type' => $project->contract_type,
            'purpose' => $project->purpose,
            'bundled_std_ink' => $project->bundled_std_ink,
            'annual_interest' => $project->annual_interest,
            'percent_margin' => $project->percent_margin,
            'mono_yield_monthly' => $project->mono_yield_monthly,
            'color_yield_monthly' => $project->color_yield_monthly,
            'entry_remarks' => $project->entry_remarks,
            'mc_unit_cost' => $project->mc_unit_cost,
            'mc_qty' => $project->mc_qty,
            'mc_total_cost' => $project->mc_total_cost,
            'mc_selling_price' => $project->mc_selling_price,
            'mc_total_sell' => $project->mc_total_sell,
            'fees_total' => $project->fees_total,
            'grand_total_cost' => $project->grand_total_cost,
            'grand_total_revenue' => $project->grand_total_revenue,
            'grand_roi' => $project->grand_roi,
            'grand_roi_percentage' => $project->grand_roi_percentage,
        ];
    }

}