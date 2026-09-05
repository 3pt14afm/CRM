<?php

namespace Tests\Unit\Services\Roi\Entry;

use App\Services\Roi\Entry\RoiCalculator;
use PHPUnit\Framework\TestCase;

/**
 * Type 5 — NON-OUTRIGHT, Fixed Monthly Only.
 *
 * Fixture: 3-year contract, 10% annual interest, mandatory printer qty 1,
 * one "others" machine row with a user-entered qty, mono/color/others
 * consumables billed at plain entered qty x cost, one one-time company fee
 * (shipping), two recurring company fees (support, rental), and one
 * one-time customer fee (setup).
 */
class RoiCalculatorType5Test extends TestCase
{
    private RoiCalculator $calculator;
    private array $projectData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new RoiCalculator();

        $this->projectData = [
            'companyInfo' => [
                'contractType'  => 'Fixed Monthly Only',
                'contractYears' => 3,
                'bundledStdInk' => false,
            ],
            'interest' => [
                'annualInterest' => 10,
            ],
            'yield' => [
                'monoAmvpYields'  => ['monthly' => 0],
                'colorAmvpYields' => ['monthly' => 0],
            ],
            'machineConfiguration' => [
                'machine' => [
                    [
                        'id'           => '__mandatory_printer__',
                        'isMandatory'  => true,
                        'type'         => 'machine',
                        'mode'         => 'mono',
                        'qty'          => 1,
                        'cost'         => 5000,
                        'inputtedCost' => 5000,
                        'price'        => 6000,
                        'yields'       => 0,
                    ],
                    [
                        'id'           => 'others-1',
                        'isMandatory'  => false,
                        'type'         => 'machine',
                        'mode'         => 'others',
                        'qty'          => 3,
                        'cost'         => 1000,
                        'inputtedCost' => 1000,
                        'price'        => 0,
                        'yields'       => 0,
                    ],
                ],
                'consumable' => [
                    ['type' => 'consumable', 'mode' => 'mono',   'qty' => 10, 'cost' => 50, 'yields' => 5000, 'price' => 2],
                    ['type' => 'consumable', 'mode' => 'color',  'qty' => 8,  'cost' => 70, 'yields' => 4000, 'price' => 3],
                    ['type' => 'consumable', 'mode' => 'others', 'qty' => 5,  'cost' => 20, 'yields' => 0,    'price' => 0],
                ],
            ],
            'additionalFees' => [
                'company' => [
                    ['name' => 'Shipping', 'category' => 'one-time-fee',  'total' => 2000,  'qty' => 1,  'checked' => false],
                    ['name' => 'Support',  'category' => 'recurring-fee', 'total' => 1200,  'qty' => 12, 'checked' => false],
                    ['name' => 'Rental',   'category' => 'recurring-fee', 'total' => 24000, 'qty' => 12, 'checked' => false],
                ],
                'customer' => [
                    ['name' => 'Setup Fee', 'category' => 'one-time-fee', 'total' => 3000, 'qty' => 1, 'checked' => true],
                ],
            ],
        ];
    }

    // ---------------------------------------------------------------
    // getRowCalculations
    // ---------------------------------------------------------------

    public function test_row_calculation_for_monthly_rental_consumable(): void
    {
        $row = ['type' => 'consumable', 'mode' => 'mono', 'cost' => 50, 'qty' => 10, 'yields' => 5000, 'price' => 2];

        $result = $this->calculator->getRowCalculations($row, $this->projectData);

        // Fixed Monthly consumables: no financing model, entered qty x cost only.
        $this->assertEqualsWithDelta(50.0, $result['inputtedCost'], 0.0001);
        $this->assertEqualsWithDelta(50.0, $result['computedCost'], 0.0001);
        $this->assertEqualsWithDelta(50.0, $result['basePerYear'], 0.0001);
        $this->assertEqualsWithDelta(500.0, $result['totalCost'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['yields'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['costCpp'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['price'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['totalSell'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['sellCpp'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['machineMargin'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['machineMarginTotal'], 0.0001);
    }

    public function test_row_calculation_for_monthly_rental_printer_machine(): void
    {
        $row = ['type' => 'machine', 'mode' => 'mono', 'cost' => 5000, 'qty' => 2, 'yields' => 0, 'price' => 6000];

        $result = $this->calculator->getRowCalculations($row, $this->projectData);

        // Non-outright machine -> financed cost + margin apply; price forced to 0.
        $this->assertEqualsWithDelta(5000.0, $result['inputtedCost'], 0.0001);
        $this->assertEqualsWithDelta(5500.0, $result['computedCost'], 0.0001); // 5000 * (1 + 10%)
        $this->assertEqualsWithDelta(1666.6667, $result['basePerYear'], 0.0001);
        $this->assertEqualsWithDelta(10000.0, $result['totalCost'], 0.0001); // plain qty x cost, no markup
        $this->assertEqualsWithDelta(0.0, $result['yields'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['costCpp'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['price'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['totalSell'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['sellCpp'], 0.0001);
        $this->assertEqualsWithDelta(500.0, $result['machineMargin'], 0.0001); // per-year
        $this->assertEqualsWithDelta(1500.0, $result['machineMarginTotal'], 0.0001);
    }

    // ---------------------------------------------------------------
    // get1YrPotential
    // ---------------------------------------------------------------

    public function test_first_year_potential(): void
    {
        $result = $this->calculator->get1YrPotential($this->projectData);

        $this->assertEqualsWithDelta(4.0, $result['totalMachineQty'], 0.0001);
        $this->assertEqualsWithDelta(9500.0, $result['totalMachineCost'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['totalMachineSales'], 0.0001);
        $this->assertEqualsWithDelta(1500.0, $result['totalMachineMargin'], 0.0001);

        $this->assertEqualsWithDelta(23.0, $result['totalConsumableQty'], 0.0001);
        $this->assertEqualsWithDelta(1160.0, $result['totalConsumableCost'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['totalConsumableSales'], 0.0001);

        $this->assertEqualsWithDelta(27200.0, $result['totalCompanyFeesAmount'], 0.0001);
        $this->assertEqualsWithDelta(3000.0, $result['totalCustomerFeesAmount'], 0.0001);

        $this->assertEqualsWithDelta(37860.0, $result['grandtotalCost'], 0.0001);
        $this->assertEqualsWithDelta(3000.0, $result['grandtotalSell'], 0.0001);
        $this->assertEqualsWithDelta(-34860.0, $result['grossProfit'], 0.0001);
        $this->assertEqualsWithDelta(-92.08, $result['roiPercentage'], 0.01);

        $this->assertEqualsWithDelta(0.0, $result['bundleDeduction'], 0.0001);
        $this->assertEqualsWithDelta(10660.0, $result['firstYearTotalCost'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['firstYearTotalSell'], 0.0001);

        // Row-level: "others" machine qty is respected as user-entered on Fixed Monthly.
        $machines = $result['machines'];
        $this->assertEqualsWithDelta(1.0, $machines[0]['qty'], 0.0001);
        $this->assertEqualsWithDelta(3.0, $machines[1]['qty'], 0.0001);

        // Row-level: consumables use entered qty directly, yields/price zeroed out.
        $consumables = $result['consumables'];
        $this->assertEqualsWithDelta(10.0, $consumables[0]['qty'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $consumables[0]['price'], 0.0001);
        $this->assertEquals(0, $consumables[0]['yields']);
    }

    // ---------------------------------------------------------------
    // succeedingYears
    // ---------------------------------------------------------------

    public function test_succeeding_years(): void
    {
        $result = $this->calculator->succeedingYears($this->projectData);

        $this->assertEqualsWithDelta(4.0, $result['totalMachineQty'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['totalMachineCost'], 0.0001); // machines already paid for in Year 1
        $this->assertEqualsWithDelta(0.0, $result['totalMachineSales'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['totalMachineMargin'], 0.0001); // reported per-row, not summed

        $this->assertEqualsWithDelta(23.0, $result['totalConsumableQty'], 0.0001);
        $this->assertEqualsWithDelta(1160.0, $result['totalConsumableCost'], 0.0001); // recurs every year
        $this->assertEqualsWithDelta(0.0, $result['totalConsumableSales'], 0.0001);

        $this->assertEqualsWithDelta(24.0, $result['totalFeesQty'], 0.0001); // one-time qtys zeroed, recurring kept
        $this->assertEqualsWithDelta(25200.0, $result['totalCompanyFeesAmount'], 0.0001); // shipping dropped
        $this->assertEqualsWithDelta(0.0, $result['totalCustomerFeesAmount'], 0.0001); // setup fee was one-time

        $this->assertEqualsWithDelta(26360.0, $result['grandtotalCost'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['grandtotalSell'], 0.0001);
        $this->assertEqualsWithDelta(-26360.0, $result['grossProfit'], 0.0001);
        $this->assertEqualsWithDelta(-100.0, $result['roiPercentage'], 0.0001);

        $this->assertEqualsWithDelta(1160.0, $result['succeedingYearsTotalCost'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['succeedingYearsTotalSales'], 0.0001);

        // machineMarginTotal is still reported per-row (informational), just not folded into the totals above.
        $this->assertEqualsWithDelta(1500.0, $result['machines'][0]['machineMarginTotal'], 0.0001);
    }

    public function test_succeeding_years_returns_zeros_when_only_one_contract_year(): void
    {
        $projectData = $this->projectData;
        $projectData['companyInfo']['contractYears'] = 1;

        $result = $this->calculator->succeedingYears($projectData);

        $this->assertEquals(0, $result['totalMachineQty']);
        $this->assertEquals(0, $result['grandtotalCost']);
        $this->assertEquals(0, $result['grandtotalSell']);
        $this->assertSame([], $result['machines']);
        $this->assertSame([], $result['consumables']);
    }

    // ---------------------------------------------------------------
    // Edge cases
    // ---------------------------------------------------------------

    public function test_others_machine_derives_qty_from_yields_when_not_entered(): void
    {
        $projectData = [
            'companyInfo' => ['contractType' => 'Fixed Monthly Only', 'contractYears' => 1],
            'interest'    => ['annualInterest' => 0],
            'yield'       => ['monoAmvpYields' => ['monthly' => 500], 'colorAmvpYields' => ['monthly' => 0]],
            'machineConfiguration' => [
                'machine' => [
                    ['id' => 'others-1', 'type' => 'machine', 'mode' => 'others', 'qty' => 0, 'cost' => 100, 'yields' => 2000],
                ],
                'consumable' => [],
            ],
            'additionalFees' => ['company' => [], 'customer' => []],
        ];

        $result = $this->calculator->get1YrPotential($projectData);

        // annualMonoYields = 500 * 12 = 6000; 6000 / 2000 = 3
        $this->assertEqualsWithDelta(3.0, $result['machines'][0]['qty'], 0.0001);
    }

    public function test_others_machine_defaults_to_one_when_not_entered_and_no_valid_yield(): void
    {
        $projectData = [
            'companyInfo' => ['contractType' => 'Fixed Monthly Only', 'contractYears' => 1],
            'interest'    => ['annualInterest' => 0],
            'yield'       => ['monoAmvpYields' => ['monthly' => 0], 'colorAmvpYields' => ['monthly' => 0]],
            'machineConfiguration' => [
                'machine' => [
                    ['id' => 'others-1', 'type' => 'machine', 'mode' => 'others', 'qty' => 0, 'cost' => 100, 'yields' => 0],
                ],
                'consumable' => [],
            ],
            'additionalFees' => ['company' => [], 'customer' => []],
        ];

        $result = $this->calculator->get1YrPotential($projectData);

        $this->assertEqualsWithDelta(1.0, $result['machines'][0]['qty'], 0.0001);
    }

    public function test_bundle_deduction_reduces_grandtotal_cost_and_can_push_roi_negative_denominator_to_zero(): void
    {
        $projectData = [
            'companyInfo' => ['contractType' => 'Fixed Monthly Only', 'contractYears' => 1, 'bundledStdInk' => true],
            'interest'    => ['annualInterest' => 0],
            'yield'       => ['monoAmvpYields' => ['monthly' => 0], 'colorAmvpYields' => ['monthly' => 0]],
            'machineConfiguration' => [
                'machine'    => [['id' => 'p1', 'isMandatory' => true, 'type' => 'machine', 'mode' => 'mono', 'qty' => 1, 'cost' => 1000, 'inputtedCost' => 1000]],
                'consumable' => [['type' => 'consumable', 'mode' => 'mono', 'qty' => 5, 'cost' => 10]],
                'totals'     => ['totalBundledPrice' => 5000],
            ],
            'additionalFees' => ['company' => [], 'customer' => []],
        ];

        $result = $this->calculator->get1YrPotential($projectData);

        $this->assertEqualsWithDelta(5000.0, $result['bundleDeduction'], 0.0001);
        // (1000 machine + 50 consumable) - 5000 bundle = -3950
        $this->assertEqualsWithDelta(-3950.0, $result['grandtotalCost'], 0.0001);
        // roiPercentage formula only divides when grandtotalCost > 0, so a
        // negative-cost result (bundle bigger than spend) reports 0, not a
        // meaningful negative-denominator percentage.
        $this->assertEqualsWithDelta(0.0, $result['roiPercentage'], 0.0001);
    }

    public function test_consumable_zero_qty_costs_zero_not_defaulted(): void
    {
        $projectData = $this->projectData;
        $projectData['machineConfiguration']['consumable'] = [
            ['type' => 'consumable', 'mode' => 'mono', 'qty' => 0, 'cost' => 100, 'yields' => 5000, 'price' => 2],
        ];

        $result = $this->calculator->get1YrPotential($projectData);

        $this->assertEqualsWithDelta(0.0, $result['consumables'][0]['qty'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['consumables'][0]['totalCost'], 0.0001);
    }

    public function test_consumable_negative_qty_currently_passes_through_unclamped(): void
    {
        // NOTE: the monthly-rental consumable branch reads qty straight via
        // toFloat()/getSafeNumber(), bypassing the negative-qty guard
        // (toFloatOrFallbackIfNegative / rawQty < 0 check) that the other
        // consumable branches use. This test documents that current
        // behavior — flag it if a negative qty should instead be clamped
        // to 0 or 1 for Fixed Monthly.
        $projectData = $this->projectData;
        $projectData['machineConfiguration']['consumable'] = [
            ['type' => 'consumable', 'mode' => 'mono', 'qty' => -5, 'cost' => 100, 'yields' => 5000, 'price' => 2],
        ];

        $result = $this->calculator->get1YrPotential($projectData);

        $this->assertEqualsWithDelta(-5.0, $result['consumables'][0]['qty'], 0.0001);
        $this->assertEqualsWithDelta(-500.0, $result['consumables'][0]['totalCost'], 0.0001);
    }

    public function test_zero_annual_interest_zeroes_machine_margin_cleanly(): void
    {
        $projectData = $this->projectData;
        $projectData['interest']['annualInterest'] = 0;

        $result = $this->calculator->get1YrPotential($projectData);

        $this->assertEqualsWithDelta(0.0, $result['totalMachineMargin'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['machines'][0]['machineMarginTotal'], 0.0001);
        // Machine cost is now just qty x unit cost with no margin loaded in.
        $this->assertEqualsWithDelta(5000.0, $result['machines'][0]['totalCost'], 0.0001); // 1 x 5000
    }

    public function test_row_calculation_zero_interest_returns_unmarked_up_cost(): void
    {
        $row = ['type' => 'machine', 'mode' => 'mono', 'cost' => 5000, 'qty' => 2, 'yields' => 0, 'price' => 6000];
        $projectData = $this->projectData;
        $projectData['interest']['annualInterest'] = 0;

        $result = $this->calculator->getRowCalculations($row, $projectData);

        $this->assertEqualsWithDelta(5000.0, $result['computedCost'], 0.0001); // no interest markup
        $this->assertEqualsWithDelta(0.0, $result['machineMargin'], 0.0001);
        $this->assertEqualsWithDelta(0.0, $result['machineMarginTotal'], 0.0001);
    }

    public function test_missing_contract_years_defaults_to_one_in_get1yr_potential(): void
    {
        $projectData = $this->projectData;
        unset($projectData['companyInfo']['contractYears']);

        $result = $this->calculator->get1YrPotential($projectData);

        // percentMargin falls back to (annualInterest * 1) / 100 = 0.10,
        // so the printer's margin is unitCost x 0.10 instead of x 0.30.
        $this->assertEqualsWithDelta(500.0, $result['machines'][0]['machineMarginTotal'], 0.0001);
    }

    public function test_row_calculation_missing_contract_years_defaults_to_one(): void
    {
        $row = ['type' => 'machine', 'mode' => 'mono', 'cost' => 5000, 'qty' => 2, 'yields' => 0, 'price' => 6000];
        $projectData = $this->projectData;
        unset($projectData['companyInfo']['contractYears']);

        $result = $this->calculator->getRowCalculations($row, $projectData);

        $this->assertEqualsWithDelta(5000.0, $result['basePerYear'], 0.0001); // rawCost / 1
        $this->assertEqualsWithDelta(5500.0, $result['computedCost'], 0.0001); // 5000 * (1 + 10%)
        $this->assertEqualsWithDelta(500.0, $result['machineMarginTotal'], 0.0001); // 5000 * (10 * 1) / 100
    }
}