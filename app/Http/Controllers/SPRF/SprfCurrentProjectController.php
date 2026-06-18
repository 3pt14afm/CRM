<?php

namespace App\Http\Controllers\SPRF;

use App\Http\Controllers\Controller;
use App\Models\SPRF\SprfArchiveProject;
use App\Models\SPRF\SprfCurrentProject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use App\Services\SprfActivityLogger;
use Illuminate\Support\Facades\Log;

class SprfCurrentProjectController extends Controller
{
    public function current(Request $request)
        {
            $userId = (int) Auth::id();
            $perPage = (int) $request->input('per_page', 10);

            $query = SprfCurrentProject::query()
                ->with([
                    'items.subitems',
                    'fees',
                    'preparer:id,first_name,last_name,position',
                    'currentApprover:id,first_name,last_name,position',
                ]);
              // Apply visibility restriction only if the user is not ID 1
            if ($userId !== 1) {
                $query->where(function ($q) use ($userId) {
                    $q->where('prepared_by_user_id', $userId)
                        ->orWhere('current_approver_user_id', $userId)
                        ->orWhere('director_customer_engagement_user_id', $userId)
                        ->orWhere('esd_director_user_id', $userId)
                        ->orWhere('vp_ccto_user_id', $userId)
                        ->orWhere('president_ceo_user_id', $userId);
                });
            }
                $query->whereIn('status', ['for_review', 'under_review']);

            // ─── ALIGNED SPRF DYNAMIC FILTERS ────────────────────────────────────
            
            // Global textual multi-search bar
            $query->when(filled($request->input('search')), function ($q) use ($request) {
                $search = trim($request->input('search'));
                $q->where(function ($sub) use ($search) {
                    $sub->where('sprf_no', 'like', "%{$search}%")
                        ->orWhere('account', 'like', "%{$search}%")
                        ->orWhere('account_manager', 'like', "%{$search}%");
                });
            });

            // Dedicated SPRF # Column Filter
            $query->when(filled($request->input('sprf_no')), function ($q) use ($request) {
                $q->where('sprf_no', 'like', '%' . trim($request->input('sprf_no')) . '%');
            });

            // Dedicated Account Filter
            $query->when(filled($request->input('account')), function ($q) use ($request) {
                $q->where('account', 'like', '%' . trim($request->input('account')) . '%');
            });

            // Dedicated Account Manager (AM) Filter
            $query->when(filled($request->input('account_manager')), function ($q) use ($request) {
                $q->where('account_manager', 'like', '%' . trim($request->input('account_manager')) . '%');
            });

            // Dedicated Sub Category Filter
            $query->when(filled($request->input('sub_category')), function ($q) use ($request) {
                $q->where('sub_category', 'like', '%' . trim($request->input('sub_category')) . '%');
            });

            // Dedicated Prepared By Filter (Queries the user profiles through the relation)
            $query->when(filled($request->input('prepared_by')), function ($q) use ($request) {
                $preparedBy = trim($request->input('prepared_by'));
                $q->whereHas('preparer', function ($sub) use ($preparedBy) {
                    $sub->whereRaw("CONCAT(first_name, ' ', last_name) like ?", ["%{$preparedBy}%"]);
                });
            });

            // Dropdown Approval Level Filter
            $query->when(filled($request->input('approval_level')), function ($q) use ($request) {
                $q->where('approval_level', $request->input('approval_level'));
            });

            // Dropdown Status Filter
            $query->when(filled($request->input('status')), function ($q) use ($request) {
                $q->where('status', $request->input('status'));
            });

            // Date Range Filters (last_saved_at or submitted_at context lookup)
            $query->when(filled($request->input('date_from')), function ($q) use ($request) {
                $q->whereDate('last_saved_at', '>=', $request->input('date_from'));
            });
            $query->when(filled($request->input('date_to')), function ($q) use ($request) {
                $q->whereDate('last_saved_at', '<=', $request->input('date_to'));
            });

            // Ordering structures definitions
            $query->orderByDesc('last_saved_at')
                ->orderByDesc('updated_at');

            // Apply pagination mapping
            $currentProjects = (clone $query)
                ->paginate($perPage)
                ->withQueryString()
                ->through(function (SprfCurrentProject $project) {
                    return [
                        'id' => $project->id,
                        'sprf_no' => $project->sprf_no,
                        'status' => $project->status,
                        'current_level' => $project->current_level,
                        'approval_level' => $project->approval_level,
                        'company_name' => $project->account,
                        'sub_category' => $project->sub_category,
                        'account_manager' => $project->account_manager,
                        'revenue' => $project->revenue,
                        'gp_percent' => $project->gp_percent,
                        'submitted_at' => $project->submitted_at ? $project->submitted_at->toISOString() : null,
                        'prepared_by' => $project->preparer ? $project->preparer->first_name . ' ' . $project->preparer->last_name : null,
                        'current_approver' => $project->currentApprover ? $project->currentApprover->first_name . ' ' . $project->currentApprover->last_name : null,
                        'last_saved_display' => $project->last_saved_at
                            ? $project->last_saved_at->diffForHumans()
                            : '—',
                    ];
                });

            // Active stats calculation
            $totalCurrentProjects = (clone $query)->count();

            $recentlyAddedToday = SprfCurrentProject::query()
                ->where(function ($q) use ($userId) {
                    $q->where('prepared_by_user_id', $userId)
                        ->orWhere('current_approver_user_id', $userId);
                })
                ->whereIn('status', ['for_review', 'under_review'])
                ->whereDate('last_saved_at', now()->toDateString())
                ->count();

            return Inertia::render('CustomerManagement/ProjectSPRF/CurrentRoutes/CurrentList', [
                'currentProjects' => $currentProjects,
                'stats' => [
                    'totalCurrentProjects' => $totalCurrentProjects,
                    'recentlyAddedToday' => $recentlyAddedToday . ' Today',
                ],
                'viewerId' => $userId,
                'filters' => $request->only([
                    'search', 
                    'status', 
                    'per_page', 
                    'date_from', 
                    'date_to', 
                    'sprf_no', 
                    'account', 
                    'account_manager', 
                    'sub_category',
                    'prepared_by',
                    'approval_level'
                ]),
            ]);
        }
        
    public function show(SprfCurrentProject $project)
    {
        $this->ensureCanView($project);

        $project->load([
            'items.subitems',
            'fees',
            'preparer:id,first_name,last_name,position,email',
            'currentApprover:id,first_name,last_name,position,email',
        ]);

        $transformedProject = $this->transformProjectForFrontend($project);

        return Inertia::render('CustomerManagement/ProjectSPRF/EntryRoutes/sprfEntry', [
            'project' => $transformedProject,
            'initialProject' => $transformedProject,
            'approverUsers' => $this->mapApproverUsersFromProject($project),
            'readOnly' => true,
            'route' => 'current',
            'createdBy' => $project->preparer ? $project->preparer->first_name . ' ' . $project->preparer->last_name : '—',
            'canActOnCurrentProject' => $this->currentProjectAssignedToUser($project, (int) Auth::id()),
        ]);
    }

    public function print(SprfCurrentProject $project)
    {
        $this->ensureCanView($project);

        $project->load([
            'items.subitems',
            'fees',
            'preparer:id,first_name,last_name,position,email',
            'currentApprover:id,first_name,last_name,position,email',
        ]);

        return Inertia::render('CustomerManagement/ProjectSPRF/sprfEntryPrint', [
            'entryProject' => $this->transformProjectForPrint($project),
            'storageKey' => request('storageKey'),
            'autoprint' => (bool) request('autoprint', false),
            'showDraftWatermark' => false,
        ]);
    }

    public function advanceProject(Request $request, SprfCurrentProject $project)
    {
        $this->assertAssignedApprover($project);

        $oldValues = $project->toArray();

        $validated = $request->validate([
            'rebate_justification' => ['nullable', 'string'],
        ]);

        $rebateJustification = $project->rebate_justification;

        if ((int) $project->current_level === 2) {
            $rebateJustification = data_get(
                $validated,
                'rebate_justification',
                $project->rebate_justification
            );

            if ($project->requires_rebate_justification && trim((string) $rebateJustification) === '') {
                throw ValidationException::withMessages([
                    'rebate_justification' => 'Rebate justification is required when the Rebate row has a value.',
                ]);
            }
        }

        $finalLevel = $this->finalApprovalLevel($project);

        if ((int) $project->current_level >= $finalLevel) {
            throw ValidationException::withMessages([
                'project' => 'This project is already at its final approval level. Use Approve instead.',
            ]);
        }

        list($nextLevel, $nextApproverId) = $this->resolveNextStep($project);

        if (! $nextApproverId) {
            throw ValidationException::withMessages([
                'project' => 'Next approver is not configured in User Management.',
            ]);
        }

        $project->update([
            'status' => 'under_review',
            'current_level' => $nextLevel,
            'current_approver_user_id' => $nextApproverId,
            'rebate_justification' => $rebateJustification,
            'last_saved_at' => now(),
        ]);

        try {
            SprfActivityLogger::log(
                activityType: 'advanced',
                sprf: $project->fresh(),
                details: 'SPRF project advanced to the next level',
                oldValues: $oldValues,
                newValues: $project->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF advance activity log failed', [
                'message' => $e->getMessage(),
                'sprf_current_project_id' => $project->id,
            ]);
        }

        return to_route('sprf.current')->with('success', 'SPRF project advanced to the next level.');
    }

    public function reject(Request $request, SprfCurrentProject $project)
    {
        $validated = $request->validate([
            'body' => ['nullable', 'string'],
        ]);

        $this->assertAssignedApprover($project);

        $project->load(['items.subitems', 'fees']);

        $oldValues = [
            'project' => $project->toArray(),
            'items' => $project->items->map->toArray()->toArray(),
            'fees' => $project->fees->map->toArray()->toArray(),
        ];

        $archiveProject = DB::transaction(function () use ($project, $validated) {
            $archiveProject = SprfArchiveProject::create([
                'entry_project_id' => $project->entry_project_id,
                'current_project_id' => $project->id,
                'sprf_no' => $project->sprf_no,
                'document_datetime' => $project->document_datetime,

                'status' => 'rejected',
                'current_level' => $project->current_level,
                'approval_level' => $project->approval_level,

                'prepared_by_user_id' => $project->prepared_by_user_id,
                'director_customer_engagement_user_id' => $project->director_customer_engagement_user_id,
                'esd_director_user_id' => $project->esd_director_user_id,
                'vp_ccto_user_id' => $project->vp_ccto_user_id,
                'president_ceo_user_id' => $project->president_ceo_user_id,
                'current_approver_user_id' => null,
                'approved_by_user_id' => null,
                'rejected_by_user_id' => Auth::id(),

                'sub_category' => $project->sub_category,
                'account' => $project->account,
                'account_manager' => $project->account_manager,

                'remarks' => $project->remarks,
                'rebate_justification' => $project->rebate_justification,
                'last_reject_note' => isset($validated['body']) ? $validated['body'] : null,

                'revenue' => $project->revenue,
                'cogs' => $project->cogs,
                'other_expense_total' => $project->other_expense_total,
                'total_expense' => $project->total_expense,
                'gp_value' => $project->gp_value,
                'gp_percent' => $project->gp_percent,

                'requires_vp_ccto' => $project->requires_vp_ccto,
                'requires_president_ceo' => $project->requires_president_ceo,
                'requires_rebate_justification' => $project->requires_rebate_justification,

                'last_saved_at' => now(),
                'submitted_at' => $project->submitted_at,
                'approved_at' => null,
                'rejected_at' => now(),
            ]);

            $createdItems = $archiveProject->items()->createMany(
                $project->items->map(function ($item) {
                    return [
                        'row_key'                        => $item->row_key,
                        'sort_order'                     => $item->sort_order,
                        'total_cost'                     => $item->total_cost,
                        'selling_price_per_unit_vat_inc' => $item->selling_price_per_unit_vat_inc,
                        'total_selling_price_vat_inc'    => $item->total_selling_price_vat_inc,
                        'markup_value'                   => $item->markup_value,
                    ];
                })->all()
            );

            foreach ($createdItems as $i => $createdItem) {
                $sourceItem = $project->items[$i];

                if ($sourceItem->subitems->isNotEmpty()) {
                    $createdItem->subitems()->createMany(
                        $sourceItem->subitems->map(function ($sub) {
                            return [
                                'row_key'          => $sub->row_key,
                                'sort_order'       => $sub->sort_order,
                                'product_code'     => $sub->product_code,
                                'item_description' => $sub->item_description,
                                'qty'              => $sub->qty,
                                'disty'            => $sub->disty,
                                'cost_per_unit'    => $sub->cost_per_unit,
                                'total_cost'       => $sub->total_cost,
                                'markup_percent'   => $sub->markup_percent,
                            ];
                        })->all()
                    );
                }
            }

            $archiveProject->fees()->createMany(
                $project->fees->map(function ($fee) {
                    return [
                        'expense_key' => $fee->expense_key,
                        'is_fixed' => $fee->is_fixed,
                        'product_code' => $fee->product_code,
                        'item_description' => $fee->item_description,
                        'qty' => $fee->qty,
                        'unit_price' => $fee->unit_price,
                        'total' => $fee->total,
                    ];
                })->all()
            );

            $project->items()->delete();
            $project->fees()->delete();
            $project->forceDelete();

            return $archiveProject;
        });

        try {
            SprfActivityLogger::log(
                activityType: 'rejected',
                sprf: $archiveProject,
                details: 'SPRF project rejected and archived',
                oldValues: $oldValues,
                newValues: $archiveProject->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF reject activity log failed', [
                'message' => $e->getMessage(),
                'sprf_archive_project_id' => $archiveProject->id ?? null,
            ]);
        }

        return to_route('sprf.current')->with('success', 'SPRF project rejected and archived.');
    }

    public function approve(SprfCurrentProject $project)
    {
        $this->assertAssignedApprover($project);

        $finalLevel = $this->finalApprovalLevel($project);

        if ((int) $project->current_level !== $finalLevel) {
            throw ValidationException::withMessages([
                'project' => 'Only the final approver can approve this SPRF project.',
            ]);
        }

        $project->load(['items.subitems', 'fees']);

        $oldValues = [
            'project' => $project->toArray(),
            'items' => $project->items->map->toArray()->toArray(),
            'fees' => $project->fees->map->toArray()->toArray(),
        ];

        $archiveProject = DB::transaction(function () use ($project) {
            $archiveProject = SprfArchiveProject::create([
                'entry_project_id' => $project->entry_project_id,
                'current_project_id' => $project->id,
                'sprf_no' => $project->sprf_no,
                'document_datetime' => $project->document_datetime,

                'status' => 'approved',
                'current_level' => $project->current_level,
                'approval_level' => $project->approval_level,

                'prepared_by_user_id' => $project->prepared_by_user_id,
                'director_customer_engagement_user_id' => $project->director_customer_engagement_user_id,
                'esd_director_user_id' => $project->esd_director_user_id,
                'vp_ccto_user_id' => $project->vp_ccto_user_id,
                'president_ceo_user_id' => $project->president_ceo_user_id,
                'current_approver_user_id' => null,
                'approved_by_user_id' => Auth::id(),
                'rejected_by_user_id' => null,

                'sub_category' => $project->sub_category,
                'account' => $project->account,
                'account_manager' => $project->account_manager,

                'remarks' => $project->remarks,
                'rebate_justification' => $project->rebate_justification,
                'last_reject_note' => null,

                'revenue' => $project->revenue,
                'cogs' => $project->cogs,
                'other_expense_total' => $project->other_expense_total,
                'total_expense' => $project->total_expense,
                'gp_value' => $project->gp_value,
                'gp_percent' => $project->gp_percent,

                'requires_vp_ccto' => $project->requires_vp_ccto,
                'requires_president_ceo' => $project->requires_president_ceo,
                'requires_rebate_justification' => $project->requires_rebate_justification,

                'last_saved_at' => now(),
                'submitted_at' => $project->submitted_at,
                'approved_at' => now(),
                'rejected_at' => null,
            ]);

            $createdItems = $archiveProject->items()->createMany(
                $project->items->map(function ($item) {
                    return [
                        'row_key'                        => $item->row_key,
                        'sort_order'                     => $item->sort_order,
                        'total_cost'                     => $item->total_cost,
                        'selling_price_per_unit_vat_inc' => $item->selling_price_per_unit_vat_inc,
                        'total_selling_price_vat_inc'    => $item->total_selling_price_vat_inc,
                        'markup_value'                   => $item->markup_value,
                    ];
                })->all()
            );

            foreach ($createdItems as $i => $createdItem) {
                $sourceItem = $project->items[$i];

                if ($sourceItem->subitems->isNotEmpty()) {
                    $createdItem->subitems()->createMany(
                        $sourceItem->subitems->map(function ($sub) {
                            return [
                                'row_key'          => $sub->row_key,
                                'sort_order'       => $sub->sort_order,
                                'product_code'     => $sub->product_code,
                                'item_description' => $sub->item_description,
                                'qty'              => $sub->qty,
                                'disty'            => $sub->disty,
                                'cost_per_unit'    => $sub->cost_per_unit,
                                'total_cost'       => $sub->total_cost,
                                'markup_percent'   => $sub->markup_percent,
                            ];
                        })->all()
                    );
                }
            }

            $archiveProject->fees()->createMany(
                $project->fees->map(function ($fee) {
                    return [
                        'expense_key' => $fee->expense_key,
                        'is_fixed' => $fee->is_fixed,
                        'product_code' => $fee->product_code,
                        'item_description' => $fee->item_description,
                        'qty' => $fee->qty,
                        'unit_price' => $fee->unit_price,
                        'total' => $fee->total,
                    ];
                })->all()
            );

            $project->items()->delete();
            $project->fees()->delete();
            $project->forceDelete();

            return $archiveProject;
        });

        try {
            SprfActivityLogger::log(
                activityType: 'approved',
                sprf: $archiveProject,
                details: 'SPRF project approved and archived',
                oldValues: $oldValues,
                newValues: $archiveProject->fresh()->toArray()
            );
        } catch (\Throwable $e) {
            Log::error('SPRF approve activity log failed', [
                'message' => $e->getMessage(),
                'sprf_archive_project_id' => $archiveProject->id ?? null,
            ]);
        }

        return to_route('sprf.current')->with('success', 'SPRF project approved and archived.');
    }

    private function currentProjectAssignedToUser(SprfCurrentProject $project, int $userId): bool
    {
        return (int) ($project->current_approver_user_id ?? 0) === $userId;
    }

    private function ensureCanView(SprfCurrentProject $project): void
    {
        $userId = (int) Auth::id();

        // Allow user 1 to bypass checks
            if ($userId === 1) {
                return;
            }
            
        $approverIds = array_filter([
            $project->director_customer_engagement_user_id,
            $project->esd_director_user_id,
            $project->vp_ccto_user_id,
            $project->president_ceo_user_id,
        ]);

        $canView =
            (int) $project->prepared_by_user_id === $userId
            || in_array($userId, array_map('intval', $approverIds), true);

        abort_unless($canView, 403);
    }

    private function assertAssignedApprover(SprfCurrentProject $project): void
    {
        if (! in_array($project->status, ['for_review', 'under_review'], true)) {
            throw ValidationException::withMessages([
                'project' => 'This SPRF project is not in the current approval queue.',
            ]);
        }

        if ((int) $project->current_approver_user_id !== (int) Auth::id()) {
            throw ValidationException::withMessages([
                'project' => 'You are not the assigned approver for this SPRF project.',
            ]);
        }
    }

    private function finalApprovalLevel(SprfCurrentProject $project): int
    {
        if ($project->requires_president_ceo) {
            return 5;
        }

        if ($project->requires_vp_ccto) {
            return 4;
        }

        return 3;
    }

    private function resolveNextStep(SprfCurrentProject $project): array
    {
        $currentLevel = (int) $project->current_level;

        if ($currentLevel === 2) {
            return [3, $project->esd_director_user_id];
        }

        if ($currentLevel === 3) {
            if ($project->requires_vp_ccto || $project->requires_president_ceo) {
                return [4, $project->vp_ccto_user_id];
            }

            throw ValidationException::withMessages([
                'project' => 'ESD Director is the final approver for this SPRF project.',
            ]);
        }

        if ($currentLevel === 4) {
            if ($project->requires_president_ceo) {
                return [5, $project->president_ceo_user_id];
            }

            throw ValidationException::withMessages([
                'project' => 'VP & CCTO is the final approver for this SPRF project.',
            ]);
        }

        throw ValidationException::withMessages([
            'project' => 'Invalid SPRF approval state.',
        ]);
    }

    private function mapApproverUsersFromProject(SprfCurrentProject $project): array
    {
        return [
            'directorCustomerEngagement' => $this->findUserById($project->director_customer_engagement_user_id),
            'esdDirector' => $this->findUserById($project->esd_director_user_id),
            'vpCcto' => $this->findUserById($project->vp_ccto_user_id),
            'presidentCeo' => $this->findUserById($project->president_ceo_user_id),
        ];
    }

    private function findUserById(?int $id): ?array
    {
        if (! $id) {
            return null;
        }

        $user = User::query()
            ->whereKey($id)
            ->first(['id', 'first_name', 'last_name', 'position', 'email']);

        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->first_name . ' ' . $user->last_name,
            'position' => $user->position,
            'email' => $user->email,
        ];
    }

    private function transformProjectForFrontend(SprfCurrentProject $project): array
    {
        return [
            'id' => $project->id,
            'sprf_no' => $project->sprf_no,
            'status' => $project->status,
            'current_level' => $project->current_level,
            'approval_level' => $project->approval_level,
            'last_saved_at' => $project->last_saved_at ? $project->last_saved_at->toISOString() : null,
            'submitted_at' => $project->submitted_at ? $project->submitted_at->toISOString() : null,
            'approved_at' => $project->approved_at ? $project->approved_at->toISOString() : null,
            'rejected_at' => $project->rejected_at ? $project->rejected_at->toISOString() : null,
            'prepared_by_name' => $project->preparer ? $project->preparer->first_name . ' ' . $project->preparer->last_name : null,
            'current_approver_name' => $project->currentApprover ? $project->currentApprover->first_name . ' ' . $project->currentApprover->last_name : null,

            'company_info' => [
                'subCategory' => $project->sub_category,
                'account' => $project->account,
                'accountManager' => $project->account_manager,
            ],

            'remarks' => $project->remarks,
            'rebate_justification' => $project->rebate_justification,

            'items' => $project->items
                ->map(function ($item) {
                    return [
                        'rowKey'                    => $item->row_key,
                        'totalCost'                 => $item->total_cost,
                        'sellingPricePerUnitVatInc' => $item->selling_price_per_unit_vat_inc,
                        'totalSellingPriceVatInc'   => $item->total_selling_price_vat_inc,
                        'markupValue'               => $item->markup_value,
                        'subitems' => $item->subitems
                            ->map(fn($sub) => [
                                'rowKey'          => $sub->row_key,
                                'productCode'     => $sub->product_code,
                                'itemDescription' => $sub->item_description,
                                'qty'             => $sub->qty,
                                'disty'           => $sub->disty,
                                'costPerUnit'     => $sub->cost_per_unit,
                                'markupPercent'   => $sub->markup_percent,
                                'totalCost'       => $sub->total_cost,
                            ])
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all(),

            'other_expenses' => $project->fees
                ->map(function ($fee) {
                    return [
                        'expenseKey' => $fee->expense_key,
                        'isFixed' => $fee->is_fixed,
                        'productCode' => $fee->product_code,
                        'itemDescription' => $fee->item_description,
                        'qty' => $fee->qty,
                        'unitPrice' => $fee->unit_price,
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    private function transformProjectForPrint(SprfCurrentProject $project): array
    {
        return [
            'id' => $project->id,
            'sprf_no' => $project->sprf_no,
            'status' => $project->status,
            'remarks' => $project->remarks,
            'rebate_justification' => $project->rebate_justification,

            'company_info' => [
                'subCategory' => $project->sub_category,
                'account' => $project->account,
                'accountManager' => $project->account_manager,
            ],

            'items' => $project->items
                ->map(function ($item) {
                    return [
                        'rowKey'                    => $item->row_key,
                        'totalCost'                 => $item->total_cost,
                        'sellingPricePerUnitVatInc' => $item->selling_price_per_unit_vat_inc,
                        'totalSellingPriceVatInc'   => $item->total_selling_price_vat_inc,
                        'markupValue'               => $item->markup_value,
                        'subitems' => $item->subitems
                            ->map(fn($sub) => [
                                'rowKey'          => $sub->row_key,
                                'productCode'     => $sub->product_code,
                                'itemDescription' => $sub->item_description,
                                'qty'             => $sub->qty,
                                'disty'           => $sub->disty,
                                'costPerUnit'     => $sub->cost_per_unit,
                                'markupPercent'   => $sub->markup_percent,
                                'totalCost'       => $sub->total_cost,
                            ])
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all(),

            'other_expenses' => $project->fees
                ->map(function ($fee) {
                    return [
                        'expenseKey' => $fee->expense_key,
                        'isFixed' => $fee->is_fixed,
                        'productCode' => $fee->product_code,
                        'itemDescription' => $fee->item_description,
                        'qty' => $fee->qty,
                        'unitPrice' => $fee->unit_price,
                    ];
                })
                ->values()
                ->all(),

            'approver_users' => $this->mapApproverUsersFromProject($project),

            'preparer' => [
                'id' => $project->preparer?->id,
                'name' => $project->preparer ? $project->preparer->first_name . ' ' . $project->preparer->last_name : null,
                'position' => $project->preparer?->position,
                'email' => $project->preparer?->email,
            ],
        ];
    }
}