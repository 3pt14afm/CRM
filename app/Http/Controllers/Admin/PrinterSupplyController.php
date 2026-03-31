<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PrinterModel;
use App\Models\PrinterModelSupply;
use App\Models\Supply;
use App\Models\PrinterSupplyPagePrinter;
use App\Models\PrinterSupplyPageSupply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrinterSupplyController extends Controller
{
    public function printerSupplies(): Response
    {
        $managedPrinters = PrinterSupplyPagePrinter::query()
            ->with([
                'printerModel:id,item_code,printer_name,unit_cost,selling_price,status',
            ])
            ->orderByDesc('id')
            ->paginate(10)
            ->through(function ($item) {
                $printer = $item->printerModel;

                return [
                    'id' => $printer?->id,
                    'page_item_id' => $item->id,
                    'printer_model_id' => $item->printer_model_id,
                    'item_code' => $printer?->item_code,
                    'printer_name' => $printer?->printer_name,
                    'unit_cost' => $printer?->unit_cost,
                    'selling_price' => $printer?->selling_price,
                    'status' => $printer?->status ?? 'Inactive',
                    'linked_supplies_count' => PrinterModelSupply::query()
                        ->where('printer_model_id', $item->printer_model_id)
                        ->count(),
                ];
            });

        $managedSupplies = PrinterSupplyPageSupply::query()
            ->with([
                'supply:id,item_code,category,print_type,supply_name,yield,status',
            ])
            ->orderByDesc('id')
            ->paginate(10)
            ->through(function ($item) {
                $supply = $item->supply;

                return [
                    'id' => $supply?->id,
                    'page_item_id' => $item->id,
                    'supply_id' => $item->supply_id,
                    'item_code' => $supply?->item_code,
                    'category' => $supply?->category,
                    'print_type' => $supply?->print_type,
                    'supply_name' => $supply?->supply_name,
                    'yield' => $supply?->yield,
                    'status' => $supply?->status ?? 'Inactive',
                    'linked_printers_count' => PrinterModelSupply::query()
                        ->where('supply_id', $item->supply_id)
                        ->count(),
                ];
            });

        $printerModels = PrinterModel::query()
            ->orderBy('printer_name')
            ->get([
                'id',
                'item_code',
                'printer_name',
                'unit_cost',
                'selling_price',
                'status',
            ]);

        $supplies = Supply::query()
            ->orderBy('supply_name')
            ->get([
                'id',
                'item_code',
                'category',
                'print_type',
                'supply_name',
                'yield',
                'status',
            ]);

        return Inertia::render('Admin/PrinterSupplies', [
            'stats' => [
                'managed_printers' => $managedPrinters->total(),
                'managed_supplies' => $managedSupplies->total(),
            ],
            'managedPrinters' => $managedPrinters,
            'managedSupplies' => $managedSupplies,
            'printerModels' => $printerModels,
            'supplies' => $supplies,
        ]);
    }

    public function printerModelSupplyIndex(PrinterModel $printerModel): JsonResponse
    {
        $links = PrinterModelSupply::query()
            ->with([
                'supply:id,item_code,category,print_type,supply_name,yield,status',
            ])
            ->where('printer_model_id', $printerModel->id)
            ->orderBy('id', 'desc')
            ->get()
            ->map(fn ($link) => [
                'id' => $link->id,
                'printer_model_id' => $link->printer_model_id,
                'supply_id' => $link->supply_id,
                'item_code' => $link->supply?->item_code,
                'category' => $link->supply?->category,
                'print_type' => $link->supply?->print_type,
                'supply_name' => $link->supply?->supply_name,
                'yield' => $link->supply?->yield,
                'status' => $link->supply?->status ?? 'Inactive',
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

    public function supplyPrinterModelIndex(Supply $supply): JsonResponse
    {
        $rows = PrinterModelSupply::query()
            ->with('printerModel:id,item_code,printer_name,unit_cost,selling_price,status')
            ->where('supply_id', $supply->id)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'printer_model_id' => $item->printer_model_id,
                    'item_code' => $item->printerModel?->item_code,
                    'printer_name' => $item->printerModel?->printer_name ?? '—',
                    'unit_cost' => $item->printerModel?->unit_cost ?? null,
                    'selling_price' => $item->printerModel?->selling_price ?? null,
                    'status' => $item->printerModel?->status ?? 'Inactive',
                ];
            });

        return response()->json($rows);
    }

    public function addManagedPrinter(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'printer_model_id' => ['required', 'exists:printer_models,id'],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        PrinterSupplyPagePrinter::firstOrCreate(
            ['printer_model_id' => $validated['printer_model_id']],
            ['status' => $validated['status']]
        );

        return back()->with('success', 'Printer added to Printer Supplies page successfully.');
    }

    public function addManagedSupply(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'supply_id' => ['required', 'exists:supplies,id'],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        PrinterSupplyPageSupply::firstOrCreate(
            ['supply_id' => $validated['supply_id']],
            ['status' => $validated['status']]
        );

        return back()->with('success', 'Supply added to Printer Supplies page successfully.');
    }

    public function removeManagedPrinter(PrinterSupplyPagePrinter $printerSupplyPagePrinter): RedirectResponse
    {
        $printerSupplyPagePrinter->delete();

        return back()->with('success', 'Printer removed from Printer Supplies page successfully.');
    }

    public function removeManagedSupply(PrinterSupplyPageSupply $printerSupplyPageSupply): RedirectResponse
    {
        $printerSupplyPageSupply->delete();

        return back()->with('success', 'Supply removed from Printer Supplies page successfully.');
    }
}