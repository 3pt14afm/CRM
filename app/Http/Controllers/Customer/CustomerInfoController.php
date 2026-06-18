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

        $sortBy = $request->input('sort_by', 'id');
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
                $query->where('status', $request->input('status'));
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('CustomerManagement/CustomerInfo/Index', [
            'companies' => $companies,
            'filters' => $request->only([
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