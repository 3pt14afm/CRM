<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\RoiArchiveProject;
use App\Models\RoiEntryProject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class RoiController extends Controller
{

    public function entryList(Request $request)
    {
        $userId = Auth::id();
        $perPage = (int) $request->input('per_page', 10);

        // 1. Build Base Filterable Query — one row per group (master or single-entry)
        $draftsQuery = RoiEntryProject::query()
            ->where('user_id', $userId)
            ->where('sequence', '<=', 1)
            ->whereIn('status', ['draft', 'returned', 'sent back', 'withdrawn', 'duplicate'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->input('search');
                $q->where(function ($inner) use ($search) {
                    $inner->where('reference', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%")
                        ->orWhere('company_sap_code', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), function ($q) use ($request) {
                $status = $request->input('status');

                $statusArray = is_array($status) ? $status : explode(',', $status);
                $statusArray = array_filter($statusArray, fn($s) => $s !== 'all' && !empty($s));

                if (empty($statusArray)) {
                    return;
                }

                $finalStatuses = [];

                foreach ($statusArray as $s) {
                    if ($s === 'returned') {
                        $finalStatuses[] = 'returned';
                        $finalStatuses[] = 'sent back';
                    } else {
                        $finalStatuses[] = $s;
                    }
                }

                $q->whereIn('status', array_unique($finalStatuses));
            })
            ->when($request->filled('date_from'), function ($q) use ($request) {
                $q->whereDate('last_saved_at', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function ($q) use ($request) {
                $q->whereDate('last_saved_at', '<=', $request->input('date_to'));
            })
            ->orderByDesc('last_saved_at')
            ->orderByDesc('updated_at');

        // 2. Execute Paginated Response Build
        $drafts = $draftsQuery->paginate($perPage)->withQueryString();

        // 2b. Sibling counts for the groups on this page (1 for single-entry, 2+ for groups)
        $references = $drafts->getCollection()->pluck('reference');
        $entryCounts = RoiEntryProject::query()
            ->where('user_id', $userId)
            ->whereIn('reference', $references)
            ->selectRaw('reference, count(*) as cnt')
            ->groupBy('reference')
            ->pluck('cnt', 'reference');

        // 2c. Sibling rows for groups only — loaded once here so expand/collapse
        // on the frontend is pure client-side state, no extra fetch needed.
        $groupReferences = $entryCounts->filter(fn ($cnt) => $cnt > 1)->keys();

        $siblingsByReference = $groupReferences->isEmpty()
            ? collect()
            : RoiEntryProject::query()
                ->where('user_id', $userId)
                ->whereIn('reference', $groupReferences)
                ->where('sequence', '>', 1)
                ->orderBy('sequence')
                ->get(['id', 'reference', 'sequence', 'contract_type', 'contract_years', 'purpose', 'status'])
                ->groupBy('reference');

        // Map collection data models cleanly
        $draftsTransformed = $drafts->through(function (RoiEntryProject $p) use ($entryCounts, $siblingsByReference) {
            $last = $p->last_saved_at;
            $display = null;

            if ($last) {
                $now = now();
                $diffMinutes = (int) $last->diffInMinutes($now);
                $diffHours = (int) $last->diffInHours($now);
                $diffDays = (int) $last->diffInDays($now);

                if ($diffDays >= 2) {
                    $display = $last->format('m/d/y');
                } elseif ($diffDays >= 1) {
                    $display = '1d ago';
                } elseif ($diffHours >= 1) {
                    $display = $diffHours . 'hr ago';
                } elseif ($diffMinutes >= 1) {
                    $display = $diffMinutes . 'm ago';
                } else {
                    $display = 'Just now';
                }
            }

            $entryCount = $entryCounts[$p->reference] ?? 1;

            $siblingEntries = $entryCount > 1
                ? $siblingsByReference->get($p->reference, collect())->map(fn ($s) => [
                    'id' => $s->id,
                    'sequence' => $s->sequence,
                    'contract_type' => $s->contract_type,
                    'contract_years' => $s->contract_years,
                    'purpose' => $s->purpose,
                    'status' => $s->status,
                ])->values()->all()
                : [];

            return [
                'id' => $p->id,
                'reference' => $p->reference,
                'company_name' => $p->company_name,
                'company_sap_code' => $p->company_sap_code,
                'contract_years' => $p->contract_years,
                'contract_type' => $p->contract_type,
                'type' => $p->type,
                'last_saved_display' => $display,
                'status' => $p->status,
                'entry_count' => $entryCount,
                'is_group' => $entryCount > 1 || (bool) $p->from_group,
                'sibling_entries' => $siblingEntries,
            ];
        });

        // 3. Dynamic Stats — count groups (references), not raw rows
        $totalDrafts = RoiEntryProject::query()
            ->where('user_id', $userId)
            ->where('sequence', '<=', 1)
            ->whereIn('status', ['draft', 'returned', 'sent back', 'withdrawn', 'duplicate'])
            ->count();

        $recentlyModifiedToday = RoiEntryProject::query()
            ->where('user_id', $userId)
            ->where('sequence', '<=', 1)
            ->where('status', 'draft')
            ->whereDate('last_saved_at', now()->toDateString())
            ->count();

        $stats = [
            'totalDrafts' => $totalDrafts,
            'recentlyModifiedText' => $recentlyModifiedToday . ' Today',
        ];

        // 4. Axios API vs Inertia View Router Handler Split Check
        if ($request->wantsJson()) {
            return response()->json([
                'drafts' => $draftsTransformed,
                'stats' => $stats,
            ]);
        }

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/EntryList', [
            'drafts' => $draftsTransformed,
            'stats' => $stats,
        ]);
    }

    public function entry(Request $request)
    {
        return $this->entryList($request);
    }


    public function entryCreate()
    {
        $machineCatalog = \App\Models\PrinterModel::query()
            ->with([
                'printerModelSupplies.supply:id,category,print_type,supply_name,yield,unit_cost,selling_price,status',
            ])
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
                        })
                        ->values(),
                ];
            })
            ->values();

        $consumableCatalog = [
            'mono' => [],
            'color' => [],
            'others' => [],
        ];

        $supplies = \App\Models\Supply::query()
            ->where('status', 'Active')
            ->orderBy('supply_name')
            ->get();

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
            'entryProject' => null,
            'project' => null,
            'createdBy' => Auth::user()->name,
            'machineCatalog' => $machineCatalog,
            'consumableCatalog' => $consumableCatalog,
        ]);
    }

    public function groupCreate()
    {
        $machineCatalog = \App\Models\PrinterModel::query()
            ->with([
                'printerModelSupplies.supply:id,category,print_type,supply_name,yield,unit_cost,selling_price,status',
            ])
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
                        })
                        ->values(),
                ];
            })
            ->values();

        $consumableCatalog = [
            'mono' => [],
            'color' => [],
            'others' => [],
        ];

        $supplies = \App\Models\Supply::query()
            ->where('status', 'Active')
            ->orderBy('supply_name')
            ->get();

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
            'activeTab' => 'Machine Configuration',
            'entryProjects' => null,
            'reference' => null,
            'createdBy' => Auth::user()->name,
            'machineCatalog' => $machineCatalog,
            'consumableCatalog' => $consumableCatalog,
        ]);
    }

    public function entryMachine()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Machine Configuration',
        ]);
    }

    public function entrySummary()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Summary',
        ]);
    }

    public function entrySucceeding()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/Entry', [
            'activeTab' => 'Succeeding',
        ]);
    }

    public function current()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/CurrentRoutes/Current');
    }

    // public function archive(Request $request)
    // {
    //     $perPage = (int) $request->input('per_page', 10);

    //     $archiveQuery = RoiArchiveProject::query()
    //         ->with('user')
    //         ->leftJoin('users as approved_user', 'roi_archive_projects.approved_by', '=', 'approved_user.id')
    //         ->leftJoin('users as rejected_user', 'roi_archive_projects.rejected_by', '=', 'rejected_user.id')
    //         ->selectRaw("
    //             roi_archive_projects.*,
    //             TRIM(CONCAT(COALESCE(approved_user.first_name, ''), ' ', COALESCE(approved_user.last_name, ''))) as approved_by_name,
    //             TRIM(CONCAT(COALESCE(rejected_user.first_name, ''), ' ', COALESCE(rejected_user.last_name, ''))) as rejected_by_name
    //         ")
    //         ->orderByDesc('roi_archive_projects.updated_at');

    //     $archiveProjects = (clone $archiveQuery)
    //         ->paginate($perPage)
    //         ->withQueryString()
    //         ->through(function ($p) {
    //             $status = strtolower((string) ($p->status ?? ''));

    //             $isRejected = $status === 'rejected';
    //             $isApproved = $status === 'approved';

    //             $decidedByName = $isRejected
    //                 ? ($p->rejected_by_name ?: '—')
    //                 : ($p->approved_by_name ?: '—');

    //             $decidedAt = $isRejected ? $p->rejected_at : $p->approved_at;

    //             $p->decision_display = $isRejected
    //                 ? 'Rejected'
    //                 : ($isApproved ? 'Approved' : ($p->status ?? '—'));

    //             $p->decided_by_name = $decidedByName;

    //             $p->decided_at_display = $decidedAt
    //                 ? $decidedAt->diffForHumans()
    //                 : '—';

    //             $p->rejected_by_level_display = ($isRejected && $p->rejected_by_level)
    //                 ? ('Level ' . $p->rejected_by_level)
    //                 : null;

    //             return $p;
    //         });

    //     $totalArchiveProjects = (clone $archiveQuery)->count();

    //     $recentlyArchivedToday = RoiArchiveProject::query()
    //         ->where(function ($q) {
    //             $q->whereDate('approved_at', now()->toDateString())
    //               ->orWhereDate('rejected_at', now()->toDateString());
    //         })
    //         ->count();

    //     $stats = [
    //         'totalArchiveProjects' => $totalArchiveProjects,
    //         'recentlyArchivedToday' => $recentlyArchivedToday . ' Today',
    //     ];

    //     return Inertia::render('CustomerManagement/ProjectROIApproval/ArchiveRoutes/Archive', [
    //         'archiveProjects' => $archiveProjects,
    //         'stats' => $stats,
    //     ]);

    // }

    private function buildMachineCatalog()
    {
        return \App\Models\PrinterModel::query()
            ->with([
                'printerModelSupplies.supply:id,category,print_type,supply_name,yield,unit_cost,selling_price,status',
            ])
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
                        })
                        ->values(),
                ];
            })
            ->values();
    }

    private function buildConsumableCatalog()
    {
        $catalog = [
            'mono' => [],
            'color' => [],
            'others' => [],
        ];

        $supplies = \App\Models\Supply::query()
            ->where('status', 'Active')
            ->orderBy('supply_name')
            ->get();

        foreach ($supplies as $supply) {
            $mode = strtolower($supply->category ?? '') === 'part'
                ? 'others'
                : (strtolower($supply->print_type ?? '') === 'mono' ? 'mono' : 'color');

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

    // public function archiveShow($id)
    // {
    //    $project = RoiArchiveProject::with([
    //         'items',
    //         'fees',
    //         'user:id,first_name,last_name,position',
    //         'reviewedByUser:id,first_name,last_name,position',
    //         'checkedByUser:id,first_name,last_name,position',
    //         'endorsedByUser:id,first_name,last_name,position',
    //         'confirmedByUser:id,first_name,last_name,position',
    //         'approvedByUser:id,first_name,last_name,position',
    //         'rejectedByUser:id,first_name,last_name,position',
    //         ])->findOrFail($id);

    //     $this->ensureCanViewArchive($project);

    //     $userIds = collect([
    //         $project->user_id,
    //         $project->approved_by,
    //         $project->rejected_by,
    //         $project->reviewed_by,
    //         $project->checked_by,
    //         $project->endorsed_by,
    //         $project->confirmed_by,
    //     ])->filter()->unique()->values();

    //    $usersById = User::query()
    //     ->whereIn('id', $userIds)
    //     // 2. ADD 'position' TO THE SELECT HERE
    //     ->get(['id', 'first_name', 'last_name', 'position']) 
    //     ->mapWithKeys(fn ($u) => [
    //         (string) $u->id => [
    //             'id' => $u->id,
    //             'name' => trim($u->first_name . ' ' . $u->last_name),
    //             'position' => $u->position, // 3. MAP IT TO THE KEY
    //         ],
    //     ]);

    //     return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
    //         'project' => $project,
    //         'entryProject' => $project,
    //         'readOnly' => true,
    //         'route' => 'archive',
    //         'createdBy' => $project->user?->name ?? '—',
    //         'role' => Auth::user()->workflow_role,
    //         'usersById' => $usersById,
    //         'machineCatalog' => $this->buildMachineCatalog(),
    //         'consumableCatalog' => $this->buildConsumableCatalog(),
    //     ]);
    // }

    // public function showArchiveAttachment($id, int $attachmentIndex)
    // {
    //     $project = RoiArchiveProject::findOrFail($id);

    //     $this->ensureCanViewArchive($project);

    //     $attachments = is_array($project->entry_remarks_attachments)
    //         ? array_values($project->entry_remarks_attachments)
    //         : [];

    //     abort_unless(array_key_exists($attachmentIndex, $attachments), 404);

    //     $attachment = $attachments[$attachmentIndex];

    //     abort_unless(!empty($attachment['path']), 404);
    //     abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

    //     return response()->file(Storage::disk('local')->path($attachment['path']));
    // }

    // private function ensureCanViewArchive(RoiArchiveProject $project): void
    // {
    //     $user = Auth::user();

    //     abort_unless($user, 403);

    //     $userId = (int) $user->id;

    //     $canView =
    //         (int) $project->user_id === $userId
    //         || (int) ($project->reviewed_by ?? 0) === $userId
    //         || (int) ($project->checked_by ?? 0) === $userId
    //         || (int) ($project->endorsed_by ?? 0) === $userId
    //         || (int) ($project->confirmed_by ?? 0) === $userId
    //         || (int) ($project->approved_by ?? 0) === $userId
    //         || (int) ($project->rejected_by ?? 0) === $userId;
            
    //     abort_unless($canView, 403);
    // }

    
}