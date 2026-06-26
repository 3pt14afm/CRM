<?php

namespace App\Http\Controllers\CustomerInfo;

use App\Http\Controllers\Controller;
use App\Models\CustomerInfo\PotentialCustomer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PotentialCustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = PotentialCustomer::with('clientManager')
            ->when($request->search, fn($q, $s) =>
                $q->where('company_name', 'like', "%{$s}%")
                  ->orWhere('address', 'like', "%{$s}%")
            )
            ->when($request->status !== null && $request->status !== '', fn($q) =>
                $q->where('status', $request->status)
            );

        // Sorting
        $sortBy    = in_array($request->sort_by, ['company_name', 'address', 'status']) ? $request->sort_by : 'id';
        $sortOrder = $request->sort_order === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        $potentials = $query->paginate($request->per_page ?? 12)->withQueryString();

        // Shape the data to match what the frontend expects
        $potentials->getCollection()->transform(fn($p) => [
            'id'             => $p->id,
            'company_name'   => $p->company_name,
            'address'        => $p->address,
            'contact_no'     => $p->contact_no,
            'client_manager' => $p->clientManager?->name,
            'status'         => $p->status,
        ]);

        return $potentials;
    }
}