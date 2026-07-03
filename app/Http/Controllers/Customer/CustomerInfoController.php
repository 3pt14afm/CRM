<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerInfo\Company;
use App\Models\CustomerInfo\PotentialCustomer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CustomerInfoController extends Controller
{
public function index(Request $request)
{
    $perPage = $request->integer('per_page', 12);

    if ($perPage < 1) {
        $perPage = 12;
    } elseif ($perPage > 100) {
        $perPage = 100;
    }

    $sortBy    = $request->input('sort_by', 'company_name');
    $sortOrder = $request->input('sort_order', 'asc');
    $statusParam = $request->input('status', '1'); // default to Active only

    // ── Existing companies ──────────────────────────────────────────────

    $allowedSorts = [
        'id', 'company_name', 'sap_code',
        'client_category', 'delsan_company', 'status', 'client_manager',
    ];

    if (!in_array($sortBy, $allowedSorts)) {
        $sortBy = 'company_name';
    }

    $sortOrder = $sortOrder === 'desc' ? 'desc' : 'asc';

    $numericColumns = ['id', 'status'];

    $companyTable = (new Company())->getTable();

    $qualify = fn (string $table, string $column) =>
        '`' . str_replace('.', '`.`', $table) . '`.`' . $column . '`';

    $companies = Company::query()
        ->leftJoin('users as client_managers', function ($join) use ($companyTable) {
            $join->on(
                DB::raw("{$companyTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                '=',
                DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
            );
        })
        ->select("{$companyTable}.*")
        ->with('clientManager')
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
        })
        ->when($statusParam !== null && $statusParam !== '', function ($query) use ($statusParam, $companyTable) {
            $statuses = array_filter(explode(',', $statusParam), fn($v) => $v !== '');
            if (!empty($statuses)) {
                $query->whereIn("{$companyTable}.status", $statuses);
            }
        })
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

    $companies->getCollection()->transform(fn($c) => [
        'id'             => $c->id,
        'company_name'   => $c->company_name,
        'sap_code'       => $c->sap_code,
        'client_category'=> $c->client_category,
        'delsan_company' => $c->delsan_company,
        'address'        => $c->address,
        'main_location'  => $c->main_location,
        'branches'       => $c->branches,
        'contact_no'     => $c->contact_no,
        'id_client_mngr' => $c->id_client_mngr,
        'client_manager' => $c->clientManager ? $c->clientManager->first_name . ' ' . $c->clientManager->last_name : null,
        'status'         => $c->status,
    ]);

    $categories = Company::query()
        ->whereNotNull('client_category')
        ->where('client_category', '!=', '')
        ->distinct()
        ->orderBy('client_category')
        ->pluck('client_category');

    // ── Potential customers ─────────────────────────────────────────────

    $allowedPotentialSorts = ['id', 'company_name', 'address', 'status', 'created_at', 'client_manager'];

    $potentialSortBy = in_array($sortBy, $allowedPotentialSorts) ? $sortBy : 'company_name';

    $potentialTable = (new PotentialCustomer())->getTable();

    $potentials = PotentialCustomer::query()
        ->leftJoin('users as client_managers', function ($join) use ($potentialTable) {
            $join->on(
                DB::raw("{$potentialTable}.id_client_mngr COLLATE utf8mb4_unicode_ci"),
                '=',
                DB::raw('client_managers.employee_id COLLATE utf8mb4_unicode_ci')
            );
        })
        ->select("{$potentialTable}.*")
        ->with('clientManager')
        ->when($request->input('search'), function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        })
        ->when($statusParam !== null && $statusParam !== '', function ($query) use ($statusParam, $potentialTable) {
            $statuses = array_filter(explode(',', $statusParam), fn($v) => $v !== '');
            if (!empty($statuses)) {
                $query->whereIn("{$potentialTable}.status", $statuses);
            }
        })
        ->when($potentialSortBy === 'client_manager', function ($query) use ($sortOrder) {
            $query->orderByRaw(
                "LOWER(CONCAT(client_managers.first_name, ' ', client_managers.last_name)) {$sortOrder}"
            );
        })
        ->when($potentialSortBy !== 'client_manager' && in_array($potentialSortBy, ['id', 'status']), function ($query) use ($potentialSortBy, $sortOrder, $potentialTable) {
            $query->orderBy("{$potentialTable}.{$potentialSortBy}", $sortOrder);
        })
        ->when($potentialSortBy !== 'client_manager' && !in_array($potentialSortBy, ['id', 'status']), function ($query) use ($potentialSortBy, $sortOrder, $potentialTable, $qualify) {
            $query->orderByRaw("LOWER({$qualify($potentialTable, $potentialSortBy)}) {$sortOrder}");
        })
        ->paginate($perPage)
        ->withQueryString();

    $potentials->getCollection()->transform(fn($p) => [
        'id'             => $p->id,
        'company_name'   => $p->company_name,
        'address'        => $p->address,
        'contact_no'     => $p->contact_no,
        'id_client_mngr' => $p->id_client_mngr,
        'client_manager' => $p->clientManager ? $p->clientManager->first_name . ' ' . $p->clientManager->last_name : null,
        'status'         => $p->status,
        'created_at'     => $p->created_at?->toDateTimeString(),
    ]);

    // ── AJAX (axios) search request: bypass Inertia, return raw paginators ──
// ── AJAX (axios) search request: bypass Inertia, return raw paginators ──
// Only for plain axios calls — never for Inertia's own visits, which send X-Inertia.
if (!$request->header('X-Inertia') && ($request->ajax() || $request->wantsJson())) {
    return response()->json([
        'companies'  => $companies,
        'potentials' => $potentials,
    ]);
}

    // ── Render ──────────────────────────────────────────────────────────

    return Inertia::render('CustomerManagement/CustomerInfo/Index', [
        'companies'  => $companies,
        'potentials' => $potentials,
        'categories' => $categories,
        'filters'    => $request->only([
            'search',
            'category',
            'status',
            'per_page',
            'sort_by',
            'sort_order',
            'delsan_company',
        ]),
    ]);
}

    public function show($id)
    {
        $company = Company::findOrFail($id);

        return Inertia::render('Companies/Show', [
            'company' => $company,
        ]);
    }
}