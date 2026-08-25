<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Validation\ValidationException;

/**
 * Enforces: at SUBMIT time (not saveDraft), any subitem or other_expense row
 * that has a value entered (cost, markup%, selling price, or unit price)
 * must have qty >= 1.
 *
 * A row with qty = 0/null AND no values at all is left alone — that's just
 * an empty row the user hasn't started filling in yet, not an error.
 *
 * Shared by SprfEntryProjectController (v1) and SprfEntryProjectController2
 * (v2) so the rule can't drift between the two forms.
 */
trait ValidatesSprfRowQuantities
{
    /**
     * @param array $items raw payload 'items' (camelCase keys, pre-mapItemsPayload shape)
     * @param array $fees  raw payload 'other_expenses' (camelCase keys, pre-mapFeesPayload shape)
     *
     * @throws ValidationException
     */
    private function assertRowsWithValuesHaveQty(array $items, array $fees): void
    {
        $errors = [];

        foreach ($items as $itemIndex => $item) {
            $subitems = (array) ($item['subitems'] ?? []);

            foreach ($subitems as $subIndex => $sub) {
                $hasValue = $this->isFilled($sub['costPerUnit'] ?? null)
                    || $this->isFilled($sub['markupPercent'] ?? null)          // v1
                    || $this->isFilled($sub['sellingPricePerUnit'] ?? null);   // v2

                if ($hasValue && (int) ($sub['qty'] ?? 0) < 1) {
                    $errors["items.{$itemIndex}.subitems.{$subIndex}.qty"] =
                        'Invalid quantity.';
                }
            }
        }

        foreach ($fees as $feeIndex => $fee) {
            $hasValue = $this->isFilled($fee['unitPrice'] ?? null);

            if ($hasValue && (int) ($fee['qty'] ?? 0) < 1) {
                $errors["other_expenses.{$feeIndex}.qty"] =
                    'Invalid quantity.';
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function isFilled($value): bool
    {
        return $value !== null && $value !== '';
    }
}