<?php

namespace App\Http\Controllers\Roi;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\RoiArchiveProject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Models\RoiEntryProject;
use App\Models\RoiEntryItem;
use App\Models\RoiEntryFee;
use App\Models\RoiCurrentProject;
use App\Services\RoiActivityLogger;
use Illuminate\Support\Str;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;

class RoiArchiveController extends Controller
{
    /**
     * Display a listing of the archived projects.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $perPage = $request->integer('per_page', 10);
        $userId = (int) ($user->id ?? 0);
        $isAdmin = $userId === 1;

        // Build the query using Eloquent
        $query = RoiArchiveProject::query()
            ->with(['user', 'proposals'])
            ->leftJoin('users as creator_user', 'roi_archive_projects.user_id', '=', 'creator_user.id')
            ->leftJoin('users as approved_user', 'roi_archive_projects.approved_by', '=', 'approved_user.id')
            ->leftJoin('users as rejected_user', 'roi_archive_projects.rejected_by', '=', 'rejected_user.id')
            ->selectRaw("
                roi_archive_projects.*,
                TRIM(CONCAT(COALESCE(creator_user.first_name, ''), ' ', COALESCE(creator_user.last_name, ''))) as prepared_by_name,
                TRIM(CONCAT(COALESCE(approved_user.first_name, ''), ' ', COALESCE(approved_user.last_name, ''))) as approved_by_name,
                TRIM(CONCAT(COALESCE(rejected_user.first_name, ''), ' ', COALESCE(rejected_user.last_name, ''))) as rejected_by_name,
                COALESCE(roi_archive_projects.rejected_at, roi_archive_projects.approved_at, roi_archive_projects.cancelled_at) as decided_at
            ");

        // Apply Filters
        if ($request->filled('status')) {
            $query->where('roi_archive_projects.status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('roi_archive_projects.type', $request->integer('type'));
        }

        if ($request->filled('location_id')) {
            $query->where('roi_archive_projects.location_id', (int) $request->location_id);
        }

        if ($request->filled('date_from')) {
            $query->whereRaw("COALESCE(rejected_at, approved_at, cancelled_at, last_saved_at) >= ?", [$request->date_from . ' 00:00:00']);
        }

        if ($request->filled('date_to')) {
            $query->whereRaw("COALESCE(rejected_at, approved_at, cancelled_at, last_saved_at) <= ?", [$request->date_to . ' 23:59:59']);
        }

        if ($request->filled('decided_by')) {
            $decidedBy = $request->decided_by;
            $query->whereRaw("
                CASE 
                    WHEN LOWER(roi_archive_projects.status) = 'rejected' 
                    THEN TRIM(CONCAT(COALESCE(rejected_user.first_name, ''), ' ', COALESCE(rejected_user.last_name, '')))
                    ELSE TRIM(CONCAT(COALESCE(approved_user.first_name, ''), ' ', COALESCE(approved_user.last_name, '')))
                END LIKE ?", ["%{$decidedBy}%"]);
        }

        // General Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%")
                  ->orWhere('company_sap_code', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($u) use ($search) {
                      $u->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('prepared_by')) {
            $preparedBy = $request->prepared_by;
            $query->whereHas('user', function ($q) use ($preparedBy) {
                $q->where('first_name', 'like', "%{$preparedBy}%")
                  ->orWhere('last_name', 'like', "%{$preparedBy}%")
                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$preparedBy}%"]);
            });
        }

        // Sorting and Pagination
        $sortOrder = in_array($request->sort_order, ['asc', 'desc']) ? $request->sort_order : null;

        $allowedSorts = [
            'decided_at'       => "COALESCE(roi_archive_projects.rejected_at, roi_archive_projects.approved_at, roi_archive_projects.cancelled_at, roi_archive_projects.last_saved_at)",
            'prepared_by_name' => "TRIM(CONCAT(COALESCE(creator_user.first_name, ''), ' ', COALESCE(creator_user.last_name, '')))",
            'reference'        => 'roi_archive_projects.reference',
            'company_sap_code' => 'roi_archive_projects.company_sap_code',
            'company_name'     => 'roi_archive_projects.company_name',
            'contract_years'   => 'roi_archive_projects.contract_years',
            'contract_type'    => 'roi_archive_projects.contract_type',
            'type'             => 'roi_archive_projects.type',
            'status' => "
                CASE LOWER(roi_archive_projects.status)
                    WHEN 'rejected'  THEN TRIM(CONCAT(COALESCE(rejected_user.first_name, ''), ' ', COALESCE(rejected_user.last_name, '')))
                    WHEN 'cancelled' THEN TRIM(CONCAT(COALESCE(creator_user.first_name,  ''), ' ', COALESCE(creator_user.last_name,  '')))
                    ELSE                  TRIM(CONCAT(COALESCE(approved_user.first_name, ''), ' ', COALESCE(approved_user.last_name, '')))
                END
            ",
        ];

        $sortByKey = $request->input('sort_by', 'decided_at');
        $sortCol   = $allowedSorts[$sortByKey] ?? $allowedSorts['decided_at'];

        $archiveProjects = $query
            ->when(
                $sortOrder,
                fn($q) => $q->orderByRaw("{$sortCol} {$sortOrder}"),
                fn($q) => $q->orderByRaw("CASE WHEN roi_archive_projects.user_id = ? THEN 0 ELSE 1 END ASC, COALESCE(roi_archive_projects.rejected_at, roi_archive_projects.approved_at, roi_archive_projects.cancelled_at, roi_archive_projects.last_saved_at) DESC", [$userId])
            )
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($p) use ($userId) {
                $status = strtolower((string) ($p->status ?? ''));
                $p->has_proposal = $p->proposals->isNotEmpty();
                $p->decided_by_name = match ($status) {
                    'rejected'  => $p->rejected_by_name ?: '—',
                    'cancelled' => $p->prepared_by_name ?: '—',
                    default     => $p->approved_by_name ?: '—',
                };

                $p->decided_at_display = match ($status) {
                    'rejected'  => $p->rejected_at,
                    'cancelled' => $p->cancelled_at,
                    default     => $p->approved_at,
                };

                $p->is_owner = (int) $p->user_id === $userId;

                // Was this user assigned at ANY workflow level (2-6) on this specific project?
                $p->is_approver = in_array($userId, array_filter([
                    (int) ($p->reviewed_by  ?? 0),
                    (int) ($p->checked_by   ?? 0),
                    (int) ($p->endorsed_by  ?? 0),
                    (int) ($p->confirmed_by ?? 0),
                    (int) ($p->approved_by  ?? 0),
                ]), true);

                return $p;
            });

        if ($request->wantsJson()) {
            return response()->json([
                'archiveProjects' => $archiveProjects,
                'isAdmin' => $isAdmin,
            ]);
        }

        return Inertia::render('CustomerManagement/ProjectROIApproval/ArchiveRoutes/Archive', [
            'filters' => $request->only(['search', 'status', 'type', 'date_from', 'date_to', 'decided_by', 'prepared_by', 'location_id', 'per_page', 'sort_by', 'sort_order']),
            'archiveProjects' => $archiveProjects,
            'locations' => Location::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'isAdmin' => $isAdmin,
            'stats' => [
                'totalArchiveProjects' => RoiArchiveProject::count(),
                'recentlyArchivedToday' => RoiArchiveProject::whereDate('approved_at', now()->toDateString())
                                            ->orWhereDate('rejected_at', now()->toDateString())->count() . ' Today',
            ],
        ]);
    }

    /**
     * Display the specified archived project.
     */
    public function show($id)
    {
        $project = RoiArchiveProject::with([
            'items',
            'fees',
            'user:id,first_name,last_name,position,employee_id',
            'reviewedByUser:id,first_name,last_name,position,employee_id',
            'checkedByUser:id,first_name,last_name,position,employee_id',
            'endorsedByUser:id,first_name,last_name,position,employee_id',
            'confirmedByUser:id,first_name,last_name,position,employee_id',
            'approvedByUser:id,first_name,last_name,position,employee_id',
            'rejectedByUser:id,first_name,last_name,position,employee_id',
            'cancelledByUser:id,first_name,last_name,position,employee_id',
        ])->findOrFail($id);

        $this->ensureCanViewArchive($project);

        $userIds = collect([
            $project->user_id,
            $project->approved_by,
            $project->rejected_by,
            $project->reviewed_by,
            $project->checked_by,
            $project->endorsed_by,
            $project->confirmed_by,
        ])->filter()->unique()->values();

        $usersById = User::query()
            ->whereIn('id', $userIds)
            ->get(['id', 'first_name', 'last_name', 'position'])
            ->mapWithKeys(fn ($u) => [
                (string) $u->id => [
                    'id'       => $u->id,
                    'name'     => trim($u->first_name . ' ' . $u->last_name),
                    'position' => $u->position,
                ],
            ]);

        // Same logic as RoiCurrentProjectController — uses employee_id, storage disk
        $signatureFor = function ($userRelation) {
            if (!$userRelation || !$userRelation->employee_id) return null;
            $employeeId = $userRelation->employee_id;

            foreach (['png', 'jpg', 'jpeg', 'webp'] as $ext) {
                $path = 'signatures/' . $employeeId . '.' . $ext;

                // Check if the file physically exists on the storage disk
                if (Storage::disk('public')->exists($path)) {
                    // Generate the direct public URL using the asset helper
                    return asset('storage/' . $path) . '?v=' . filemtime(storage_path('app/public/' . $path));
                }
            }

            return null;
        };

        $signatures = [
            'preparer'     => $signatureFor($project->user),
            'reviewed_by'  => $signatureFor($project->reviewedByUser),
            'checked_by'   => $signatureFor($project->checkedByUser),
            'endorsed_by'  => $signatureFor($project->endorsedByUser),
            'confirmed_by' => $signatureFor($project->confirmedByUser),
            'approved_by'  => $signatureFor($project->approvedByUser),
        ];

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
            'project'           => $project,
            'entryProject'      => $project,
            'readOnly'          => true,
            'route'             => 'archive',
            'createdBy'         => $project->user?->name ?? '—',
            'role'              => Auth::user()->workflow_role,
            'usersById'         => $usersById,
            'signatures'        => $signatures,
            'machineCatalog'    => $this->buildMachineCatalog(),
            'consumableCatalog' => $this->buildConsumableCatalog(),
        ]);
    }

    /**
     * Stream the requested archive file attachment.
     * Everyone authenticated can view.
     */
    public function showArchiveAttachment($id, int $attachmentIndex)
    {
        // 1. Ensure the user is logged in
        abort_unless(Auth::check(), 403, 'You must be logged in to view attachments.');

        // 2. Fetch the project
        $project = RoiArchiveProject::findOrFail($id);

        // 3. Get the attachments list
        $attachments = is_array($project->entry_remarks_attachments)
            ? array_values($project->entry_remarks_attachments)
            : [];

        // 4. Validate existence
        abort_unless(array_key_exists($attachmentIndex, $attachments), 404, 'Attachment index not found.');
        $attachment = $attachments[$attachmentIndex];

        abort_unless(!empty($attachment['path']), 404, 'Attachment path is empty.');
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404, 'File not found on server.');

        // 5. Return the file
        return response()->file(Storage::disk('local')->path($attachment['path']));
    }

    /**
     * "Withdraw" an archived project — copies it (and its items/fees) into
     * roi_entry_projects as a new draft with status "duplicate", with a
     * freshly generated project_uid + sequential reference (same rules as
     * a brand-new draft).
     */
    public function withdraw(Request $request, $id)
    {
         /** @var \App\Models\RoiArchiveProject $archived */
        $archived = RoiArchiveProject::with(['items', 'fees'])->findOrFail($id);

        $this->ensureCanWithdrawArchive($archived);

        $actor = Auth::user();

        if (!$actor->primary_location_id) {
            abort(422, 'Your account has no primary location.');
        }
        $location = Location::find($actor->primary_location_id);
        if (!$location || empty($location->code)) {
            abort(422, 'Primary location has no code.');
        }
        $prefix = strtoupper(trim($location->code));

        $oldValues = [
            'status'             => $archived->status,
            'archive_project_id' => $archived->id,
        ];

        $entryProject = DB::transaction(function () use ($archived, $actor, $prefix) {
            $projectData = $archived->only([
                'user_id',
                'location_id',
                'version',
                'last_saved_at',
                'type',
                'company_id',
                'company_name',
                'company_sap_code',
                'contract_years',
                'contract_type',
                'purpose',
                'bundled_std_ink',
                'annual_interest',
                'percent_margin',
                'mono_yield_monthly',
                'mono_yield_annual',
                'color_yield_monthly',
                'color_yield_annual',
                'mc_unit_cost',
                'mc_qty',
                'mc_total_cost',
                'mc_yields',
                'mc_cost_cpp',
                'mc_selling_price',
                'mc_total_sell',
                'mc_sell_cpp',
                'mc_total_bundled_price',
                'fees_total',
                'grand_total_cost',
                'grand_total_revenue',
                'grand_roi',
                'grand_roi_percentage',
                'yearly_breakdown',
                'entry_remarks',
                'entry_remarks_attachments',
                'notes',
                'comments',
            ]);

            $projectData['status']        = 'duplicate';
            $projectData['version']       = 1;
            $projectData['last_saved_at'] = now();

            $entryProject = $this->createEntryWithUniqueReference($projectData, $prefix);

            // Bulk insert items
            $itemRows = $archived->items->map(function ($item) use ($entryProject) {
                $data = $item->toArray();
                unset($data['id'], $data['roi_archive_project_id'], $data['created_at'], $data['updated_at']);
                $data['roi_entry_project_id'] = $entryProject->id;
                $data['created_at'] = now();
                $data['updated_at'] = now();
                return $data;
            })->all();
            if (!empty($itemRows)) {
                RoiEntryItem::insert($itemRows);
            }

            // Bulk insert fees
            $feeRows = $archived->fees->map(function ($fee) use ($entryProject) {
                $data = $fee->toArray();
                unset($data['id'], $data['roi_archive_project_id'], $data['created_at'], $data['updated_at']);
                $data['roi_entry_project_id'] = $entryProject->id;
                $data['created_at'] = now();
                $data['updated_at'] = now();
                return $data;
            })->all();
            if (!empty($feeRows)) {
                RoiEntryFee::insert($feeRows);
            }

            return $entryProject;
        });

        $this->logArchiveWithdraw($archived, $actor, $oldValues, $entryProject);

        if ($request->wantsJson()) {
            return response()->json([
                'message'        => 'Project withdrawn to draft.',
                'entryProjectId' => $entryProject->id,
            ]);
        }

        return redirect()
            ->route('roi.entry.list')
            ->with('success', 'Project withdrawn back to draft as a duplicate.');
    }

    /**
     * Creates a RoiEntryProject with a fresh project_uid + sequential reference,
     * retrying on unique-constraint collisions. Mirrors the generation rules
     * used in RoiProjectService::createNewDraftRecord() — kept as a local copy
     * here to avoid coupling RoiArchiveController to the Entry service.
     *
     * NOTE: if the reference format ever changes in RoiProjectService, update it here too.
     */
    private function createEntryWithUniqueReference(array $projectData, string $prefix): RoiEntryProject
    {
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
            try {
                $projectData['project_uid'] = (string) Str::ulid();
                $projectData['reference']   = $prefix . '-' . str_pad((string) ($maxNumber + 1), 4, '0', STR_PAD_LEFT);

                return RoiEntryProject::create($projectData);
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
     * Logs the withdraw-from-archive action so it's traceable per user.
     */
    private function logArchiveWithdraw(
        RoiArchiveProject $archived,
        $actor,
        array $oldValues,
        RoiEntryProject $entryProject
    ): void {
        $workflow = [
            'preparer_id'  => $archived->user_id,
            'reviewer_id'  => $archived->reviewed_by,
            'checker_id'   => $archived->checked_by,
            'endorser_id'  => $archived->endorsed_by,
            'confirmer_id' => $archived->confirmed_by,
            'approver_id'  => $archived->approved_by,
        ];

        try {
            RoiActivityLogger::log(
                activityType: 'withdraw',
                moduleType:   'ROI Archive',
                details:      'Withdrew ROI #' . $archived->reference . ' from Archive to Draft (duplicate) as #' . $entryProject->reference,
                subject:      $entryProject,
                oldValues:    $oldValues,
                newValues:    [
                    'status'              => 'duplicate',
                    'entry_project_id'    => $entryProject->id,
                    'new_reference'       => $entryProject->reference,
                    'archive_reference'   => $archived->reference,
                    'withdrawn_by'        => $actor->id,
                ],
                workflow:     $workflow
            );
        } catch (\Throwable $e) {
            Log::error('ROI archive withdraw activity log failed', ['message' => $e->getMessage()]);
        }
    }

    /**
     * Authorization gate logic check.
     */
    private function ensureCanViewArchive(RoiArchiveProject $project): void
    {
        // Simply ensure they are logged in
        abort_unless(Auth::check(), 403);
    }

    /**
     * Authorization gate for withdrawing an archived project.
     * Only the original preparer (or admin) can withdraw, and only when
     * the project's status is "approved".
     */
    private function ensureCanWithdrawArchive(RoiArchiveProject $project): void
    {
        abort_unless(Auth::check(), 403);

        $userId  = (int) (Auth::id() ?? 0);
        $isAdmin = $userId === 1;

        abort_unless($isAdmin || (int) $project->user_id === $userId, 403, 'You are not allowed to withdraw this project.');

        abort_unless(
            strtolower((string) $project->status) === 'approved',
            422,
            'Only approved projects can be withdrawn/duplicated.'
        );
    }

    private function buildMachineCatalog()
    {
        return \App\Models\PrinterModel::query()
            ->with(['printerModelSupplies.supply:id,category,print_type,supply_name,yield,unit_cost,selling_price,status'])
            ->where('status', 'Active')
            ->orderBy('printer_name')
            ->get()
            ->map(function ($printer) {
                return [
                    'id'           => (string) $printer->id,
                    'name'         => $printer->printer_name,
                    'unitCost'     => number_format((float) ($printer->unit_cost     ?? 0), 2, '.', ''),
                    'sellingPrice' => number_format((float) ($printer->selling_price ?? 0), 2, '.', ''),
                    'consumables'  => $printer->printerModelSupplies
                        ->filter(fn ($link) => $link->supply && $link->supply->status === 'Active')
                        ->map(function ($link) {
                            $supply = $link->supply;
                            $mode   = strtolower($supply->category ?? '') === 'part'
                                ? 'others'
                                : (strtolower($supply->print_type ?? '') === 'mono' ? 'mono' : 'color');
                            return [
                                'id'           => (string) $supply->id,
                                'mode'         => $mode,
                                'name'         => $supply->supply_name,
                                'unitCost'     => number_format((float) ($supply->unit_cost     ?? 0), 2, '.', ''),
                                'sellingPrice' => number_format((float) ($supply->selling_price ?? 0), 2, '.', ''),
                                'yields'       => (string) ($supply->yield ?? ''),
                            ];
                        })->values(),
                ];
            })->values();
    }

    private function buildConsumableCatalog()
    {
        $catalog  = ['mono' => [], 'color' => [], 'others' => []];
        $supplies = \App\Models\Supply::query()->where('status', 'Active')->orderBy('supply_name')->get();

        foreach ($supplies as $supply) {
            $mode = strtolower($supply->category ?? '') === 'part'
                ? 'others'
                : (strtolower($supply->print_type ?? '') === 'mono' ? 'mono' : 'color');

            $catalog[$mode][] = [
                'id'           => (string) $supply->id,
                'name'         => $supply->supply_name,
                'unitCost'     => number_format((float) ($supply->unit_cost     ?? 0), 2, '.', ''),
                'sellingPrice' => number_format((float) ($supply->selling_price ?? 0), 2, '.', ''),
                'yields'       => (string) ($supply->yield ?? ''),
            ];
        }

        return $catalog;
    }
}