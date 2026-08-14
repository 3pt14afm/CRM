<?php

namespace App\Services\SPRF;

/**
 * SPRF2 variant of SprfItemCalculationService.
 *
 * Difference from the v1 service:
 *   v1: markupPercent is the input  -> sellingPrice is derived
 *       sellingPrice = (unitCost * markup%) + unitCost
 *   v2: sellingPricePerUnit is the input -> markupPercent is derived
 *       markup% = [(sellingPrice - unitCost) / unitCost] * 100
 *
 * Persisted column shapes (total_cost, selling_price_per_unit_vat_inc,
 * total_selling_price_vat_inc, markup_value, markup_percent, etc.) are kept
 * identical to the v1 service so every downstream consumer (frontend
 * transforms, print views, summary calculations) works unchanged.
 */
class SprfItemCalculationService2
{
    // ── Per-subitem row calc ────────────────────────────────────────────────────

    /**
     * Computes totalCost, markup-derived values, and markupPercent for a single
     * subitem from qty, costPerUnit, and sellingPricePerUnit (the v2 input).
     */
    public function computeSubitemRow(?float $qty, ?float $costPerUnit, ?float $sellingPricePerUnit): array
    {
        $totalCost = ($qty === null || $costPerUnit === null)
            ? null
            : $qty * $costPerUnit;

        $markupPerUnit = ($costPerUnit === null || $sellingPricePerUnit === null)
            ? null
            : $sellingPricePerUnit - $costPerUnit;

        // markup% = [(sellingPrice - unitCost) / unitCost] * 100
        $markupPercent = ($costPerUnit === null || $sellingPricePerUnit === null || $costPerUnit == 0.0)
            ? null
            : (($sellingPricePerUnit - $costPerUnit) / $costPerUnit) * 100;

        $totalMarkup = ($qty === null || $markupPerUnit === null)
            ? null
            : $qty * $markupPerUnit;

        return [
            'total_cost'      => $totalCost,
            'markup_per_unit' => $markupPerUnit,
            'markup_percent'  => $markupPercent,
            'total_markup'    => $totalMarkup,
        ];
    }

    // ── Master aggregates from subitems ─────────────────────────────────────────

    /**
     * @param array $subitemRows  raw payload subitem rows (frontend shape)
     */
    public function computeMasterAggregates(array $subitemRows): array
    {
        $sumCostPerUnit   = 0.0;
        $sumMarkupPerUnit = 0.0;
        $grandTotalCost   = 0.0;
        $grandTotalMarkup = 0.0;

        foreach ($subitemRows as $row) {
            $qty                 = $this->toNullableFloat($row['qty'] ?? null);
            $costPerUnit         = $this->toNullableFloat($row['costPerUnit'] ?? null);
            $sellingPricePerUnit = $this->toNullableFloat($row['sellingPricePerUnit'] ?? null);

            $calc = $this->computeSubitemRow($qty, $costPerUnit, $sellingPricePerUnit);

            if ($costPerUnit !== null) {
                $sumCostPerUnit += $costPerUnit;
            }

            if ($calc['markup_per_unit'] !== null) {
                $sumMarkupPerUnit += $calc['markup_per_unit'];
            }

            if ($calc['total_cost'] !== null) {
                $grandTotalCost += $calc['total_cost'];
            }

            if ($calc['total_markup'] !== null) {
                $grandTotalMarkup += $calc['total_markup'];
            }
        }

        return [
            'total_cost'                     => $grandTotalCost,
            'selling_price_per_unit_vat_inc' => $sumCostPerUnit + $sumMarkupPerUnit,
            'markup_value'                   => $grandTotalMarkup,
            'total_selling_price_vat_inc'    => $grandTotalCost + $grandTotalMarkup,
        ];
    }

    // ── Full payload mapping ──────────────────────────────────────────────────

    /**
     * @param array $items  [{ rowKey, subitems: [{...}, ...] }, ...]
     * @return array{parentRows: array, subitemsByRowKey: array}
     */
    public function mapPayload(array $items): array
    {
        $parentRows       = [];
        $subitemsByRowKey = [];
        $sortOrder        = 1;

        foreach ($items as $group) {
            $rowKey   = $group['rowKey'] ?? null;
            $subitems = $group['subitems'] ?? [];

            $aggregates = $this->computeMasterAggregates($subitems);

            $parentRows[] = [
                'row_key'                        => $rowKey,
                'sort_order'                     => $sortOrder++,
                'total_cost'                     => $aggregates['total_cost'],
                'selling_price_per_unit_vat_inc' => $aggregates['selling_price_per_unit_vat_inc'],
                'total_selling_price_vat_inc'    => $aggregates['total_selling_price_vat_inc'],
                'markup_value'                   => $aggregates['markup_value'],
            ];

            $subSortOrder   = 1;
            $mappedSubitems = [];

            foreach ($subitems as $sub) {
                $qty                 = $this->toNullableInt($sub['qty'] ?? null);
                $costPerUnit         = $this->toNullableFloat($sub['costPerUnit'] ?? null);
                $sellingPricePerUnit = $this->toNullableFloat($sub['sellingPricePerUnit'] ?? null);
                $calc                = $this->computeSubitemRow($qty, $costPerUnit, $sellingPricePerUnit);

                $mappedSubitems[] = [
                    'row_key'                => $sub['rowKey'] ?? null,
                    'sort_order'              => $subSortOrder++,
                    'product_code'            => $sub['productCode'] ?? null,
                    'item_description'        => $sub['itemDescription'] ?? null,
                    'qty'                     => $qty,
                    'disty'                   => $sub['disty'] ?? null,
                    'cost_per_unit'           => $costPerUnit,
                    'selling_price_per_unit'  => $sellingPricePerUnit,
                    'markup_percent'          => $calc['markup_percent'],
                    'total_cost'              => $calc['total_cost'],
                ];
            }

            if (!empty($mappedSubitems)) {
                $subitemsByRowKey[$rowKey] = $mappedSubitems;
            }
        }

        return [
            'parentRows'       => $parentRows,
            'subitemsByRowKey' => $subitemsByRowKey,
        ];
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    public function toNullableFloat($value): ?float
    {
        return ($value === null || $value === '') ? null : (float) $value;
    }

    public function toNullableInt($value): ?int
    {
        return ($value === null || $value === '') ? null : (int) round((float) $value);
    }
}