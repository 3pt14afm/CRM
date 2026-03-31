<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Supply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupplyController extends Controller
{
    public function supplyMaster(): Response
    {
        $supplies = Supply::query()
            ->orderBy('supply_name')
            ->paginate(10)
            ->through(fn ($supply) => [
                'id' => $supply->id,
                'item_code' => $supply->item_code,
                'category' => $supply->category,
                'print_type' => $supply->print_type,
                'supply_name' => $supply->supply_name,
                'yield' => $supply->yield,
                'unit_cost' => $supply->unit_cost,
                'selling_price' => $supply->selling_price,
                'status' => $supply->status,
            ]);

        return Inertia::render('Admin/SupplyMaster', [
            'stats' => [
                'supplies' => $supplies->total(),
            ],
            'supplies' => $supplies,
        ]);
    }

    public function supplyIndex(): JsonResponse
    {
        $supplies = Supply::query()
            ->orderBy('supply_name')
            ->get([
                'id',
                'item_code',
                'category',
                'print_type',
                'supply_name',
                'yield',
                'unit_cost',
                'selling_price',
                'status',
            ]);

        return response()->json($supplies);
    }

    public function supplyStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'item_code' => ['required', 'string', 'max:255', 'unique:supplies,item_code'],
            'category' => ['required', 'in:Consumable,Part'],
            'print_type' => ['nullable', 'in:Color,Mono'],
            'supply_name' => ['required', 'string', 'max:255'],
            'yield' => ['nullable', 'integer', 'min:0'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        if ($validated['category'] === 'Part') {
            $validated['print_type'] = null;
        }

        Supply::create($validated);

        return back()->with('success', 'Supply created successfully.');
    }

    public function supplyUpdate(Request $request, Supply $supply): RedirectResponse
    {
        $validated = $request->validate([
            'item_code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('supplies', 'item_code')->ignore($supply->id),
            ],
            'category' => ['required', 'in:Consumable,Part'],
            'print_type' => ['nullable', 'in:Color,Mono'],
            'supply_name' => ['required', 'string', 'max:255'],
            'yield' => ['nullable', 'integer', 'min:0'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        if ($validated['category'] === 'Part') {
            $validated['print_type'] = null;
        }

        $supply->update($validated);

        return back()->with('success', 'Supply updated successfully.');
    }

    public function supplyActivate(Supply $supply): RedirectResponse
    {
        $supply->update([
            'status' => 'Active',
        ]);

        return back()->with('success', 'Supply activated successfully.');
    }

    public function supplyDeactivate(Supply $supply): RedirectResponse
    {
        $supply->update([
            'status' => 'Inactive',
        ]);

        return back()->with('success', 'Supply deactivated successfully.');
    }
}