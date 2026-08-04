<?php

namespace App\Http\Controllers\Contract;

use App\Http\Controllers\Concerns\AppliesCompanyVisibility;
use App\Http\Controllers\Controller;
use App\Models\Contracts\Contract;
use App\Models\CustomerInfo\Company;
use App\Models\LocationDepartment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ContractController extends Controller
{
    use AppliesCompanyVisibility;

    public function upload(Request $request)
    {
        $perPage = $request->integer('per_page', 12);

        if ($perPage < 1) {
            $perPage = 12;
        } elseif ($perPage > 100) {
            $perPage = 100;
        }

        $sortBy    = $request->input('sort_by', 'company_name');
        $sortOrder = $request->input('sort_order', 'asc') === 'desc' ? 'desc' : 'asc';

        $allowedSorts = [
            'id', 'company_name', 'sap_code',
            'client_category', 'delsan_company', 'client_manager',
        ];

        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'company_name';
        }

        $numericColumns = ['id'];
        $companyTable   = (new Company())->getTable();

        $qualify = fn (string $table, string $column) =>
            '`' . str_replace('.', '`.`', $table) . '`.`' . $column . '`';

        $baseQuery = Company::query()
            ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
                $join->on(
                    DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                    '=',
                    DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
                );
            })
            ->select("{$companyTable}.*")
            ->with('clientManager')
            ->where("{$companyTable}.status", 1)
            ->when(true, fn ($query) => $this->applyCompanyVisibility($query))
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('company_name', 'like', "%{$search}%")
                      ->orWhere('sap_code', 'like', "%{$search}%")
                      ->orWhere('address', 'like', "%{$search}%")
                      ->orWhere('delsan_company', 'like', "%{$search}%");
                });
            })
            ->when($request->input('category'), function ($query, $category) {
                $query->where('client_category', $category);
            })
            ->when($request->input('delsan_company'), function ($query, $delsan) {
                $query->where('delsan_company', $delsan);
            });

        $representativeIds = (clone $baseQuery)
            ->reorder()
            ->select(DB::raw("MIN({$companyTable}.id) as agg_id"))
            ->groupBy(DB::raw("COALESCE({$companyTable}.sap_code, CONCAT('__id_', {$companyTable}.id))"))
            ->pluck('agg_id');

        $companies = $baseQuery
            ->whereIn("{$companyTable}.id", $representativeIds)
            ->when($sortBy === 'sap_code', function ($query) use ($sortOrder) {
                $query->orderByRaw(
                    "CAST(REGEXP_REPLACE(sap_code, '^[A-Za-z-]+', '') AS UNSIGNED) {$sortOrder},
                     sap_code {$sortOrder}"
                );
            })
            ->when($sortBy === 'client_manager', function ($query) use ($sortOrder) {
                $query->orderByRaw(
                    "LOWER(CONCAT(client_managers.first_name, ' ', client_managers.last_name)) {$sortOrder}"
                );
            })
            ->when(!in_array($sortBy, ['sap_code', 'client_manager']) && in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder, $companyTable) {
                $query->orderBy("{$companyTable}.{$sortBy}", $sortOrder);
            })
            ->when(!in_array($sortBy, ['sap_code', 'client_manager']) && !in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder, $companyTable, $qualify) {
                $query->orderByRaw("LOWER({$qualify($companyTable, $sortBy)}) {$sortOrder}");
            })
            ->paginate($perPage)
            ->withQueryString();

        $sapCodesOnPage = $companies->getCollection()->pluck('sap_code')->filter()->unique()->values();

        $nameOptionsBySapCode = Company::query()
            ->select('sap_code', 'company_name')
            ->where('status', 1)
            ->whereIn('sap_code', $sapCodesOnPage)
            ->distinct()
            ->get()
            ->groupBy('sap_code')
            ->map(fn ($group) => $group->pluck('company_name')->filter()->unique()->values());

        // All id_client_mngr values that appear anywhere within each SAP-code
        // group on this page, so we can tell whether the current user manages
        // *any* branch in the group — not just the single representative row
        // that the dedup logic happens to display.
        $managerIdsBySapCode = Company::query()
            ->select('sap_code', 'id_client_mngr')
            ->where('status', 1)
            ->whereIn('sap_code', $sapCodesOnPage)
            ->get()
            ->groupBy('sap_code')
            ->map(fn ($group) => $group->pluck('id_client_mngr')->filter()->unique()->values());

        $isAdmin           = $this->isAdmin();
        $currentEmployeeId = Auth::user()->employee_id ?? null;

        $companies->getCollection()->transform(function ($c) use (
            $nameOptionsBySapCode,
            $managerIdsBySapCode,
            $isAdmin,
            $currentEmployeeId
        ) {
            $isDirectManager = $currentEmployeeId
                && (string) $c->id_client_mngr === (string) $currentEmployeeId;

            $isGroupManager = $currentEmployeeId && $c->sap_code
                && ($managerIdsBySapCode[$c->sap_code] ?? collect())
                    ->contains(fn ($id) => (string) $id === (string) $currentEmployeeId);

            return [
                'id'                    => $c->id,
                'company_name'          => $c->company_name,
                'sap_code'              => $c->sap_code,
                'client_category'       => $c->client_category,
                'delsan_company'        => $c->delsan_company,
                'address'               => $c->address,
                'id_client_mngr'        => $c->id_client_mngr,
                'client_manager'        => $c->clientManager ? $c->clientManager->first_name . ' ' . $c->clientManager->last_name : null,
                'company_name_options'  => $c->sap_code
                    ? ($nameOptionsBySapCode[$c->sap_code] ?? collect([$c->company_name]))->values()->all()
                    : [$c->company_name],
                'can_upload'            => $isAdmin || $isDirectManager || $isGroupManager,
            ];
        });

        $categories = Company::query()
            ->where('status', 1)
            ->whereNotNull('client_category')
            ->where('client_category', '!=', '')
            ->distinct()
            ->orderBy('client_category')
            ->pluck('client_category');

        if (!$request->header('X-Inertia') && ($request->ajax() || $request->wantsJson())) {
            return response()->json([
                'companies' => $companies,
            ]);
        }

        return Inertia::render('Contract/UploadContract', [
            'companies'  => $companies,
            'categories' => $categories,
            'is_admin'   => $isAdmin,
            'filters'    => $request->only([
                'search', 'category', 'per_page', 'sort_by', 'sort_order', 'delsan_company',
            ]),
        ]);
    }

    public function contracts($companyId)
    {
        $company = Company::findOrFail($companyId);

        // Admin, Assigned Manager, or Approver can VIEW
        if (!$this->canAccessCompanyContracts($company)) {
            abort(403, 'You are not authorized to view contracts for this company.');
        }

        $branchIds = $company->sap_code
            ? Company::query()->where('status', 1)->where('sap_code', $company->sap_code)->pluck('id')
            : collect([$company->id]);

        $branchCompanies = Company::query()
            ->whereIn('id', $branchIds)
            ->get(['id', 'company_name', 'id_client_mngr']);

        $branches = $branchCompanies->pluck('company_name')->filter()->unique()->values();

        // can_extend depends on which specific branch a contract belongs to,
        // so compute it per company row within the group rather than using a
        // single blanket flag for every contract returned.
        $canExtendByCompanyId = $branchCompanies->mapWithKeys(
            fn ($c) => [$c->id => $this->canManageCompanyContracts($c)]
        );

        $contracts = Contract::whereIn('company_id', $branchIds)
            ->orderByDesc('start_date')
            ->get()
            ->map(function ($c) use ($canExtendByCompanyId) {
                $c->refreshStatus();

                return [
                    'id'           => $c->id,
                    'doc_num'      => $c->doc_num,
                    'company_name' => $c->company_name,
                    'start_date'   => optional($c->start_date)->format('Y-m-d'),
                    'end_date'     => optional($c->end_date)->format('Y-m-d'),
                    'extend_dates' => $c->extend_dates ?? [],
                    'status'       => $c->status,
                    'can_extend'   => $canExtendByCompanyId[$c->company_id] ?? false,
                    'pdf_url'      => $c->pdf_path ? route('contract.pdf', $c->id) : null,
                ];
            });

        return response()->json([
            'sap_code'     => $company->sap_code,
            'company_name' => $company->company_name,
            'branches'     => $branches,
            'contracts'    => $contracts,
        ]);
    }

    public function store(Request $request, $companyId)
    {
        $company = Company::findOrFail($companyId);

        // Admin or Assigned Manager (including sibling branches under the
        // same SAP code) can UPLOAD — Approvers cannot.
        if (!$this->canManageCompanyContracts($company)) {
            abort(403, 'You are not authorized to upload a contract for this company.');
        }

        $employeeId = Auth::user()->employee_id ?? null;

        $validCompanyNames = Company::query()
            ->where('status', 1)
            ->where(function ($q) use ($company) {
                $q->where('id', $company->id)
                  ->orWhere('sap_code', $company->sap_code);
            })
            ->pluck('company_name')
            ->toArray();

        $validated = $request->validate([
            'pdf'          => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:10240'],
            'doc_num'      => ['required', 'string', 'max:100', Rule::unique('contracts', 'doc_num')],
            'start_date'   => ['required', 'date'],
            'end_date'     => ['required', 'date', 'after_or_equal:start_date'],
            'company_name' => ['required', 'string', 'max:255', Rule::in($validCompanyNames)],
        ]);

        $path = $request->file('pdf')->store('contracts', 'local');

        try {
            DB::transaction(function () use ($company, $validated, $path, $employeeId) {
                Contract::create([
                    'company_id'   => $company->id,
                    'company_name' => $validated['company_name'],
                    'doc_num'      => $validated['doc_num'],
                    'start_date'   => $validated['start_date'],
                    'end_date'     => $validated['end_date'],
                    'pdf_path'     => $path,
                    'uploader'     => $employeeId,
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Clean up the orphaned file since the DB write didn't take.
            Storage::disk('local')->delete($path);

            // MySQL duplicate-entry error code (use 23505 / SQLSTATE check on Postgres).
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                return back()
                    ->withErrors(['doc_num' => 'This document number was just taken by another upload. Please use a different one.'])
                    ->withInput();
            }

            throw $e;
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }

        return back()->with('success', 'Contract uploaded successfully.');
    }

    public function extendDate(Request $request, $contractId)
    {
        $contract = Contract::findOrFail($contractId);
        $company  = Company::findOrFail($contract->company_id);

        // Admin or Assigned Manager (including sibling branches under the
        // same SAP code) can EXTEND — Approvers cannot.
        if (!$this->canManageCompanyContracts($company)) {
            abort(403, 'You are not authorized to extend this contract.');
        }

        $employeeId = Auth::user()->employee_id ?? null;

        $currentEffectiveEnd = $contract->latestExtendedDate()
            ?? optional($contract->end_date)->format('Y-m-d');

        $validated = $request->validate([
            'extended_end_date' => array_filter([
                'required',
                'date',
                $currentEffectiveEnd ? "after:{$currentEffectiveEnd}" : null,
            ]),
        ]);

        $extendDates   = $contract->extend_dates ?? [];
        $extendDates[] = [
            'date'        => $validated['extended_end_date'],
            'extended_at' => now()->toDateTimeString(),
            'extended_by' => $employeeId,
        ];

        $contract->extend_dates = $extendDates;
        $contract->save();

        return response()->json([
            'id'           => $contract->id,
            'extend_dates' => $contract->extend_dates,
            'status'       => $contract->status,
        ]);
    }

    public function viewPdf($contractId)
    {
        $contract = Contract::findOrFail($contractId);
        $company  = Company::find($contract->company_id);

        // Admin, Assigned Manager, or Approver can VIEW PDF
        if (!$company || !$this->canAccessCompanyContracts($company)) {
            abort(403, 'You are not authorized to view this contract.');
        }

        if (!$contract->pdf_path) {
            abort(404, 'No PDF path specified.');
        }

        if (!Storage::disk('local')->exists($contract->pdf_path)) {
            abort(404, 'File not found on disk.');
        }

        return response()->file(
            Storage::disk('local')->path($contract->pdf_path),
            ['Content-Type' => 'application/pdf']
        );
    }

    /**
     * True if the logged-in user is the system admin (user id 1).
     */
    private function isAdmin(): bool
    {
        $currentUser = Auth::user();
        return $currentUser && (int) $currentUser->id === 1;
    }

    /**
     * True if the logged-in user is an approver for the company's assigned
     * client manager's location and department.
     */
    private function isApproverForCompany(Company $company): bool
    {
        $currentUser = Auth::user();
        if (!$currentUser) return false;

        $clientManager = User::where('employee_id', $company->id_client_mngr)->first();
        if (!$clientManager) return false;

        return LocationDepartment::query()
            ->where(function ($q) use ($currentUser) {
                $q->where('reviewed_by', $currentUser->id)
                  ->orWhere('checked_by', $currentUser->id)
                  ->orWhere('endorsed_by', $currentUser->id)
                  ->orWhere('confirmed_by', $currentUser->id)
                  ->orWhere('approved_by', $currentUser->id);
            })
            ->where('location_id', $clientManager->primary_location_id)
            ->where('department_id', $clientManager->department_id)
            ->exists();
    }

    /**
     * VIEW access: Admin, Assigned Manager, or Approver.
     */
    private function canAccessCompanyContracts(Company $company): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $employeeId = Auth::user()->employee_id ?? null;

        if ((string) $company->id_client_mngr === (string) $employeeId) {
            return true;
        }

        return $this->isApproverForCompany($company);
    }

    /**
     * UPLOAD / EXTEND access: Admin, or the manager assigned to this
     * company's own row, or the manager assigned to any sibling branch
     * sharing the same SAP code. Approvers are deliberately excluded here —
     * they can view contracts but never upload or extend them.
     */
    private function canManageCompanyContracts(Company $company): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $employeeId = Auth::user()->employee_id ?? null;
        if (!$employeeId) {
            return false;
        }

        if ((string) $company->id_client_mngr === (string) $employeeId) {
            return true;
        }

        if ($company->sap_code) {
            return Company::query()
                ->where('status', 1)
                ->where('sap_code', $company->sap_code)
                ->where('id_client_mngr', $employeeId)
                ->exists();
        }

        return false;
    }
}