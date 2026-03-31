<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PrinterModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PrinterController extends Controller
{
    public function printerMaster(): Response
    {
        $printerModels = PrinterModel::query()
            ->orderBy('printer_name')
            ->paginate(10)
            ->through(fn ($printer) => [
                'id' => $printer->id,
                'item_code' => $printer->item_code,
                'printer_name' => $printer->printer_name,
                'unit_cost' => $printer->unit_cost,
                'selling_price' => $printer->selling_price,
                'status' => $printer->status,
            ]);

        return Inertia::render('Admin/PrinterMaster', [
            'stats' => [
                'printer_models' => $printerModels->total(),
            ],
            'printerModels' => $printerModels,
        ]);
    }

    public function printerModelIndex(): JsonResponse
    {
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

        return response()->json($printerModels);
    }

    public function printerModelStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'item_code' => ['required', 'string', 'max:255', 'unique:printer_models,item_code'],
            'printer_name' => ['required', 'string', 'max:255'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        PrinterModel::create($validated);

        return back()->with('success', 'Printer created successfully.');
    }

    public function printerModelUpdate(Request $request, PrinterModel $printerModel): RedirectResponse
    {
        $validated = $request->validate([
            'item_code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('printer_models', 'item_code')->ignore($printerModel->id),
            ],
            'printer_name' => ['required', 'string', 'max:255'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        $printerModel->update($validated);

        return back()->with('success', 'Printer updated successfully.');
    }

    public function printerModelActivate(PrinterModel $printerModel): RedirectResponse
    {
        $printerModel->update([
            'status' => 'Active',
        ]);

        return back()->with('success', 'Printer activated successfully.');
    }

    public function printerModelDeactivate(PrinterModel $printerModel): RedirectResponse
    {
        $printerModel->update([
            'status' => 'Inactive',
        ]);

        return back()->with('success', 'Printer deactivated successfully.');
    }
}