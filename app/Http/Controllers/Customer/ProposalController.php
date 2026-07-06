<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Proposal;
use App\Models\RoiArchiveProject;
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

        // ── Incoming filter/sort params ──
        $search     = trim((string) $request->input('search', ''));
        $type       = $request->input('type', '');
        $dateFrom   = $request->input('date_from');
        $dateTo     = $request->input('date_to');
        $decidedBy  = trim((string) $request->input('decided_by', ''));
        $locationId = $request->input('location_id');
        $sortBy     = (string) $request->input('sort_by', '');
        $sortOrder  = strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        // 1. Get Approved Projects
        $archiveQuery = RoiArchiveProject::query()
            ->select('roi_archive_projects.*')
            ->where('roi_archive_projects.user_id', $userId)
            ->where('roi_archive_projects.status', 'approved')
            ->with(['user', 'approver'])
            ->whereDoesntHave('proposals', function ($query) {
                $query->whereIn('status', ['draft', 'generated']); // ← now excludes drafted too
            });

        // ── Search (reference / company name / sap code) ──
        if ($search !== '') {
            $archiveQuery->where(function ($q) use ($search) {
                $q->where('roi_archive_projects.reference', 'like', "%{$search}%")
                  ->orWhere('roi_archive_projects.company_name', 'like', "%{$search}%")
                  ->orWhere('roi_archive_projects.company_sap_code', 'like', "%{$search}%");
            });
        }

        // ── Type filter (1 = Existing, 0 = Potential) ──
        if ($type !== '' && $type !== null) {
            $archiveQuery->where('roi_archive_projects.type', (int) $type);
        }

        // ── Date range, based on approval date ──
        if ($dateFrom) {
            $archiveQuery->whereDate('roi_archive_projects.approved_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $archiveQuery->whereDate('roi_archive_projects.approved_at', '<=', $dateTo);
        }

        // ── Decided By (approver name) ──
        // NOTE: `name` on the User model is a computed accessor (first_name + last_name),
        // not a real column — so we match against the underlying columns instead,
        // plus a concatenated version so full-name searches like "Kim Santos" still work.
        if ($decidedBy !== '') {
            $archiveQuery->whereHas('approver', function ($q) use ($decidedBy) {
                $q->where(function ($sub) use ($decidedBy) {
                    $sub->where('first_name', 'like', "%{$decidedBy}%")
                        ->orWhere('last_name', 'like', "%{$decidedBy}%")
                        ->orWhereRaw("CONCAT(first_name, ' ', last_name) like ?", ["%{$decidedBy}%"]);
                });
            });
        }

        // ── Location ──
        if ($locationId) {
            $archiveQuery->where('roi_archive_projects.location_id', $locationId);
        }

        // ── Sorting ──
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
            $archiveQuery->leftJoin('users as prepared_user', 'roi_archive_projects.user_id', '=', 'prepared_user.id')
                ->orderBy('prepared_user.first_name', $sortOrder)
                ->orderBy('prepared_user.last_name', $sortOrder);
        } elseif ($sortBy === 'decided_by_name') {
            $archiveQuery->leftJoin('users as approver_user', 'roi_archive_projects.approved_by', '=', 'approver_user.id')
                ->orderBy('approver_user.first_name', $sortOrder)
                ->orderBy('approver_user.last_name', $sortOrder);
        } elseif (isset($sortableColumns[$sortBy])) {
            $archiveQuery->orderBy($sortableColumns[$sortBy], $sortOrder);
        } else {
            $archiveQuery->orderByDesc('roi_archive_projects.updated_at');
        }

        // Clone for stats to avoid conflict with pagination/selects/order
        $statsQuery = (clone $archiveQuery)->reorder();

        $proposals = $archiveQuery->paginate($perPage)
            ->withQueryString()
            ->through(fn ($p) => $this->transformProposal($p));

        $stats = [
            'totalArchiveProjects'  => $statsQuery->count('roi_archive_projects.id'),
            'recentlyArchivedToday' => (clone $statsQuery)
                ->whereDate('roi_archive_projects.updated_at', now()->toDateString())
                ->count('roi_archive_projects.id') . ' Today',
        ];

        // ── AJAX/XHR request (from the filter toolbar's axios calls) → plain JSON ──
        // Explicit header check instead of relying solely on wantsJson()/ajax(),
        // which can behave inconsistently depending on middleware/content negotiation.
          if ($request->wantsJson()) {
            return response()->json([
                'proposals' => $proposals,
                'stats'     => $stats,
            ]);
        }

        // Resolve locations defensively — never let a missing/renamed model 500 the page.
        $locations = [];
        if (class_exists(\App\Models\Location::class)) {
            $locations = \App\Models\Location::orderBy('name')->get(['id', 'name']);
        }

        return Inertia::render('CustomerManagement/Proposal/ProposalRoute', [
            'proposals' => $proposals,
            'stats'     => $stats,
            'filters'   => [
                'search'      => $search,
                'type'        => $type,
                'date_from'   => $dateFrom,
                'date_to'     => $dateTo,
                'decided_by'  => $decidedBy,
                'location_id' => $locationId,
                'sort_by'     => $sortBy,
                'sort_order'  => $sortOrder,
                'per_page'    => $perPage,
            ],
            'locations' => $locations,

            'generatedproposals' => Proposal::query()
                ->where('user_id', $userId)
                ->with(['roiArchiveProject'])
                ->orderByDesc('updated_at')
                ->paginate($perPage)
                ->through(fn ($p) => [
                    'id'             => $p->roi_archive_project_id,
                    'proposal_id'    => $p->id,
                    'proposal_ref'   => $p->proposal_ref ?? 'DRAFT',
                    'company_name'   => $p->company_name,
                    'status'         => $p->status,
                    'updated_at'     => $p->updated_at->diffForHumans(),
                    'contract_years' => $p->roiArchiveProject->contract_years ?? '—',
                    'project_ref'    => $p->roiArchiveProject->reference ?? '—',
                ]),
            'generatedstats' => [
                'totalProposals' => Proposal::where('user_id', $userId)->count(),
                'generatedCount' => Proposal::where('user_id', $userId)->where('status', 'generated')->count(),
            ],
        ]);
    }



    // ─── Show Proposal Page ───────────────────────────────────────

public function show($id)
{
    $project = RoiArchiveProject::with(['items', 'fees', 'user'])
        ->findOrFail($id);

    $userId  = (int) Auth::id();
    $isOwner = (int) $project->user_id === $userId;
    $isAdmin = $userId === 1;

    // Was this user assigned at ANY workflow level (2-6) on this project?
    $isApprover = in_array($userId, array_filter([
        (int) ($project->reviewed_by  ?? 0),
        (int) ($project->checked_by   ?? 0),
        (int) ($project->endorsed_by  ?? 0),
        (int) ($project->confirmed_by ?? 0),
        (int) ($project->approved_by  ?? 0),
    ]), true);

    abort_unless($isOwner || $isApprover || $isAdmin, 403, 'You are not authorized to view this proposal.');

    $document = Proposal::where('roi_archive_project_id', $id)
        ->latest()
        ->first();

    return Inertia::render('CustomerManagement/Proposal/Proposal', [
        'proposal'  => $this->buildProposal($project, $document),
        'items'     => $project->items,
        'fees'      => $project->fees,
        'is_locked' => $document?->isGenerated() ?? false,
        'is_owner'  => $isOwner,
    ]);
}
    // ─── Save Draft ───────────────────────────────────────────────

    public function saveDraft(Request $request, $id)
    {
        $project = RoiArchiveProject::where('user_id', Auth::id())->findOrFail($id);

        $existing = Proposal::where('roi_archive_project_id', $id)
            ->where('user_id', Auth::id())
            ->latest()
            ->first();

        if ($existing?->isGenerated()) {
            return back()->with('error', 'This proposal has already been generated and cannot be edited.');
        }

        $data = $request->validate($this->rules());
        $data['unit_price'] = $data['unit_price'] ?? 0;

        Proposal::updateOrCreate(
            [
                'roi_archive_project_id' => $id,
                'user_id'                => Auth::id(),
            ],
            array_merge($data, ['status' => 'draft'])
        );

        return redirect()->route('proposals.index')->with('success', 'Draft saved successfully.');
    }

    // ─── Generate Proposal ────────────────────────────────────────

    public function generate(Request $request, $id)
    {
        $project = RoiArchiveProject::where('user_id', Auth::id())->findOrFail($id);

        $existing = Proposal::where('roi_archive_project_id', $id)
            ->where('user_id', Auth::id())
            ->latest()
            ->first();

        if ($existing?->isGenerated()) {
            return back()->with('error', 'This proposal has already been generated.');
        }

        $data = $request->validate($this->rules());
        $data['unit_price'] = $data['unit_price'] ?? 0;

        // Build proposal ref using user's location code e.g. QC-2026-00001
        $year     = now()->format('Y');
        $sequence = str_pad(
            Proposal::whereYear('created_at', $year)->count() + 1,
            5, '0', STR_PAD_LEFT
        );
        $ref = "PROP-{$year}-{$sequence}";

      
 
        Proposal::updateOrCreate(
            [
                'roi_archive_project_id' => $id,
                'user_id'                => Auth::id(),
            ],
            array_merge($data, [
                'status'       => 'generated',
                'proposal_ref' => $ref,
            ])
        );

        return redirect()->route('proposals.index')->with('success', 'Draft saved successfully.');
    }

    // ─── Private Helpers ──────────────────────────────────────────

private function transformProposal($p)
{
    // Ensure the user relationship is converted to an array/object the frontend expects
    $p->user_data = $p->user ? [
        'name' => $p->user->name,
        'role' => $p->user->role,
    ] : null;

    $p->decision_display    = 'Approved';
    $p->decided_by_name     = $p->approver->name ?? '—';
    $p->decided_at_display  = $p->approved_at ? $p->approved_at->diffForHumans() : '—';

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
        'proposal_id'    => $doc?->id,   // ← add this
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
            'position' => $project->user->position
        ] : null,

        // Document defaults
        'proposal_ref'       => null,
        'status'             => 'draft',
        'message'            => null,
        'specs'              => null,
        'printer_image'      => null,
        'unit_price'         => 0,
        'terms_text'         => null,
        'closing_text'       => null,
         'user_signature' => $userSignature, // ← replaces null
        'conforme_name'      => null,
        'conforme_signature' => null,
    ];

    if (!$doc) {
        return $base;
    }

    // dd($userSignature, $user?->employee_id);

    return array_merge($base, [
        'proposal_id' => $doc->id,   // ← add this
        'proposal_ref'       => $doc->proposal_ref,
        'status'             => $doc->status,
        'message'            => $doc->message,
        'specs'              => $doc->specs ?? [],
        'printer_image'      => $doc->printer_image,
        'unit_price'         => $doc->unit_price,
        'terms_text'         => $doc->terms_text,
        'closing_text'       => $doc->closing_text,
        // 'user_signature'     => $doc->user_signature,
        'conforme_name'      => $doc->conforme_name,
        'conforme_signature' => $doc->conforme_signature,

        // Doc overrides base if user edited in sidebar
        'company_name'  => $doc->company_name  ?? $project->company_name,
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
    $proposal = Proposal::with(['roiArchiveProject', 'user'])->findOrFail($id);

    $project = $proposal->roiArchiveProject;

    return Inertia::render('CustomerManagement/Proposal/ProposalPrint', [
        'proposal' => [
            ...$proposal->toArray(),
            'contract_type' => $project?->contract_type,
            'contract_years' => $project?->contract_years,
        ],
        'items' => $project?->items ?? [],
        'fees' => $project?->fees ?? [],
        'showDraftWatermark' => $proposal->status === 'draft',
    ]);
}


    // ProposalController.php

}