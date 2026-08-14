// resources/js/utils/sprf/calculations2.js
//
// Variant of calculations.js used by sprfEntry2.jsx (SPRF2 flow).
//
// Only the item-lot subitem/group math differs from calculations.js:
//   sprfEntry.jsx  (v1): Mark-up %        is the input  → Selling Price/unit is derived
//                         sellingPrice = (unitCost * markup%) + unitCost
//   sprfEntry2.jsx (v2): Selling Price/unit is the input → Mark-up %        is derived
//                         markup% = [(sellingPrice - unitCost) / unitCost] * 100
//
// Everything else (expenses, summary, item totals, approval level, formatting,
// and the child/group-sum helpers used by SprfItemsTable) is untouched, so it
// is imported straight from calculations.js instead of being redefined here —
// keep it that way; fix it once, in calculations.js, if it ever needs to change.

import { isBlank, toNumber } from './calculations';

// ─────────────────────────────────────────────────────────────────────────
// Item lots (group of subitems)
// ─────────────────────────────────────────────────────────────────────────

export const computeSubitem2 = (row) => {
  const qty = toNumber(row.qty);
  const costPerUnit = toNumber(row.costPerUnit);
  const sellingPricePerUnit = toNumber(row.sellingPricePerUnit);

  const qtyBlank = isBlank(row.qty);
  const costBlank = isBlank(row.costPerUnit);
  const sellingBlank = isBlank(row.sellingPricePerUnit);

  // markup% = [(sellingPrice - unitCost) / unitCost] * 100
  const markupPercent =
    costBlank || sellingBlank || costPerUnit === 0
      ? ''
      : ((sellingPricePerUnit - costPerUnit) / costPerUnit) * 100;

  const markupPerUnit = costBlank || sellingBlank ? '' : sellingPricePerUnit - costPerUnit;
  const totalCost = qtyBlank || costBlank ? '' : qty * costPerUnit;
  const totalMarkup = qtyBlank || markupPerUnit === '' ? '' : qty * markupPerUnit;

  return { ...row, markupPercent, markupPerUnit, totalCost, totalMarkup };
};

export const computeGroup2 = (group) => {
  const computedSubitems = (group.subitems || []).map(computeSubitem2);

  let sumCostPerUnit = 0;
  let sumMarkupPerUnit = 0;
  let grandTotalCost = 0;
  let grandTotalMarkup = 0;
  let hasIncompleteSelling = false;

  computedSubitems.forEach((row) => {
    if (!isBlank(row.costPerUnit)) sumCostPerUnit += toNumber(row.costPerUnit);
    if (row.totalCost !== '') grandTotalCost += toNumber(row.totalCost);

    if (isBlank(row.sellingPricePerUnit)) {
      hasIncompleteSelling = true;
    } else {
      sumMarkupPerUnit += toNumber(row.markupPerUnit);
      grandTotalMarkup += toNumber(row.totalMarkup);
    }
  });

  return {
    ...group,
    computedSubitems,
    totalCost: grandTotalCost,
    sellingPricePerUnitVatInc: hasIncompleteSelling ? '' : sumCostPerUnit + sumMarkupPerUnit,
    totalSellingPriceVatInc: hasIncompleteSelling ? '' : grandTotalCost + grandTotalMarkup,
    markupValue: hasIncompleteSelling ? '' : grandTotalMarkup,
  };
};