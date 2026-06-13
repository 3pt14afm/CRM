<?php

namespace App\Services\SPRF;

class SprfItemCalculationService
{
    // ── Per-subitem row calc ────────────────────────────────────────────────────

    /**
     * Computes totalCost and markupPerUnit-derived totalMarkup for a single subitem.
     */
    public function computeSubitemRow(?float $qty, ?float $costPerUnit, ?float $markupPercent): array
    {
        $totalCost = ($qty === null || $costPerUnit === null)
            ? null
            : $qty * $costPerUnit;

        $markupPerUnit = ($costPerUnit === null || $markupPercent === null)
            ? null
            : $costPerUnit * ($markupPercent / 100);

        $totalMarkup = ($qty === null || $markupPerUnit === null)
            ? null
            : $qty * $markupPerUnit;

        return [
            'total_cost'     => $totalCost,
            'markup_per_unit'=> $markupPerUnit,
            'total_markup'   => $totalMarkup,
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
            $qty           = $this->toNullableFloat($row['qty'] ?? null);
            $costPerUnit   = $this->toNullableFloat($row['costPerUnit'] ?? null);
            $markupPercent = $this->toNullableFloat($row['markupPercent'] ?? null);

            $calc = $this->computeSubitemRow($qty, $costPerUnit, $markupPercent);

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

            $subSortOrder = 1;
            $mappedSubitems = [];

            foreach ($subitems as $sub) {
                $qty           = $this->toNullableFloat($sub['qty'] ?? null);
                $costPerUnit   = $this->toNullableFloat($sub['costPerUnit'] ?? null);
                $markupPercent = $this->toNullableFloat($sub['markupPercent'] ?? null);
                $calc          = $this->computeSubitemRow($qty, $costPerUnit, $markupPercent);

                $mappedSubitems[] = [
                    'row_key'          => $sub['rowKey'] ?? null,
                    'sort_order'       => $subSortOrder++,
                    'product_code'     => $sub['productCode'] ?? null,
                    'item_description' => $sub['itemDescription'] ?? null,
                    'qty'              => $qty,
                    'disty'            => $sub['disty'] ?? null,
                    'cost_per_unit'    => $costPerUnit,
                    'markup_percent'   => $markupPercent,
                    'total_cost'       => $calc['total_cost'],
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
}