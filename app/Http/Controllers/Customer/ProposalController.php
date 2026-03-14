<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Proposal;
use App\Models\RoiArchiveProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProposalController extends Controller
{
    // ─── Proposal List ────────────────────────────────────────────

public function proposalList(Request $request)
{
    $perPage = (int) $request->input('per_page', 10);
    $userId  = Auth::id();

    // 1. Get Approved Projects
    $archiveQuery = RoiArchiveProject::query()
        // Prefix with table name to avoid "Column not found" or "Ambiguous" errors
        ->where('roi_archive_projects.user_id', $userId)
        ->where('roi_archive_projects.status', 'approved')
        ->whereDoesntHave('proposals', function ($query) {
            $query->where('status', 'generated');
        })
        // Eager load relationships instead of using manual leftJoin
        ->with(['user', 'approver']) 
        ->orderByDesc('roi_archive_projects.updated_at');

    // Clone for stats to avoid conflict with pagination/selects
    $statsQuery = $archiveQuery->clone();

    return Inertia::render('CustomerManagement/Proposal/ProposalRoute', [
        'proposals' => $archiveQuery->paginate($perPage)->through(fn($p) => $this->transformProposal($p)),
        'stats'     => [
            'totalArchiveProjects' => $statsQuery->count(),
            'recentlyArchivedToday' => $statsQuery->clone()
                ->whereDate('roi_archive_projects.updated_at', now()->toDateString())
                ->count() . ' Today',
        ],
        'generatedproposals' => Proposal::query()
            ->where('user_id', $userId)
            ->with(['roiArchiveProject'])
            ->orderByDesc('updated_at')
            ->paginate($perPage)
            ->through(fn($p) => [
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
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        $document = Proposal::where('roi_archive_project_id', $id)
            ->where('user_id', Auth::id())
            ->latest()
            ->first();

        return Inertia::render('CustomerManagement/Proposal/Proposal', [
            'proposal'  => $this->buildProposal($project, $document),
            'items'     => $project->items,
            'fees'      => $project->fees,
            'is_locked' => $document?->isGenerated() ?? false,
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
    $p->decision_display    = 'Approved';
    
    // Accessing via the 'approver' relationship we defined in Step 1
    $p->decided_by_name     = $p->approver->name ?? '—';
    
    $decidedAt              = $p->approved_at;
    $p->decided_at_display  = $decidedAt ? $decidedAt->diffForHumans() : '—';

    return $p;
}
  private function buildProposal(RoiArchiveProject $project, ?Proposal $doc): array
{
    $base = [
        'id'             => $project->id,
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
        ] : null,

        // Document defaults
        'proposal_ref'       => null,
        'status'             => 'draft',
        'message'            => null,
        'specs'              => [],
        'printer_image'      => null,
        'unit_price'         => 0,
        'terms_text'         => null,
        'closing_text'       => null,
        'user_signature'     => null,
        'conforme_name'      => null,
        'conforme_signature' => null,
    ];

    if (!$doc) {
        return $base;
    }

    return array_merge($base, [
        'proposal_ref'       => $doc->proposal_ref,
        'status'             => $doc->status,
        'message'            => $doc->message,
        'specs'              => $doc->specs ?? [],
        'printer_image'      => $doc->printer_image,
        'unit_price'         => $doc->unit_price,
        'terms_text'         => $doc->terms_text,
        'closing_text'       => $doc->closing_text,
        'user_signature'     => $doc->user_signature,
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
            'designation'       => ['nullable', 'string', 'max:255'],
            'email'              => ['nullable', 'email', 'max:255'],
            'mobile'             => ['nullable', 'string', 'max:50'],
            'message'            => ['nullable', 'string'],
            'specs'              => ['nullable', 'array'],
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

    // ProposalController.php

}