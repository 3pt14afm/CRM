<?php

namespace App\Http\Controllers\Roi;

use App\Models\LocationDepartment;
use App\Models\RoiCurrentProject;
use App\Models\RoiEntryProject;
use App\Http\Requests\Roi\Entry\StoreRoiDraftRequest;
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
use Illuminate\Support\Facades\Log;

class RoiEntryProjectController extends Controller
{
    use StreamsEntryRemarkAttachments;

    protected RoiProjectService $roiService;

    public function __construct(RoiProjectService $roiService)
    {
        $this->roiService = $roiService;
    }

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
                ->select('company_name', 'sap_code as company_sap_code')
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

    public function saveDraft(StoreRoiDraftRequest $request)
    {
        $project = $this->roiService->handleSaveDraft($request->validated(), Auth::user(), $request);

        return redirect()->route('roi.entry.projects.show', $project);
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

        $newProject = $this->roiService->handleSubmitProject($project, $submitter, $matrix, $oldValues);

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

    public function storeComment(Request $request, RoiCurrentProject $project, $id)
    {
        $project = RoiCurrentProject::find($id);

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
        if (!in_array($project->status, ['draft', 'returned'], true)) return false;

        $userId = (int) $user->id;
        if ((int) $project->user_id === $userId) return true;

        $currentProject = RoiCurrentProject::where('project_uid', $project->project_uid)->first();
        if (!$currentProject) return false;

        return (int) $currentProject->reviewed_by === $userId
            || (int) $currentProject->checked_by === $userId
            || (int) $currentProject->endorsed_by === $userId;
    }

    // private function canCommentOnCurrentProject(RoiCurrentProject $project): bool
    // {
    //     $user = Auth::user();
    //     if (!$user) return false;

    //     $userId = (int) $user->id;

    //     return (int) $project->confirmed_by === $userId
    //         || (int) $project->approved_by === $userId;
    // }

    private function canCommentOnCurrentProject(RoiCurrentProject $project): bool
    {
        $user = Auth::user();
        if (!$user) return false;

        $userId = (int) $user->id;
        $level  = (int) $project->current_level;

        if ((int) ($project->confirmed_by ?? 0) === $userId && $level === 5) return true;
        if ((int) ($project->approved_by  ?? 0) === $userId && $level === 6) return true;

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