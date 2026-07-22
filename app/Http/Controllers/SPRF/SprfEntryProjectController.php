<?php

namespace App\Http\Controllers\SPRF;

use App\Http\Controllers\Controller;
use App\Models\SPRF\SprfApprovalMatrix;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\SPRF\SprfEntryFee;
use App\Models\SPRF\SprfEntryItem;
use App\Models\SPRF\SprfEntryItemSubitem;
use App\Models\SPRF\SprfEntryProject;
use App\Models\User;
use App\Services\SPRF\Current\SprfCurrentWorkflowService;
use App\Services\SprfActivityLogger;
use App\Services\SPRF\SprfItemCalculationService;
use App\Services\SPRF\SprfNumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use App\Models\CustomerInfo\Company;
use App\Models\CustomerInfo\PotentialCustomer;
use Illuminate\Support\Facades\Storage;

class SprfEntryProjectController extends Controller
{
    public function __construct(
        private readonly SprfItemCalculationService $itemCalc,
        private readonly SprfCurrentWorkflowService $workflowService,
    ) {}

    public function show(SprfEntryProject $project)
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            abort(403);
        }

        $project->load(['items.subitems', 'fees', 'preparer:id,first_name,last_name,position,email']);

        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntry', [
            'approverUsers'  => $this->mapApproverUsersFromProject($project),
            'initialProject' => $this->transformProjectForFrontend($project),
            'route'          => 'entry',
        ]);
    }

    public function print(SprfEntryProject $project)
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            abort(403);
        }

        $project->load(['items.subitems', 'fees', 'preparer:id,first_name,last_name,position,email']);

        return Inertia::render('CustomerManagement/ProjectSPRF/sprfEntryPrint', [
            'entryProject'       => $this->transformProjectForPrint($project),
            'storageKey'         => request('storageKey'),
            'autoprint'          => (bool) request('autoprint', false),
            'showDraftWatermark' => (bool) request('draftWatermark', true),
        ]);
    }

    // ─── Save Draft ───────────────────────────────────────────────────────────

    public function saveDraft(Request $request, SprfNumberGenerator $sprfNumberGenerator)
    {
        $payload = $this->validatePayload($request);

        $companyInfo = (array) data_get($payload, 'company_info', []);
        $this->validateCompanyIntegrity($companyInfo);

        $projectId = data_get($payload, 'project_id');

        $existingProject = $projectId
            ? SprfEntryProject::query()
                ->where('id', $projectId)
                ->where('prepared_by_user_id', Auth::id())
                ->firstOrFail()
            : null;

        $oldValues = $existingProject ? $existingProject->toArray() : null;

        $revenue           = (float) data_get($payload, 'summary.revenue', 0);
        $cogs              = (float) data_get($payload, 'summary.cogs', 0);
        $otherExpenseTotal = (float) data_get($payload, 'summary.otherExpense', 0);
        $totalExpense      = (float) data_get($payload, 'summary.totalExpense', 0);
        $gpValue           = (float) data_get($payload, 'summary.gpValue', 0);
        $gpPercent         = (float) data_get($payload, 'summary.totalGpPercent', 0);

        $items = $this->mapItemsPayload((array) data_get($payload, 'items', []));
        $fees  = $this->mapFeesPayload((array) data_get($payload, 'other_expenses', []));

        $hasRebate = $this->hasRebateValueFromMappedFees($fees);

        $approvalConditionCode = $this->resolveApprovalConditionCode(
            $payload, $revenue, $gpPercent, $hasRebate
        );

        // Lenient — no matrix found just means approvers stay null on the draft
        ['location_id' => $locationId, 'department_id' => $departmentId]
            = $this->resolvePreparerLocationAndDepartment();

        $matrix        = $this->tryFindActiveMatrix($locationId, $departmentId);
        $approverUsers = $matrix
            ? $this->extractApproverUsers($matrix)
            : ['directorCustomerEngagement' => null, 'esdDirector' => null, 'vpCcto' => null, 'presidentCeo' => null];

        $flags                = $this->resolveApprovalFlagsFromCondition($approvalConditionCode);
        $sprfApprovalMatrixId = $matrix?->id;

        $project = DB::transaction(function () use (
            $existingProject, $payload, $approverUsers, $revenue, $cogs,
            $otherExpenseTotal, $totalExpense, $gpValue, $gpPercent,
            $flags, $items, $fees, $sprfApprovalMatrixId, $approvalConditionCode,
            $locationId, $departmentId, $sprfNumberGenerator, $request
        ) {
            $project = $existingProject ?: new SprfEntryProject();

            $documentDatetime = $existingProject?->document_datetime
                ? Carbon::parse($existingProject->document_datetime)
                : now();

            $sprfNo = $existingProject?->sprf_no
                ?: $sprfNumberGenerator->generateForCreatedAt($documentDatetime);

            $companyInfo = (array) data_get($payload, 'company_info', []);

            $project->fill([
                'sprf_no'           => $sprfNo,
                'document_datetime' => $documentDatetime,

                'status'                  => $existingProject && $existingProject->status === 'returned' ? 'returned' : 'draft',
                'current_level'           => 1,
                'approval_level'          => $flags['approval_level'],
                'sprf_approval_matrix_id' => $sprfApprovalMatrixId,
                'approval_condition_code' => $approvalConditionCode,
                'location_id'             => $locationId,
                'department_id'           => $departmentId,

                'prepared_by_user_id'                  => $existingProject?->prepared_by_user_id ?: Auth::id(),
                'director_customer_engagement_user_id' => data_get($approverUsers, 'directorCustomerEngagement.id'),
                'esd_director_user_id'                 => data_get($approverUsers, 'esdDirector.id'),
                'vp_ccto_user_id'                      => data_get($approverUsers, 'vpCcto.id'),
                'president_ceo_user_id'                => data_get($approverUsers, 'presidentCeo.id'),

                'sub_category'    => data_get($companyInfo, 'subCategory'),
                'account'         => data_get($companyInfo, 'account'),
                'account_manager' => data_get($companyInfo, 'accountManager'),
                'type'            => (int) data_get($companyInfo, 'type', $existingProject->type ?? 0),   // NEW
                'company_sap_code'=> data_get($companyInfo, 'companySapCode'),                            // NEW
                'company_id'      => (int) data_get($companyInfo, 'type', 0) === 1
                    ? $this->resolveCompanyIdFromSapCode(data_get($companyInfo, 'companySapCode'))
                    : $existingProject->company_id ?? null,     
               'remarks'              => data_get($payload, 'remarks'),
                'remarks_attachments'  => $this->resolveRemarksAttachments($payload, $existingProject),
                'rebate_justification' => data_get($payload, 'rebate_justification'),
             

                'revenue'             => $revenue,
                'cogs'                => $cogs,
                'other_expense_total' => $otherExpenseTotal,
                'total_expense'       => $totalExpense,
                'gp_value'            => $gpValue,
                'gp_percent'          => $gpPercent,

                'requires_vp_ccto'              => $flags['requires_vp_ccto'],
                'requires_president_ceo'        => $flags['requires_president_ceo'],
                'requires_rebate_justification' => $flags['requires_rebate_justification'],
            ]);

            $project->save();

            $project->items()->delete();
            $project->fees()->delete();

            if (! empty($items['parentRows'])) {
                $createdItems = $project->items()->createMany($items['parentRows']);

                foreach ($createdItems as $createdItem) {
                    $rowKey = $createdItem->row_key;
                    if (! empty($items['subitemsByRowKey'][$rowKey])) {
                        $createdItem->subitems()->createMany($items['subitemsByRowKey'][$rowKey]);
                    }
                }
            }

            if (! empty($fees)) {
                $project->fees()->createMany($fees);
            }

            return $project;
        });
        // Auto-create/link potential company for type = 0
        if ((int) data_get($companyInfo, 'type', 0) === 0) {
            $potentialId = $this->resolvePotentialCompanyId((string) data_get($companyInfo, 'account', ''));
            if ($potentialId) {
                $project->update(['company_id' => $potentialId]);
            }
        }

        SprfActivityLogger::log(
            activityType: $existingProject ? 'update_draft' : 'create_draft',
            sprf: $project,
            details: $existingProject ? 'SPRF draft updated' : 'SPRF draft created',
            oldValues: $oldValues,
            newValues: $project->fresh()->toArray()
        );

        return redirect()
            ->route('sprf.entry.projects.show', $project)
            ->with('success', 'SPRF draft saved.');
    }

    // ─── Submit ───────────────────────────────────────────────────────────────

    public function submit(Request $request, SprfEntryProject $project, SprfNumberGenerator $sprfNumberGenerator)
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            abort(403);
        }

        if (! in_array($project->status, ['draft', 'returned'], true)) {
            throw ValidationException::withMessages([
                'project' => 'Only draft SPRF projects can be submitted.',
            ]);
        }

        $oldValues = $project->toArray();

        $payload = $this->validatePayload($request);

        $companyInfo = (array) data_get($payload, 'company_info', []);
        $this->validateCompanyIntegrity($companyInfo);

        $revenue           = (float) data_get($payload, 'summary.revenue', $project->revenue);
        $cogs              = (float) data_get($payload, 'summary.cogs', $project->cogs);
        $otherExpenseTotal = (float) data_get($payload, 'summary.otherExpense', $project->other_expense_total);
        $totalExpense      = (float) data_get($payload, 'summary.totalExpense', $project->total_expense);
        $gpValue           = (float) data_get($payload, 'summary.gpValue', $project->gp_value);
        $gpPercent         = (float) data_get($payload, 'summary.totalGpPercent', $project->gp_percent);

        $items = $this->mapItemsPayload((array) data_get($payload, 'items', []));
        $fees  = $this->mapFeesPayload((array) data_get($payload, 'other_expenses', []));

        $hasRebate = $this->hasRebateValueFromMappedFees($fees);

        $approvalConditionCode = $this->resolveApprovalConditionCode(
            $payload, $revenue, $gpPercent, $hasRebate
        );

        // Strict — hard fail if no active matrix found for this location + department
        ['location_id' => $locationId, 'department_id' => $departmentId]
            = $this->resolvePreparerLocationAndDepartment();

        $matrix = $this->findActiveMatrixOrFail($locationId, $departmentId);
        $this->validateMatrixApprovers($matrix);

        $approverUsers        = $this->extractApproverUsers($matrix);
        $flags                = $this->resolveApprovalFlagsFromCondition($approvalConditionCode);
        $sprfApprovalMatrixId = $matrix->id;

        $rebateJustification = (string) data_get(
            $payload,
            'rebate_justification',
            $project->rebate_justification ?? ''
        );

        $currentProject = DB::transaction(function () use (
            $project, $payload, $approverUsers, $revenue, $cogs,
            $otherExpenseTotal, $totalExpense, $gpValue, $gpPercent,
            $flags, $items, $fees, $rebateJustification,
            $sprfApprovalMatrixId, $approvalConditionCode,
            $locationId, $departmentId, $sprfNumberGenerator
        ) {
            $companyInfo = (array) data_get($payload, 'company_info', []);

            $documentDatetime = $project->document_datetime
                ? Carbon::parse($project->document_datetime)
                : now();

            $sprfNo = $project->sprf_no
                ?: $sprfNumberGenerator->generateForCreatedAt($documentDatetime);

            $startLevel = $flags['requires_rebate_justification'] ? 2 : 3;

            $currentProject = SprfCurrentProject::create([
                'sprf_no'           => $sprfNo,
                'document_datetime' => $documentDatetime,

                'status'                  => 'for_review',
                'current_level'           => $startLevel,
                'approval_level'          => $flags['approval_level'],
                'sprf_approval_matrix_id' => $sprfApprovalMatrixId,
                'approval_condition_code' => $approvalConditionCode,
                'location_id'             => $locationId,
                'department_id'           => $departmentId,

                'submitted_at'             => now(),
                'current_approver_user_id' => $startLevel === 2
                    ? data_get($approverUsers, 'directorCustomerEngagement.id')
                    : data_get($approverUsers, 'esdDirector.id'),

                'prepared_by_user_id'                  => $project->prepared_by_user_id ?: Auth::id(),
                'director_customer_engagement_user_id' => data_get($approverUsers, 'directorCustomerEngagement.id'),
                'esd_director_user_id'                 => data_get($approverUsers, 'esdDirector.id'),
                'vp_ccto_user_id'                      => data_get($approverUsers, 'vpCcto.id'),
                'president_ceo_user_id'                => data_get($approverUsers, 'presidentCeo.id'),

                'sub_category'    => data_get($companyInfo, 'subCategory'),
                'account'         => data_get($companyInfo, 'account'),
                'account_manager' => data_get($companyInfo, 'accountManager'),

                 'type'            => (int) data_get($companyInfo, 'type', $project->type ?? 0),           // NEW
                'company_sap_code'=> data_get($companyInfo, 'companySapCode'),                             // NEW
                'company_id'      => (int) data_get($companyInfo, 'type', 0) === 1
                    ? $this->resolveCompanyIdFromSapCode(data_get($companyInfo, 'companySapCode'))
                    : null,       

                'remarks'              => data_get($payload, 'remarks', $project->remarks),
                'remarks_attachments'  => $this->resolveRemarksAttachments($payload, $project),
                'rebate_justification' => $rebateJustification,

                'notes'    => $project->notes    ?? [],
                'comments' => $project->comments ?? [],

                'revenue'             => $revenue,
                'cogs'                => $cogs,
                'other_expense_total' => $otherExpenseTotal,
                'total_expense'       => $totalExpense,
                'gp_value'            => $gpValue,
                'gp_percent'          => $gpPercent,

                'requires_vp_ccto'              => $flags['requires_vp_ccto'],
                'requires_president_ceo'        => $flags['requires_president_ceo'],
                'requires_rebate_justification' => $flags['requires_rebate_justification'],
            ]);

            // Auto-create/link potential company for type = 0
            if ((int) data_get($companyInfo, 'type', 0) === 0) {
                $potentialId = $this->resolvePotentialCompanyId((string) data_get($companyInfo, 'account', ''));
                if ($potentialId) {
                    $currentProject->update(['company_id' => $potentialId]);
                }
            }

            if (! empty($items['parentRows'])) {
                $createdItems = $currentProject->items()->createMany($items['parentRows']);

                foreach ($createdItems as $createdItem) {
                    $rowKey = $createdItem->row_key;
                    if (! empty($items['subitemsByRowKey'][$rowKey])) {
                        $createdItem->subitems()->createMany($items['subitemsByRowKey'][$rowKey]);
                    }
                }
            }

            if (! empty($fees)) {
                $currentProject->fees()->createMany($fees);
            }

            $project->items()->delete();
            $project->fees()->delete();
            $project->forceDelete();

            return $currentProject;
        });

        $this->workflowService->handleAutoAdvanceOnSubmit($currentProject->fresh());
        $this->workflowService->notifySubmit($currentProject->fresh());

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
                'message'                 => $e->getMessage(),
                'sprf_current_project_id' => $currentProject->id ?? null,
            ]);
        }

        return redirect()
            ->route('sprf.current')
            ->with('success', 'Draft successfully submitted.');
    }

    // ─── Destroy ─────────────────────────────────────────────────────────────

    public function destroy(SprfEntryProject $project)
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            abort(403);
        }

        if (! in_array($project->status, ['draft', 'Returned'], true)) {
            throw ValidationException::withMessages([
                'project' => 'Only draft SPRF projects can be deleted.',
            ]);
        }

        $project->load(['items', 'fees']);

        $oldValues = [
            'project' => $project->toArray(),
            'items'   => $project->items->map->toArray()->toArray(),
            'fees'    => $project->fees->map->toArray()->toArray(),
        ];

        $wasReturned = $project->status === 'Returned';

        DB::transaction(function () use ($project) {
            foreach ($this->normalizeAttachmentsArray($project->remarks_attachments) as $row) {
                $isLegacySingle = ! isset($row[0]) && isset($row['path']);
                $rowItems = $isLegacySingle ? [$row] : (array) $row;

                foreach ($rowItems as $attachment) {
                    if (! empty($attachment['path'])) {
                        \Illuminate\Support\Facades\Storage::disk('public')->delete($attachment['path']);
                    }
                }
            }

            $project->items()->delete();
            $project->fees()->delete();
            $project->forceDelete();
        });

        try {
            SprfActivityLogger::log(
                activityType: $wasReturned ? 'delete_returned_draft' : 'delete_draft',
                sprf: null,
                details: ($wasReturned ? 'Deleted returned SPRF draft #' : 'Deleted SPRF draft #')
                    . ($oldValues['project']['sprf_no'] ?? $project->id),
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

    // ─── Store Note ───────────────────────────────────────────────────────────

    public function storeNote(Request $request, SprfEntryProject $project): \Illuminate\Http\RedirectResponse
    {
        if ((int) $project->prepared_by_user_id !== (int) Auth::id()) {
            abort(403);
        }

        if ((int) $project->current_level !== 1) {
            abort(403, 'Notes can only be added while the project is at level 1.');
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $user = Auth::user();

        $newEntry = [
            'id'         => (string) \Illuminate\Support\Str::ulid(),
            'body'       => trim($validated['body']),
            'created_at' => now()->toIso8601String(),
            'author'     => [
                'id'   => $user->id,
                'name' => $user->name,
                'role' => $user->role ?? null,
            ],
        ];

        $notes   = is_array($project->notes) ? $project->notes : [];
        $notes[] = $newEntry;

        usort($notes, fn ($a, $b) =>
            (strtotime($b['created_at'] ?? '') ?: 0) <=> (strtotime($a['created_at'] ?? '') ?: 0)
        );

        $project->notes = array_values($notes);
        $project->save();

        return back()->with('success', 'Note added successfully.');
    }

    // ─── Payload Validation ───────────────────────────────────────────────────

    private function validatePayload(Request $request): array
    {
        // When the frontend sends a multipart FormData request (required for file
        // uploads), the structured payload arrives as a single JSON string under
        // 'payload' rather than as flat top-level fields. Merge it in first so
        // validation below can treat both request shapes identically.
        if ($request->has('payload') && is_string($request->input('payload'))) {
            $decoded = json_decode($request->input('payload'), true);

            if (is_array($decoded)) {
                $request->merge($decoded);
            }
        }

        return $request->validate([
            'project_id'              => ['nullable', 'integer', 'exists:sprf_entry_projects,id'],
            'approval_condition_code' => ['nullable', 'string', 'max:50'],

            'company_info'                => ['nullable', 'array'],
            'company_info.subCategory'    => ['nullable', 'string', 'max:255'],
            'company_info.account'        => ['nullable', 'string', 'max:255'],
            'company_info.accountManager' => ['nullable', 'string', 'max:255'],
            'company_info.type'           => ['nullable', 'integer', 'in:0,1'],          // NEW
            'company_info.companySapCode' => ['nullable', 'string', 'max:255'],         
            'remarks'              => ['nullable', 'string'],

            // Attachments are keyed by remark row index, each holding multiple files,
            // e.g. remarks_attachments[2][] => file, remarks_attachments[2][] => file
            'remarks_attachments'    => ['nullable', 'array'],
            'remarks_attachments.*'  => ['array'],
            'remarks_attachments.*.*' => ['file'],
            // "rowIndex:savedSubIndex" keys of previously-saved attachments the user removed on this save
            'remarks_attachments_remove'   => ['nullable', 'array'],
            'remarks_attachments_remove.*' => ['string', 'regex:/^\d+:\d+$/'],

            'rebate_justification'       => ['nullable', 'string'],

            'items'                              => ['nullable', 'array'],
            'items.*.rowKey'                     => ['nullable', 'string', 'max:255'],
            'items.*.subitems'                   => ['nullable', 'array'],
            'items.*.subitems.*.rowKey'          => ['nullable', 'string', 'max:255'],
            'items.*.subitems.*.productCode'     => ['nullable', 'string', 'max:255'],
            'items.*.subitems.*.itemDescription' => ['nullable', 'string'],
            'items.*.subitems.*.qty'             => ['nullable', 'integer', 'min:0'],
            'items.*.subitems.*.disty'           => ['nullable', 'string', 'max:255'],
            'items.*.subitems.*.costPerUnit'     => ['nullable', 'numeric'],
            'items.*.subitems.*.markupPercent'   => ['nullable', 'numeric'],

            'other_expenses'                   => ['nullable', 'array'],
            'other_expenses.*.expenseKey'      => ['nullable', 'string', 'max:255'],
            'other_expenses.*.isFixed'         => ['nullable', 'boolean'],
            'other_expenses.*.productCode'     => ['nullable', 'string', 'max:255'],
            'other_expenses.*.itemDescription' => ['nullable', 'string'],
            'other_expenses.*.qty'             => ['nullable', 'integer', 'min:0'],
            'other_expenses.*.unitPrice'       => ['nullable', 'numeric'],

            'summary'                => ['nullable', 'array'],
            'summary.revenue'        => ['nullable', 'numeric'],
            'summary.cogs'           => ['nullable', 'numeric'],
            'summary.otherExpense'   => ['nullable', 'numeric'],
            'summary.totalExpense'   => ['nullable', 'numeric'],
            'summary.gpValue'        => ['nullable', 'numeric'],
            'summary.totalGpPercent' => ['nullable', 'numeric'],
        ]);
    }

    // ─── Remarks Attachments ──────────────────────────────────────────────────

    /**
     * Merges newly-uploaded remark files with whatever was already saved,
     * keyed by remark row index so attachments stay aligned with their row.
     * Each row can hold multiple attachments.
     *
     * - $payload['remarks_attachments'][$index]  => array of newly uploaded UploadedFiles, appended to that row
     * - $payload['remarks_attachments_remove']   => "rowIndex:savedSubIndex" keys to delete (no replacement upload)
     */
    private function resolveRemarksAttachments(array $payload, ?SprfEntryProject $existingProject): array
    {
        $existing = $this->normalizeAttachmentsArray($existingProject?->remarks_attachments);

        // Normalize legacy single-attachment rows ({path,name}) into arrays before mutating
        foreach ($existing as $index => $row) {
            if (! isset($row[0]) && isset($row['path'])) {
                $existing[$index] = [$row];
            }
        }

        $removeKeys = collect((array) data_get($payload, 'remarks_attachments_remove', []))
            ->map(function ($key) {
                [$rowIndex, $subIndex] = array_pad(explode(':', (string) $key, 2), 2, null);
                return ['row' => (string) $rowIndex, 'sub' => (int) $subIndex];
            })
            ->groupBy('row');

        foreach ($removeKeys as $rowIndex => $entries) {
            if (! isset($existing[$rowIndex]) || ! is_array($existing[$rowIndex])) continue;

            $subIndexes = $entries->pluck('sub')->sort()->reverse()->values();

            foreach ($subIndexes as $subIndex) {
                if (isset($existing[$rowIndex][$subIndex]['path'])) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($existing[$rowIndex][$subIndex]['path']);
                }
                unset($existing[$rowIndex][$subIndex]);
            }

            $existing[$rowIndex] = array_values($existing[$rowIndex]);
            if (empty($existing[$rowIndex])) {
                unset($existing[$rowIndex]);
            }
        }

        $uploadedRows = (array) data_get($payload, 'remarks_attachments', []);

        foreach ($uploadedRows as $index => $files) {
            $index = (string) $index;
            $files = is_array($files) ? $files : [$files];

            foreach ($files as $file) {
                if (! $file instanceof \Illuminate\Http\UploadedFile) continue;

                $existing[$index][] = [
                    'path' => $file->store('sprf-remarks', 'public'),
                    'name' => $file->getClientOriginalName(),
                ];
            }
        }

        ksort($existing);

        return $existing;
    }


        /**
     * Validates the type/account/SAP-code integrity of a company_info payload.
     * Mirrors RoiProjectService's company validation exactly.
     */
    private function validateCompanyIntegrity(array $companyInfo): void
    {
        $type        = isset($companyInfo['type']) ? (int) $companyInfo['type'] : null;
        $companyName = trim($companyInfo['account'] ?? '');
        $sapCode     = $companyInfo['companySapCode'] ?? null;

        if ($type === null) {
            throw ValidationException::withMessages([
                'company_info.type' => 'Please select whether the account is Existing or Potential.',
            ]);
        }

        if ($companyName === '') {
            throw ValidationException::withMessages([
                'company_info.account' => 'Account (company name) is required.',
            ]);
        }

        if ($type === 1) {
            if (empty($sapCode)) {
                throw ValidationException::withMessages([
                    'company_info.account' =>
                        "\"{$companyName}\" was not selected from the list. Please search and select a valid existing company.",
                ]);
            }

            $existsByCode = Company::query()->where('sap_code', $sapCode)->exists();

            if (! $existsByCode) {
                throw ValidationException::withMessages([
                    'company_info.companySapCode' =>
                        'The selected company could not be verified. Please re-select a valid company.',
                ]);
            }
        }

        if ($type === 0 && ! empty($sapCode)) {
            throw ValidationException::withMessages([
                'company_info.companySapCode' =>
                    'A potential company should not have an SAP code. Please clear the selection and try again.',
            ]);
        }
    }

    /**
     * Resolves company_id from sap_code for an existing (type=1) company.
     */
    private function resolveCompanyIdFromSapCode(?string $sapCode): ?int
    {
        if (empty($sapCode)) {
            return null;
        }

        return Company::query()->where('sap_code', $sapCode)->value('id');
    }

    /**
     * firstOrCreate a PotentialCustomer for type=0 accounts and return its id.
     */
    private function resolvePotentialCompanyId(string $companyName): ?int
    {
        $companyName = trim($companyName);

        if ($companyName === '') {
            return null;
        }

        $potential = PotentialCustomer::firstOrCreate(
            ['company_name' => $companyName],
            [
                'id_client_mngr' => Auth::user()->employee_id ?? null,
                'status'         => 1,
                'address'        => '',
                'contact_no'     => '',
            ]
        );

        return $potential->id;
    }

    /**
     * Defensively normalizes the raw remarks_attachments column value to an
     * array, in case the model attribute isn't cast to 'array'.
     */
    private function normalizeAttachmentsArray($attachments): array
    {
        if (is_string($attachments)) {
            $attachments = json_decode($attachments, true);
        }

        return is_array($attachments) ? $attachments : [];
    }

    /**
     * Shapes a saved remarks_attachments map into the { index: [{name, url}, ...] }
     * structure the RemarksBlock frontend component expects. Each row can hold
     * multiple attachments; legacy rows stored as a single {path,name} object
     * are wrapped into a one-item array for backward compatibility.
     *
     * Accepts array|string|null because the underlying model attribute may not
     * be cast to 'array', in which case Eloquent returns the raw JSON string.
     */
    private function mapRemarksAttachmentsForFrontend($attachments): array
    {
        $attachments = $this->normalizeAttachmentsArray($attachments);

        if (! $attachments) return [];

        $mapToUrl = function ($attachment) {
            $path = data_get($attachment, 'path');

            return [
                'name' => data_get($attachment, 'name'),
                'url'  => $path ? asset('storage/' . ltrim($path, '/')) : null,
            ];
        };

        return collect($attachments)
            ->mapWithKeys(function ($row, $index) use ($mapToUrl) {
                // Legacy shape: a single {path,name} object instead of an array of them
                $isLegacySingle = ! isset($row[0]) && isset($row['path']);
                $rowItems = $isLegacySingle ? [$row] : (array) $row;

                return [
                    (string) $index => collect($rowItems)->map($mapToUrl)->values()->all(),
                ];
            })
            ->all();
    }

    // ─── Item / Fee Mapping ───────────────────────────────────────────────────

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
        $mapped = $this->itemCalc->mapPayload($items);

        $validRowKeys = collect($mapped['subitemsByRowKey'])
            ->filter(fn ($subitems) => collect($subitems)->contains(fn ($row) =>
                ! blank($row['product_code']) ||
                ! blank($row['item_description']) ||
                ! blank($row['disty']) ||
                $row['qty'] !== null ||
                $row['cost_per_unit'] !== null ||
                $row['markup_percent'] !== null
            ))
            ->keys();

        $mapped['parentRows'] = collect($mapped['parentRows'])
            ->filter(fn ($row) => $validRowKeys->contains($row['row_key']))
            ->values()
            ->all();

        $mapped['subitemsByRowKey'] = collect($mapped['subitemsByRowKey'])
            ->only($validRowKeys)
            ->all();

        return $mapped;
    }

    private function mapFeesPayload(array $fees): array
    {
        return collect($fees)
            ->map(function ($row) {
                $qty       = $this->toNullableFloat(data_get($row, 'qty'));
                $unitPrice = $this->toNullableFloat(data_get($row, 'unitPrice'));

                $total = $qty === null || $unitPrice === null ? null : $qty * $unitPrice;

                return [
                    'expense_key'      => data_get($row, 'expenseKey'),
                    'is_fixed'         => (bool) data_get($row, 'isFixed', false),
                    'product_code'     => data_get($row, 'productCode'),
                    'item_description' => data_get($row, 'itemDescription'),
                    'qty'              => $qty,
                    'unit_price'       => $unitPrice,
                    'total'            => $total,
                ];
            })
            ->filter(fn ($row) => ! (
                blank($row['expense_key']) &&
                blank($row['product_code']) &&
                blank($row['item_description']) &&
                $row['qty'] === null &&
                $row['unit_price'] === null
            ))
            ->values()
            ->all();
    }

    // ─── Rebate Detection ─────────────────────────────────────────────────────

    private const REBATE_VALUE_THRESHOLD = 0;

    private function hasRebateValueFromMappedFees(array $fees): bool
    {
        foreach ($fees as $row) {
            $expenseKey  = (string) data_get($row, 'expense_key', '');
            $productCode = trim((string) data_get($row, 'product_code', ''));
            $total       = (float) data_get($row, 'total', 0);

            if ($expenseKey === 'rebate' || strcasecmp($productCode, 'Rebate') === 0) {
                return $total > self::REBATE_VALUE_THRESHOLD;
            }
        }

        return false;
    }

    // ─── Condition Code Resolution ────────────────────────────────────────────

    private function resolveApprovalConditionCode(
        array $payload,
        float $revenue,
        float $gpPercent,
        bool $hasRebate
    ): string {
        $conditionCode = strtoupper(trim((string) data_get($payload, 'approval_condition_code', '')));

        $allowed = ['STANDARD_PRICING', 'VALUE_GT_1M', 'GP_GT_15', 'GP_LTE_15', 'REBATE_REQUEST'];

        if ($hasRebate) return 'REBATE_REQUEST';

        if (in_array($conditionCode, $allowed, true) && $conditionCode !== 'REBATE_REQUEST') {
            return $conditionCode;
        }

        if ($gpPercent < 16)      return 'GP_LTE_15';
        if ($revenue < 1000000)  return 'STANDARD_PRICING';

        return 'VALUE_GT_1M';
    }

    // ─── Matrix Resolution ────────────────────────────────────────────────────

    /**
     * Resolves the preparer's location and department from their user record.
     */
    private function resolvePreparerLocationAndDepartment(): array
    {
        $user = User::find(Auth::id());

        return [
            'location_id'   => $user?->primary_location_id,
            'department_id' => $user?->department_id,
        ];
    }

    /**
     * Lenient lookup — returns null if no active matrix exists.
     * Used during saveDraft so a missing matrix never blocks saving.
     */
    private function tryFindActiveMatrix(?int $locationId, ?int $departmentId): ?SprfApprovalMatrix
    {
        if (! $locationId || ! $departmentId) return null;

        return SprfApprovalMatrix::query()
            ->where('location_id', $locationId)
            ->where('department_id', $departmentId)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Strict lookup — throws if no active matrix is found.
     * Used during submit so a missing matrix hard-blocks submission.
     */
    private function findActiveMatrixOrFail(?int $locationId, ?int $departmentId): SprfApprovalMatrix
    {
        if (! $locationId || ! $departmentId) {
            throw ValidationException::withMessages([
                'approvers' => 'Your account is not assigned to a location and department. Please contact your administrator.',
            ]);
        }

        $matrix = SprfApprovalMatrix::query()
            ->where('location_id', $locationId)
            ->where('department_id', $departmentId)
            ->where('is_active', true)
            ->first();

        if (! $matrix) {
            throw ValidationException::withMessages([
                'approvers' => 'No active SPRF approver matrix found for your location and department.',
            ]);
        }

        return $matrix;
    }

    /**
     * Validates that all 4 approver slots on the matrix are filled with
     * valid, non-banned users. Called at submit time only.
     */
    private function validateMatrixApprovers(SprfApprovalMatrix $matrix): void
    {
        $missing = [];

        if (! $matrix->director_customer_engagement_user_id) $missing[] = 'Director - Customer Engagement';
        if (! $matrix->esd_director_user_id)                 $missing[] = 'ESD Director';
        if (! $matrix->vp_ccto_user_id)                      $missing[] = 'VP & CCTO';
        if (! $matrix->president_ceo_user_id)                $missing[] = 'President & CEO';

        if (! empty($missing)) {
            throw ValidationException::withMessages([
                'approvers' => 'SPRF approver matrix is missing: ' . implode(', ', $missing) . '.',
            ]);
        }
    }

    /**
     * Pulls the 4 approver user arrays directly from the flat matrix columns.
     */
    private function extractApproverUsers(SprfApprovalMatrix $matrix): array
    {
        return [
            'directorCustomerEngagement' => $this->findUserById($matrix->director_customer_engagement_user_id),
            'esdDirector'                => $this->findUserById($matrix->esd_director_user_id),
            'vpCcto'                     => $this->findUserById($matrix->vp_ccto_user_id),
            'presidentCeo'               => $this->findUserById($matrix->president_ceo_user_id),
        ];
    }

    // ─── Approval Flags ───────────────────────────────────────────────────────

    private function resolveApprovalFlagsFromCondition(string $conditionCode): array
    {
        return match ($conditionCode) {
            'STANDARD_PRICING',
            'GP_GT_15' => [
                'approval_level'                => 'ESD_ONLY',
                'requires_vp_ccto'              => false,
                'requires_president_ceo'        => false,
                'requires_rebate_justification' => false,
                'final_level'                   => 3,
            ],
            'VALUE_GT_1M' => [
                'approval_level'                => 'VP_AND_CCTO',
                'requires_vp_ccto'              => true,
                'requires_president_ceo'        => false,
                'requires_rebate_justification' => false,
                'final_level'                   => 4,
            ],
            'GP_LTE_15' => [
                'approval_level'                => 'PRESIDENT_AND_CEO',
                'requires_vp_ccto'              => true,
                'requires_president_ceo'        => true,
                'requires_rebate_justification' => false,
                'final_level'                   => 5,
            ],
            'REBATE_REQUEST' => [
                'approval_level'                => 'PRESIDENT_AND_CEO',
                'requires_vp_ccto'              => true,
                'requires_president_ceo'        => true,
                'requires_rebate_justification' => true,
                'final_level'                   => 5,
            ],
            default => throw ValidationException::withMessages([
                'approval_condition_code' => 'Invalid SPRF approval condition.',
            ]),
        };
    }

    // ─── User Helpers ─────────────────────────────────────────────────────────

    private function mapApproverUsersFromProject(SprfEntryProject $project): array
    {
        return [
            'directorCustomerEngagement' => $this->findUserById($project->director_customer_engagement_user_id),
            'esdDirector'                => $this->findUserById($project->esd_director_user_id),
            'vpCcto'                     => $this->findUserById($project->vp_ccto_user_id),
            'presidentCeo'               => $this->findUserById($project->president_ceo_user_id),
        ];
    }

    private function findUserById(?int $id): ?array
    {
        if (! $id) return null;

        $user = User::query()
            ->whereKey($id)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) return null;

        return [
            'id'       => $user->id,
            'name'     => $user->name,
            'position' => $user->position,
            'email'    => $user->email,
        ];
    }

    // ─── Frontend Transforms ──────────────────────────────────────────────────

    private function transformProjectForFrontend(SprfEntryProject $project): array
    {
        return [
            'id'             => $project->id,
            'sprf_no'        => $project->sprf_no,
            'status'         => $project->status,
            'current_level'  => $project->current_level,
            'approval_level' => $project->approval_level,

            'requires_vp_ccto'              => $project->requires_vp_ccto,
            'requires_president_ceo'        => $project->requires_president_ceo,
            'requires_rebate_justification' => $project->requires_rebate_justification,

            'sprf_approval_matrix_id' => $project->sprf_approval_matrix_id,
            'approval_condition_code' => $project->approval_condition_code,
            'location_id'             => $project->location_id,
            'department_id'           => $project->department_id,

            'last_saved_at' => optional($project->last_saved_at)?->toISOString(),
            'approved_at'   => optional($project->approved_at)?->toISOString(),
            'rejected_at'   => optional($project->rejected_at)?->toISOString(),
            'updated_at'    => optional($project->updated_at)?->toISOString(),

            'prepared_by_name'    => $project->preparer?->name,
            'prepared_by_user_id' => $project->prepared_by_user_id,
            'notes'               => $project->notes    ?? [],
            'comments'            => $project->comments ?? [],

            'company_info' => [
                'subCategory'        => $project->sub_category,
                'account'            => $project->account,
                'accountManager'     => $project->account_manager,
                'type'               => $project->type,
                'companySapCode'     => $project->company_sap_code,
                'potentialCompanyId' => (int) $project->type === 0 ? $project->company_id : null,
            ],

            'remarks'              => $project->remarks,
            'remarks_attachments'  => $this->normalizeAttachmentsArray($project->remarks_attachments),
            'attachments'          => $this->mapRemarksAttachmentsForFrontend($project->remarks_attachments),
            'rebate_justification' => $project->rebate_justification,

            'items' => $project->items
                ->map(function (SprfEntryItem $item) {
                    return [
                        'rowKey'                    => $item->row_key,
                        'totalCost'                 => $item->total_cost,
                        'sellingPricePerUnitVatInc' => $item->selling_price_per_unit_vat_inc,
                        'totalSellingPriceVatInc'   => $item->total_selling_price_vat_inc,
                        'markupValue'               => $item->markup_value,
                        'subitems' => $item->subitems
                            ->map(fn (SprfEntryItemSubitem $sub) => [
                                'rowKey'          => $sub->row_key,
                                'productCode'     => $sub->product_code,
                                'itemDescription' => $sub->item_description,
                                'qty'             => $sub->qty,
                                'disty'           => $sub->disty,
                                'costPerUnit'     => $sub->cost_per_unit,
                                'markupPercent'   => $sub->markup_percent,
                                'totalCost'       => $sub->total_cost,
                            ])
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all(),

            'other_expenses' => $project->fees
                ->map(fn (SprfEntryFee $fee) => [
                    'expenseKey'      => $fee->expense_key,
                    'isFixed'         => $fee->is_fixed,
                    'productCode'     => $fee->product_code,
                    'itemDescription' => $fee->item_description,
                    'qty'             => $fee->qty,
                    'unitPrice'       => $fee->unit_price,
                ])
                ->values()
                ->all(),
        ];
    }

    private function transformProjectForPrint(SprfEntryProject $project): array
    {
        return [
            'id'             => $project->id,
            'sprf_no'        => $project->sprf_no,
            'status'         => $project->status,
            'approval_level' => $project->approval_level,

            'sprf_approval_matrix_id' => $project->sprf_approval_matrix_id,
            'approval_condition_code' => $project->approval_condition_code,
            'location_id'             => $project->location_id,
            'department_id'           => $project->department_id,

            'remarks'              => $project->remarks,
            'remarks_attachments'  => $this->normalizeAttachmentsArray($project->remarks_attachments),
            'attachments'          => $this->mapRemarksAttachmentsForFrontend($project->remarks_attachments),
            'rebate_justification' => $project->rebate_justification,
            'notes'                => $project->notes    ?? [],
            'comments'             => $project->comments ?? [],

            'company_info' => [
                'subCategory'        => $project->sub_category,
                'account'            => $project->account,
                'accountManager'     => $project->account_manager,
                'type'               => $project->type,
                'companySapCode'     => $project->company_sap_code,
                'potentialCompanyId' => (int) $project->type === 0 ? $project->company_id : null,
            ],

            'items' => $project->items
                ->map(function (SprfEntryItem $item) {
                    return [
                        'rowKey'                    => $item->row_key,
                        'totalCost'                 => $item->total_cost,
                        'sellingPricePerUnitVatInc' => $item->selling_price_per_unit_vat_inc,
                        'totalSellingPriceVatInc'   => $item->total_selling_price_vat_inc,
                        'markupValue'               => $item->markup_value,
                        'subitems' => $item->subitems
                            ->map(fn (SprfEntryItemSubitem $sub) => [
                                'rowKey'          => $sub->row_key,
                                'productCode'     => $sub->product_code,
                                'itemDescription' => $sub->item_description,
                                'qty'             => $sub->qty,
                                'disty'           => $sub->disty,
                                'costPerUnit'     => $sub->cost_per_unit,
                                'markupPercent'   => $sub->markup_percent,
                                'totalCost'       => $sub->total_cost,
                            ])
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all(),

            'other_expenses' => $project->fees
                ->map(fn (SprfEntryFee $fee) => [
                    'expenseKey'      => $fee->expense_key,
                    'isFixed'         => $fee->is_fixed,
                    'productCode'     => $fee->product_code,
                    'itemDescription' => $fee->item_description,
                    'qty'             => $fee->qty,
                    'unitPrice'       => $fee->unit_price,
                ])
                ->values()
                ->all(),

            'approver_users' => $this->mapApproverUsersFromProject($project),
            'preparer' => [
                'id'       => $project->preparer?->id,
                'name'     => $project->preparer?->name,
                'position' => $project->preparer?->position,
                'email'    => $project->preparer?->email,
            ],
        ];
    }
}