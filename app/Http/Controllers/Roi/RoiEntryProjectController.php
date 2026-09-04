<?php

namespace App\Http\Controllers\Roi;

use App\Models\LocationDepartment;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryProject;
use App\Http\Requests\Roi\Entry\StoreRoiDraftRequest;
use App\Services\Roi\Current\RoiCurrentWorkflowService;
use App\Services\Roi\Entry\RoiProjectService;
use App\Services\RoiActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Concerns\StreamsEntryRemarkAttachments;
use App\Http\Controllers\Controller;
use App\Http\Requests\Roi\Entry\StoreRoiGroupDraftRequest;
use App\Services\Roi\Current\RoiMultiEntryWorkflowService;
use App\Services\Roi\Entry\RoiMultiEntryService;
use Illuminate\Support\Facades\Log;

class RoiEntryProjectController extends Controller
{
    use StreamsEntryRemarkAttachments;

    protected RoiProjectService $roiService;
    protected RoiCurrentWorkflowService $workflowService;
    protected RoiMultiEntryService $multiEntryService;
    protected RoiMultiEntryWorkflowService $multiEntryWorkflowService;

    public function __construct(
        RoiProjectService $roiService,
        RoiCurrentWorkflowService $workflowService,
        RoiMultiEntryService $multiEntryService,
        RoiMultiEntryWorkflowService $multiEntryWorkflowService
    ) {
        $this->roiService = $roiService;
        $this->workflowService = $workflowService;
        $this->multiEntryService = $multiEntryService;
        $this->multiEntryWorkflowService = $multiEntryWorkflowService;
    }

    public function getCompanySuggestions(Request $request)
    {
        $search = strtolower(trim($request->query('search')));

        if (!$search || strlen($search) < 1) {
            return response()->json([]);
        }

        $employeeId = Auth::user()->employee_id;
        
        if (!$employeeId) {
            return response()->json([]);
        }

        $cacheKey = 'company_search_' . $employeeId . '_' . $search;

        $suggestions = Cache::remember($cacheKey, now()->addDay(), function () use ($search, $employeeId) {
            return DB::table('erms.tbl_company')
                ->where('status', 1)
                ->where('company_name', 'LIKE', $search . '%')
                ->whereNotNull('sap_code')
                ->where('id_client_mngr', $employeeId) // only companies managed by this user
                ->select('company_name', 'sap_code as company_sap_code')
                ->limit(20)
                ->get();
        });

        return response()->json($suggestions);
    }

    public function getPotentialSuggestions(Request $request)
    {
        $search = strtolower(trim($request->query('search')));

        if (!$search || strlen($search) < 1) {
            return response()->json([]);
        }

          $employeeId = Auth::user()->employee_id;
        
        if (!$employeeId) {
            return response()->json([]);
        }


        $suggestions = \App\Models\CustomerInfo\PotentialCustomer::query()
            ->where('status', 1)
            ->whereRaw('LOWER(company_name) LIKE ?', [$search . '%'])
             ->where('id_client_mngr', $employeeId) // only companies managed by this user
             
            ->select('id', 'company_name')
            ->limit(20)
            ->get();

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

    public function show(RoiEntryProject $project, Request $request)
    {
        abort_unless($project->user_id === Auth::id(), 403);

        $search = $request->query('company_search');
        $companySuggestions = [];

        if ($search && strlen($search) >= 2) {
            $companySuggestions = DB::table('erms.tbl_company')
                ->where('company_name', 'LIKE', "{$search}%")
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

    public function showGroup(string $reference, Request $request)
    {
        $user = Auth::user();

        $projects = RoiEntryProject::where('user_id', $user->id)
            ->where('reference', $reference)
            ->orderBy('sequence')
            ->get();

        abort_if($projects->isEmpty(), 404);

        $projects->load([
            'items' => fn ($q) => $q->orderBy('id'),
            'fees'  => fn ($q) => $q->orderBy('id'),
            'user',
        ]);

        // Master row (sequence <= 1) owns shared company fields + workflow state,
        // per the existing multi-entry field-scoping decision. Since $projects is
        // already ordered by sequence ascending, $projects->first() IS the master.
        $master = $projects->first();

        // Whichever entry is active client-side (?entry=) needs to be the
        // singular "project"/"entryProject" AddComments/AddNotes/Names read from
        // usePage().props — its own id/notes/comments, but master's workflow
        // columns, since those only live on master. Sending master alone (as
        // before) meant every note/comment silently targeted the master row
        // regardless of which entry was active.
        $activeIndex = max(0, (int) $request->query('entry', 0));
        $activeEntry = $projects->get($activeIndex) ?? $master;

        foreach ($projects as $project) {
            $project->notes = $this->sortTimelineEntries($project->notes);
            $project->comments = $this->sortTimelineEntries($project->comments);
        }

        $workflowFields = [
            'user_id', 'status', 'current_level', 'status_updated_by',
            'reviewed_by', 'checked_by', 'endorsed_by', 'confirmed_by', 'approved_by',
            'rejected_by', 'rejected_by_level',
            'submitted_at', 'reviewed_at', 'checked_at', 'endorsed_at', 'confirmed_at',
            'approved_at', 'rejected_at', 'cancelled_at',
        ];
        $entryProject = clone $activeEntry;
        $entryProject->setRawAttributes(
            array_merge(
                $activeEntry->getAttributes(),
                array_intersect_key($master->getAttributes(), array_flip($workflowFields))
            ),
            true
        );

        $search = $request->query('company_search');
        $companySuggestions = [];

        if ($search && strlen($search) >= 2) {
            $companySuggestions = DB::table('erms.tbl_company')
                ->where('company_name', 'LIKE', "{$search}%")
                ->select('company_name', 'sap_code as company_sap_code')
                ->limit(10)
                ->get();
        }

        $userIds = collect([
            $master->user_id,
            $master->reviewed_by,
            $master->checked_by,
            $master->endorsed_by,
            $master->confirmed_by,
            $master->approved_by,
            $master->rejected_by,
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

        // Catalogs are identical for every entry in the group — build once,
        // not per row.
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

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/GroupEntry', [
            'reference' => $reference,
            'entryProjects' => $projects,
            'project' => $entryProject,
            'entryProject' => $entryProject,
            'activeEntryIndex' => $activeIndex,
            'createdBy' => $master->user->name,
            'machineCatalog' => $machineCatalog,
            'consumableCatalog' => $consumableCatalog,
            'companySuggestions' => $companySuggestions,
            'usersById' => $usersById,
            'projectNotes' => $activeEntry->notes ?? [],
            'projectComments' => $activeEntry->comments ?? [],
        ]);
    }

    public function saveDraft(StoreRoiDraftRequest $request)
    {
        
        $project = $this->roiService->handleSaveDraft($request->validated(), Auth::user(), $request);

        return redirect()->route('roi.entry.projects.show', $project);
    }

    public function saveGroupDraft(StoreRoiGroupDraftRequest $request)
    {
        $rows = $this->multiEntryService->handleSaveGroupDraft($request->validated(), Auth::user(), $request);

        $master = $rows->first(fn ($r) => (int) $r->sequence <= 1) ?? $rows->first();

        return redirect()->route('roi.entry.group.show', $master->reference);
    }

    public function submit(StoreRoiDraftRequest $request, RoiEntryProject $project)
    {
        abort_unless($project->user_id === Auth::id(), 403);

        if ($this->requestHasRoiDraftPayload($request)) {
            $this->roiService->persistDraftData($request, $project, $request->validated());
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
                  
        // Auto-save potential company name on submit if not an existing company
        if (empty($project->company_sap_code)) {
            $companyName = trim($project->company_name ?? '');

            if ($companyName !== '') {
                \App\Models\CustomerInfo\PotentialCustomer::firstOrCreate(
                    ['company_name' => $companyName],
                    [
                        'id_client_mngr' => $submitter->employee_id,
                        'status' => 1,
                        'address' => '',
                        'contact_no' => '',
                    ]
                );
            }
        }

        // The service will evaluate the SAP code and populate the type automatically
        $newProject = $this->roiService->handleSubmitProject($project, $submitter, $matrix, $oldValues);
            
        $this->workflowService->handleAutoAdvanceOnSubmit($newProject);
        $this->workflowService->notifySubmit($newProject);

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

    public function submitGroup(Request $request, string $reference)
    {
        $user = Auth::user();

        // Merge (if dirty) + submit as one atomic unit — if submission fails for
        // any reason, the merge rolls back with it rather than leaving a
        // committed draft edit behind a failed submit.
        $result = DB::transaction(function () use ($request, $reference, $user) {
            if ($this->requestHasRoiGroupDraftPayload($request)) {
                $groupRequest = StoreRoiGroupDraftRequest::createFrom($request);
                $groupRequest->setContainer(app());
                $groupRequest->setRedirector(app('redirect'));
                $groupRequest->validateResolved();

                $data = $groupRequest->validated();
                $data['companyInfo']['reference'] = $reference;
                $this->multiEntryService->handleSaveGroupDraft($data, $user, $request);
            }

            $projects = RoiEntryProject::where('user_id', $user->id)
                ->where('reference', $reference)
                ->orderBy('sequence')
                ->get();

            abort_if($projects->isEmpty(), 403);

            if ($projects->contains(fn ($p) => empty($p->company_name) || empty($p->contract_type))) {
                return back()->with('error', 'Please complete Company Name and Contract Type on every entry before submitting.');
            }

            if (!$user?->primary_location_id || !$user?->department_id) {
                return back()->with('error', 'Your account must have both a primary location and department before submitting.');
            }

            $matrix = LocationDepartment::query()
                ->where('location_id', $user->primary_location_id)
                ->where('department_id', $user->department_id)
                ->first();

            if (!$matrix) {
                return back()->with('error', 'No approver matrix found for your location and department.');
            }

            $newRows = $this->multiEntryService->handleSubmitMultiEntryProject($reference, $user, $user, $matrix);
            $master = $newRows->first(fn ($p) => (int) $p->sequence <= 1) ?? $newRows->first();

            $this->multiEntryWorkflowService->handleAutoAdvanceOnSubmit($master);

            return $master;
        });

        // Any of the validation branches above returns a RedirectResponse directly —
        // only a successful submit returns the master RoiCurrentProject.
        if (!$result instanceof RoiCurrentProject) {
            return $result;
        }

        $this->workflowService->notifySubmit($result);

        return redirect()->route('roi.entry.list')->with('success', 'Draft group successfully submitted.');
    }

    private function requestHasRoiGroupDraftPayload(Request $request): bool
    {
        return $request->hasAny(['companyInfo', 'entries']);
    }

    public function destroy(RoiEntryProject $project)
    {
        abort_unless($project->user_id === Auth::id(), 403);

        $allowedStatuses = ['draft', 'returned', 'withdrawn', 'duplicate'];
        if (!in_array($project->status, $allowedStatuses, true)) {
            return back()->with('error', 'Only drafts or returned projects can be deleted.');
        }

        $project->load(['items', 'fees']);

        $oldValues = [
            'project' => $project->toArray(),
            'items' => $project->items->map->toArray()->toArray(),
            'fees' => $project->fees->map->toArray()->toArray(),
        ];

        DB::transaction(function () use ($project) {
            \App\Models\RoiEntryItem::where('roi_entry_project_id', $project->id)->delete();
            \App\Models\RoiEntryFee::where('roi_entry_project_id', $project->id)->delete();
            $project->delete();
        });

        try {
            RoiActivityLogger::log(
                activityType: 'delete',
                moduleType: 'ROI Entry',
                details: 'Deleted ROI draft #' . ($oldValues['project']['reference'] ?? ''),
                subject: null,
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
            'version'       => $project->version + 1,
        ]);

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


        if (!$project) {
            return response()->json(['message' => 'This project has been archived and no longer accepts comments.'], 403);
        }


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
            'version'       => $project->version + 1,
        ]);

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

        // Sibling rows carry no workflow state — status/ownership are always
        // determined by the group's master row (sequence <= 1), same fix as
        // canCommentOnCurrentProject().
        $master = $project->sequence <= 1
            ? $project
            : RoiEntryProject::where('reference', $project->reference)
                ->where('sequence', '<=', 1)
                ->first();

        if (!$master) return false;
        if (!in_array($master->status, ['draft', 'returned', 'withdrawn'], true)) return false;

        $userId = (int) $user->id;
        if ((int) $master->user_id === $userId) return true;

        $currentProject = RoiCurrentProject::where('project_uid', $master->project_uid)->first();
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

        // Sibling rows carry no workflow state — permission is always determined by the group's master row.
        $master = $project->sequence <= 1
            ? $project
            : RoiCurrentProject::where('reference', $project->reference)
                ->where('sequence', '<=', 1)
                ->first();

        if (!$master) return false;

        $level = (int) $master->current_level;

        if ((int) ($master->confirmed_by ?? 0) === $userId && $level === 5) return true;
        if ((int) ($master->approved_by  ?? 0) === $userId && $level === 6) return true;

        return false;
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
}