<?php

namespace Tests\Unit\Http\Controllers\Concerns;

use App\Http\Controllers\Concerns\ValidatesSprfRowQuantities;
use Illuminate\Validation\ValidationException;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Unit-style test for the "qty >= 1 when a row has values" submit-time rule
 * shared by v1 and v2. Calls the private trait method directly via
 * reflection so we're testing the rule itself, independent of which
 * controller/form version wires it in.
 *
 * Extends Laravel's own Tests\TestCase (not plain PHPUnit\Framework\TestCase)
 * because ValidationException::withMessages() resolves the validator via the
 * app container — it needs the framework booted, even though this test
 * never touches the database. No RefreshDatabase trait needed.
 *
 * Run: php artisan test --filter=ValidatesSprfRowQuantitiesTest
 *
 * See also: tests/Feature/Sprf/SprfSubmitQtyValidationTest.php, which proves
 * this rule is actually wired into the real submit() endpoints — this file
 * only proves the rule's logic is correct in isolation.
 */
class ValidatesSprfRowQuantitiesTest extends TestCase
{
    private function callAssert(array $items, array $fees): void
    {
        $instance = new class {
            use ValidatesSprfRowQuantities;
        };

        $method = new ReflectionMethod($instance, 'assertRowsWithValuesHaveQty');
        $method->setAccessible(true);
        $method->invoke($instance, $items, $fees);
    }

    // ── Subitems ────────────────────────────────────────────────────────

    /**
     * Baseline: a row nobody has started filling in yet (qty 0, no values)
     * must NOT be treated as an error — it's just an empty row.
     */
    public function test_passes_when_row_is_completely_empty(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [[
                'rowKey' => 'sub-1',
                'qty' => 0,
                'costPerUnit' => null,
                'markupPercent' => null,
            ]],
        ]];

        $this->callAssert($items, []);
        $this->addToAssertionCount(1); // no exception thrown = pass
    }

    /**
     * Baseline: a properly filled-in row (qty >= 1, has values) must pass —
     * this is the normal, expected case and shouldn't be blocked.
     */
    public function test_passes_when_qty_is_at_least_1_and_has_values(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [[
                'rowKey' => 'sub-1',
                'qty' => 1,
                'costPerUnit' => 100,
                'markupPercent' => 20,
            ]],
        ]];

        $this->callAssert($items, []);
        $this->addToAssertionCount(1);
    }

    /**
     * The core bug this whole feature exists to prevent: a row with a real
     * cost entered but qty left at 0 must be rejected, not silently saved
     * as a "free" line item.
     */
    public function test_fails_when_qty_is_zero_but_cost_per_unit_is_filled(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [[
                'rowKey' => 'sub-1',
                'qty' => 0,
                'costPerUnit' => 100,
                'markupPercent' => null,
            ]],
        ]];

        $this->expectException(ValidationException::class);
        $this->callAssert($items, []);
    }

    /**
     * Same as above but qty is null (not even 0) and only markupPercent is
     * filled (v1's specific input field) — confirms the check isn't
     * accidentally scoped to costPerUnit only.
     */
    public function test_fails_when_qty_is_null_but_markup_percent_is_filled_v1(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [[
                'rowKey' => 'sub-1',
                'qty' => null,
                'costPerUnit' => null,
                'markupPercent' => 20,
            ]],
        ]];

        $this->expectException(ValidationException::class);
        $this->callAssert($items, []);
    }

    /**
     * Same rule, but for v2's input field (sellingPricePerUnit instead of
     * markupPercent) — confirms the rule covers both form versions, since
     * they use different field names for "the markup input."
     */
    public function test_fails_when_qty_is_zero_but_selling_price_is_filled_v2(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [[
                'rowKey' => 'sub-1',
                'qty' => 0,
                'costPerUnit' => 100,
                'sellingPricePerUnit' => 120,
            ]],
        ]];

        $this->expectException(ValidationException::class);
        $this->callAssert($items, []);
    }

    /**
     * Deliberately typing "0" as a cost is still a filled-in value (not the
     * same as leaving the field blank) — qty must still be required for it.
     */
    public function test_zero_explicitly_entered_as_cost_still_counts_as_filled(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [[
                'rowKey' => 'sub-1',
                'qty' => 0,
                'costPerUnit' => 0,
                'markupPercent' => 20,
            ]],
        ]];

        $this->expectException(ValidationException::class);
        $this->callAssert($items, []);
    }

    /**
     * The validation error must point at the SPECIFIC row that's wrong
     * (items.1.subitems.0.qty), not just fire generically — otherwise the
     * frontend can't highlight the right field for the user.
     */
    public function test_error_message_is_keyed_by_item_and_subitem_index(): void
    {
        $items = [
            ['rowKey' => 'row-1', 'subitems' => [
                ['rowKey' => 'sub-1', 'qty' => 1, 'costPerUnit' => 100],
            ]],
            ['rowKey' => 'row-2', 'subitems' => [
                ['rowKey' => 'sub-2', 'qty' => 0, 'costPerUnit' => 50],
            ]],
        ];

        try {
            $this->callAssert($items, []);
            $this->fail('Expected ValidationException was not thrown.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('items.1.subitems.0.qty', $e->errors());
            $this->assertArrayNotHasKey('items.0.subitems.0.qty', $e->errors());
        }
    }

    // ── Other expenses ──────────────────────────────────────────────────

    /**
     * Baseline for the "other expenses" table: an empty expense row must
     * not be blocked just because qty is 0.
     */
    public function test_passes_when_expense_row_has_no_unit_price(): void
    {
        $fees = [[
            'expenseKey' => 'fee-1',
            'qty' => 0,
            'unitPrice' => null,
        ]];

        $this->callAssert([], $fees);
        $this->addToAssertionCount(1);
    }

    /**
     * The expense-table equivalent of the core bug: a unit price entered
     * with qty still 0 must be rejected.
     */
    public function test_fails_when_expense_row_has_unit_price_but_no_qty(): void
    {
        $fees = [[
            'expenseKey' => 'fee-1',
            'qty' => 0,
            'unitPrice' => 500,
        ]];

        $this->expectException(ValidationException::class);
        $this->callAssert([], $fees);
    }

    /**
     * Baseline: a properly filled expense row (price + qty 1) must pass.
     */
    public function test_passes_when_expense_row_has_unit_price_and_qty_1(): void
    {
        $fees = [[
            'expenseKey' => 'fee-1',
            'qty' => 1,
            'unitPrice' => 500,
        ]];

        $this->callAssert([], $fees);
        $this->addToAssertionCount(1);
    }

    // ── Mixed ────────────────────────────────────────────────────────────

    /**
     * If someone submits a form with several bad rows at once, all of them
     * should surface in one error response — not just the first one found.
     * Without this, a user fixing one row and resubmitting would just hit
     * the next error, one at a time, which is a bad UX for something that
     * could be shown all at once.
     */
    public function test_multiple_violations_are_all_collected_before_throwing(): void
    {
        $items = [[
            'rowKey' => 'row-1',
            'subitems' => [
                ['rowKey' => 'sub-1', 'qty' => 0, 'costPerUnit' => 100],
                ['rowKey' => 'sub-2', 'qty' => 0, 'markupPercent' => 10],
            ],
        ]];
        $fees = [[
            'expenseKey' => 'fee-1', 'qty' => 0, 'unitPrice' => 200,
        ]];

        try {
            $this->callAssert($items, $fees);
            $this->fail('Expected ValidationException was not thrown.');
        } catch (ValidationException $e) {
            $this->assertCount(3, $e->errors());
        }
    }
}