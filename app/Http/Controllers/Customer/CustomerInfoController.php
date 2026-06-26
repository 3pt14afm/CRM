<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerInfo\Company;
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

        $allowedSorts = [
            'id',
            'company_name',
            'sap_code',
            'client_category',
            'delsan_company',
            'status',
        ];

        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'id';
        }

        $sortOrder = $sortOrder === 'asc' ? 'asc' : 'desc';

        // Columns that are numeric — use plain orderBy, not LOWER()
        $numericColumns = ['id', 'status'];

        $companies = Company::query()
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
                // Natural numeric sort on the suffix after the prefix (e.g. CUS-10 > CUS-2)
                $query->orderByRaw(
                    "CAST(REGEXP_REPLACE(sap_code, '^[A-Za-z-]+', '') AS UNSIGNED) {$sortOrder},
                     sap_code {$sortOrder}"
                );
            })
            ->when($sortBy !== 'sap_code' && in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder) {
                // Numeric columns — plain orderBy
                $query->orderBy($sortBy, $sortOrder);
            })
            ->when($sortBy !== 'sap_code' && !in_array($sortBy, $numericColumns), function ($query) use ($sortBy, $sortOrder) {
                // Text columns — case-insensitive alphabetical
                $query->orderByRaw("LOWER(`{$sortBy}`) {$sortOrder}");
            })
            ->paginate($perPage)
            ->withQueryString();

        // Distinct non-null categories for the filter dropdown
        $categories = Company::query()
            ->whereNotNull('client_category')
            ->where('client_category', '!=', '')
            ->distinct()
            ->orderBy('client_category')
            ->pluck('client_category');

        return Inertia::render('CustomerManagement/CustomerInfo/Index', [
            'companies'  => $companies,
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