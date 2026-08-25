<?php

namespace Tests\Unit\Services\SPRF;

use App\Services\SPRF\SprfItemCalculationService;
use App\Services\SPRF\SprfItemCalculationService2;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Pure-logic unit tests for the SPRF item calculation services.
 *
 * Both services are dependency-free (no DB, no facades), so these run as
 * plain PHPUnit tests — no RefreshDatabase / crm_testing DB needed. Run with:
 *
 *   php artisan test --filter=SprfItemCalculationServiceTest
 *
 * v1 (SprfItemCalculationService): markupPercent is the input, sellingPrice is derived.
 * v2 (SprfItemCalculationService2): sellingPricePerUnit is the input, markupPercent is derived.
 * They are meant to be inverses of each other for the same underlying numbers —
 * several tests below assert that round-trip.
 */
class SprfItemCalculationServiceTest extends TestCase
{
    private SprfItemCalculationService $v1;
    private SprfItemCalculationService2 $v2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->v1 = new SprfItemCalculationService();
        $this->v2 = new SprfItemCalculationService2();
    }

    // ─────────────────────────────────────────────────────────────────
    // v1: computeSubitemRow (markup% -> derived totals)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Sanity check: the basic v1 formula (cost*qty, markup%*cost, qty*markupPerUnit)
     * gives the right numbers for a normal, fully-filled row.
     */
    public function test_v1_computes_row_with_normal_inputs(): void
    {
        // qty 10, cost 100/unit, 20% markup
        $result = $this->v1->computeSubitemRow(10, 100, 20);

        $this->assertSame(1000.0, $result['total_cost']);
        $this->assertSame(20.0, $result['markup_per_unit']);
        $this->assertSame(200.0, $result['total_markup']);
    }

    /**
     * Guards the null-propagation rule: missing qty should null out qty-dependent
     * fields only — markup_per_unit doesn't need qty, so it should still compute.
     */
    public function test_v1_row_returns_nulls_when_qty_missing(): void
    {
        $result = $this->v1->computeSubitemRow(null, 100, 20);

        $this->assertNull($result['total_cost']);
        $this->assertSame(20.0, $result['markup_per_unit']); // doesn't need qty
        $this->assertNull($result['total_markup']);          // needs qty
    }

    /**
     * Guards the null-propagation rule: missing cost nulls out everything,
     * since every v1 output ultimately depends on cost.
     */
    public function test_v1_row_returns_nulls_when_cost_missing(): void
    {
        $result = $this->v1->computeSubitemRow(10, null, 20);

        $this->assertNull($result['total_cost']);
        $this->assertNull($result['markup_per_unit']);
        $this->assertNull($result['total_markup']);
    }

    /**
     * 0% markup is a valid, deliberate value and must NOT be treated the same
     * as "markup not entered yet" (null).
     */
    public function test_v1_row_treats_zero_markup_percent_as_zero_not_null(): void
    {
        $result = $this->v1->computeSubitemRow(10, 100, 0);

        $this->assertSame(1000.0, $result['total_cost']);
        $this->assertSame(0.0, $result['markup_per_unit']);
        $this->assertSame(0.0, $result['total_markup']);
    }

    // ─────────────────────────────────────────────────────────────────
    // v1: computeMasterAggregates
    // ─────────────────────────────────────────────────────────────────

    /**
     * Confirms the four master/parent-row totals sum correctly across multiple
     * subitem rows — this is the number shown on the SPRF item (parent) row.
     */
    public function test_v1_aggregates_multiple_subitems(): void
    {
        $subitems = [
            ['qty' => 10, 'costPerUnit' => 100, 'markupPercent' => 20], // totalCost 1000, markupPerUnit 20, totalMarkup 200
            ['qty' => 5,  'costPerUnit' => 50,  'markupPercent' => 10], // totalCost 250,  markupPerUnit 5,  totalMarkup 25
        ];

        $result = $this->v1->computeMasterAggregates($subitems);

        $this->assertSame(1250.0, $result['total_cost']);                    // 1000 + 250
        $this->assertSame(175.0, $result['selling_price_per_unit_vat_inc']); // (100+50) + (20+5)
        $this->assertSame(225.0, $result['markup_value']);                   // 200 + 25
        $this->assertSame(1475.0, $result['total_selling_price_vat_inc']);   // 1250 + 225
    }

    /**
     * An item with zero subitems should show 0.0 totals, not null — protects
     * the frontend from having to handle unexpected nulls when rendering.
     */
    public function test_v1_aggregates_empty_subitems_returns_zeros(): void
    {
        $result = $this->v1->computeMasterAggregates([]);

        $this->assertSame(0.0, $result['total_cost']);
        $this->assertSame(0.0, $result['selling_price_per_unit_vat_inc']);
        $this->assertSame(0.0, $result['markup_value']);
        $this->assertSame(0.0, $result['total_selling_price_vat_inc']);
    }

    /**
     * Edge case that's easy to break if the aggregation loop gets "simplified":
     * a row missing qty still contributes its cost/markup-per-unit to
     * selling_price_per_unit_vat_inc (doesn't need qty), but contributes
     * nothing to total_cost/markup_value (which do need qty).
     */
    public function test_v1_aggregates_skip_rows_with_missing_qty_but_still_count_cost_per_unit(): void
    {
        $subitems = [
            ['qty' => null, 'costPerUnit' => 100, 'markupPercent' => 20],
        ];

        $result = $this->v1->computeMasterAggregates($subitems);

        $this->assertSame(0.0, $result['total_cost']);
        $this->assertSame(120.0, $result['selling_price_per_unit_vat_inc']); // 100 + 20
        $this->assertSame(0.0, $result['markup_value']);
    }

    // ─────────────────────────────────────────────────────────────────
    // v1: mapPayload (full item/subitem shape used by saveDraft/submit)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Confirms the full items[] payload (as sent by the frontend) maps
     * correctly into DB-ready rows: sort_order increments per item, and —
     * importantly — an item with NO subitems gets no entry at all in
     * subitemsByRowKey (not even an empty array). Regressing this silently
     * breaks item rows on save.
     */
    public function test_v1_map_payload_produces_parent_rows_and_subitems_keyed_by_row_key(): void
    {
        $items = [
            [
                'rowKey' => 'row-1',
                'subitems' => [
                    [
                        'rowKey' => 'sub-1',
                        'productCode' => 'ABC',
                        'itemDescription' => 'Widget',
                        'qty' => 10,
                        'disty' => 'Disty A',
                        'costPerUnit' => 100,
                        'markupPercent' => 20,
                    ],
                ],
            ],
            [
                'rowKey' => 'row-2',
                'subitems' => [],
            ],
        ];

        $mapped = $this->v1->mapPayload($items);

        $this->assertCount(2, $mapped['parentRows']);
        $this->assertSame('row-1', $mapped['parentRows'][0]['row_key']);
        $this->assertSame(1, $mapped['parentRows'][0]['sort_order']);
        $this->assertSame('row-2', $mapped['parentRows'][1]['row_key']);
        $this->assertSame(2, $mapped['parentRows'][1]['sort_order']);

        // row-1 has subitems -> keyed entry exists
        $this->assertArrayHasKey('row-1', $mapped['subitemsByRowKey']);
        $this->assertCount(1, $mapped['subitemsByRowKey']['row-1']);
        $this->assertSame('ABC', $mapped['subitemsByRowKey']['row-1'][0]['product_code']);
        $this->assertSame(1000.0, $mapped['subitemsByRowKey']['row-1'][0]['total_cost']);

        // row-2 has no subitems -> no keyed entry at all (empty arrays are dropped)
        $this->assertArrayNotHasKey('row-2', $mapped['subitemsByRowKey']);
    }

    /**
     * qty arrives from the frontend as a string/float and must be rounded to
     * a whole number before saving — checks the rounding specifically (10.6 -> 11).
     */
    public function test_v1_map_payload_qty_is_rounded_to_nearest_int(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [[
                'rowKey' => 'sub-1',
                'qty' => '10.6',
                'costPerUnit' => 100,
                'markupPercent' => 10,
            ]],
        ]];

        $mapped = $this->v1->mapPayload($items);

        $this->assertSame(11, $mapped['subitemsByRowKey']['row-1'][0]['qty']);
    }

    // ─────────────────────────────────────────────────────────────────
    // v1: helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Helper used everywhere in the mapping code: confirms an empty-string
     * form field is treated the same as null (not coerced to 0), while the
     * string '0' is correctly treated as a real, deliberate zero.
     */
    public function test_v1_to_nullable_float_treats_empty_string_and_null_as_null(): void
    {
        $this->assertNull($this->v1->toNullableFloat(null));
        $this->assertNull($this->v1->toNullableFloat(''));
        $this->assertSame(0.0, $this->v1->toNullableFloat('0'));
        $this->assertSame(12.5, $this->v1->toNullableFloat('12.5'));
    }

    /**
     * Helper used for qty conversion: confirms null/empty-string handling and
     * rounding behavior (half-up) in isolation from the rest of mapPayload.
     */
    public function test_v1_to_nullable_int_rounds_half_up(): void
    {
        $this->assertNull($this->v1->toNullableInt(null));
        $this->assertNull($this->v1->toNullableInt(''));
        $this->assertSame(3, $this->v1->toNullableInt('2.5'));
        $this->assertSame(2, $this->v1->toNullableInt('2.4'));
    }

    // ─────────────────────────────────────────────────────────────────
    // v2: computeSubitemRow (sellingPrice -> derived markup%)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Sanity check: v2's reversed formula (selling price is the input,
     * markup% is derived from it) gives the right numbers for a normal row.
     */
    public function test_v2_computes_row_with_normal_inputs(): void
    {
        // qty 10, cost 100/unit, selling price 120/unit -> markup% should be 20
        $result = $this->v2->computeSubitemRow(10, 100, 120);

        $this->assertSame(1000.0, $result['total_cost']);
        $this->assertSame(20.0, $result['markup_per_unit']);
        $this->assertSame(20.0, $result['markup_percent']);
        $this->assertSame(200.0, $result['total_markup']);
    }

    /**
     * Critical safety check: v2 divides by costPerUnit to derive markup%.
     * If cost is 0, this must return null — not throw a division-by-zero
     * error and not return NAN/INF.
     */
    public function test_v2_row_returns_null_markup_percent_when_cost_is_zero(): void
    {
        $result = $this->v2->computeSubitemRow(10, 0, 120);

        $this->assertNull($result['markup_percent']);
        $this->assertSame(120.0, $result['markup_per_unit']); // still computable (no division)
    }

    /**
     * Guards the null-propagation rule for v2: missing selling price nulls
     * out markup fields, but total_cost (which only needs qty+cost) still computes.
     */
    public function test_v2_row_returns_nulls_when_selling_price_missing(): void
    {
        $result = $this->v2->computeSubitemRow(10, 100, null);

        $this->assertNull($result['markup_per_unit']);
        $this->assertNull($result['markup_percent']);
        $this->assertNull($result['total_markup']);
        $this->assertSame(1000.0, $result['total_cost']); // total_cost only needs qty+cost
    }

    /**
     * A selling price lower than cost is a valid (if unusual) real-world case
     * — the formula should produce a negative markup, not clamp to 0 or error.
     */
    public function test_v2_row_handles_selling_price_below_cost_negative_markup(): void
    {
        $result = $this->v2->computeSubitemRow(10, 100, 90);

        $this->assertSame(-10.0, $result['markup_per_unit']);
        $this->assertSame(-10.0, $result['markup_percent']);
        $this->assertSame(-100.0, $result['total_markup']);
    }

    // ─────────────────────────────────────────────────────────────────
    // v2: computeMasterAggregates / mapPayload sanity (same shape as v1)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Per the service's own docblock, v1 and v2 must produce IDENTICAL
     * persisted totals for equivalent inputs (same cost, same effective
     * markup) — this is the cross-service contract every downstream
     * consumer (frontend transforms, print views) relies on.
     */
    public function test_v2_aggregates_match_v1_shape_for_equivalent_inputs(): void
    {
        // v1 input: cost 100, markup% 20  =>  sellingPrice 120 (v2's equivalent input)
        $v1Result = $this->v1->computeMasterAggregates([
            ['qty' => 10, 'costPerUnit' => 100, 'markupPercent' => 20],
        ]);

        $v2Result = $this->v2->computeMasterAggregates([
            ['qty' => 10, 'costPerUnit' => 100, 'sellingPricePerUnit' => 120],
        ]);

        $this->assertSame($v1Result['total_cost'], $v2Result['total_cost']);
        $this->assertSame($v1Result['selling_price_per_unit_vat_inc'], $v2Result['selling_price_per_unit_vat_inc']);
        $this->assertSame($v1Result['markup_value'], $v2Result['markup_value']);
        $this->assertSame($v1Result['total_selling_price_vat_inc'], $v2Result['total_selling_price_vat_inc']);
    }

    /**
     * Confirms v2's payload mapping includes the v2-specific
     * 'selling_price_per_unit' column (which v1 doesn't have) alongside the
     * derived markup_percent.
     */
    public function test_v2_map_payload_produces_expected_keys_including_selling_price(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [[
                'rowKey' => 'sub-1',
                'productCode' => 'ABC',
                'itemDescription' => 'Widget',
                'qty' => 10,
                'disty' => 'Disty A',
                'costPerUnit' => 100,
                'sellingPricePerUnit' => 120,
            ]],
        ]];

        $mapped = $this->v2->mapPayload($items);

        $subitem = $mapped['subitemsByRowKey']['row-1'][0];
        $this->assertSame(120.0, $subitem['selling_price_per_unit']);
        $this->assertSame(20.0, $subitem['markup_percent']);
        $this->assertSame(1000.0, $subitem['total_cost']);
    }

    // ─────────────────────────────────────────────────────────────────
    // Round-trip: v1 markup% -> v2 selling price -> v1 markup% again
    // ─────────────────────────────────────────────────────────────────

    /**
     * THE key regression guard for this whole file: feed v1 a markup%,
     * derive the resulting selling price, feed that selling price into v2,
     * and you must get the original markup% back — across several markup
     * sizes including 0% and >100%. If v1 and v2 ever drift out of sync with
     * each other (e.g. someone tweaks one formula but not the other), this
     * is what catches it.
     */
    #[DataProvider('roundTripProvider')]
    public function test_v1_and_v2_are_inverses_for_various_markup_percentages(
        float $costPerUnit,
        float $markupPercent
    ): void {
        $v1Row = $this->v1->computeSubitemRow(1, $costPerUnit, $markupPercent);
        $sellingPrice = $costPerUnit + $v1Row['markup_per_unit'];

        $v2Row = $this->v2->computeSubitemRow(1, $costPerUnit, $sellingPrice);

        $this->assertEqualsWithDelta($markupPercent, $v2Row['markup_percent'], 0.0001);
    }

    public static function roundTripProvider(): array
    {
        return [
            'small markup' => [100.0, 5.0],
            'round markup' => [100.0, 20.0],
            'fractional markup' => [133.33, 17.5],
            'zero markup' => [100.0, 0.0],
            'large markup' => [50.0, 150.0],
        ];
    }
}