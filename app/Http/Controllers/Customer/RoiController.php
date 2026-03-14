<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\RoiArchiveProject;
use App\Models\RoiEntryProject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RoiController extends Controller
{
    public function entryList(Request $request)
    {
        $userId = Auth::id();
        $perPage = (int) $request->input('per_page', 10);

        $draftsQuery = RoiEntryProject::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['draft', 'returned'])
            ->orderByDesc('last_saved_at')
            ->orderByDesc('updated_at');

        $drafts = (clone $draftsQuery)
            ->paginate($perPage)
            ->withQueryString();

        $totalDrafts = (clone $draftsQuery)->count();

        $recentlyModifiedToday = RoiEntryProject::query()
            ->where('user_id', $userId)
            ->where('status', 'draft')
            ->whereDate('last_saved_at', now()->toDateString())
            ->count();

        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/EntryList', [
            'drafts' => $drafts->through(function (RoiEntryProject $p) {
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
                        $display = $diffMinutes . ' minute' . ($diffMinutes === 1 ? '' : 's') . ' ago';
                    } else {
                        $display = 'Just now';
                    }
                }

                return [
                    'id' => $p->id,
                    'reference' => $p->reference,
                    'company_name' => $p->company_name,
                    'contract_years' => $p->contract_years,
                    'contract_type' => $p->contract_type,
                    'last_saved_display' => $display,
                    'status' => $p->status,
                ];
            }),
            'stats' => [
                'totalDrafts' => $totalDrafts,
                'recentlyModifiedText' => $recentlyModifiedToday . ' Today',
            ],
        ]);
    }

    public function entry(Request $request)
    {
        return $this->entryList($request);
    }

    public function entryCreate()
    {
        return Inertia::render('CustomerManagement/ProjectROIApproval/EntryRoutes/Entry', [
            'activeTab' => 'Machine Configuration',
            'entryProject' => null,
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

    public function archive(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);

        $archiveQuery = RoiArchiveProject::query()
            ->with('user')
            ->leftJoin('users as approved_user', 'roi_archive_projects.approved_by', '=', 'approved_user.id')
            ->leftJoin('users as rejected_user', 'roi_archive_projects.rejected_by', '=', 'rejected_user.id')
            ->selectRaw("
                roi_archive_projects.*,
                TRIM(CONCAT(COALESCE(approved_user.first_name, ''), ' ', COALESCE(approved_user.last_name, ''))) as approved_by_name,
                TRIM(CONCAT(COALESCE(rejected_user.first_name, ''), ' ', COALESCE(rejected_user.last_name, ''))) as rejected_by_name
            ")
            ->orderByDesc('roi_archive_projects.updated_at');

        $archiveProjects = (clone $archiveQuery)
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($p) {
                $status = strtolower((string) ($p->status ?? ''));

                $isRejected = $status === 'rejected';
                $isApproved = $status === 'approved';

                $decidedByName = $isRejected
                    ? ($p->rejected_by_name ?: '—')
                    : ($p->approved_by_name ?: '—');

                $decidedAt = $isRejected ? $p->rejected_at : $p->approved_at;

                $p->decision_display = $isRejected
                    ? 'Rejected'
                    : ($isApproved ? 'Approved' : ($p->status ?? '—'));

                $p->decided_by_name = $decidedByName;

                $p->decided_at_display = $decidedAt
                    ? $decidedAt->diffForHumans()
                    : '—';

                $p->rejected_by_level_display = ($isRejected && $p->rejected_by_level)
                    ? ('Level ' . $p->rejected_by_level)
                    : null;

                return $p;
            });

        $totalArchiveProjects = (clone $archiveQuery)->count();

        $recentlyArchivedToday = RoiArchiveProject::query()
            ->where(function ($q) {
                $q->whereDate('approved_at', now()->toDateString())
                  ->orWhereDate('rejected_at', now()->toDateString());
            })
            ->count();

        $stats = [
            'totalArchiveProjects' => $totalArchiveProjects,
            'recentlyArchivedToday' => $recentlyArchivedToday . ' Today',
        ];

        return Inertia::render('CustomerManagement/ProjectROIApproval/ArchiveRoutes/Archive', [
            'archiveProjects' => $archiveProjects,
            'stats' => $stats,
        ]);
    }

    public function archiveShow($id)
    {
        $project = RoiArchiveProject::with(['items', 'fees', 'user'])->findOrFail($id);

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
            ->get(['id', 'first_name', 'last_name'])
            ->mapWithKeys(fn ($u) => [
                (string) $u->id => [
                    'id' => $u->id,
                    'name' => trim($u->first_name . ' ' . $u->last_name),
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
        ]);
    }
}