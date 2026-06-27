<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerInfo\Company;
use App\Models\CustomerInfo\PotentialCustomer;
use Illuminate\Http\Request;
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

        $sortBy    = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'desc');

        // ── Existing companies ──────────────────────────────────────────────

        $allowedSorts = [
            'id', 'company_name', 'sap_code',
            'client_category', 'delsan_company', 'status',
        ];

        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'id';
        }

        $sortOrder = $sortOrder === 'asc' ? 'asc' : 'desc';

        $numericColumns = ['id', 'status'];

        $companies = Company::query()
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
            ->when($request->input('status') !== null && $request->input('status') !== '', function ($query) use ($request) {
                $statuses = array_filter(
                    explode(',', $request->input('status')),
                    fn($v) => $v !== ''
                );
                if (!empty($statuses)) {
                    $query->whereIn('status', $statuses);
                }
            })
            ->when($sortBy === 'sap_code', function ($query) use ($sortOrder) {
                $query->orderByRaw(
                    "CAST(REGEXP_REPLACE(sap_code, '^[A-Za-z-]+', '') AS UNSIGNED) {$sortOrder},
                     sap_code {$sortOrder}"
                );
            })
            ->when($sortBy !== 'sap_code' && in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder) {
                $query->orderBy($sortBy, $sortOrder);
            })
            ->when($sortBy !== 'sap_code' && !in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder) {
                $query->orderByRaw("LOWER(`{$sortBy}`) {$sortOrder}");
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

        $allowedPotentialSorts = ['id', 'company_name', 'address', 'status', 'created_at'];


        $potentialSortBy = in_array($sortBy, $allowedPotentialSorts) ? $sortBy : 'id';

        $potentials = PotentialCustomer::with('clientManager')
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('company_name', 'like', "%{$search}%")
                      ->orWhere('address', 'like', "%{$search}%");
                });
            })
            ->when($request->input('status') !== null && $request->input('status') !== '', function ($query) use ($request) {
                $statuses = array_filter(
                    explode(',', $request->input('status')),
                    fn($v) => $v !== ''
                );
                if (!empty($statuses)) {
                    $query->whereIn('status', $statuses);
                }
            })
            ->when(in_array($potentialSortBy, ['id', 'status']), function ($query) use ($potentialSortBy, $sortOrder) {
                $query->orderBy($potentialSortBy, $sortOrder);
            })
            ->when(!in_array($potentialSortBy, ['id', 'status']), function ($query) use ($potentialSortBy, $sortOrder) {
                $query->orderByRaw("LOWER(`{$potentialSortBy}`) {$sortOrder}");
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
            'created_at'     => $p->created_at?->toDateTimeString(), // ← add this

        ]);

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