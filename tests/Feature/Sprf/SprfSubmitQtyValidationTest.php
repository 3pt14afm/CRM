<?php

namespace Tests\Feature\Sprf;

use App\Models\SPRF\SprfApprovalMatrix;
use App\Models\SPRF\SprfEntryProject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Feature test for the qty>=1-when-filled rule (ValidatesSprfRowQuantities),
 * exercised through the real HTTP submit endpoints for both form versions —
 * proves the rule is actually wired in, not just correct in isolation.
 *
 * See also: tests/Unit/Http/Controllers/Concerns/ValidatesSprfRowQuantitiesTest.php,
 * which tests the rule's logic directly. This file tests that the logic is
 * actually reachable from the controller — a passing unit test alone
 * wouldn't catch someone forgetting to call the trait in submit().
 *
 * Uses the same crm_testing DB / RefreshDatabase setup as the ROI feature
 * tests. FK constraints are disabled during setup because location/department
 * master data isn't what's under test here.
 *
 * Run: php artisan test --filter=SprfSubmitQtyValidationTest
 */
class SprfSubmitQtyValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $preparer;
    private User $approver;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::disableForeignKeyConstraints();

        $this->approver = User::factory()->create();

        $this->preparer = User::factory()->create([
            'primary_location_id' => 1,
            'department_id'       => 1,
        ]);

        // Active matrix for location 1 / department 1 with all 4 slots filled,
        // needed for the "valid submission still succeeds" tests — without
        // this, those tests would 422 for an unrelated reason (missing
        // matrix) and give a false read on the qty rule specifically.
        SprfApprovalMatrix::create([
            'location_id'                           => 1,
            'department_id'                         => 1,
            'director_customer_engagement_user_id'  => $this->approver->id,
            'esd_director_user_id'                  => $this->approver->id,
            'vp_ccto_user_id'                        => $this->approver->id,
            'president_ceo_user_id'                  => $this->approver->id,
            'is_active'                              => true,
        ]);

        Schema::enableForeignKeyConstraints();
    }

    private function makeDraft(int $formVersion): SprfEntryProject
    {
        return SprfEntryProject::create([
            'form_version'         => $formVersion,
            'status'               => 'draft',
            'prepared_by_user_id'  => $this->preparer->id,
        ]);
    }

    private function basePayload(): array
    {
        return [
            'company_info' => [
                'type'    => 0,
                'account' => 'Test Account',
            ],
            'summary' => [
                'revenue'        => 500000,
                'totalGpPercent' => 20,
            ],
        ];
    }

    // ── v1: subitems ────────────────────────────────────────────────────

    /**
     * The main regression this file exists to catch: hitting the REAL v1
     * submit route with a cost-filled, qty-0 row must return a 422 with the
     * qty field flagged. If someone removes the trait call from
     * SprfEntryProjectController::submit(), this fails.
     */
    public function test_v1_submit_rejects_subitem_with_cost_but_zero_qty(): void
    {
        $project = $this->makeDraft(1);

        $payload = array_merge($this->basePayload(), [
            'items' => [[
                'rowKey' => 'row-1',
                'subitems' => [[
                    'rowKey'         => 'sub-1',
                    'qty'            => 0,
                    'costPerUnit'    => 100,
                    'markupPercent'  => 20,
                ]],
            ]],
        ]);

        $response = $this->actingAs($this->preparer)
            ->patchJson(route('sprf.entry.projects.submit', $project), $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items.0.subitems.0.qty']);
    }

    /**
     * Sanity check that the new rule doesn't have false positives: a
     * correctly filled row (qty 1 + cost + markup) must NOT trip the qty
     * validation error when submitted for real.
     */
    public function test_v1_submit_accepts_subitem_with_cost_and_qty_one(): void
    {
        $project = $this->makeDraft(1);

        $payload = array_merge($this->basePayload(), [
            'items' => [[
                'rowKey' => 'row-1',
                'subitems' => [[
                    'rowKey'         => 'sub-1',
                    'qty'            => 1,
                    'costPerUnit'    => 100,
                    'markupPercent'  => 20,
                ]],
            ]],
        ]);

        $response = $this->actingAs($this->preparer)
            ->patchJson(route('sprf.entry.projects.submit', $project), $payload);

        // We only assert the qty-specific rule doesn't fire here — we don't assert
        // full submission success, since that also depends on matrix/company setup
        // that isn't the focus of this test.
        $response->assertJsonMissingValidationErrors(['items.0.subitems.0.qty']);
    }

    /**
     * A row nobody has touched yet (qty 0, nothing filled) must be allowed
     * through the real endpoint, same as it is in the unit test — confirms
     * the controller isn't applying a stricter blanket "qty must be 1" rule
     * that would break in-progress/placeholder rows.
     */
    public function test_v1_submit_allows_completely_empty_subitem_row(): void
    {
        $project = $this->makeDraft(1);

        $payload = array_merge($this->basePayload(), [
            'items' => [[
                'rowKey' => 'row-1',
                'subitems' => [[
                    'rowKey'        => 'sub-1',
                    'qty'           => 0,
                    'costPerUnit'   => null,
                    'markupPercent' => null,
                ]],
            ]],
        ]);

        $response = $this->actingAs($this->preparer)
            ->patchJson(route('sprf.entry.projects.submit', $project), $payload);

        $response->assertJsonMissingValidationErrors(['items.0.subitems.0.qty']);
    }

    // ── v1: other_expenses ──────────────────────────────────────────────

    /**
     * Same core regression check as the subitem test, but for the "other
     * expenses" table via the real endpoint.
     */
    public function test_v1_submit_rejects_expense_with_unit_price_but_zero_qty(): void
    {
        $project = $this->makeDraft(1);

        $payload = array_merge($this->basePayload(), [
            'other_expenses' => [[
                'expenseKey' => 'fee-1',
                'qty'        => 0,
                'unitPrice'  => 500,
            ]],
        ]);

        $response = $this->actingAs($this->preparer)
            ->patchJson(route('sprf.entry.projects.submit', $project), $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['other_expenses.0.qty']);
    }

    // ── v2: sellingPricePerUnit variant ─────────────────────────────────

    /**
     * Confirms the rule is ALSO wired into v2's submit() — this uses
     * sellingPricePerUnit instead of markupPercent as the "has values"
     * trigger field, since that's v2's actual input field.
     */
    public function test_v2_submit_rejects_subitem_with_selling_price_but_zero_qty(): void
    {
        $project = $this->makeDraft(2);

        $payload = array_merge($this->basePayload(), [
            'items' => [[
                'rowKey' => 'row-1',
                'subitems' => [[
                    'rowKey'               => 'sub-1',
                    'qty'                  => 0,
                    'costPerUnit'          => 100,
                    'sellingPricePerUnit'  => 120,
                ]],
            ]],
        ]);

        $response = $this->actingAs($this->preparer)
            ->patchJson(route('sprf.entry2.projects.submit', $project), $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items.0.subitems.0.qty']);
    }

    /**
     * Sanity check for v2, same purpose as the v1 equivalent: a correctly
     * filled row must not trip the qty error on the real v2 endpoint.
     */
    public function test_v2_submit_accepts_subitem_with_selling_price_and_qty_one(): void
    {
        $project = $this->makeDraft(2);

        $payload = array_merge($this->basePayload(), [
            'items' => [[
                'rowKey' => 'row-1',
                'subitems' => [[
                    'rowKey'               => 'sub-1',
                    'qty'                  => 1,
                    'costPerUnit'          => 100,
                    'sellingPricePerUnit'  => 120,
                ]],
            ]],
        ]);

        $response = $this->actingAs($this->preparer)
            ->patchJson(route('sprf.entry2.projects.submit', $project), $payload);

        $response->assertJsonMissingValidationErrors(['items.0.subitems.0.qty']);
    }
}