<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\RoiArchiveProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // Added for Auth
use Inertia\Inertia;

class ProposalController extends Controller
{
    /**
     * List only APPROVED projects for the CURRENT user
     */
    public function proposalList(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);
        $userId = Auth::id(); // Get the current logged-in user ID

        // 1. Build the base query with specific filters
        $query = RoiArchiveProject::query()
            ->where('roi_archive_projects.user_id', $userId) // Only this user's projects
            ->where('roi_archive_projects.status', 'approved') // Only approved projects
            ->with('user')
            ->leftJoin('users as approved_user', 'roi_archive_projects.approved_by', '=', 'approved_user.id')
            ->select([
                'roi_archive_projects.*',
                'approved_user.name as approved_by_name',
            ])
            ->orderByDesc('roi_archive_projects.updated_at');

        // 2. Paginate and transform
        $proposals = $query->paginate($perPage)
            ->withQueryString()
            ->through(fn ($p) => $this->transformProposal($p));

        // 3. Calculate Stats based on the same user context
        $stats = [
            'totalArchiveProjects' => RoiArchiveProject::where('user_id', $userId)
                ->where('status', 'approved')
                ->count(),
            'recentlyArchivedToday' => RoiArchiveProject::where('user_id', $userId)
                ->where('status', 'approved')
                ->whereDate('updated_at', now()->toDateString())
                ->count() . ' Today',
        ];

        return Inertia::render('CustomerManagement/Proposal/ProposalList', [
            'proposals' => $proposals,
            'stats' => $stats,
        ]);
    }

    /**
     * Show a single proposal - with security check
     */
/**
     * Show a single proposal with core info for generation:
     * Company Info, Machine Configs/Items, Fees, and Contract Details
     */
  public function show($id)
    {
        // Fetch project with only the specific relationships needed
        $project = RoiArchiveProject::with(['items', 'fees', 'user'])
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        // We use the existing transformProposal to get the 'decided_at_display' 
        // and 'decided_by_name' you already logic-ed out.
        $proposal = $this->transformProposal($project);

        return Inertia::render('CustomerManagement/Proposal/Proposal', [
            'proposal' => $proposal,
            // These are included in the 'proposal' object because of with(), 
            // but we pass them explicitly if your frontend prefers separate props.
            'items'    => $project->items,
            'fees'     => $project->fees,
        ]);
    }

    /**
     * Helper to keep logic DRY
     */
    private function transformProposal($p)
    {
        // Since the list is filtered to 'approved', logic is simplified
        $p->decision_display = 'Approved';
        $p->decided_by_name = $p->approved_by_name ?? '—';
        
        $decidedAt = $p->approved_at;
        $p->decided_at_display = $decidedAt ? $decidedAt->diffForHumans() : '—';

        return $p;
    }
}