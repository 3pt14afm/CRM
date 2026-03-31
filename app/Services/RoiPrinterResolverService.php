<?php

namespace App\Services;

use App\Models\PrinterModel;

class RoiPrinterResolverService
{
    public function resolve(?string $printerQuery): array
    {
        $printerQuery = trim((string) $printerQuery);

        if ($printerQuery === '') {
            return [
                'status' => 'missing',
                'printer' => null,
                'matches' => [],
                'message' => 'No printer was provided.',
            ];
        }

        $exactMatch = PrinterModel::query()
            ->with(['supplies', 'printerModelSupplies.supply'])
            ->where('printer_name', $printerQuery)
            ->first();

        if ($exactMatch) {
            return [
                'status' => 'resolved',
                'printer' => $exactMatch,
                'matches' => [$exactMatch],
                'message' => null,
            ];
        }

        $matches = PrinterModel::query()
            ->with(['supplies', 'printerModelSupplies.supply'])
            ->where('printer_name', 'like', '%' . $printerQuery . '%')
            ->limit(5)
            ->get();

        if ($matches->count() === 1) {
            return [
                'status' => 'resolved',
                'printer' => $matches->first(),
                'matches' => [$matches->first()],
                'message' => null,
            ];
        }

        if ($matches->count() > 1) {
            return [
                'status' => 'ambiguous',
                'printer' => null,
                'matches' => $matches->values()->all(),
                'message' => 'Multiple printers matched that query.',
            ];
        }

        return [
            'status' => 'not_found',
            'printer' => null,
            'matches' => [],
            'message' => 'No printer matched that query.',
        ];
    }

    public function searchOptions(?string $printerQuery): array
{
    $printerQuery = trim((string) $printerQuery);

    if ($printerQuery === '') {
        return [];
    }

    return PrinterModel::query()
        ->where('printer_name', 'like', '%' . $printerQuery . '%')
        ->orderBy('printer_name')
        ->limit(5)
        ->get(['id', 'printer_name'])
        ->toArray();
}

public function findById(?int $printerModelId): ?PrinterModel
{
    if (!$printerModelId) {
        return null;
    }

    return PrinterModel::query()
        ->with(['supplies', 'printerModelSupplies.supply'])
        ->find($printerModelId);
}

    public function formatAmbiguousChoices(array $matches): string
    {
        if (empty($matches)) {
            return 'I found multiple printers. Please be more specific.';
        }

        $lines = [
            'I found multiple printer matches. Please choose one of these:',
        ];

        foreach ($matches as $match) {
            $lines[] = '- ' . $match->printer_name;
        }

        return implode("\n", $lines);
    }
}