<?php

namespace Tests\Unit\Services\Roi\Entry;

use App\Services\Roi\Entry\RoiCalculator;
use PHPUnit\Framework\TestCase;

/**
 * Contract Type 1: Free Use + per Cartridge — EDGE CASES
 *
 * Companion to RoiCalculatorType1Test.php, which only covers the happy
 * path. This file covers missing/invalid input, structural edge cases,
 * contract-type string robustness, rounding boundaries, and multi-year
 * edge cases.
 *
 * IMPORTANT — three tests in here are marked "EXPECTED TO FAIL" below.
 * They assert the behavior we WANT (not what the code currently does):
 *   1. test_negative_numbers_are_sanitized_not_passed_through()
 *   2. test_negative_qty_on_generic_mode_row_is_sanitized()
 *   3. test_fee_missing_category_defaults_to_one_time_not_recurring()
 *   4. test_contract_years_of_zero_produces_zero_output()
 * These fail against the current RoiCalculator.php because negative
 * numbers flow through unguarded, a categoryless fee is currently
 * treated as recurring, and contractYears=0 currently falls back to 1
 * in get1YrPotential (inconsistent with succeedingYears, which treats
 * 0 as "no valid contract" and returns an empty breakdown). Once the
 * calculator is patched to sanitize negatives, default missing
 * category to one-time, and treat contractYears<=0 consistently as
 * "no valid contract" across both functions, these should pass.
 */
class RoiCalculatorType1EdgeCasesTest extends TestCase
{
    private RoiCalculator $calc;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calc = new RoiCalculator();
    }

    /**
     * A stripped-down Type 1 fixture with interest = 0 and contractYears = 1
     * so margin math doesn't complicate the assertions we actually care
     * about here. $overrides does a SHALLOW replace for
     * 'machineConfiguration' and 'additionalFees' (not a recursive merge)
     * so tests can fully swap out machine/consumable/fee arrays, and a
     * recursive merge for everything else (companyInfo, interest, yield).
     */
    private function buildProjectData(array $overrides = []): array
    {
        $base = [
            'companyInfo' => [
                'contractType'  => 'Free Use + per Cartridge',
                'contractYears' => 1,
                'bundledStdInk' => false,
            ],
            'interest' => [
                'annualInterest' => 0,
            ],
            'yield' => [
                'monoAmvpYields'  => ['monthly' => 1000], // -> annual 12,000
                'colorAmvpYields' => ['monthly' => 500],  // -> annual 6,000
            ],
            'machineConfiguration' => [
                'machine' => [
                    [
                        'id'           => '__mandatory_printer__',
                        'sku'          => 'Printer Model X',
                        'type'         => 'machine',
                        'mode'         => '',
                        'cost'         => 1000,
                        'inputtedCost' => 1000,
                        'qty'          => 1,
                        'isMandatory'  => true,
                    ],
                ],
                'consumable' => [],
            ],
            'additionalFees' => [
                'company'  => [],
                'customer' => [],
            ],
        ];

        $result = $base;
        foreach ($overrides as $key => $value) {
            if (in_array($key, ['machineConfiguration', 'additionalFees'], true) && is_array($value)) {
                $result[$key] = $value; // full replace, never merged
            } elseif (is_array($value) && isset($result[$key]) && is_array($result[$key])) {
                $result[$key] = array_replace_recursive($result[$key], $value);
            } else {
                $result[$key] = $value;
            }
        }
        return $result;
    }

    // =========================================================================
    // Missing / blank input
    // =========================================================================

    public function test_blank_fields_do_not_crash_and_compute_as_zero(): void
    {
        $row = [
            'id' => 'c-blank', 'type' => 'consumable', 'mode' => 'mono',
            'cost' => '', 'qty' => '', 'yields' => '', 'price' => '',
        ];
        $projectData = $this->buildProjectData();

        $result = $this->calc->getRowCalculations($row, $projectData);

        $this->assertEquals(0.0, $result['computedCost']);
        $this->assertEquals(0.0, $result['totalCost']);
        $this->assertEquals(0.0, $result['yields']);
        $this->assertEquals(0.0, $result['price']);
        $this->assertEquals(0.0, $result['totalSell']);
        $this->assertEquals(0.0, $result['costCpp']);
        $this->assertEquals(0.0, $result['sellCpp']);
    }

    public function test_non_numeric_strings_fall_back_to_zero(): void
    {
        $row = [
            'id' => 'c-junk', 'type' => 'consumable', 'mode' => 'mono',
            'cost' => 'abc', 'qty' => 5, 'yields' => 1000, 'price' => 'xyz',
        ];
        $projectData = $this->buildProjectData();

        $result = $this->calc->getRowCalculations($row, $projectData);

        // Non-numeric cost/price silently become 0 (filter_var/FILTER_VALIDATE_FLOAT
        // fails, so toFloat() falls back) rather than throwing or NaN-ing out.
        $this->assertEquals(0.0, $result['inputtedCost']);
        $this->assertEquals(0.0, $result['price']);
        $this->assertEquals(0.0, $result['totalCost']); // 0 * 5
        $this->assertEquals(0.0, $result['totalSell']); // 0 * 5
        $this->assertEquals(1000.0, $result['yields']); // valid numeric yields still passes through
    }

    /**
     * EXPECTED TO FAIL against current code. Negative cost/price currently
     * flow straight through arithmetic unguarded. Desired: a negative
     * numeric input should be sanitized the same way an invalid/non-numeric
     * one is (fall back to 0), since neither is a real-world valid entry.
     */
    public function test_negative_numbers_are_sanitized_not_passed_through(): void
    {
        $row = [
            'id' => 'c-neg', 'type' => 'consumable', 'mode' => 'mono',
            'cost' => -500, 'qty' => 2, 'yields' => 1000, 'price' => -800,
        ];
        $projectData = $this->buildProjectData();

        $result = $this->calc->getRowCalculations($row, $projectData);

        $this->assertEquals(0.0, $result['inputtedCost'], 'negative cost should sanitize to 0, not pass through as -500');
        $this->assertEquals(0.0, $result['price'], 'negative price should sanitize to 0, not pass through as -800');
    }

    /**
     * EXPECTED TO FAIL against current code. A row with a mode that isn't
     * mono/color/others (the "else" qty branch in get1YrPotential) reads
     * raw qty via toFloat() with no <=0 guard, so an explicitly negative
     * qty is used as-is and produces a negative totalCost. Desired: treat
     * a negative qty the same as an absent one (fall back to 1).
     */
    public function test_negative_qty_on_generic_mode_row_is_sanitized(): void
    {
        $projectData = $this->buildProjectData([
            'machineConfiguration' => [
                'machine' => [
                    ['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 1, 'isMandatory' => true],
                ],
                'consumable' => [
                    ['id' => 'c-misc', 'type' => 'consumable', 'mode' => 'misc', 'cost' => 100, 'yields' => 0, 'price' => 50, 'qty' => -3],
                ],
            ],
        ]);

        $result = $this->calc->get1YrPotential($projectData);
        $misc = collect($result['consumables'] ?? [])->firstWhere('id', 'c-misc')
            ?? array_values(array_filter($result['consumables'], fn($c) => $c['id'] === 'c-misc'))[0];

        $this->assertGreaterThanOrEqual(0, $misc['qty'], 'a negative entered qty should not survive into a negative row quantity');
    }

    // =========================================================================
    // qty = 0 explicit vs. never touched
    // =========================================================================

    public function test_explicit_zero_qty_and_missing_qty_derive_identically_when_yields_are_valid(): void
    {
        $projectDataZero = $this->buildProjectData([
            'machineConfiguration' => [
                'machine'    => [['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 1, 'isMandatory' => true]],
                'consumable' => [['id' => 'c-mono', 'type' => 'consumable', 'mode' => 'mono', 'cost' => 10, 'yields' => 2000, 'price' => 20, 'qty' => 0]],
            ],
        ]);
        $projectDataMissing = $this->buildProjectData([
            'machineConfiguration' => [
                'machine'    => [['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 1, 'isMandatory' => true]],
                'consumable' => [['id' => 'c-mono', 'type' => 'consumable', 'mode' => 'mono', 'cost' => 10, 'yields' => 2000, 'price' => 20]], // no 'qty' key at all
            ],
        ]);

        $resultZero    = $this->calc->get1YrPotential($projectDataZero);
        $resultMissing = $this->calc->get1YrPotential($projectDataMissing);

        // Both should derive qty from yields (mono/color derivation ignores
        // raw qty entirely when valid yields exist), so 0 and "never touched"
        // produce the same result: 12000 / 2000 = 6, * printer qty (1) = 6.
        $this->assertEqualsWithDelta(6.0, $resultZero['consumables'][0]['qty'], 0.01);
        $this->assertEqualsWithDelta(6.0, $resultMissing['consumables'][0]['qty'], 0.01);
    }

    // =========================================================================
    // Structural edge cases
    // =========================================================================

    public function test_no_consumables_returns_zeros_without_error(): void
    {
        $projectData = $this->buildProjectData(); // base fixture already has consumable: []

        $result = $this->calc->get1YrPotential($projectData);

        $this->assertSame([], $result['consumables']);
        $this->assertEqualsWithDelta(0.0, $result['totalConsumableCost'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['totalConsumableSales'], 0.01);
        // Machine total should still compute normally.
        $this->assertEqualsWithDelta(1000.0, $result['totalMachineCost'], 0.01);
    }

    public function test_no_machine_rows_falls_back_printer_qty_to_one(): void
    {
        $projectData = $this->buildProjectData([
            'machineConfiguration' => [
                'machine'    => [],
                'consumable' => [['id' => 'c-mono', 'type' => 'consumable', 'mode' => 'mono', 'cost' => 10, 'yields' => 1000, 'price' => 20]],
            ],
        ]);

        $result = $this->calc->get1YrPotential($projectData);

        // annualMonoYields 12000 / 1000 = 12, * printerMachineQty fallback (1) = 12
        $this->assertEqualsWithDelta(12.0, $result['consumables'][0]['qty'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['totalMachineCost'], 0.01);
        $this->assertSame([], $result['machines']);
    }

    public function test_multiple_non_mandatory_printer_rows_are_not_double_counted(): void
    {
        $projectData = $this->buildProjectData([
            'machineConfiguration' => [
                'machine' => [
                    ['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 2, 'isMandatory' => true],
                    ['id' => 'p2', 'type' => 'machine', 'mode' => '', 'cost' => 500, 'inputtedCost' => 500, 'qty' => 5, 'isMandatory' => false],
                ],
                'consumable' => [
                    ['id' => 'c-mono', 'type' => 'consumable', 'mode' => 'mono', 'cost' => 10, 'yields' => 1000, 'price' => 20],
                ],
            ],
        ]);

        $result = $this->calc->get1YrPotential($projectData);

        // printerMachineQty only sums the mandatory row's qty (2), NOT the
        // extra non-mandatory row's qty (5). 12000/1000=12, *2 = 24.
        $this->assertEqualsWithDelta(24.0, $result['consumables'][0]['qty'], 0.01);
    }

    public function test_consumable_with_no_yields_falls_back_to_entered_qty_times_printer_qty(): void
    {
        $projectData = $this->buildProjectData([
            'machineConfiguration' => [
                'machine'    => [['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 2, 'isMandatory' => true]],
                'consumable' => [['id' => 'c-mono', 'type' => 'consumable', 'mode' => 'mono', 'cost' => 10, 'yields' => 0, 'price' => 20, 'qty' => 3]],
            ],
        ]);

        $result = $this->calc->get1YrPotential($projectData);

        // No valid yields -> falls back to entered qty (3), then multiplied
        // by printer qty (2) since mono always gets the printer multiplier.
        $this->assertEqualsWithDelta(6.0, $result['consumables'][0]['qty'], 0.01);
    }

    public function test_others_mode_machine_row_with_no_yields_always_derives_from_printer_qty(): void
    {
        $projectData = $this->buildProjectData([
            'machineConfiguration' => [
                'machine' => [
                    ['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 3, 'isMandatory' => true],
                    ['id' => 'm-others', 'type' => 'machine', 'mode' => 'others', 'cost' => 200, 'inputtedCost' => 200, 'qty' => 999, 'yields' => 0],
                ],
                'consumable' => [],
            ],
        ]);

        $result = $this->calc->get1YrPotential($projectData);
        $others = array_values(array_filter($result['machines'], fn($m) => $m['id'] === 'm-others'))[0];

        // Under a printer-enforced contract, "others" machine qty is ALWAYS
        // 1 x printerMachineQty — the entered qty (999) is ignored entirely.
        $this->assertEqualsWithDelta(3.0, $others['qty'], 0.01);
    }

    public function test_others_mode_consumable_row_with_no_yields_uses_entered_qty_times_printer_qty(): void
    {
        $projectData = $this->buildProjectData([
            'machineConfiguration' => [
                'machine'    => [['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 3, 'isMandatory' => true]],
                'consumable' => [['id' => 'c-others', 'type' => 'consumable', 'mode' => 'others', 'cost' => 50, 'yields' => 0, 'price' => 80, 'qty' => 5]],
            ],
        ]);

        $result = $this->calc->get1YrPotential($projectData);

        // Unlike the machine-row case above, an "others" CONSUMABLE with no
        // valid yields respects the entered qty (5), then still applies the
        // printer multiplier (3) since shouldEnforcePrinterQty is true here.
        $this->assertEqualsWithDelta(15.0, $result['consumables'][0]['qty'], 0.01);
    }

    public function test_empty_additional_fees_returns_zero_totals_without_error(): void
    {
        $projectData = $this->buildProjectData(['additionalFees' => []]);

        $result = $this->calc->get1YrPotential($projectData);

        $this->assertEqualsWithDelta(0.0, $result['totalCompanyFeesAmount'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['totalCustomerFeesAmount'], 0.01);
    }

    /**
     * EXPECTED TO FAIL against current code. A fee row with no 'category'
     * key at all currently survives into succeeding years (treated as
     * recurring by default) because `($f['category'] ?? '') === 'one-time-fee'`
     * is false for an empty string. Desired: a categoryless fee should be
     * treated as one-time (the safer default — a fee nobody explicitly
     * marked recurring shouldn't silently repeat every year).
     */
    public function test_fee_missing_category_defaults_to_one_time_not_recurring(): void
    {
        $projectData = $this->buildProjectData([
            'companyInfo'    => ['contractYears' => 2],
            'additionalFees' => [
                'company'  => [['id' => 'f-nocat', 'label' => 'Mystery Fee', 'total' => 1000, 'qty' => 1]], // no 'category' key
                'customer' => [],
            ],
        ]);

        $result = $this->calc->succeedingYears($projectData);

        $this->assertEqualsWithDelta(0.0, $result['totalCompanyFeesAmount'], 0.01, 'a fee with no category should default to one-time (zeroed in succeeding years), not recurring');
    }

    // =========================================================================
    // Contract-type string robustness
    // =========================================================================

    public function test_contract_type_casing_does_not_affect_result(): void
    {
        $lower = $this->buildProjectData(['companyInfo' => ['contractType' => 'free use + per cartridge']]);
        $upper = $this->buildProjectData(['companyInfo' => ['contractType' => 'FREE USE + PER CARTRIDGE']]);

        $resultLower = $this->calc->get1YrPotential($lower);
        $resultUpper = $this->calc->get1YrPotential($upper);

        $this->assertEqualsWithDelta($resultLower['grandtotalCost'], $resultUpper['grandtotalCost'], 0.01);
        $this->assertEqualsWithDelta($resultLower['totalMachineCost'], $resultUpper['totalMachineCost'], 0.01);
    }

    public function test_contract_type_leading_trailing_whitespace_does_not_affect_result(): void
    {
        $clean     = $this->buildProjectData(['companyInfo' => ['contractType' => 'Free Use + per Cartridge']]);
        $whitespace = $this->buildProjectData(['companyInfo' => ['contractType' => '  Free Use + per Cartridge  ']]);

        $resultClean      = $this->calc->get1YrPotential($clean);
        $resultWhitespace = $this->calc->get1YrPotential($whitespace);

        $this->assertEqualsWithDelta($resultClean['grandtotalCost'], $resultWhitespace['grandtotalCost'], 0.01);
        $this->assertEqualsWithDelta($resultClean['totalMachineCost'], $resultWhitespace['totalMachineCost'], 0.01);
    }

    // =========================================================================
    // Rounding boundaries (per-cartridge ceiling)
    // =========================================================================

    public function test_qty_exactly_on_whole_number_is_not_bumped_up(): void
    {
        $projectData = $this->buildProjectData([
            'machineConfiguration' => [
                'machine'    => [['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 1, 'isMandatory' => true]],
                // annualMonoYields (12000) / 2000 = exactly 6.0
                'consumable' => [['id' => 'c-mono', 'type' => 'consumable', 'mode' => 'mono', 'cost' => 10, 'yields' => 2000, 'price' => 20]],
            ],
        ]);

        $result = $this->calc->get1YrPotential($projectData);

        $this->assertEqualsWithDelta(6.0, $result['consumables'][0]['qty'], 0.001);
    }

    public function test_qty_just_over_whole_number_ceils_up(): void
    {
        $projectData = $this->buildProjectData([
            'machineConfiguration' => [
                'machine'    => [['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 1, 'isMandatory' => true]],
                // 12000 / 1998 = 6.006... -> rounds to 6.01 at 2 decimals -> ceils to 7
                'consumable' => [['id' => 'c-mono', 'type' => 'consumable', 'mode' => 'mono', 'cost' => 10, 'yields' => 1998, 'price' => 20]],
            ],
        ]);

        $result = $this->calc->get1YrPotential($projectData);

        $this->assertEqualsWithDelta(7.0, $result['consumables'][0]['qty'], 0.001);
    }

    // =========================================================================
    // Multi-year edge cases
    // =========================================================================

    /**
     * EXPECTED TO FAIL against current code. get1YrPotential currently uses
     * orFallback(contractYears ?? 1, 1) so an EXPLICIT 0 silently becomes 1
     * and a normal, non-zero first year is computed. succeedingYears, by
     * contrast, treats 0 (and missing) as "not a valid contract" and
     * returns an all-zero breakdown. Desired: contractYears explicitly set
     * to 0 should be treated as invalid by BOTH functions, not just one.
     */
    public function test_contract_years_of_zero_produces_zero_output(): void
    {
        $projectData = $this->buildProjectData(['companyInfo' => ['contractYears' => 0]]);

        $result = $this->calc->get1YrPotential($projectData);

        $this->assertEquals(0.0, $result['grandtotalCost'], 'an explicit contractYears of 0 should not produce a normal, non-zero first year');
    }

    public function test_contract_years_missing_defaults_to_one(): void
    {
        $projectData = $this->buildProjectData();
        unset($projectData['companyInfo']['contractYears']);

        $resultMissing = $this->calc->get1YrPotential($projectData);
        $resultExplicitOne = $this->calc->get1YrPotential($this->buildProjectData(['companyInfo' => ['contractYears' => 1]]));

        $this->assertEqualsWithDelta($resultExplicitOne['grandtotalCost'], $resultMissing['grandtotalCost'], 0.01);
    }

    public function test_large_contract_years_scales_linearly_via_calculate_all(): void
    {
        $projectData = $this->buildProjectData([
            'companyInfo' => ['contractYears' => 10],
            'machineConfiguration' => [
                'machine'    => [['id' => '__mandatory_printer__', 'type' => 'machine', 'mode' => '', 'cost' => 1000, 'inputtedCost' => 1000, 'qty' => 1, 'isMandatory' => true]],
                'consumable' => [['id' => 'c-mono', 'type' => 'consumable', 'mode' => 'mono', 'cost' => 10, 'yields' => 2000, 'price' => 20]],
            ],
        ]);

        $result = $this->calc->calculateAll($projectData);

        $this->assertCount(10, $result['yearlyBreakdown']);
        $this->assertArrayHasKey('year_10', $result['yearlyBreakdown']);

        $firstYear      = $result['firstYear'];
        $succeedingYear = $result['succeedingYear'];
        $expectedTotalCost = $firstYear['grandtotalCost'] + (9 * $succeedingYear['grandtotalCost']);

        $this->assertEqualsWithDelta($expectedTotalCost, $result['grandTotalCost'], 0.01);
    }
}