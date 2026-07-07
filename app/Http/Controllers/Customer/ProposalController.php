<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Proposal;
use App\Models\RoiArchiveProject;
use App\Models\SPRF\SprfArchiveProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProposalController extends Controller
{
    // ─── Proposal List ────────────────────────────────────────────

    public function proposalList(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);
        $userId  = Auth::id();

        $roiResult  = $this->getAvailableRoiProjects($request, $userId, $perPage);
        $sprfResult = $this->getAvailableSprfProjects($request, $userId, $perPage);

        // Stats for the "Available Projects" tables
        $availableStats = [
            'totalArchiveProjects'  => $roiResult['stats']['total'] + $sprfResult['stats']['total'],
            'recentlyArchivedToday' => ($roiResult['stats']['today'] + $sprfResult['stats']['today']) . ' Today',
            'totalRoiProjects'      => $roiResult['stats']['total'],
            'totalSprfProjects'     => $sprfResult['stats']['total'],
        ];

        // Stats for the "My Proposals" (generated) tables — this is what
        // GeneratedProposals.jsx reads as liveStats.totalRoiMine, etc.
        $generatedStats = [
            'totalProposals'     => Proposal::where('user_id', $userId)->whereNotIn('status', ['awarded', 'closed'])->count(),
            'generatedCount'     => Proposal::where('user_id', $userId)->where('status', 'generated')->count(),
            'totalRoiMine'       => Proposal::where('user_id', $userId)->where('project_type', 'roi')->whereNotIn('status', ['awarded', 'closed'])->count(),
            'totalSprfMine'      => Proposal::where('user_id', $userId)->where('project_type', 'sprf')->whereNotIn('status', ['awarded', 'closed'])->count(),
            'generatedRoiCount'  => Proposal::where('user_id', $userId)->where('project_type', 'roi')->where('status', 'generated')->count(),
            'generatedSprfCount' => Proposal::where('user_id', $userId)->where('project_type', 'sprf')->where('status', 'generated')->count(),
            'archivedRoiCount'   => Proposal::where('user_id', $userId)->where('project_type', 'roi')->whereIn('status', ['awarded', 'closed'])->count(),
            'archivedSprfCount'  => Proposal::where('user_id', $userId)->where('project_type', 'sprf')->whereIn('status', ['awarded', 'closed'])->count(),
        ];

        if ($request->wantsJson()) {
            // GeneratedProposals.jsx (axios/XHR) expects roiProposals / sprfProposals
            // (paginated "my proposals" data) and a single `stats` object that
            // contains both the available-project counts AND the my-proposals
            // counts (totalRoiMine, generatedRoiCount, ...).
            return response()->json([
                'roiProjects'           => $roiResult['data'],
                'sprfProjects'          => $sprfResult['data'],
                'roiProposals'          => $this->getMyRoiProposals($request, $userId, $perPage),
                'sprfProposals'         => $this->getMySprfProposals($request, $userId, $perPage),
                'archivedRoiProposals'  => $this->getMyArchivedRoiProposals($request, $userId, $perPage),
                'archivedSprfProposals' => $this->getMyArchivedSprfProposals($request, $userId, $perPage),
                'stats'                 => array_merge($availableStats, $generatedStats),
            ]);
        }

        $locations = [];
        if (class_exists(\App\Models\Location::class)) {
            $locations = \App\Models\Location::orderBy('name')->get(['id', 'name']);
        }

        return Inertia::render('CustomerManagement/Proposal/ProposalRoute', [
            'roiProjects'  => $roiResult['data'],
            'sprfProjects' => $sprfResult['data'],
            'stats'        => $availableStats,
            'filters'      => [
                'search'      => trim((string) $request->input('search', '')),
                'type'        => $request->input('type', ''),
                'date_from'   => $request->input('date_from'),
                'date_to'     => $request->input('date_to'),
                'decided_by'  => trim((string) $request->input('decided_by', '')),
                'location_id' => $request->input('location_id'),
                'sort_by'     => (string) $request->input('sort_by', ''),
                'sort_order'  => strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc',
                'per_page'    => $perPage,
            ],
            'locations' => $locations,

            'roiProposals'          => $this->getMyRoiProposals($request, $userId, $perPage),
            'sprfProposals'         => $this->getMySprfProposals($request, $userId, $perPage),
            'archivedRoiProposals'  => $this->getMyArchivedRoiProposals($request, $userId, $perPage),
            'archivedSprfProposals' => $this->getMyArchivedSprfProposals($request, $userId, $perPage),

            'generatedstats' => $generatedStats,
        ]);
    }

    /**
     * Approved ROI archive projects that don't already have a draft/generated proposal.
     */
    private function getAvailableRoiProjects(Request $request, $userId, int $perPage): array
    {
        $search     = trim((string) $request->input('search', ''));
        $type       = $request->input('type', '');
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $decidedBy  = trim((string) $request->input('decided_by', ''));
        $locationId = $request->input('location_id');
        $sortBy     = (string) $request->input('sort_by', '');
        $sortOrder  = strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = RoiArchiveProject::query()
            ->select('roi_archive_projects.*')
            ->where('roi_archive_projects.user_id', $userId)
            ->where('roi_archive_projects.status', 'approved')
            ->with(['user', 'approver'])
            ->whereDoesntHave('proposals', function ($q) {
                $q->whereIn('status', ['draft', 'generated', 'awarded', 'closed']);
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('roi_archive_projects.reference', 'like', "%{$search}%")
                  ->orWhere('roi_archive_projects.company_name', 'like', "%{$search}%")
                  ->orWhere('roi_archive_projects.company_sap_code', 'like', "%{$search}%");
            });
        }

        if ($type !== '' && $type !== null) {
            $query->where('roi_archive_projects.type', (int) $type);
        }

        if ($dateFrom) {
            $query->whereDate('roi_archive_projects.approved_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('roi_archive_projects.approved_at', '<=', $dateTo);
        }

        if ($decidedBy !== '') {
            $query->whereHas('approver', function ($q) use ($decidedBy) {
                $q->where(function ($sub) use ($decidedBy) {
                    $sub->where('first_name', 'like', "%{$decidedBy}%")
                        ->orWhere('last_name', 'like', "%{$decidedBy}%")
                        ->orWhereRaw("CONCAT(first_name, ' ', last_name) like ?", ["%{$decidedBy}%"]);
                });
            });
        }

        if ($locationId) {
            $query->where('roi_archive_projects.location_id', $locationId);
        }

        $sortableColumns = [
            'reference'        => 'roi_archive_projects.reference',
            'company_sap_code' => 'roi_archive_projects.company_sap_code',
            'company_name'     => 'roi_archive_projects.company_name',
            'contract_years'   => 'roi_archive_projects.contract_years',
            'contract_type'    => 'roi_archive_projects.contract_type',
            'type'             => 'roi_archive_projects.type',
            'decided_at'       => 'roi_archive_projects.approved_at',
        ];

        if ($sortBy === 'prepared_by_name') {
            $query->leftJoin('users as prepared_user', 'roi_archive_projects.user_id', '=', 'prepared_user.id')
                ->orderBy('prepared_user.first_name', $sortOrder)
                ->orderBy('prepared_user.last_name', $sortOrder);
        } elseif ($sortBy === 'decided_by_name') {
            $query->leftJoin('users as approver_user', 'roi_archive_projects.approved_by', '=', 'approver_user.id')
                ->orderBy('approver_user.first_name', $sortOrder)
                ->orderBy('approver_user.last_name', $sortOrder);
        } elseif (isset($sortableColumns[$sortBy])) {
            $query->orderBy($sortableColumns[$sortBy], $sortOrder);
        } else {
            $query->orderByDesc('roi_archive_projects.updated_at');
        }

        $statsQuery = (clone $query)->reorder();

        $data = $query->paginate($perPage)
            ->withQueryString()
            ->through(fn ($p) => $this->transformRoiProposal($p));

        return [
            'data' => $data,
            'stats' => [
                'total' => $statsQuery->count('roi_archive_projects.id'),
                'today' => (clone $statsQuery)
                    ->whereDate('roi_archive_projects.updated_at', now()->toDateString())
                    ->count('roi_archive_projects.id'),
            ],
        ];
    }

    /**
     * Approved SPRF archive projects that don't already have a draft/generated proposal.
     * NOTE: SprfArchiveProject exposes `sprf_no` (used as reference) and `company_sap_code`
     * rather than `company_name`/`reference` like ROI does. Swap in a real company relation
     * here if/when one exists.
     */
    private function getAvailableSprfProjects(Request $request, $userId, int $perPage): array
    {
        $search    = trim((string) $request->input('search', ''));
        $dateFrom  = $request->input('date_from');
        $dateTo    = $request->input('date_to');
        $decidedBy = trim((string) $request->input('decided_by', ''));
        $sortBy    = (string) $request->input('sort_by', '');
        $sortOrder = strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = SprfArchiveProject::query()
            ->where('prepared_by_user_id', $userId)
            ->where('status', 'approved')
            ->with(['preparer', 'approvedBy'])
            ->whereDoesntHave('proposals', function ($q) {
                $q->whereIn('status', ['draft', 'generated', 'awarded', 'closed']);
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('sprf_no', 'like', "%{$search}%")
                  ->orWhere('company_sap_code', 'like', "%{$search}%")
                  ->orWhere('account', 'like', "%{$search}%");
            });
        }

        if ($dateFrom) {
            $query->whereDate('approved_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('approved_at', '<=', $dateTo);
        }

        if ($decidedBy !== '') {
            $query->whereHas('approvedBy', function ($q) use ($decidedBy) {
                $q->where(function ($sub) use ($decidedBy) {
                    $sub->where('first_name', 'like', "%{$decidedBy}%")
                        ->orWhere('last_name', 'like', "%{$decidedBy}%")
                        ->orWhereRaw("CONCAT(first_name, ' ', last_name) like ?", ["%{$decidedBy}%"]);
                });
            });
        }

        $sortableColumns = [
            'sprf_no'          => 'sprf_no',
            'company_sap_code' => 'company_sap_code',
            'account'          => 'account',
            'type'             => 'type',
            'decided_at'       => 'approved_at',
        ];

        if (isset($sortableColumns[$sortBy])) {
            $query->orderBy($sortableColumns[$sortBy], $sortOrder);
        } else {
            $query->orderByDesc('approved_at');
        }

        $statsQuery = (clone $query)->reorder();

        $data = $query->paginate($perPage)
            ->withQueryString()
            ->through(fn ($p) => $this->transformSprfProposal($p));

        return [
            'data' => $data,
            'stats' => [
                'total' => $statsQuery->count('id'),
                'today' => (clone $statsQuery)->whereDate('approved_at', now()->toDateString())->count('id'),
            ],
        ];
    }

    // ─── My Proposals (Generated tab) ──────────────────────────────

    private function getMyRoiProposals(Request $request, $userId, int $perPage)
    {
        $search    = trim((string) $request->input('gen_search', ''));
        $status    = $request->input('gen_status', '');
        $sortBy    = (string) $request->input('gen_sort_by', 'updated_at');
        $sortOrder = strtolower((string) $request->input('gen_sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = Proposal::query()
            ->select('proposals.*')
            ->where('proposals.user_id', $userId)
            ->where('proposals.project_type', 'roi')
            ->whereNotIn('proposals.status', ['awarded', 'closed'])
            ->with('roiArchiveProject');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('proposals.company_name', 'like', "%{$search}%")
                  ->orWhereHas('roiArchiveProject', function ($sub) use ($search) {
                      $sub->where('reference', 'like', "%{$search}%");
                  });
            });
        }

        if (in_array($status, ['draft', 'generated'], true)) {
            $query->where('proposals.status', $status);
        }

        $sortableColumns = [
            'company_name' => 'proposals.company_name',
            'status'       => 'proposals.status',
            'updated_at'   => 'proposals.updated_at',
            'proposal_ref' => 'proposals.proposal_ref',
        ];

        if ($sortBy === 'project_ref') {
            $query->leftJoin('roi_archive_projects', 'proposals.roi_archive_project_id', '=', 'roi_archive_projects.id')
                ->orderBy('roi_archive_projects.reference', $sortOrder);
        } elseif (isset($sortableColumns[$sortBy])) {
            $query->orderBy($sortableColumns[$sortBy], $sortOrder);
        } else {
            $query->orderByDesc('proposals.updated_at');
        }

        return $query->paginate($perPage, ['*'], 'roi_page')
            ->withQueryString()
            ->through(fn (Proposal $p) => [
                'id'             => $p->roiArchiveProject?->id,
                'proposal_id'    => $p->id,
                'proposal_ref'   => $p->proposal_ref ?? 'DRAFT',
                'company_name'   => $p->company_name,
                'status'         => $p->status,
                'project_type'   => 'roi',
                'updated_at'     => $p->updated_at->diffForHumans(),
                'generated_at'   => $p->generated_at?->toIso8601String(),
                'archived_at'    => $p->archived_at?->toIso8601String(),
                'aging_seconds'  => $p->agingSeconds(),
                'aging_display'  => $p->agingDisplay(),
                'contract_years' => $p->roiArchiveProject->contract_years ?? '—',
                'project_ref'    => $p->roiArchiveProject->reference ?? '—',
            ]);
    }

    private function getMySprfProposals(Request $request, $userId, int $perPage)
    {
        $search    = trim((string) $request->input('gen_search', ''));
        $status    = $request->input('gen_status', '');
        $sortBy    = (string) $request->input('gen_sort_by', 'updated_at');
        $sortOrder = strtolower((string) $request->input('gen_sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = Proposal::query()
            ->select('proposals.*')
            ->where('proposals.user_id', $userId)
            ->where('proposals.project_type', 'sprf')
            ->whereNotIn('proposals.status', ['awarded', 'closed'])
            ->with('sprfArchiveProject');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('proposals.company_name', 'like', "%{$search}%")
                  ->orWhereHas('sprfArchiveProject', function ($sub) use ($search) {
                      $sub->where('sprf_no', 'like', "%{$search}%");
                  });
            });
        }

        if (in_array($status, ['draft', 'generated'], true)) {
            $query->where('proposals.status', $status);
        }

        $sortableColumns = [
            'company_name' => 'proposals.company_name',
            'status'       => 'proposals.status',
            'updated_at'   => 'proposals.updated_at',
            'proposal_ref' => 'proposals.proposal_ref',
        ];

        if ($sortBy === 'project_ref') {
            $query->leftJoin('sprf_archive_projects', 'proposals.sprf_archive_project_id', '=', 'sprf_archive_projects.id')
                ->orderBy('sprf_archive_projects.sprf_no', $sortOrder);
        } elseif (isset($sortableColumns[$sortBy])) {
            $query->orderBy($sortableColumns[$sortBy], $sortOrder);
        } else {
            $query->orderByDesc('proposals.updated_at');
        }

        return $query->paginate($perPage, ['*'], 'sprf_page')
            ->withQueryString()
            ->through(fn (Proposal $p) => [
                'id'             => $p->sprfArchiveProject?->id,
                'proposal_id'    => $p->id,
                'proposal_ref'   => $p->proposal_ref ?? 'DRAFT',
                'company_name'   => $p->company_name,
                'status'         => $p->status,
                'project_type'   => 'sprf',
                'updated_at'     => $p->updated_at->diffForHumans(),
                'generated_at'   => $p->generated_at?->toIso8601String(),
                'archived_at'    => $p->archived_at?->toIso8601String(),
                'aging_seconds'  => $p->agingSeconds(),
                'aging_display'  => $p->agingDisplay(),
                'contract_years' => '—',
                'project_ref'    => $p->sprfArchiveProject->sprf_no ?? '—',
            ]);
    }

    // ─── My Proposals (Archived tab: awarded / closed) ─────────────

    private function getMyArchivedRoiProposals(Request $request, $userId, int $perPage)
    {
        $search    = trim((string) $request->input('arch_search', ''));
        $status    = $request->input('arch_status', '');
        $sortBy    = (string) $request->input('arch_sort_by', 'archived_at');
        $sortOrder = strtolower((string) $request->input('arch_sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = Proposal::query()
            ->select('proposals.*')
            ->where('proposals.user_id', $userId)
            ->where('proposals.project_type', 'roi')
            ->whereIn('proposals.status', ['awarded', 'closed'])
            ->with('roiArchiveProject');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('proposals.company_name', 'like', "%{$search}%")
                  ->orWhereHas('roiArchiveProject', function ($sub) use ($search) {
                      $sub->where('reference', 'like', "%{$search}%");
                  });
            });
        }

        if (in_array($status, ['awarded', 'closed'], true)) {
            $query->where('proposals.status', $status);
        }

        $sortableColumns = [
            'company_name' => 'proposals.company_name',
            'status'       => 'proposals.status',
            'archived_at'  => 'proposals.archived_at',
            'updated_at'   => 'proposals.updated_at',
            'proposal_ref' => 'proposals.proposal_ref',
        ];

        if ($sortBy === 'project_ref') {
            $query->leftJoin('roi_archive_projects', 'proposals.roi_archive_project_id', '=', 'roi_archive_projects.id')
                ->orderBy('roi_archive_projects.reference', $sortOrder);
        } elseif (isset($sortableColumns[$sortBy])) {
            $query->orderBy($sortableColumns[$sortBy], $sortOrder);
        } else {
            $query->orderByDesc('proposals.archived_at');
        }

        return $query->paginate($perPage, ['*'], 'archived_roi_page')
            ->withQueryString()
            ->through(fn (Proposal $p) => [
                'id'             => $p->roiArchiveProject?->id,
                'proposal_id'    => $p->id,
                'proposal_ref'   => $p->proposal_ref ?? 'DRAFT',
                'company_name'   => $p->company_name,
                'status'         => $p->status,
                'project_type'   => 'roi',
                'updated_at'     => $p->updated_at->diffForHumans(),
                'generated_at'   => $p->generated_at?->toIso8601String(),
                'archived_at'    => $p->archived_at?->toIso8601String(),
                'aging_seconds'  => $p->agingSeconds(),
                'aging_display'  => $p->agingDisplay(),
                'contract_years' => $p->roiArchiveProject->contract_years ?? '—',
                'project_ref'    => $p->roiArchiveProject->reference ?? '—',
            ]);
    }

    private function getMyArchivedSprfProposals(Request $request, $userId, int $perPage)
    {
        $search    = trim((string) $request->input('arch_search', ''));
        $status    = $request->input('arch_status', '');
        $sortBy    = (string) $request->input('arch_sort_by', 'archived_at');
        $sortOrder = strtolower((string) $request->input('arch_sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = Proposal::query()
            ->select('proposals.*')
            ->where('proposals.user_id', $userId)
            ->where('proposals.project_type', 'sprf')
            ->whereIn('proposals.status', ['awarded', 'closed'])
            ->with('sprfArchiveProject');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('proposals.company_name', 'like', "%{$search}%")
                  ->orWhereHas('sprfArchiveProject', function ($sub) use ($search) {
                      $sub->where('sprf_no', 'like', "%{$search}%");
                  });
            });
        }

        if (in_array($status, ['awarded', 'closed'], true)) {
            $query->where('proposals.status', $status);
        }

        $sortableColumns = [
            'company_name' => 'proposals.company_name',
            'status'       => 'proposals.status',
            'archived_at'  => 'proposals.archived_at',
            'updated_at'   => 'proposals.updated_at',
            'proposal_ref' => 'proposals.proposal_ref',
        ];

        if ($sortBy === 'project_ref') {
            $query->leftJoin('sprf_archive_projects', 'proposals.sprf_archive_project_id', '=', 'sprf_archive_projects.id')
                ->orderBy('sprf_archive_projects.sprf_no', $sortOrder);
        } elseif (isset($sortableColumns[$sortBy])) {
            $query->orderBy($sortableColumns[$sortBy], $sortOrder);
        } else {
            $query->orderByDesc('proposals.archived_at');
        }

        return $query->paginate($perPage, ['*'], 'archived_sprf_page')
            ->withQueryString()
            ->through(fn (Proposal $p) => [
                'id'             => $p->sprfArchiveProject?->id,
                'proposal_id'    => $p->id,
                'proposal_ref'   => $p->proposal_ref ?? 'DRAFT',
                'company_name'   => $p->company_name,
                'status'         => $p->status,
                'project_type'   => 'sprf',
                'updated_at'     => $p->updated_at->diffForHumans(),
                'generated_at'   => $p->generated_at?->toIso8601String(),
                'archived_at'    => $p->archived_at?->toIso8601String(),
                'aging_seconds'  => $p->agingSeconds(),
                'aging_display'  => $p->agingDisplay(),
                'contract_years' => '—',
                'project_ref'    => $p->sprfArchiveProject->sprf_no ?? '—',
            ]);
    }

    // ─── Show Proposal Page ───────────────────────────────────────

    public function show(Request $request, $id)
    {
        $type    = $request->input('type', 'roi'); // 'roi' | 'sprf'
        $userId  = (int) Auth::id();
        $isAdmin = $userId === 1;

        if ($type === 'sprf') {
            $project = SprfArchiveProject::with(['items.subitems', 'fees', 'preparer'])->findOrFail($id);

            $isOwner    = (int) $project->prepared_by_user_id === $userId;
            $isApprover = in_array($userId, array_filter([
                (int) ($project->director_customer_engagement_user_id ?? 0),
                (int) ($project->esd_director_user_id ?? 0),
                (int) ($project->vp_ccto_user_id ?? 0),
                (int) ($project->president_ceo_user_id ?? 0),
                (int) ($project->approved_by_user_id ?? 0),
            ]), true);

            abort_unless($isOwner || $isApprover || $isAdmin, 403, 'You are not authorized to view this proposal.');

            $document = Proposal::where('sprf_archive_project_id', $id)
                ->where('project_type', 'sprf')
                ->latest()
                ->first();

            return Inertia::render('CustomerManagement/Proposal/Proposal', [
                'proposal'     => $this->buildSprfProposal($project, $document),
                'items'        => $this->normalizeSprfItems($project->items),
                'fees'         => $this->normalizeSprfFees($project->fees),
                'is_locked'    => $document?->isGenerated() ?? false,
                'is_owner'     => $isOwner,
                'project_type' => 'sprf',
            ]);
        }

        $project = RoiArchiveProject::with(['items', 'fees', 'user'])->findOrFail($id);

        $isOwner = (int) $project->user_id === $userId;
        $isApprover = in_array($userId, array_filter([
            (int) ($project->reviewed_by  ?? 0),
            (int) ($project->checked_by   ?? 0),
            (int) ($project->endorsed_by  ?? 0),
            (int) ($project->confirmed_by ?? 0),
            (int) ($project->approved_by  ?? 0),
        ]), true);

        abort_unless($isOwner || $isApprover || $isAdmin, 403, 'You are not authorized to view this proposal.');

        $document = Proposal::where('roi_archive_project_id', $id)
            ->where('project_type', 'roi')
            ->latest()
            ->first();

        return Inertia::render('CustomerManagement/Proposal/Proposal', [
            'proposal'     => $this->buildProposal($project, $document),
            'items'        => $this->normalizeRoiItems($project->items),
            'fees'         => $this->normalizeRoiFees($project->fees),
            'is_locked'    => $document?->isGenerated() ?? false,
            'is_owner'     => $isOwner,
            'project_type' => 'roi',
        ]);
    }

    // ─── Save Draft ───────────────────────────────────────────────

    public function saveDraft(Request $request, $id)
    {
        $type = $request->input('type', 'roi');

        if ($type === 'sprf') {
            SprfArchiveProject::where('prepared_by_user_id', Auth::id())->findOrFail($id);
            $existing = Proposal::where('sprf_archive_project_id', $id)
                ->where('project_type', 'sprf')
                ->where('user_id', Auth::id())
                ->latest()->first();
        } else {
            RoiArchiveProject::where('user_id', Auth::id())->findOrFail($id);
            $existing = Proposal::where('roi_archive_project_id', $id)
                ->where('project_type', 'roi')
                ->where('user_id', Auth::id())
                ->latest()->first();
        }

        if ($existing?->isGenerated()) {
            return back()->with('error', 'This proposal has already been generated and cannot be edited.');
        }

        $data = $request->validate($this->rules());
        $data['unit_price'] = $data['unit_price'] ?? 0;

        $key = $type === 'sprf'
            ? ['sprf_archive_project_id' => $id, 'user_id' => Auth::id(), 'project_type' => 'sprf']
            : ['roi_archive_project_id' => $id, 'user_id' => Auth::id(), 'project_type' => 'roi'];

        Proposal::updateOrCreate($key, array_merge($data, ['status' => 'draft', 'project_type' => $type]));

        return redirect()->route('proposals.index')->with('success', 'Draft saved successfully.');
    }

    // ─── Generate Proposal ────────────────────────────────────────

    public function generate(Request $request, $id)
    {
        $type = $request->input('type', 'roi');

        if ($type === 'sprf') {
            SprfArchiveProject::where('prepared_by_user_id', Auth::id())->findOrFail($id);
            $existing = Proposal::where('sprf_archive_project_id', $id)
                ->where('project_type', 'sprf')
                ->where('user_id', Auth::id())
                ->latest()->first();
        } else {
            RoiArchiveProject::where('user_id', Auth::id())->findOrFail($id);
            $existing = Proposal::where('roi_archive_project_id', $id)
                ->where('project_type', 'roi')
                ->where('user_id', Auth::id())
                ->latest()->first();
        }

        if ($existing?->isGenerated()) {
            return back()->with('error', 'This proposal has already been generated.');
        }

        $data = $request->validate($this->rules());
        $data['unit_price'] = $data['unit_price'] ?? 0;

        $year     = now()->format('Y');
        $sequence = str_pad(Proposal::whereYear('created_at', $year)->count() + 1, 5, '0', STR_PAD_LEFT);
        $ref      = "PROP-{$year}-{$sequence}";

        $key = $type === 'sprf'
            ? ['sprf_archive_project_id' => $id, 'user_id' => Auth::id(), 'project_type' => 'sprf']
            : ['roi_archive_project_id' => $id, 'user_id' => Auth::id(), 'project_type' => 'roi'];

        Proposal::updateOrCreate($key, array_merge($data, [
            'status'       => 'generated',
            'proposal_ref' => $ref,
            'project_type' => $type,
            'generated_at' => now(), // aging clock starts here
        ]));

        return redirect()->route('proposals.index')->with('success', 'Proposal generated successfully.');
    }

    // ─── Change Status (awarded / closed) ──────────────────────────

    public function changeStatus(Request $request, $id)
    {
        $request->validate([
            'status' => ['required', 'in:awarded,closed'],
        ]);

        $proposal = Proposal::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        if (!$proposal->isGenerated()) {
            return back()->with('error', 'Only generated proposals can be marked as awarded or closed.');
        }

        $proposal->update([
            'status'      => $request->status,
            'archived_at' => now(), // aging clock stops here
        ]);

        return back()->with('success', "Proposal marked as {$request->status}.");
    }

    // ─── Item/Fee Normalizers ───────────────────────────────────────

    private function normalizeRoiItems($items)
    {
        return $items->map(fn ($i) => [
            'id'          => $i->id,
            'description' => $i->sku ?? $i->remarks ?? '—',
            'qty'         => $i->qty,
            'cost'        => $i->cost,
            'unit_price'  => $i->price,
            'total_cost'  => $i->total_cost,
            'total_sell'  => $i->total_sell,
            'raw'         => $i,
        ])->values();
    }

    private function normalizeRoiFees($fees)
    {
        return $fees->map(fn ($f) => [
            'id'          => $f->id,
            'description' => $f->label,
            'category'    => $f->category,
            'qty'         => $f->qty,
            'unit_price'  => $f->cost,
            'total'       => $f->total,
            'is_machine'  => $f->is_machine,
            'raw'         => $f,
        ])->values();
    }

    /**
     * SPRF items are two-level: a group with a blended selling price,
     * containing subitems that carry the actual product/cost breakdown.
     * Selling price only exists at the group level.
     */
    private function normalizeSprfItems($items)
    {
        return $items->map(fn ($group) => [
            'id'                  => $group->id,
            'label'               => $group->row_key ?? "Group #{$group->id}",
            'total_cost'          => $group->total_cost,
            'selling_price_unit'  => $group->selling_price_per_unit_vat_inc,
            'selling_price_total' => $group->total_selling_price_vat_inc,
            'markup_value'        => $group->markup_value,
            'subitems'            => $group->subitems->map(fn ($s) => [
                'id'             => $s->id,
                'product_code'   => $s->product_code,
                'description'    => $s->item_description,
                'qty'            => $s->qty,
                'disty'          => $s->disty,
                'cost_per_unit'  => $s->cost_per_unit,
                'total_cost'     => $s->total_cost,
                'markup_percent' => $s->markup_percent,
            ])->values(),
            'raw' => $group,
        ])->values();
    }

    private function normalizeSprfFees($fees)
    {
        return $fees->map(fn ($f) => [
            'id'          => $f->id,
            'description' => $f->item_description,
            'category'    => $f->product_code,
            'qty'         => $f->qty,
            'unit_price'  => $f->unit_price,
            'total'       => $f->total,
            'is_fixed'    => $f->is_fixed,
            'raw'         => $f,
        ])->values();
    }

    // ─── Private Helpers ──────────────────────────────────────────

    private function transformRoiProposal($p)
    {
        $p->user_data = $p->user ? ['name' => $p->user->name, 'role' => $p->user->role] : null;
        $p->decision_display   = 'Approved';
        $p->decided_by_name    = $p->approver->name ?? '—';
        $p->decided_at_display = $p->approved_at ? $p->approved_at->diffForHumans() : '—';
        $p->project_type = 'roi';

        return $p;
    }

    private function transformSprfProposal($p)
    {
        $p->decision_display   = 'Approved';
        $p->decided_by_name    = $p->approvedBy->name ?? '—';
        $p->decided_at_display = $p->approved_at ? $p->approved_at->diffForHumans() : '—';
        $p->project_type = 'sprf';
        $p->reference = $p->sprf_no;

        return $p;
    }

    private function buildProposal(RoiArchiveProject $project, ?Proposal $doc): array
    {
        $user = $project->user;
        $userSignature = null;

        if ($user?->employee_id) {
            foreach (['png', 'jpg', 'jpeg', 'webp'] as $ext) {
                $path = 'signatures/' . $user->employee_id . '.' . $ext;
                if (Storage::disk('public')->exists($path)) {
                    $userSignature = asset('storage/' . $path) . '?v=' . filemtime(storage_path('app/public/' . $path));
                    break;
                }
            }
        }

        $base = [
            'id'             => $project->id,
            'proposal_id'    => $doc?->id,
            'company_name'   => $project->company_name,
            'attention'      => null,
            'designation'    => null,
            'email'          => null,
            'mobile'         => null,
            'contract_type'  => $project->contract_type,
            'contract_years' => $project->contract_years,
            'reference'      => $project->reference,
            'user'           => $project->user ? [
                'name' => $project->user->name,
                'role' => $project->user->role,
                'position' => $project->user->position,
            ] : null,

            'proposal_ref'       => null,
            'status'             => 'draft',
            'message'            => null,
            'specs'              => null,
            'printer_image'      => null,
            'unit_price'         => 0,
            'terms_text'         => null,
            'closing_text'       => null,
            'user_signature'     => $userSignature,
            'conforme_name'      => null,
            'conforme_signature' => null,
        ];

        if (!$doc) {
            return $base;
        }

        return array_merge($base, [
            'proposal_id'        => $doc->id,
            'proposal_ref'       => $doc->proposal_ref,
            'status'             => $doc->status,
            'message'            => $doc->message,
            'specs'              => $doc->specs ?? [],
            'printer_image'      => $doc->printer_image,
            'unit_price'         => $doc->unit_price,
            'terms_text'         => $doc->terms_text,
            'closing_text'       => $doc->closing_text,
            'conforme_name'      => $doc->conforme_name,
            'conforme_signature' => $doc->conforme_signature,
            'company_name'  => $doc->company_name  ?? $project->company_name,
            'attention'     => $doc->attention     ?? null,
            'designation'   => $doc->designation   ?? null,
            'email'         => $doc->email         ?? null,
            'mobile'        => $doc->mobile        ?? null,
        ]);
    }

    /**
     * NOTE: company_name falls back to company_sap_code since SprfArchiveProject
     * doesn't expose a company name field directly — swap in a real relation if one exists.
     */
    private function buildSprfProposal(SprfArchiveProject $project, ?Proposal $doc): array
    {
        $user = $project->preparer;
        $userSignature = null;

        if ($user?->employee_id) {
            foreach (['png', 'jpg', 'jpeg', 'webp'] as $ext) {
                $path = 'signatures/' . $user->employee_id . '.' . $ext;
                if (Storage::disk('public')->exists($path)) {
                    $userSignature = asset('storage/' . $path) . '?v=' . filemtime(storage_path('app/public/' . $path));
                    break;
                }
            }
        }

        $base = [
            'id'             => $project->id,
            'proposal_id'    => $doc?->id,
            'company_name'   => $project->company_sap_code,
            'attention'      => null,
            'designation'    => null,
            'email'          => null,
            'mobile'         => null,
            'contract_type'  => null,
            'contract_years' => null,
            'reference'      => $project->sprf_no,
            'user'           => $user ? [
                'name' => $user->name,
                'role' => $user->role,
                'position' => $user->position,
            ] : null,

            'proposal_ref'       => null,
            'status'             => 'draft',
            'message'            => null,
            'specs'              => null,
            'printer_image'      => null,
            'unit_price'         => 0,
            'terms_text'         => null,
            'closing_text'       => null,
            'user_signature'     => $userSignature,
            'conforme_name'      => null,
            'conforme_signature' => null,
        ];

        if (!$doc) {
            return $base;
        }

        return array_merge($base, [
            'proposal_id'        => $doc->id,
            'proposal_ref'       => $doc->proposal_ref,
            'status'             => $doc->status,
            'message'            => $doc->message,
            'specs'              => $doc->specs ?? [],
            'printer_image'      => $doc->printer_image,
            'unit_price'         => $doc->unit_price,
            'terms_text'         => $doc->terms_text,
            'closing_text'       => $doc->closing_text,
            'conforme_name'      => $doc->conforme_name,
            'conforme_signature' => $doc->conforme_signature,
            'company_name'  => $doc->company_name  ?? $base['company_name'],
            'attention'     => $doc->attention     ?? null,
            'designation'   => $doc->designation   ?? null,
            'email'         => $doc->email         ?? null,
            'mobile'        => $doc->mobile        ?? null,
        ]);
    }

    private function rules(): array
    {
        return [
            'company_name'       => ['nullable', 'string', 'max:255'],
            'attention'          => ['nullable', 'string', 'max:255'],
            'designation'        => ['nullable', 'string', 'max:255'],
            'email'              => ['nullable', 'email', 'max:255'],
            'mobile'             => ['nullable', 'string', 'max:50'],
            'message'            => ['nullable', 'string'],
            'specs'              => ['nullable', 'string'],
            'specs.*.label'      => ['nullable', 'string', 'max:255'],
            'specs.*.value'      => ['nullable', 'string', 'max:255'],
            'printer_image'      => ['nullable', 'string'],
            'unit_price'         => ['nullable', 'numeric', 'min:0'],
            'terms_text'         => ['nullable', 'string'],
            'closing_text'       => ['nullable', 'string'],
            'user_signature'     => ['nullable', 'string'],
            'conforme_name'      => ['nullable', 'string', 'max:255'],
            'conforme_signature' => ['nullable', 'string'],
        ];
    }

    public function print($id)
    {
        $proposal = Proposal::with(['roiArchiveProject', 'sprfArchiveProject', 'user'])->findOrFail($id);
        $project  = $proposal->resolveProject();

        $items = $proposal->isSprf()
            ? $this->normalizeSprfItems($project?->items()->with('subitems')->get() ?? collect())
            : $this->normalizeRoiItems($project?->items ?? collect());

        $fees = $proposal->isSprf()
            ? $this->normalizeSprfFees($project?->fees ?? collect())
            : $this->normalizeRoiFees($project?->fees ?? collect());

        return Inertia::render('CustomerManagement/Proposal/ProposalPrint', [
            'proposal' => [
                ...$proposal->toArray(),
                'contract_type'  => $proposal->isRoi() ? ($project?->contract_type ?? null) : null,
                'contract_years' => $proposal->isRoi() ? ($project?->contract_years ?? null) : null,
                'project_type'   => $proposal->project_type,
            ],
            'items' => $items,
            'fees'  => $fees,
            'showDraftWatermark' => $proposal->status === 'draft',
        ]);
    }
}