<?php

namespace Tests\Unit\Services\Roi\Entry;

use App\Services\Roi\Entry\RoiCalculator;
use PHPUnit\Framework\TestCase;

/**
 * Contract Type 1: Free Use + per Cartridge
 *
 * Rules under test (see ROI_Calculation_Rules.pdf / crm-roi notes):
 *  - Hardware (machine): unit cost only, no selling price (free use), still
 *    carries the non-outright interest margin on top of unit cost.
 *  - Consumables/others: require cost, yields, sellprice; qty is derived
 *    from annual AMPV yields x printer qty, then ceiling-rounded because
 *    the contract bills "per cartridge".
 *  - Fees: shipping is a one-time (1st year only) company-side (cost) fee,
 *    support recurs every year. A checked/customer-side fee row counts as
 *    gross sales instead of cost, and if flagged one-time, is zeroed out
 *    in succeeding years exactly like the shipping fee.
 *  - Succeeding years: drop shipping + hardware cost, keep consumable
 *    cost/sales and support.
 *
 * All expected totals below were hand-derived from the fixture in
 * buildProjectData() by walking RoiCalculator's formulas line by line —
 * see the inline comments next to each assertion for the arithmetic.
 */
class RoiCalculatorType1Test extends TestCase
{
    private RoiCalculator $calc;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calc = new RoiCalculator();
    }

    /**
     * Shared Type 1 fixture. Pass $overrides to tweak nested keys for
     * edge-case tests without repeating the whole structure.
     */
    private function buildProjectData(array $overrides = []): array
    {
        $base = [
            'companyInfo' => [
                'contractType'  => 'Free Use + per Cartridge',
                'contractYears' => 3,
                'bundledStdInk' => false,
            ],
            'interest' => [
                'annualInterest' => 5, // 5%
            ],
            'yield' => [
                'monoAmvpYields'  => ['monthly' => 2000], // -> annual 24,000
                'colorAmvpYields' => ['monthly' => 1000], // -> annual 12,000
            ],
            'machineConfiguration' => [
                'machine' => [
                    [
                        'id'           => '__mandatory_printer__',
                        'sku'          => 'Printer Model X',
                        'type'         => 'machine',
                        'mode'         => '',
                        'cost'         => 10000,
                        'inputtedCost' => 10000,
                        'qty'          => 2,
                        'yields'       => '',
                        'price'        => '',
                        'isMandatory'  => true,
                    ],
                ],
                'consumable' => [
                    [
                        'id'     => 'c-mono',
                        'sku'    => 'Mono Toner',
                        'type'   => 'consumable',
                        'mode'   => 'mono',
                        'cost'   => 500,
                        'yields' => 5000,
                        'price'  => 800,
                        'qty'    => 1,
                    ],
                    [
                        'id'     => 'c-color',
                        'sku'    => 'Color Toner',
                        'type'   => 'consumable',
                        'mode'   => 'color',
                        'cost'   => 600,
                        'yields' => 4000,
                        'price'  => 900,
                        'qty'    => 1,
                    ],
                    [
                        'id'     => 'c-others',
                        'sku'    => 'Maintenance Kit',
                        'type'   => 'consumable',
                        'mode'   => 'others',
                        'cost'   => 300,
                        'yields' => 8000,
                        'price'  => 400,
                        'qty'    => 1,
                    ],
                ],
            ],
            'additionalFees' => [
                // Company side = cost. Unchecked "gross sales" rows land here.
                'company' => [
                    ['id' => 'fee-shipping', 'label' => 'Shipping', 'category' => 'one-time-fee', 'total' => 2000, 'qty' => 1],
                    ['id' => 'fee-support', 'label' => 'Support', 'category' => 'recurring-fee', 'total' => 500, 'qty' => 12],
                ],
                // Customer side = gross sales. Checked "gross sales" rows land here.
                'customer' => [
                    ['id' => 'fee-install', 'label' => 'Installation', 'category' => 'one-time-fee', 'total' => 1000, 'qty' => 1],
                ],
            ],
        ];

        return array_replace_recursive($base, $overrides);
    }

    // =========================================================================
    // getRowCalculations
    // =========================================================================

    public function test_row_calculations_for_printer_row(): void
    {
        $projectData = $this->buildProjectData();
        $printerRow  = $projectData['machineConfiguration']['machine'][0];

        $result = $this->calc->getRowCalculations($printerRow, $projectData);

        // percentMargin = (5 * 3) / 100 = 0.15
        // basePerYear = 10000 / 3 = 3333.33...
        // computedCost = rawCost * (1 + rate) = 10000 * 1.05 = 10500
        // machineMargin = basePerYear * 0.15 = 500
        // machineMarginTotal = rawCost * 0.15 = 1500
        $this->assertEqualsWithDelta(10500.0, $result['computedCost'], 0.01);
        $this->assertEqualsWithDelta(500.0, $result['machineMargin'], 0.01);
        $this->assertEqualsWithDelta(1500.0, $result['machineMarginTotal'], 0.01);

        // Machine Config's own totalCost column: plain qty x unit cost, no interest.
        $this->assertEqualsWithDelta(20000.0, $result['totalCost'], 0.01);

        // Free Use: hardware has no selling price.
        $this->assertEquals(0, $result['price']);
        $this->assertEquals(0, $result['totalSell']);

        // Machine rows (not "others" mode) always report yields as 0.
        $this->assertEquals(0, $result['yields']);
        $this->assertEquals(0, $result['costCpp']);
    }

    public function test_row_calculations_for_mono_consumable_row(): void
    {
        $projectData = $this->buildProjectData();
        $monoRow     = $projectData['machineConfiguration']['consumable'][0];

        $result = $this->calc->getRowCalculations($monoRow, $projectData);

        $this->assertEqualsWithDelta(500.0, $result['computedCost'], 0.01); // consumables: no interest model
        $this->assertSame(0.0, $result['machineMargin']);
        $this->assertSame(0.0, $result['machineMarginTotal']);
        $this->assertEqualsWithDelta(5000.0, $result['yields'], 0.01);
        $this->assertEqualsWithDelta(0.1, $result['costCpp'], 0.0001); // 500 / 5000
        $this->assertEqualsWithDelta(800.0, $result['price'], 0.01);   // not zeroed: not click/rental-based
        $this->assertEqualsWithDelta(0.16, $result['sellCpp'], 0.0001); // 800 / 5000
    }

    // =========================================================================
    // get1YrPotential
    // =========================================================================

    public function test_first_year_potential_totals(): void
    {
        $result = $this->calc->get1YrPotential($this->buildProjectData());

        // Hardware: qty 2 x (10000 + 1500 margin) = 23000; no revenue (free use)
        $this->assertEqualsWithDelta(23000.0, $result['totalMachineCost'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['totalMachineSales'], 0.01);
        $this->assertEqualsWithDelta(3000.0, $result['totalMachineMargin'], 0.01); // 2 x 1500

        // Consumables: mono qty 10 (4.8 x printer-qty 2, ceil'd), color qty 6, others qty 6
        $this->assertEqualsWithDelta(22.0, $result['totalConsumableQty'], 0.01);
        $this->assertEqualsWithDelta(10400.0, $result['totalConsumableCost'], 0.01); // 5000+3600+1800
        $this->assertEqualsWithDelta(15800.0, $result['totalConsumableSales'], 0.01); // 8000+5400+2400

        // Fees: shipping (2000) + support (500) = cost side; installation (1000) = sales side
        $this->assertEqualsWithDelta(2500.0, $result['totalCompanyFeesAmount'], 0.01);
        $this->assertEqualsWithDelta(1000.0, $result['totalCustomerFeesAmount'], 0.01);

        // grandtotalCost = 23000 + 10400 + 2500 = 35900
        // grandtotalSell = 0 + 15800 + 1000 = 16800
        // grossProfit = 16800 - 35900 = -19100
        $this->assertEqualsWithDelta(35900.0, $result['grandtotalCost'], 0.01);
        $this->assertEqualsWithDelta(16800.0, $result['grandtotalSell'], 0.01);
        $this->assertEqualsWithDelta(-19100.0, $result['grossProfit'], 0.01);
        $this->assertEqualsWithDelta(-53.20, $result['roiPercentage'], 0.01);
    }

    public function test_consumable_qty_is_ceiled_for_per_cartridge_billing(): void
    {
        $result = $this->calc->get1YrPotential($this->buildProjectData());

        $mono = collect($result['consumables'])->firstWhere('id', 'c-mono');
        // Raw derived qty is 4.8 x 2 = 9.6 -> ceil'd to 10 under "per cartridge"
        $this->assertEqualsWithDelta(10.0, $mono['qty'], 0.01);
    }

    // =========================================================================
    // succeedingYears
    // =========================================================================

    public function test_succeeding_years_drops_hardware_cost_and_shipping(): void
    {
        $result = $this->calc->succeedingYears($this->buildProjectData());

        // Hardware already paid for: cost/sales/margin all zeroed
        $this->assertEqualsWithDelta(0.0, $result['totalMachineCost'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['totalMachineSales'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['totalMachineMargin'], 0.01);

        // Consumables unchanged year over year
        $this->assertEqualsWithDelta(10400.0, $result['totalConsumableCost'], 0.01);
        $this->assertEqualsWithDelta(15800.0, $result['totalConsumableSales'], 0.01);

        // Shipping (one-time) zeroed; support (recurring) survives
        $this->assertEqualsWithDelta(500.0, $result['totalCompanyFeesAmount'], 0.01);
        // Installation (one-time, customer-side) also zeroed
        $this->assertEqualsWithDelta(0.0, $result['totalCustomerFeesAmount'], 0.01);

        // grandtotalCost = 0 + 10400 + 500 = 10900
        // grandtotalSell = 0 + 15800 + 0 = 15800
        // grossProfit = 4900
        $this->assertEqualsWithDelta(10900.0, $result['grandtotalCost'], 0.01);
        $this->assertEqualsWithDelta(15800.0, $result['grandtotalSell'], 0.01);
        $this->assertEqualsWithDelta(4900.0, $result['grossProfit'], 0.01);
        $this->assertEqualsWithDelta(44.95, $result['roiPercentage'], 0.01);
    }

    public function test_succeeding_years_returns_empty_when_contract_is_one_year(): void
    {
        $projectData = $this->buildProjectData(['companyInfo' => ['contractYears' => 1]]);

        $result = $this->calc->succeedingYears($projectData);

        $this->assertSame(0, $result['grandtotalCost']);
        $this->assertSame(0, $result['grandtotalSell']);
        $this->assertSame([], $result['machines']);
        $this->assertSame([], $result['consumables']);
    }

    // =========================================================================
    // calculateProjectPotentials / calculateAll (3-year contract)
    // =========================================================================

    public function test_calculate_project_potentials_across_full_contract(): void
    {
        $projectData    = $this->buildProjectData();
        $firstYear      = $this->calc->get1YrPotential($projectData);
        $succeedingYear = $this->calc->succeedingYears($projectData);

        $yearlyBreakdown = [
            'year_1' => $firstYear,
            'year_2' => $succeedingYear,
            'year_3' => $succeedingYear,
        ];

        $result = $this->calc->calculateProjectPotentials($yearlyBreakdown);

        // totalCost = 35900 + 10900 + 10900 = 57700
        // totalRevenue = 16800 + 15800 + 15800 = 48400
        // totalGrossProfit = -19100 + 4900 + 4900 = -9300
        $this->assertEqualsWithDelta(57700.0, $result['totalCost'], 0.01);
        $this->assertEqualsWithDelta(48400.0, $result['totalRevenue'], 0.01);
        $this->assertEqualsWithDelta(-9300.0, $result['totalGrossProfit'], 0.01);
        $this->assertEqualsWithDelta(-16.12, $result['totalRoiPercentage'], 0.01);

        $this->assertEqualsWithDelta(23000.0, $result['breakdown']['machine'], 0.01);
        $this->assertEqualsWithDelta(31200.0, $result['breakdown']['consumables'], 0.01);
        $this->assertEqualsWithDelta(3500.0, $result['breakdown']['fees'], 0.01);
    }

    public function test_calculate_all_matches_manual_breakdown(): void
    {
        $projectData = $this->buildProjectData();

        $result = $this->calc->calculateAll($projectData);

        $this->assertEqualsWithDelta(57700.0, $result['grandTotalCost'], 0.01);
        $this->assertEqualsWithDelta(48400.0, $result['grandTotalRevenue'], 0.01);
        $this->assertEqualsWithDelta(-9300.0, $result['grandRoi'], 0.01);
        $this->assertCount(3, $result['yearlyBreakdown']);
    }
}