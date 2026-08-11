<?php

namespace App\Services\Roi\Entry;

/**
 * RoiCalculator
 *
 * Single source of truth for all ROI financial calculations.
 * Drop-in replacement for the frontend JS calculations.
 */
class RoiCalculator
{
    // =========================================================================
    // HELPERS
    // =========================================================================

    private function toFloat(mixed $val, float $fallback = 0.0): float
    {
        $num = filter_var($val, FILTER_VALIDATE_FLOAT);
        return ($num === false || is_nan($num)) ? $fallback : $num;
    }

    private function to2Decimals(mixed $val): float
    {
        return round($this->toFloat($val), 2);
    }

    private function hasValidYield(mixed $y): bool
    {
        return $this->toFloat($y) > 0;
    }

    private function getQtyFromYields(float $annualYields, mixed $itemYields): float
    {
        $safe = $this->toFloat($itemYields);
        if ($safe <= 0) return 0.0;
        return $this->to2Decimals($annualYields / $safe);
    }

    /**
     * Round up qty to the next whole number if contract type contains "per cartridge".
     * Any decimal value (even .1) is ceiled to the next integer.
     */
    private function applyPerCartridgeRounding(float $qty, bool $isPerCartridge): float
    {
        return $isPerCartridge ? (float) ceil($qty) : $qty;
    }

    /**
     * Mirrors JS `Number(val) || $fallback`: falls back only when the
     * numeric value is 0 or invalid — unlike max(), this does NOT clamp
     * negative numbers up to the fallback.
     */
    private function orFallback(mixed $val, float $fallback): float
    {
        $num = $this->toFloat($val, 0.0);
        return $num !== 0.0 ? $num : $fallback;
    }

    // =========================================================================
    // CONTRACT TYPE FLAGS
    // =========================================================================

    private function getContractFlags(string $contractType): array
    {
        $n = strtolower(trim($contractType));
        return [
            'normalized'      => $n,
            'isOutright'      => str_contains($n, 'outright'),
            'isOutrightOnly'  => str_contains($n, 'outright') && str_contains($n, 'only'),
            'isMonthlyRental' => $n === 'fixed monthly only',
            'isRentalClick'   => str_contains($n, 'rental + click'),
            'isFreeUseClick'  => str_contains($n, 'free use + click'),
            'isOutrightClick' => str_contains($n, 'outright + click'),
            'isNonOutright'   => $n === 'non-outright',
            'isPerCartridge'  => str_contains($n, 'per cartridge'),
        ];
    }

    // =========================================================================
    // getRowCalculations
    // =========================================================================

    public function getRowCalculations(array $row, array $projectData): array
    {
        $rawCost   = $this->toFloat($row['cost']   ?? 0);
        $qty       = $this->toFloat($row['qty']    ?? 0);
        $rawYields = $this->toFloat($row['yields'] ?? 0);
        $rawPrice  = $this->toFloat($row['price']  ?? 0);

        $annualInterestRate = $this->toFloat($projectData['interest']['annualInterest'] ?? 0) / 100;
        $annualInterest     = $this->toFloat($projectData['interest']['annualInterest'] ?? 0);
        $contractYears      = $this->orFallback($projectData['companyInfo']['contractYears'] ?? 1, 1.0);
        $percentMargin      = ($annualInterest * $contractYears) / 100;

        $type         = strtolower($row['type'] ?? '');
        $isMachine    = $type === 'machine';
        $mode         = strtolower($row['mode'] ?? '');
        $isConsumable = in_array($mode, ['mono', 'color']);
        $isModeOthers = in_array($mode, ['others', 'other']);

        $flags = $this->getContractFlags(
            $projectData['companyInfo']['contractType'] ?? $projectData['contractType'] ?? ''
        );

        // --- YIELDS RULES ---
        $yields = $rawYields;
        if ($isMachine) {
            $yields = $isModeOthers ? $rawYields : 0;
        }
        if ($flags['isMonthlyRental'] && $isConsumable) {
            $yields = 0;
        }

        // --- PRICE RULES ---
        $price = $rawPrice;
        if (($flags['isRentalClick'] || $flags['isFreeUseClick']) && $isConsumable) $price = 0;
        if ($flags['isNonOutright'] && $isMachine) $price = 0;
        if (!$flags['isOutright'] && $isMachine) $price = 0;
        if ($flags['isMonthlyRental'] && $isConsumable) { $price = 0; $yields = 0; }

        // --- COST CALCULATIONS ---
        $finalComputedCost  = $rawCost;
        $basePerYear        = 0.0;
        $machineMargin      = 0.0;
        $machineMarginTotal = 0.0;

        $isInterestModel = $isMachine && !$flags['isOutright'];

        if ($isInterestModel && !$isModeOthers) {
            $basePerYear        = $rawCost / $contractYears;
            $finalComputedCost  = ($basePerYear + ($basePerYear * $annualInterestRate)) * $contractYears;
            $machineMargin      = $basePerYear * $percentMargin;
            $machineMarginTotal = $rawCost * $percentMargin;
        } else {
            $finalComputedCost  = $rawCost;
            $basePerYear        = $rawCost;
            $machineMargin      = 0.0;
            $machineMarginTotal = 0.0;
        }

        $safeYields = $this->toFloat($yields);

        return [
            'inputtedCost'       => $rawCost,
            'computedCost'       => $finalComputedCost,
            'basePerYear'        => $basePerYear,
            'totalCost'          => $isMachine ? $finalComputedCost * $qty : $rawCost * $qty,
            'yields'             => $yields,
            'costCpp'            => $safeYields > 0 ? $rawCost / $safeYields : 0.0,
            'price'              => $price,
            'totalSell'          => $price * $qty,
            'sellCpp'            => $safeYields > 0 ? $price / $safeYields : 0.0,
            'machineMargin'      => $machineMargin,
            'machineMarginTotal' => $machineMarginTotal,
        ];
    }

    // =========================================================================
    // get1YrPotential
    // =========================================================================

    public function get1YrPotential(array $projectData): array
    {
        $config         = $projectData['machineConfiguration'] ?? [];
        $rawMachines    = $config['machine']    ?? [];
        $rawConsumables = $config['consumable'] ?? [];

        $flags = $this->getContractFlags($projectData['companyInfo']['contractType'] ?? '');

        $annualInterest = $this->toFloat($projectData['interest']['annualInterest'] ?? 0);
        $contractYears  = $this->orFallback($projectData['companyInfo']['contractYears'] ?? 1, 1.0);
        $percentMargin  = ($annualInterest * $contractYears) / 100;

        $isBundleChecked = ($projectData['companyInfo']['bundledStdInk'] ?? false) === true;
        $bundleDeduction = ($flags['isMonthlyRental'] && $isBundleChecked)
            ? $this->toFloat($config['totals']['totalBundledPrice'] ?? 0)
            : 0.0;

        $annualMonoYields  = $this->toFloat($projectData['yield']['monoAmvpYields']['monthly']  ?? 0) * 12;
        $annualColorYields = $this->toFloat($projectData['yield']['colorAmvpYields']['monthly'] ?? 0) * 12;

        $addFeesObj   = $projectData['additionalFees'] ?? [];
        $companyFees  = $addFeesObj['company']  ?? [];
        $customerFees = $addFeesObj['customer'] ?? [];

        $shouldEnforcePrinterQty = !$flags['isMonthlyRental'] && !$flags['isOutrightOnly'];

        $printerMachineQty = array_sum(array_map(
            fn($m) => $this->toFloat($m['qty'] ?? 0),
            array_filter($rawMachines, fn($m) => strtolower($m['mode'] ?? '') !== 'others')
        ));

        // --- PROCESS MACHINES ---
        $processedMachines = array_map(function (array $m) use (
            $flags, $annualMonoYields, $annualColorYields, $percentMargin, $printerMachineQty, $shouldEnforcePrinterQty
        ): array {
            $mode          = strtolower($m['mode'] ?? '');
            $machineYields = $this->toFloat($m['yields'] ?? 0);
            $machineQty    = $this->toFloat($m['qty']    ?? 0);
            $isModeOthers  = in_array($mode, ['others', 'other']);

            if ($isModeOthers) {
                if ($shouldEnforcePrinterQty) {
                    $baseQty = $this->toFloat($m['qty'] ?? 1, 1);
                    $machineQty = $this->to2Decimals($baseQty * ($printerMachineQty > 0 ? $printerMachineQty : 1));
                } else {
                    $base = $this->resolveBaseYields($annualMonoYields, $annualColorYields);
                    $machineQty = $this->hasValidYield($machineYields) && $base > 0
                        ? $this->getQtyFromYields($base, $machineYields)
                        : $this->toFloat($m['qty'] ?? 1, 1);
                }
            } elseif ($machineQty <= 0) {
                $base       = $this->resolveBaseYields($annualMonoYields, $annualColorYields);
                $machineQty = $this->hasValidYield($machineYields) && $base > 0
                    ? $this->getQtyFromYields($base, $machineYields)
                    : 1;
            }

            $rawCost = $this->toFloat($m['inputtedCost'] ?? $m['cost'] ?? 0);
            $mType = strtolower($m['type'] ?? '');
            $isMachineRow = $mType === 'machine';

            $unitMargin = 0.0;
            if (!$flags['isOutright'] && $isMachineRow && !$isModeOthers) {
                $unitMargin = $rawCost * $percentMargin;
            }

            $loadedCost = $rawCost + $unitMargin;
            $unitSell   = $flags['isOutright'] ? $this->toFloat($m['price'] ?? 0) : 0.0;

            return array_merge($m, [
                'mode'                => $mode,
                'qty'                 => $this->to2Decimals($machineQty),
                'price'               => $unitSell,
                'machineMarginTotal'  => $this->to2Decimals($unitMargin),
                'totalMachineMargin'  => $this->to2Decimals($machineQty * $unitMargin),
                'totalCost'           => $this->to2Decimals($machineQty * $loadedCost),
                'totalSell'           => $this->to2Decimals($machineQty * $unitSell),
            ]);
        }, $rawMachines);

        // --- PROCESS CONSUMABLES ---
        $processedConsumables = array_map(function (array $c) use (
            $flags, $annualMonoYields, $annualColorYields, $printerMachineQty, $shouldEnforcePrinterQty
        ): array {
            $mode       = strtolower($c['mode'] ?? '');
            $isModeOthers = in_array($mode, ['others', 'other']);
            $itemYields = $this->toFloat($c['yields'] ?? 0);
            $qty        = 0.0;

            if ($flags['isMonthlyRental']) {
                $unitCost = $this->toFloat($c['cost'] ?? 0);
                $qty = $this->toFloat($c['qty'] ?? 0);
                return array_merge($c, [
                    'qty'       => $qty,
                    'yields'    => 0,
                    'price'     => 0,
                    'totalCost' => $this->to2Decimals($qty * $unitCost),
                    'totalSell' => 0,
                ]);
            }

            if ($flags['isOutrightOnly'] && (in_array($mode, ['mono', 'color']) || $isModeOthers)) {
                $qty = $this->toFloat($c['qty'] ?? 1, 1);
            } elseif (in_array($mode, ['mono', 'color']) || $isModeOthers) {
                $base = $mode === 'color' ? $annualColorYields : $annualMonoYields;
                if ($isModeOthers) {
                    $base = $this->resolveBaseYields($annualMonoYields, $annualColorYields);
                }
                $qty = $this->hasValidYield($itemYields)
                    ? ($base > 0 ? $this->getQtyFromYields($base, $itemYields) : $this->toFloat($c['qty'] ?? 1, 1))
                    : $this->toFloat($c['qty'] ?? 1, 1);

                if ($shouldEnforcePrinterQty || in_array($mode, ['mono', 'color'])) {
                    $qty = $this->to2Decimals($qty * ($printerMachineQty > 0 ? $printerMachineQty : 1));
                }
            } else {
                $qty = $this->toFloat($c['qty'] ?? 1, 1);
            }

            $qty = $this->applyPerCartridgeRounding($qty, $flags['isPerCartridge']);

            $unitCost = $this->toFloat($c['cost']  ?? 0);
            $unitSell = $this->toFloat($c['price'] ?? 0);

            return array_merge($c, [
                'qty'       => $this->to2Decimals($qty),
                'totalCost' => $this->to2Decimals($qty * $unitCost),
                'totalSell' => $this->to2Decimals($qty * $unitSell),
            ]);
        }, $rawConsumables);

        // --- TOTALS ---
        $totalMachineQty    = array_sum(array_column($processedMachines, 'qty'));
        $totalMachineCost   = array_sum(array_column($processedMachines, 'totalCost'));
        $totalMachineSales  = array_sum(array_column($processedMachines, 'totalSell'));
        $totalMachineMargin = array_sum(array_column($processedMachines, 'totalMachineMargin'));

        $totalConsumableQty   = array_sum(array_column($processedConsumables, 'qty'));
        $totalConsumableCost  = array_sum(array_column($processedConsumables, 'totalCost'));
        $totalConsumableSales = array_sum(array_column($processedConsumables, 'totalSell'));

        $totalCompanyFeesAmount  = array_sum(array_column($companyFees,  'total'));
        $totalCustomerFeesAmount = array_sum(array_column($customerFees, 'total'));

        $grandtotalCost = ($totalMachineCost + $totalConsumableCost + $totalCompanyFeesAmount) - $bundleDeduction;
        $grandtotalSell = $totalMachineSales + $totalConsumableSales + $totalCustomerFeesAmount;
        $grossProfit    = $grandtotalSell - $grandtotalCost;
        $roiPercentage  = $grandtotalCost > 0 ? ($grossProfit / $grandtotalCost) * 100 : 0;

        return [
            'totalMachineQty'         => $this->to2Decimals($totalMachineQty),
            'totalMachineCost'        => $this->to2Decimals($totalMachineCost),
            'totalMachineSales'       => $this->to2Decimals($totalMachineSales),
            'totalMachineMargin'      => $this->to2Decimals($totalMachineMargin),
            'totalConsumableQty'      => $this->to2Decimals($totalConsumableQty),
            'totalConsumableCost'     => $this->to2Decimals($totalConsumableCost),
            'totalConsumableSales'    => $this->to2Decimals($totalConsumableSales),
            'totalCompanyFeesAmount'  => $this->to2Decimals($totalCompanyFeesAmount),
            'totalCustomerFeesAmount' => $this->to2Decimals($totalCustomerFeesAmount),
            'grandtotalCost'          => $this->to2Decimals($grandtotalCost),
            'grandtotalSell'          => $this->to2Decimals($grandtotalSell),
            'grossProfit'             => $this->to2Decimals($grossProfit),
            'roiPercentage'           => $this->to2Decimals($roiPercentage),
            'machines'                => $processedMachines,
            'consumables'             => $processedConsumables,
            'companyFees'             => $companyFees,
            'customerFees'            => $customerFees,
            'bundleDeduction'         => $this->to2Decimals($bundleDeduction),
            'firstYearTotalCost'      => $this->to2Decimals($totalMachineCost + $totalConsumableCost),
            'firstYearTotalSell'      => $this->to2Decimals($totalMachineSales + $totalConsumableSales),
        ];
    }

    // =========================================================================
    // succeedingYears
    // =========================================================================

    public function succeedingYears(array $projectData): array
    {
        $config         = $projectData['machineConfiguration'] ?? [];
        $rawMachines    = $config['machine']    ?? [];
        $rawConsumables = $config['consumable'] ?? [];

        $contractYears       = max((int) ($projectData['companyInfo']['contractYears'] ?? 0), 0);
        $succeedingYearCount = max($contractYears - 1, 0);

        $flags = $this->getContractFlags($projectData['companyInfo']['contractType'] ?? '');

        $annualInterest = $this->toFloat($projectData['interest']['annualInterest'] ?? 0);
        $percentMargin  = ($annualInterest * $contractYears) / 100;

        $annualMonoYields  = $this->toFloat($projectData['yield']['monoAmvpYields']['monthly']  ?? 0) * 12;
        $annualColorYields = $this->toFloat($projectData['yield']['colorAmvpYields']['monthly'] ?? 0) * 12;

        $addFeesObj = $projectData['additionalFees'] ?? [];

        $zeroOneTime = fn($f) => array_merge($f, [
            'total' => ($f['category'] ?? '') === 'one-time-fee' ? 0 : $this->toFloat($f['total'] ?? 0),
            'qty'   => ($f['category'] ?? '') === 'one-time-fee' ? 0 : $this->toFloat($f['qty']   ?? 0),
        ]);
        $companyFees  = array_map($zeroOneTime, $addFeesObj['company']  ?? []);
        $customerFees = array_map($zeroOneTime, $addFeesObj['customer'] ?? []);

        $emptyReturn = [
            'totalMachineQty' => 0, 'totalMachineCost' => 0, 'totalMachineSales' => 0, 'totalMachineMargin' => 0,
            'totalConsumableQty' => 0, 'totalConsumableCost' => 0, 'totalConsumableSales' => 0,
            'totalFeesQty' => 0, 'totalCompanyFeesAmount' => 0, 'totalCustomerFeesAmount' => 0,
            'grandtotalCost' => 0, 'grandtotalSell' => 0, 'grossProfit' => 0, 'roiPercentage' => 0,
            'config' => $config, 'machines' => [], 'consumables' => [], 'addFeesObj' => $addFeesObj,
            'companyFees' => [], 'customerFees' => [],
            'succeedingYearsTotalCost' => 0, 'succeedingYearsTotalSales' => 0,
        ];

        if ($succeedingYearCount === 0) return $emptyReturn;

        $shouldEnforcePrinterQty = !$flags['isMonthlyRental'] && !$flags['isOutrightOnly'];

        $printerMachineQty = array_sum(array_map(
            fn($m) => $this->toFloat($m['qty'] ?? 0),
            array_filter($rawMachines, fn($m) => strtolower($m['mode'] ?? '') !== 'others')
        ));

        // --- PROCESS MACHINES ---
        $processedMachines = array_map(function(array $m) use ($flags, $percentMargin, $printerMachineQty, $shouldEnforcePrinterQty): array {
            $unitSell = 0.0;
            $fixedQty = 1;
            $machineQty = $fixedQty;
            $mType = strtolower($m['type'] ?? '');
            $isMachineRow = $mType === 'machine';
            $mode = strtolower($m['mode'] ?? '');
            $isModeOthers = in_array($mode, ['others', 'other']);

            if ($isModeOthers && $shouldEnforcePrinterQty) {
                $machineQty = $this->to2Decimals($fixedQty * ($printerMachineQty > 0 ? $printerMachineQty : 1));
            }

            $unitMargin = 0.0;
            if (!$flags['isOutright'] && $isMachineRow && !$isModeOthers) {
                $rawCost = $this->toFloat($m['inputtedCost'] ?? $m['cost'] ?? 0);
                $unitMargin = $rawCost * $percentMargin;
            }

            return array_merge($m, [
                'qty'                 => $machineQty,
                'price'               => $unitSell,
                'machineMarginTotal'  => $unitMargin,
                'totalMachineMargin'  => 0.0,
                'totalCost'           => 0.0,
                'totalSell'           => $machineQty * $unitSell
            ]);
        }, $rawMachines);

        // --- PROCESS CONSUMABLES ---
        $processedConsumables = array_map(function (array $c) use (
            $flags, $annualMonoYields, $annualColorYields, $printerMachineQty, $shouldEnforcePrinterQty
        ): array {
            $mode       = strtolower($c['mode'] ?? '');
            $isModeOthers = in_array($mode, ['others', 'other']);
            $itemYields = $this->toFloat($c['yields'] ?? 0);
            $qty        = 0.0;

            if ($flags['isMonthlyRental']) {
                $qty = $this->toFloat($c['qty'] ?? 0);
                $unitCost = $this->toFloat($c['cost'] ?? 0);
                return array_merge($c, [
                    'qty' => $qty, 'yields' => 0, 'price' => 0,
                    'totalCost' => $qty * $unitCost, 'totalSell' => 0,
                ]);
            }

            if ((in_array($mode, ['mono', 'color']) || $isModeOthers) && $this->hasValidYield($itemYields)) {
                $base = $mode === 'color' ? $annualColorYields : $annualMonoYields;
                if ($isModeOthers) {
                    $base = $this->resolveBaseYields($annualMonoYields, $annualColorYields);
                }
                $qty = ($base > 0) ? $this->getQtyFromYields($base, $itemYields) : $this->toFloat($c['qty'] ?? 1, 1);
                
                if ($shouldEnforcePrinterQty || in_array($mode, ['mono', 'color'])) {
                    $qty = round($qty * ($printerMachineQty > 0 ? $printerMachineQty : 1) * 100) / 100;
                }
            }
            elseif (in_array($mode, ['mono', 'color']) || $isModeOthers) {
                $qty = $this->toFloat($c['qty'] ?? 1, 1);
                
                if ($shouldEnforcePrinterQty || in_array($mode, ['mono', 'color'])) {
                    $qty = round($qty * ($printerMachineQty > 0 ? $printerMachineQty : 1) * 100) / 100;
                }
            }
            else {
                $qty = $this->toFloat($c['qty'] ?? 1, 1);
            }

            $qty = $this->applyPerCartridgeRounding($qty, $flags['isPerCartridge']);

            $unitCost = $this->toFloat($c['cost']  ?? 0);
            $unitSell = $this->toFloat($c['price'] ?? 0);

            return array_merge($c, [
                'qty'       => $qty,
                'totalCost' => $qty * $unitCost,
                'totalSell' => $qty * $unitSell,
            ]);
        }, $rawConsumables);

        // --- TOTALS ---
        $totalMachineQty    = array_sum(array_column($processedMachines, 'qty'));
        $totalMachineCost   = array_sum(array_column($processedMachines, 'totalCost'));
        $totalMachineSales  = array_sum(array_column($processedMachines, 'totalSell'));
        $totalMachineMargin = array_sum(array_column($processedMachines, 'totalMachineMargin')); 

        $totalConsumableQty   = array_sum(array_column($processedConsumables, 'qty'));
        $totalConsumableCost  = array_sum(array_column($processedConsumables, 'totalCost'));
        $totalConsumableSales = array_sum(array_column($processedConsumables, 'totalSell'));

        $allFees = array_merge($companyFees, $customerFees);
        $totalFeesQty            = array_sum(array_column($allFees,      'qty'));
        $totalCompanyFeesAmount  = array_sum(array_column($companyFees,  'total'));
        $totalCustomerFeesAmount = array_sum(array_column($customerFees, 'total'));

        $grandtotalCost = $totalMachineCost + $totalConsumableCost + $totalCompanyFeesAmount;
        $grandtotalSell = $totalMachineSales + $totalConsumableSales + $totalCustomerFeesAmount;
        $grossProfit    = $grandtotalSell - $grandtotalCost;
        $roiPercentage  = $grandtotalCost > 0 ? ($grossProfit / $grandtotalCost) * 100 : 0;

        return [
            'totalMachineQty'          => $totalMachineQty,
            'totalMachineCost'         => $totalMachineCost,
            'totalMachineSales'        => $totalMachineSales,
            'totalMachineMargin'       => $totalMachineMargin,
            'totalConsumableQty'       => $totalConsumableQty,
            'totalConsumableCost'      => $totalConsumableCost,
            'totalConsumableSales'     => $totalConsumableSales,
            'totalFeesQty'             => $totalFeesQty,
            'totalCompanyFeesAmount'   => $this->toFloat($totalCompanyFeesAmount),
            'totalCustomerFeesAmount'  => $this->toFloat($totalCustomerFeesAmount),
            'grandtotalCost'           => $this->toFloat($grandtotalCost),
            'grandtotalSell'           => $this->toFloat($grandtotalSell),
            'grossProfit'              => $this->toFloat($grossProfit),
            'roiPercentage'            => $roiPercentage,
            'config'                   => $config,
            'machines'                 => $processedMachines,
            'consumables'              => $processedConsumables,
            'addFeesObj'               => $addFeesObj,
            'companyFees'              => $companyFees,
            'customerFees'             => $customerFees,
            'succeedingYearsTotalCost' => $totalMachineCost + $totalConsumableCost,
            'succeedingYearsTotalSales'=> $totalMachineSales + $totalConsumableSales,
        ];
    }
    
    // =========================================================================
    // calculateProjectPotentials
    // =========================================================================

    public function calculateProjectPotentials(array $yearlyBreakdown): array
    {
        $years = array_values($yearlyBreakdown);

        $totalCost        = array_sum(array_map(fn($y) => $this->toFloat($y['grandtotalCost']          ?? 0), $years));
        $totalRevenue     = array_sum(array_map(fn($y) => $this->toFloat($y['grandtotalSell']          ?? 0), $years));
        $totalGrossProfit = array_sum(array_map(fn($y) => $this->toFloat($y['grossProfit']             ?? 0), $years));
        $totalMachineCost = array_sum(array_map(fn($y) => $this->toFloat($y['totalMachineCost']        ?? 0), $years));
        $totalConsumable  = array_sum(array_map(fn($y) => $this->toFloat($y['totalConsumableCost']     ?? 0), $years));
        $totalFees        = array_sum(array_map(fn($y) => $this->toFloat($y['totalCompanyFeesAmount'] ?? 0), $years));

        $totalRoiPercentage = $totalCost > 0 ? ($totalGrossProfit / $totalCost) * 100 : 0;

        return [
            'totalCost'          => $totalCost,
            'totalRevenue'       => $totalRevenue,
            'totalGrossProfit'   => $totalGrossProfit,
            'totalRoiPercentage' => $totalRoiPercentage,
            'breakdown'          => [
                'machine'     => $totalMachineCost,
                'consumables' => $totalConsumable,
                'fees'        => $totalFees,
            ],
        ];
    }

    // =========================================================================
    // calculateAll
    // =========================================================================

    public function calculateAll(array $projectData): array
    {
        $firstYear      = $this->get1YrPotential($projectData);
        $succeedingYear = $this->succeedingYears($projectData);

        $contractYears = max((int) ($projectData['companyInfo']['contractYears'] ?? 1), 1);

        $yearlyBreakdown = ['year_1' => $firstYear];
        for ($y = 2; $y <= $contractYears; $y++) {
            $yearlyBreakdown["year_{$y}"] = $succeedingYear;
        }

        $potentials = $this->calculateProjectPotentials($yearlyBreakdown);

        $feesTotal = array_sum(array_map(
            fn($y) => $this->toFloat($y['totalCompanyFeesAmount'] ?? 0) + $this->toFloat($y['totalCustomerFeesAmount'] ?? 0),
            array_values($yearlyBreakdown)
        ));

        return [
            'grandTotalCost'        => $potentials['totalCost'],
            'grandTotalRevenue'     => $potentials['totalRevenue'],
            'grandRoi'              => $potentials['totalGrossProfit'],
            'grandRoiPercentage'    => $potentials['totalRoiPercentage'],
            'feesTotal'             => $feesTotal,
            'yearlyBreakdown'       => $yearlyBreakdown,
            'breakdown'             => $potentials['breakdown'],
            'firstYear'             => $firstYear,
            'succeedingYear'        => $succeedingYear,
            'projectPotentials'     => $potentials,
        ];
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private function resolveBaseYields(float $mono, float $color): float
    {
        return $mono > 0 ? $mono : $color;
    }
}