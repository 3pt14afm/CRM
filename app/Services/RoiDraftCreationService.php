<?php

namespace App\Services;

use Exception;

class RoiDraftCreationService
{
    public function __construct(
        protected RoiPrinterResolverService $printerResolver,
        protected RoiExistingDraftService $draftService
    ) {
    }

    public function createFromChatState(array $state)
    {
        $printerResult = $this->printerResolver->resolve($state['printer_query'] ?? null);

        if ($printerResult['status'] !== 'resolved') {
            throw new Exception('Printer could not be resolved.');
        }

        $printer = $printerResult['printer'];

        $fees = $this->mapFees($state);
        $feesTotal = collect($fees)->sum('total');

        $payload = [
            'companyInfo' => [
                'companyName' => $state['company_name'] ?? '',
                'contractYears' => (int) ($state['contract_years'] ?? 0),
                'contractType' => $state['contract_type'] ?? '',
                'purpose' => $state['purpose'] ?? '',
                'bundledStdInk' => true,
            ],
            'interest' => [
                'annualInterest' => 12,
                'percentMargin' => 0,
            ],
            'yield' => [
                'monoAmvpYields' => [
                    'monthly' => (int) ($state['mono_yield_monthly'] ?? 0),
                ],
                'colorAmvpYields' => [
                    'monthly' => (int) ($state['color_yield_monthly'] ?? 0),
                ],
            ],
            'machineConfiguration' => [
                'machine' => [
                    [
                        'id' => 'chatbot-machine-1',
                        'sku' => $printer->printer_name,
                        'qty' => 1,
                        'yields' => 0,
                        'mode' => null,
                        'remarks' => null,
                        'inputtedCost' => (float) ($printer->unit_cost ?? 0),
                        'cost' => (float) ($printer->unit_cost ?? 0),
                        'price' => (float) ($printer->selling_price ?? 0),
                        'basePerYear' => 0,
                        'totalCost' => (float) ($printer->unit_cost ?? 0),
                        'costCpp' => 0,
                        'totalSell' => (float) ($printer->selling_price ?? 0),
                        'sellCpp' => 0,
                        'machineMargin' => 0,
                        'machineMarginTotal' => 0,
                    ],
                ],
                'consumable' => $printer->supplies->map(function ($supply, $index) {
                    return [
                        'id' => 'chatbot-consumable-' . ($index + 1),
                        'sku' => $supply->supply_name ?? $supply->name ?? 'Supply',
                        'qty' => 1,
                        'yields' => 0,
                        'mode' => null,
                        'remarks' => null,
                        'inputtedCost' => (float) ($supply->unit_cost ?? $supply->cost ?? 0),
                        'cost' => (float) ($supply->unit_cost ?? $supply->cost ?? 0),
                        'price' => (float) ($supply->selling_price ?? $supply->price ?? 0),
                        'basePerYear' => 0,
                        'totalCost' => (float) ($supply->unit_cost ?? $supply->cost ?? 0),
                        'costCpp' => 0,
                        'totalSell' => (float) ($supply->selling_price ?? $supply->price ?? 0),
                        'sellCpp' => 0,
                        'machineMargin' => 0,
                        'machineMarginTotal' => 0,
                    ];
                })->values()->all(),
                'totals' => [
                    'unitCost' => (float) ($printer->unit_cost ?? 0),
                    'qty' => 1,
                    'totalCost' => (float) ($printer->unit_cost ?? 0),
                    'yields' => 0,
                    'costCpp' => 0,
                    'sellingPrice' => (float) ($printer->selling_price ?? 0),
                    'totalSell' => (float) ($printer->selling_price ?? 0),
                    'sellCpp' => 0,
                    'totalBundledPrice' => (float) ($printer->selling_price ?? 0),
                ],
            ],
            'additionalFees' => [
                'company' => $fees,
                'customer' => [],
                'total' => $feesTotal,
            ],
            'totalProjectCost' => [
                'grandTotalCost' => 0,
                'grandTotalRevenue' => 0,
                'grandROI' => 0,
                'grandROIPercentage' => 0,
            ],
            'yearlyBreakdown' => [],
        ];

      $draft = $this->draftService->saveDraftFromPayload($payload);

        return [
            'success' => true,
            'status' => 'created',
            'draft' => $draft,
        ];
    }

    protected function mapFees(array $state): array
    {
        $fees = [];

        $monoAnnual = ((int) ($state['mono_yield_monthly'] ?? 0)) * 12;
        $colorAnnual = ((int) ($state['color_yield_monthly'] ?? 0)) * 12;

        foreach ($state as $key => $value) {
            if (!str_starts_with($key, 'fee_')) {
                continue;
            }

            $qty = $this->feeQtyFromKey($key, $monoAnnual, $colorAnnual);
            $cost = (float) $value;
            $total = $cost * $qty;

            $fees[] = [
                'id' => 'chatbot-fee-' . $key,
                'label' => $this->labelFromKey($key),
                'cost' => $cost,
                'qty' => $qty,
                'total' => $total,
                'remarks' => null,
                'isMachine' => false,
            ];
        }

        return $fees;
    }

    protected function feeQtyFromKey(string $key, int $monoAnnual, int $colorAnnual): float|int
    {
        return match ($key) {
            'fee_one_time_charge' => 1,
            'fee_shipping' => 1,
            'fee_rebate' => 1,
            'fee_support_services' => 12,
            'fee_rental_supplies' => 12,
            'fee_a4_a3_mono_click' => $monoAnnual,
            'fee_a4_lgl_color_click' => $colorAnnual,
            'fee_a3_color_click' => 0,
            default => 1,
        };
    }

    protected function labelFromKey(string $key): string
    {
        return match ($key) {
            'fee_one_time_charge' => 'One Time Charge',
            'fee_shipping' => 'Shipping',
            'fee_rebate' => 'Rebate',
            'fee_support_services' => 'Support Services',
            'fee_rental_supplies' => 'Rental + Supplies',
            'fee_a4_a3_mono_click' => 'A4/A3 MONO CLICK',
            'fee_a4_lgl_color_click' => 'A4/LGL COLOR CLICK',
            'fee_a3_color_click' => 'A3 COLOR CLICK',
            default => ucfirst(str_replace('_', ' ', $key)),
        };
    }
}