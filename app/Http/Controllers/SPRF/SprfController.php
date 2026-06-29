<?php

namespace App\Http\Controllers\SPRF;

use App\Http\Controllers\Controller;
use App\Models\SPRF\SprfArchiveProject;
use App\Models\SPRF\SprfEntryProject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SprfController extends Controller
{
    public function entryList(Request $request)
    {
        $userId = Auth::id();
        $perPage = (int) $request->input('per_page', 10);

        $draftsQuery = SprfEntryProject::query()
            ->where('prepared_by_user_id', $userId)
            ->whereIn('status', ['draft', 'returned', 'withdrawn'])
            ->orderByDesc('updated_at');

        $drafts = (clone $draftsQuery)
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (SprfEntryProject $project) {
                return [
                    'id' => $project->id,
                    'sprf_no' => $project->sprf_no,
                    'status' => $project->status,
                    'company_name' => $project->account,
                    'sub_category' => $project->sub_category,
                    'account_manager' => $project->account_manager,
                    'revenue' => $project->revenue,
                    'gp_percent' => $project->gp_percent,
                    'approval_level' => $project->approval_level,
                    'sprf_approval_matrix_id' => $project->sprf_approval_matrix_id,
                    'approval_condition_code' => $project->approval_condition_code,
                    'last_saved_at' => optional($project->updated_at)?->toISOString(),
                    'updated_at' => optional($project->updated_at)?->format('m/d/y H:i'),
                ];
            });

        $totalDrafts = (clone $draftsQuery)->count();

        $recentlyModifiedToday = SprfEntryProject::query()
            ->where('prepared_by_user_id', $userId)
            ->whereIn('status', ['draft', 'returned', 'withdrawn'])
            ->whereDate('updated_at', now()->toDateString())
            ->count();

        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntryList', [
            'drafts' => $drafts,
            'stats' => [
                'totalDrafts' => $totalDrafts,
                'recentlyModifiedText' => $recentlyModifiedToday . ' Today',
            ],
        ]);
    }

    public function entryCreate()
    {
        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntry', [
            'approverUsers' => $this->resolveApproverUsers(),
        ]);
    }

    public function archive(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);

        $filters = $request->only([
            'search', 'status', 'per_page', 'approval_level',
            'prepared_by', 'date_from', 'date_to', 'sort_by', 'sort_order',
        ]);

        $archiveQuery = SprfArchiveProject::query()
            ->with([
                'preparer:id,first_name,last_name',
                'approvedBy:id,first_name,last_name',
                'rejectedBy:id,first_name,last_name',
            ])
            ->whereIn('status', ['approved', 'rejected']);

        // 1. Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $archiveQuery->where(function ($q) use ($search) {
                $q->where('sprf_no', 'like', "%{$search}%")
                  ->orWhere('account', 'like', "%{$search}%")
                  ->orWhere('sub_category', 'like', "%{$search}%")
                  ->orWhere('account_manager', 'like', "%{$search}%");
            });
        }

        // 2. Status
        if ($request->filled('status')) {
            $archiveQuery->where('status', $request->input('status'));
        }

        // 3. Approval Level
        if ($request->filled('approval_level')) {
            $archiveQuery->where('approval_level', $request->input('approval_level'));
        }

        // 4. Prepared By
        if ($request->filled('prepared_by')) {
            $preparedBy = $request->input('prepared_by');
            $archiveQuery->whereHas('preparer', function ($q) use ($preparedBy) {
                $q->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$preparedBy}%"]);
            });
        }

        // 5. Date Range
        if ($request->filled('date_from')) {
            $archiveQuery->where(function ($q) use ($request) {
                $q->whereDate('approved_at', '>=', $request->input('date_from'))
                  ->orWhereDate('rejected_at', '>=', $request->input('date_from'));
            });
        }
        if ($request->filled('date_to')) {
            $archiveQuery->where(function ($q) use ($request) {
                $q->whereDate('approved_at', '<=', $request->input('date_to'))
                  ->orWhereDate('rejected_at', '<=', $request->input('date_to'));
            });
        }

        // 6. Sorting
        $sortBy    = $request->input('sort_by');
        $sortOrder = in_array(strtolower($request->input('sort_order', 'desc')), ['asc', 'desc'])
            ? strtolower($request->input('sort_order', 'desc'))
            : 'desc';

        $allowedSorts = [
            'prepared_by'    => null,   // handled via join below
            'sprf_no'        => 'sprf_no',
            'sub_category'   => 'sub_category',
            'company_name'   => 'account',
            'account_manager'=> 'account_manager',
            'approval_level' => 'approval_level',
            'status'         => 'status',
            'decided_at'     => null,   // handled as raw expression below
        ];

        if ($sortBy && array_key_exists($sortBy, $allowedSorts)) {
            if ($sortBy === 'prepared_by') {
                // Join users table to sort by preparer full name
                $archiveQuery
                    ->join('users', 'users.id', '=', 'sprf_archive_projects.prepared_by_user_id')
                    ->orderByRaw("CONCAT(users.first_name, ' ', users.last_name) {$sortOrder}")
                    ->select('sprf_archive_projects.*');
            } elseif ($sortBy === 'decided_at') {
                // Sort by whichever decision date is set (approved_at or rejected_at)
                $archiveQuery->orderByRaw(
                    "COALESCE(approved_at, rejected_at) {$sortOrder}"
                );
            } else {
                $archiveQuery->orderBy($allowedSorts[$sortBy], $sortOrder);
            }
        } else {
            // Default: newest decision first
            $archiveQuery->orderByRaw("COALESCE(approved_at, rejected_at) DESC");
        }

        $archiveProjects = (clone $archiveQuery)
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (SprfArchiveProject $project) {
                $isRejected = strtolower((string) ($project->status ?? '')) === 'rejected';
                return [
                    'id'              => $project->id,
                    'sprf_no'         => $project->sprf_no,
                    'status'          => $project->status,
                    'approval_level'  => $project->approval_level,
                    'company_name'    => $project->account,
                    'sub_category'    => $project->sub_category,
                    'account_manager' => $project->account_manager,
                    'prepared_by'     => $project->preparer?->first_name . ' ' . $project->preparer?->last_name,
                    'decided_by_name' => $isRejected
                        ? ($project->rejectedBy?->first_name . ' ' . $project->rejectedBy?->last_name ?? '—')
                        : ($project->approvedBy?->first_name . ' ' . $project->approvedBy?->last_name ?? '—'),
                    'decided_at_display' => ($isRejected ? $project->rejected_at : $project->approved_at)?->format('M d, Y') ?? '—',
                ];
            });

        return Inertia::render('CustomerManagement/ProjectSPRF/ArchiveRoutes/ArchiveList', [
            'archiveProjects' => $archiveProjects,
            'filters'         => $filters,
            'stats'           => [
                'totalArchiveProjects'  => (clone $archiveQuery)->count(),
                'recentlyArchivedToday' => SprfArchiveProject::whereIn('status', ['approved', 'rejected'])
                    ->where(fn($q) => $q
                        ->whereDate('approved_at', now()->toDateString())
                        ->orWhereDate('rejected_at', now()->toDateString())
                    )
                    ->count() . ' Today',
            ],
        ]);
    }

    public function archiveShow(SprfArchiveProject $project)
    {
        $project->load([
            'items.subitems',
            'fees',
            'preparer:id,first_name,last_name,position,email',
            'approvedBy:id,first_name,last_name,position,email',
            'rejectedBy:id,first_name,last_name,position,email',
        ]);

        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntry', [
            'project'        => $this->transformArchiveProjectForFrontend($project),
            'initialProject' => $this->transformArchiveProjectForFrontend($project),
            'approverUsers'  => $this->mapApproverUsersFromArchiveProject($project),
            'readOnly'       => true,
            'route'          => 'archive',
            'createdBy'      => $project->preparer?->name ?? '—',
            'timestamps'     => [
                'submitted_at'         => $project->submitted_at?->toIso8601String(),
                'dce_acted_at'         => $project->dce_acted_at?->toIso8601String(),
                'esd_acted_at'         => $project->esd_acted_at?->toIso8601String(),
                'vp_ccto_acted_at'     => $project->vp_ccto_acted_at?->toIso8601String(),
                'president_ceo_acted_at' => $project->president_ceo_acted_at?->toIso8601String(),
                'rejectedAt'           => $project->rejected_at?->toIso8601String(),
                'rejectedByLevel'      => $project->status === 'rejected' ? $project->current_level : null,
            ],
        ]);
    }

    public function archivePrint(SprfArchiveProject $project)
    {
        $project->load([
            'items.subitems',
            'fees',
            'preparer:id,first_name,last_name,position,email',
            'approvedBy:id,first_name,last_name,position,email',
            'rejectedBy:id,first_name,last_name,position,email',
        ]);

        return Inertia::render('CustomerManagement/ProjectSPRF/sprfEntryPrint', [
            'entryProject'      => $this->transformArchiveProjectForPrint($project),
            'storageKey'        => request('storageKey'),
            'autoprint'         => (bool) request('autoprint', false),
            'showDraftWatermark'=> false,
        ]);
    }

    private function resolveApproverUsers(): array
    {
        return [
            'directorCustomerEngagement' => $this->findActiveUserByPosition('Director - Customer Engagement'),
            'esdDirector'                => $this->findActiveUserByPosition('Director - Enterprise Solutions'),
            'vpCcto'                     => $this->findActiveUserByPosition('VP & CCTO'),
            'presidentCeo'               => $this->findActiveUserByPosition('President & CEO'),
        ];
    }

    private function findActiveUserByPosition(string $position): ?array
    {
        $user = User::query()
            ->where('position', $position)
            ->where('is_banned', false)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) return null;

        return [
            'id'       => $user->id,
            'name'     => $user->name,
            'position' => $user->position,
            'email'    => $user->email,
        ];
    }

    private function findUserById(?int $id): ?array
    {
        if (! $id) return null;

        $user = User::query()
            ->whereKey($id)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) return null;

        return [
            'id'       => $user->id,
            'name'     => $user->name,
            'position' => $user->position,
            'email'    => $user->email,
        ];
    }

    private function mapApproverUsersFromArchiveProject(SprfArchiveProject $project): array
    {
        return [
            'directorCustomerEngagement' => $this->findUserById($project->director_customer_engagement_user_id),
            'esdDirector'                => $this->findUserById($project->esd_director_user_id),
            'vpCcto'                     => $this->findUserById($project->vp_ccto_user_id),
            'presidentCeo'               => $this->findUserById($project->president_ceo_user_id),
        ];
    }

    private function transformArchiveProjectForFrontend(SprfArchiveProject $project): array
    {
        return [
            'id'                             => $project->id,
            'sprf_no'                        => $project->sprf_no,
            'status'                         => $project->status,
            'current_level'                  => $project->current_level,
            'approval_level'                 => $project->approval_level,
            'requires_vp_ccto'               => $project->requires_vp_ccto,
            'requires_president_ceo'         => $project->requires_president_ceo,
            'requires_rebate_justification'  => $project->requires_rebate_justification,
            'sprf_approval_matrix_id'        => $project->sprf_approval_matrix_id,
            'approval_condition_code'        => $project->approval_condition_code,

            'submitted_at'           => optional($project->submitted_at)?->toISOString(),
            'approved_at'            => optional($project->approved_at)?->toISOString(),
            'rejected_at'            => optional($project->rejected_at)?->toISOString(),
            'dce_acted_at'           => optional($project->dce_acted_at)?->toISOString(),
            'esd_acted_at'           => optional($project->esd_acted_at)?->toISOString(),
            'vp_ccto_acted_at'       => optional($project->vp_ccto_acted_at)?->toISOString(),
            'president_ceo_acted_at' => optional($project->president_ceo_acted_at)?->toISOString(),

            'prepared_by_name'  => $project->preparer?->name,
            'approved_by_name'  => $project->approvedBy?->name,
            'rejected_by_name'  => $project->rejectedBy?->name,
            'last_reject_note'  => $project->last_reject_note,

            'notes'    => $project->notes    ?? [],
            'comments' => $project->comments ?? [],

            'company_info' => [
                'subCategory'    => $project->sub_category,
                'account'        => $project->account,
                'accountManager' => $project->account_manager,
            ],

            'remarks'               => $project->remarks,
            'rebate_justification'  => $project->rebate_justification,

            'items' => $project->items->map(function ($item) {
                return [
                    'rowKey'                    => $item->row_key,
                    'totalCost'                 => $item->total_cost,
                    'sellingPricePerUnitVatInc' => $item->selling_price_per_unit_vat_inc,
                    'totalSellingPriceVatInc'   => $item->total_selling_price_vat_inc,
                    'markupValue'               => $item->markup_value,
                    'subitems' => $item->subitems->map(fn($sub) => [
                        'rowKey'          => $sub->row_key,
                        'productCode'     => $sub->product_code,
                        'itemDescription' => $sub->item_description,
                        'qty'             => $sub->qty,
                        'disty'           => $sub->disty,
                        'costPerUnit'     => $sub->cost_per_unit,
                        'markupPercent'   => $sub->markup_percent,
                        'totalCost'       => $sub->total_cost,
                    ])->values()->all(),
                ];
            })->values()->all(),

            'other_expenses' => $project->fees->map(function ($fee) {
                return [
                    'expenseKey'      => $fee->expense_key,
                    'isFixed'         => $fee->is_fixed,
                    'productCode'     => $fee->product_code,
                    'itemDescription' => $fee->item_description,
                    'qty'             => $fee->qty,
                    'unitPrice'       => $fee->unit_price,
                ];
            })->values()->all(),
        ];
    }

    private function transformArchiveProjectForPrint(SprfArchiveProject $project): array
    {
        return [
            'id'                      => $project->id,
            'sprf_no'                 => $project->sprf_no,
            'status'                  => $project->status,
            'current_level'           => $project->current_level,
            'approval_level'          => $project->approval_level,
            'sprf_approval_matrix_id' => $project->sprf_approval_matrix_id,
            'approval_condition_code' => $project->approval_condition_code,
            'remarks'                 => $project->remarks,
            'last_reject_note'        => $project->last_reject_note,
            'rebate_justification'    => $project->rebate_justification,

            'notes'    => $project->notes    ?? [],
            'comments' => $project->comments ?? [],

            'created_at'             => optional($project->created_at)?->toISOString(),
            'submitted_at'           => optional($project->submitted_at)?->toISOString(),
            'rejected_at'            => optional($project->rejected_at)?->toISOString(),
            'dce_acted_at'           => optional($project->dce_acted_at)?->toISOString(),
            'esd_acted_at'           => optional($project->esd_acted_at)?->toISOString(),
            'vp_ccto_acted_at'       => optional($project->vp_ccto_acted_at)?->toISOString(),
            'president_ceo_acted_at' => optional($project->president_ceo_acted_at)?->toISOString(),

            'company_info' => [
                'subCategory'    => $project->sub_category,
                'account'        => $project->account,
                'accountManager' => $project->account_manager,
            ],

            'items' => $project->items->map(function ($item) {
                return [
                    'rowKey'                    => $item->row_key,
                    'totalCost'                 => $item->total_cost,
                    'sellingPricePerUnitVatInc' => $item->selling_price_per_unit_vat_inc,
                    'totalSellingPriceVatInc'   => $item->total_selling_price_vat_inc,
                    'markupValue'               => $item->markup_value,
                    'subitems' => $item->subitems->map(fn($sub) => [
                        'rowKey'          => $sub->row_key,
                        'productCode'     => $sub->product_code,
                        'itemDescription' => $sub->item_description,
                        'qty'             => $sub->qty,
                        'disty'           => $sub->disty,
                        'costPerUnit'     => $sub->cost_per_unit,
                        'markupPercent'   => $sub->markup_percent,
                        'totalCost'       => $sub->total_cost,
                    ])->values()->all(),
                ];
            })->values()->all(),

            'other_expenses' => $project->fees->map(function ($fee) {
                return [
                    'expenseKey'      => $fee->expense_key,
                    'isFixed'         => $fee->is_fixed,
                    'productCode'     => $fee->product_code,
                    'itemDescription' => $fee->item_description,
                    'qty'             => $fee->qty,
                    'unitPrice'       => $fee->unit_price,
                ];
            })->values()->all(),

            'approver_users' => $this->mapApproverUsersFromArchiveProject($project),

            'preparer' => [
                'id'       => $project->preparer?->id,
                'name'     => $project->preparer?->name,
                'position' => $project->preparer?->position,
                'email'    => $project->preparer?->email,
            ],
        ];
    }
}