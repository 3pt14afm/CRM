<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PrinterModel;
use App\Models\PrinterModelSupply;
use App\Models\Supply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Validation\Rule;

class PrinterSupplyController extends Controller
{
    public function printerSupplies(): Response
    {
        $printerModels = PrinterModel::query()
            ->withCount('printerModelSupplies')
            ->orderBy('printer_name')
            ->paginate(10)
            ->through(fn ($printer) => [
                'id' => $printer->id,
                'printer_name' => $printer->printer_name,
                'unit_cost' => $printer->unit_cost,
                'selling_price' => $printer->selling_price,
                'status' => $printer->status,
                'linked_supplies_count' => $printer->printer_model_supplies_count,
            ]);

        $supplies = Supply::query()
            ->where('status', 'Active')
            ->orderBy('supply_name')
            ->get([
                'id',
                'category',
                'print_type',
                'supply_name',
                'yield',
                'status',
            ]);

        return Inertia::render('Admin/PrinterSupplies', [
            'stats' => [
                'printer_models' => $printerModels->total(),
            ],
            'printerModels' => $printerModels,
            'supplies' => $supplies,
        ]);
    }

    public function printerModelSupplyIndex(PrinterModel $printerModel): JsonResponse
    {
        $links = PrinterModelSupply::query()
            ->with([
                'supply:id,category,print_type,supply_name,yield,status',
            ])
            ->where('printer_model_id', $printerModel->id)
            ->orderBy('id', 'desc')
            ->get()
            ->map(fn ($link) => [
                'id' => $link->id,
                'printer_model_id' => $link->printer_model_id,
                'supply_id' => $link->supply_id,
                'category' => $link->supply?->category,
                'print_type' => $link->supply?->print_type,
                'supply_name' => $link->supply?->supply_name,
                'yield' => $link->supply?->yield,
                'status' => $link->status,
            ]);

        return response()->json($links);
    }

    public function printerModelSupplyStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'printer_model_id' => ['required', 'exists:printer_models,id'],
            'supply_id' => [
                'required',
                'exists:supplies,id',
                \Illuminate\Validation\Rule::unique('printer_model_supplies')
                    ->where(fn ($query) => $query->where('printer_model_id', $request->printer_model_id)),
            ],
            'status' => ['required', 'in:Active,Inactive'],
        ], [
            'supply_id.unique' => 'This supply is already linked to the selected printer.',
        ]);

        PrinterModelSupply::create($validated);

        return back()->with('success', 'Supply linked to printer successfully.');
    }

    public function printerModelSupplyUpdate(Request $request, PrinterModelSupply $printerModelSupply): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        $printerModelSupply->update($validated);

        return back()->with('success', 'Printer supply updated successfully.');
    }

    public function printerModelSupplyActivate(PrinterModelSupply $printerModelSupply): RedirectResponse
    {
        $printerModelSupply->update([
            'status' => 'Active',
        ]);

        return back()->with('success', 'Printer supply activated successfully.');
    }

    public function printerModelSupplyDeactivate(PrinterModelSupply $printerModelSupply): RedirectResponse
    {
        $printerModelSupply->update([
            'status' => 'Inactive',
        ]);

        return back()->with('success', 'Printer supply deactivated successfully.');
    }

    public function printerModelSupplyDestroy(PrinterModelSupply $printerModelSupply): RedirectResponse
    {
        $printerModelSupply->delete();

        return back()->with('success', 'Supply unlinked from printer successfully.');
    }
}