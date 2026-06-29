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

    // Build the query using Eloquent
    $query = RoiArchiveProject::query()
        ->with('user')
        ->leftJoin('users as creator_user', 'roi_archive_projects.user_id', '=', 'creator_user.id')
        ->leftJoin('users as approved_user', 'roi_archive_projects.approved_by', '=', 'approved_user.id')
        ->leftJoin('users as rejected_user', 'roi_archive_projects.rejected_by', '=', 'rejected_user.id')
        ->selectRaw("
            roi_archive_projects.*,
            TRIM(CONCAT(COALESCE(creator_user.first_name, ''), ' ', COALESCE(creator_user.last_name, ''))) as prepared_by_name,
            TRIM(CONCAT(COALESCE(approved_user.first_name, ''), ' ', COALESCE(approved_user.last_name, ''))) as approved_by_name,
            TRIM(CONCAT(COALESCE(rejected_user.first_name, ''), ' ', COALESCE(rejected_user.last_name, ''))) as rejected_by_name,
            COALESCE(roi_archive_projects.rejected_at, roi_archive_projects.approved_at) as decided_at
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

    // REPLACE WITH:
    if ($request->filled('date_from')) {
        $query->whereRaw("COALESCE(rejected_at, approved_at, last_saved_at) >= ?", [$request->date_from . ' 00:00:00']);
    }

    if ($request->filled('date_to')) {
        $query->whereRaw("COALESCE(rejected_at, approved_at, last_saved_at) <= ?", [$request->date_to . ' 23:59:59']);
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

            // Add this after the General Search block
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
        'decided_at'       => "COALESCE(roi_archive_projects.rejected_at, roi_archive_projects.approved_at, roi_archive_projects.last_saved_at)",
        'prepared_by_name' => "TRIM(CONCAT(COALESCE(creator_user.first_name, ''), ' ', COALESCE(creator_user.last_name, '')))",
        'reference'        => 'roi_archive_projects.reference',
        'company_sap_code' => 'roi_archive_projects.company_sap_code',
        'company_name'     => 'roi_archive_projects.company_name',
        'contract_years'   => 'roi_archive_projects.contract_years',
        'contract_type'    => 'roi_archive_projects.contract_type',
        'type'             => 'roi_archive_projects.type',

        // Sorts by the decider's name — mirrors the decided_by_name logic in ->through()
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
            fn($q) => $q->orderByRaw("CASE WHEN roi_archive_projects.user_id = ? THEN 0 ELSE 1 END ASC, COALESCE(roi_archive_projects.rejected_at, roi_archive_projects.approved_at, roi_archive_projects.last_saved_at) DESC", [$userId])
        )
        ->paginate($perPage)    
        ->withQueryString()
        ->through(function ($p) use ($userId){
            $status = strtolower((string)($p->status ?? ''));

            $p->decided_by_name = match($status) {
                'rejected'  => $p->rejected_by_name ?: '—',
                'cancelled' => $p->prepared_by_name ?: '—',
                default     => $p->approved_by_name ?: '—',
            };

            $p->decided_at_display = match($status) {
                'rejected'  => $p->rejected_at,
                'cancelled' => $p->last_saved_at,
                default     => $p->approved_at,
            };
             $p->is_owner = (int) $p->user_id === $userId; // ← add this

            return $p;
        });

        

    if ($request->wantsJson()) {
        return response()->json(['archiveProjects' => $archiveProjects]);
    }

    return Inertia::render('CustomerManagement/ProjectROIApproval/ArchiveRoutes/Archive', [
        'filters' => $request->only(['search', 'status', 'type', 'date_from', 'date_to', 'decided_by', 'prepared_by', 'location_id', 'per_page', 'sort_by', 'sort_order']),
        'archiveProjects' => $archiveProjects,
        'locations' => Location::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
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
     */
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
     * Authorization gate logic check.
     */
private function ensureCanViewArchive(RoiArchiveProject $project): void
{
    // Simply ensure they are logged in
    abort_unless(Auth::check(), 403);
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