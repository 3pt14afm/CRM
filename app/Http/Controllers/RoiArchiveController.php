<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\RoiArchiveProject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class RoiArchiveController extends Controller
{
    /**
     * Display a listing of the archived projects.
     */
public function index(Request $request)
{
    $perPage  = (int) $request->input('per_page', 10);
    $search   = $request->input('search');
    $status   = $request->input('status');
    $dateFrom = $request->input('date_from');
    $dateTo   = $request->input('date_to');

    // Wrap as subquery so we can filter on the computed decided_at column cleanly
    $baseQuery = RoiArchiveProject::query()
        ->with('user')
        ->leftJoin('users as approved_user', 'roi_archive_projects.approved_by', '=', 'approved_user.id')
        ->leftJoin('users as rejected_user', 'roi_archive_projects.rejected_by', '=', 'rejected_user.id')
        ->selectRaw("
            roi_archive_projects.*,
            TRIM(CONCAT(COALESCE(approved_user.first_name, ''), ' ', COALESCE(approved_user.last_name, ''))) as approved_by_name,
            TRIM(CONCAT(COALESCE(rejected_user.first_name, ''), ' ', COALESCE(rejected_user.last_name, ''))) as rejected_by_name,
            COALESCE(roi_archive_projects.rejected_at, roi_archive_projects.approved_at) as decided_at
        ");

    if (!empty($status)) {
        $baseQuery->where('roi_archive_projects.status', '=', $status);
    }

    if (!empty($search)) {
        $baseQuery->where(function ($q) use ($search) {
            $q->where('roi_archive_projects.company_name', 'like', "%{$search}%")
              ->orWhere('roi_archive_projects.reference', 'like', "%{$search}%")
              ->orWhere('roi_archive_projects.company_sap_code', 'like', "%{$search}%")
              ->orWhere('roi_archive_projects.contract_type', 'like', "%{$search}%")
              ->orWhere('roi_archive_projects.status', 'like', "%{$search}%")
              ->orWhereHas('user', function ($userQuery) use ($search) {
                  $userQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
              });
        });
    }

    // Filter on decided_at using HAVING so it works on the computed column
    if (!empty($dateFrom)) {
        $baseQuery->havingRaw('decided_at >= ?', [$dateFrom . ' 00:00:00']);
    }

    if (!empty($dateTo)) {
        $baseQuery->havingRaw('decided_at <= ?', [$dateTo . ' 23:59:59']);
    }

    $baseQuery->orderByRaw('decided_at DESC');

    $archiveProjects = (clone $baseQuery)
        ->paginate($perPage)
        ->withQueryString()
        ->through(function ($p) {
            $statusStr  = strtolower((string) ($p->status ?? ''));
            $isRejected = $statusStr === 'rejected';

            $p->decided_by_name    = $isRejected ? ($p->rejected_by_name ?: '—') : ($p->approved_by_name ?: '—');
            $decidedAt             = $isRejected ? $p->rejected_at : $p->approved_at;
            $p->decided_at_display = $decidedAt ? \Carbon\Carbon::parse($decidedAt)->diffForHumans() : '—';

            return $p;
        });

    if ($request->wantsJson()) {
        return response()->json([
            'archiveProjects' => $archiveProjects,
        ]);
    }

    $totalArchiveProjects  = RoiArchiveProject::query()->count();
    $recentlyArchivedToday = RoiArchiveProject::query()
        ->where(function ($q) {
            $q->whereDate('approved_at', now()->toDateString())
              ->orWhereDate('rejected_at', now()->toDateString());
        })
        ->count();

    return Inertia::render('CustomerManagement/ProjectROIApproval/ArchiveRoutes/Archive', [
        'filters' => [
            'search'    => $search,
            'status'    => $status,
            'date_from' => $dateFrom,
            'date_to'   => $dateTo,
        ],
        'archiveProjects' => $archiveProjects,
        'stats' => [
            'totalArchiveProjects'  => $totalArchiveProjects,
            'recentlyArchivedToday' => $recentlyArchivedToday . ' Today',
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
            'user:id,first_name,last_name,position',
            'reviewedByUser:id,first_name,last_name,position',
            'checkedByUser:id,first_name,last_name,position',
            'endorsedByUser:id,first_name,last_name,position',
            'confirmedByUser:id,first_name,last_name,position',
            'approvedByUser:id,first_name,last_name,position',
            'rejectedByUser:id,first_name,last_name,position',
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
                    'id' => $u->id,
                    'name' => trim($u->first_name . ' ' . $u->last_name),
                    'position' => $u->position,
                ],
            ]);

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
            'project' => $project,
            'entryProject' => $project,
            'readOnly' => true,
            'route' => 'archive',
            'createdBy' => $project->user?->name ?? '—',
            'role' => Auth::user()->workflow_role,
            'usersById' => $usersById,
            'machineCatalog' => $this->buildMachineCatalog(),
            'consumableCatalog' => $this->buildConsumableCatalog(),
        ]);
    }

    /**
     * Stream the requested archive file attachment.
     */
    public function showAttachment($id, int $attachmentIndex)
    {
        $project = RoiArchiveProject::findOrFail($id);
        $this->ensureCanViewArchive($project);

        $attachments = is_array($project->entry_remarks_attachments)
            ? array_values($project->entry_remarks_attachments)
            : [];

        abort_unless(array_key_exists($attachmentIndex, $attachments), 404);
        $attachment = $attachments[$attachmentIndex];

        abort_unless(!empty($attachment['path']), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return response()->file(Storage::disk('local')->path($attachment['path']));
    }

    /**
     * Authorization gate logic check.
     */
    private function ensureCanViewArchive(RoiArchiveProject $project): void
    {
        $user = Auth::user();
        abort_unless($user, 403);

        $userId = (int) $user->id;

        $canView =
            (int) $project->user_id === $userId
            || (int) ($project->reviewed_by ?? 0) === $userId
            || (int) ($project->checked_by ?? 0) === $userId
            || (int) ($project->endorsed_by ?? 0) === $userId
            || (int) ($project->confirmed_by ?? 0) === $userId
            || (int) ($project->approved_by ?? 0) === $userId
            || (int) ($project->rejected_by ?? 0) === $userId;
            
        abort_unless($canView, 403);
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
                    'id' => (string) $printer->id,
                    'name' => $printer->printer_name,
                    'unitCost' => number_format((float) ($printer->unit_cost ?? 0), 2, '.', ''),
                    'sellingPrice' => number_format((float) ($printer->selling_price ?? 0), 2, '.', ''),
                    'consumables' => $printer->printerModelSupplies
                        ->filter(fn ($link) => $link->supply && $link->supply->status === 'Active')
                        ->map(function ($link) {
                            $supply = $link->supply;
                            $mode = strtolower($supply->category ?? '') === 'part' ? 'others' : (strtolower($supply->print_type ?? '') === 'mono' ? 'mono' : 'color');
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
    }

    private function buildConsumableCatalog()
    {
        $catalog = ['mono' => [], 'color' => [], 'others' => []];
        $supplies = \App\Models\Supply::query()->where('status', 'Active')->orderBy('supply_name')->get();

        foreach ($supplies as $supply) {
            $mode = strtolower($supply->category ?? '') === 'part' ? 'others' : (strtolower($supply->print_type ?? '') === 'mono' ? 'mono' : 'color');
            $catalog[$mode][] = [
                'id' => (string) $supply->id,
                'name' => $supply->supply_name,
                'unitCost' => number_format((float) ($supply->unit_cost ?? 0), 2, '.', ''),
                'sellingPrice' => number_format((float) ($supply->selling_price ?? 0), 2, '.', ''),
                'yields' => (string) ($supply->yield ?? ''),
            ];
        }
        return $catalog;
    }
}