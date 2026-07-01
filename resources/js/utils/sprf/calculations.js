// resources/js/utils/sprf/calculations.js
//
// Single source of truth for SPRF item/expense/summary calculations.
// Previously sprfEntry.jsx had its own inline copies of these functions —
// they have been moved here so there is only one place to fix formulas.
// sprfEntry.jsx should import from this file instead of redefining them.

export const isBlank = (value) =>
  value === '' || value === null || value === undefined;

export const toNumber = (value) => Number(value || 0);

// ─────────────────────────────────────────────────────────────────────────
// Item lots (group of subitems)
// ─────────────────────────────────────────────────────────────────────────

export const computeSubitem = (row) => {
  const qty = toNumber(row.qty);
  const costPerUnit = toNumber(row.costPerUnit);
  const markupPercent = toNumber(row.markupPercent);

  const qtyBlank = isBlank(row.qty);
  const costBlank = isBlank(row.costPerUnit);
  const markupBlank = isBlank(row.markupPercent);

  const markupPerUnit = costBlank || markupBlank ? '' : costPerUnit * (markupPercent / 100);
  const totalCost = qtyBlank || costBlank ? '' : qty * costPerUnit;
  const totalMarkup = qtyBlank || markupPerUnit === '' ? '' : qty * markupPerUnit;

  return { ...row, markupPerUnit, totalCost, totalMarkup };
};

export const computeGroup = (group) => {
  const computedSubitems = (group.subitems || []).map(computeSubitem);

  let sumCostPerUnit = 0;
  let sumMarkupPerUnit = 0;
  let grandTotalCost = 0;
  let grandTotalMarkup = 0;
  let hasIncompleteMarkup = false;

  computedSubitems.forEach((row) => {
    if (!isBlank(row.costPerUnit)) sumCostPerUnit += toNumber(row.costPerUnit);
    if (row.totalCost !== '') grandTotalCost += toNumber(row.totalCost);

    if (isBlank(row.markupPercent)) {
      hasIncompleteMarkup = true;
    } else {
      sumMarkupPerUnit += toNumber(row.markupPerUnit);
      grandTotalMarkup += toNumber(row.totalMarkup);
    }
  });

  return {
    ...group,
    computedSubitems,
    totalCost: grandTotalCost,
    sellingPricePerUnitVatInc: hasIncompleteMarkup ? '' : sumCostPerUnit + sumMarkupPerUnit,
    totalSellingPriceVatInc: hasIncompleteMarkup ? '' : grandTotalCost + grandTotalMarkup,
    markupValue: hasIncompleteMarkup ? '' : grandTotalMarkup,
  };
};

// ─────────────────────────────────────────────────────────────────────────
// Other expenses
// ─────────────────────────────────────────────────────────────────────────

export const computeExpense = (row) => {
  const qtyBlank = isBlank(row.qty);
  const unitPriceBlank = isBlank(row.unitPrice);

  const qty = toNumber(row.qty);
  const unitPrice = toNumber(row.unitPrice);

  return {
    ...row,
    total: qtyBlank || unitPriceBlank ? '' : qty * unitPrice,
  };
};

export const computeRebateTotal = (computedExpenses) =>
  computedExpenses
    .filter((row) => row.expenseKey === 'rebate')
    .reduce((sum, row) => sum + toNumber(row.total), 0);

// ─────────────────────────────────────────────────────────────────────────
// Summary / totals
// ─────────────────────────────────────────────────────────────────────────

// Overall summary block: revenue, cost, GP value/percent — nets out
// otherExpense in addition to item cost.
export const computeSummary = (computedItems, computedExpenses) => {
  const revenue = computedItems.reduce((sum, g) => sum + toNumber(g.totalSellingPriceVatInc), 0);
  const cogs = computedItems.reduce((sum, g) => sum + toNumber(g.totalCost), 0);
  const otherExpense = computedExpenses.reduce((sum, row) => sum + toNumber(row.total), 0);

  const totalExpense = cogs + otherExpense;
  const gpValue = revenue - totalExpense;
  const totalGpPercent = revenue > 0 ? (gpValue / totalExpense) * 100 : 0;

  return { revenue, cogs, otherExpense, totalExpense, gpValue, totalGpPercent };
};

// Items-table footer totals: item-only, does NOT net out otherExpense.
// ttlMarkupValue must equal the sum of each row's "Mark Up Value" column.
export const computeItemTotals = (computedItems) => ({
  ttlCost: computedItems.reduce((sum, g) => sum + toNumber(g.totalCost), 0),
  ttlRev: computedItems.reduce((sum, g) => sum + toNumber(g.totalSellingPriceVatInc), 0),
  ttlMarkupValue: computedItems.reduce((sum, g) => sum + toNumber(g.markupValue), 0),
});

// ─────────────────────────────────────────────────────────────────────────
// Approval level (matrix conditions)
// ─────────────────────────────────────────────────────────────────────────

export const APPROVAL_LEVEL = {
  // Legacy / Fallback
  ESD_ONLY: 'ESD_ONLY',
  VP_AND_CCTO: 'VP_AND_CCTO',
  PRESIDENT_AND_CEO: 'PRESIDENT_AND_CEO',

  // Matrix Conditions
  STANDARD_PRICING: 'STANDARD_PRICING',
  VALUE_GT_1M: 'VALUE_GT_1M',
  GP_GT_15: 'GP_GT_15',
  GP_LTE_15: 'GP_LTE_15',
  REBATE_REQUEST: 'REBATE_REQUEST',
};

// Pure derivation only — used as a fallback when sourceProject (backend)
// hasn't supplied approval_level yet, e.g. on a brand-new draft.
export const resolveApprovalLevelMatrix = ({ hasRebate, revenue, totalGpPercent }) => {
  if (hasRebate) return APPROVAL_LEVEL.REBATE_REQUEST;
  if (revenue <= 0) return APPROVAL_LEVEL.STANDARD_PRICING;
  if (totalGpPercent < 16) return APPROVAL_LEVEL.GP_LTE_15;
  if (revenue > 1000000) return APPROVAL_LEVEL.VALUE_GT_1M;
  return APPROVAL_LEVEL.GP_GT_15;
};

// ─────────────────────────────────────────────────────────────────────────
// Formatting helpers used by UI (SprfItemsTable, etc.)
// ─────────────────────────────────────────────────────────────────────────

export const peso = (value) => {
  if (isBlank(value)) return '';
  return Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const blankIfEmpty = (value) => (isBlank(value) ? '' : value);

export const percent = (value) => {
  if (isBlank(value)) return '';

  const num = Number(value);
  const rounded = Math.round(num * 100) / 100;
  const fixed = rounded.toFixed(2); // "9.00", "9.50", "9.57"
  const trimmed = fixed.replace(/0+$/, '').replace(/\.$/, '');

  return `${trimmed}%`;
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers to compute child/group sums used by SprfItemsTable (bundle rows)
// ─────────────────────────────────────────────────────────────────────────

export const getChildSums = (computedItems, items, parentIndex) => {
  let sumCost = 0;
  let sumTotalSelling = 0;
  let sumMarkupValue = 0;
  let p = parentIndex + 1;
  while (p < computedItems.length && (items[p]?.rowType === 'bundle' || computedItems[p]?.rowType === 'bundle')) {
    const child = computedItems[p] ?? {};
    sumCost += Number(child.totalCost || 0);
    sumTotalSelling += Number(child.totalSellingPriceVatInc || 0);
    sumMarkupValue += Number(child.markupValue || 0);
    p += 1;
  }
  return { sumCost, sumTotalSelling, sumMarkupValue };
};

export const getGroupUnitSums = (computedItems, items, parentIndex) => {
  const getSellingPerUnitForRow = (idx) => {
    const row = computedItems[idx] ?? {};
    const itemRow = items[idx] ?? {};
    let sellingPU = Number(row.sellingPricePerUnitVatInc || 0);
    if (!sellingPU) {
      const totalSelling = Number(row.totalSellingPriceVatInc || 0);
      const qty = Number(itemRow.qty || 0) || 1;
      if (totalSelling) sellingPU = totalSelling / qty;
    }
    return sellingPU;
  };

  let sumCostPerUnit = 0;
  let sumSellingPerUnit = 0;

  if (parentIndex < 0 || parentIndex >= computedItems.length) return { sumCostPerUnit: 0, sumMarkupPerUnit: 0, sumSellingPerUnit: 0 };

  let p = parentIndex;
  while (p < computedItems.length) {
    const curItem = items[p] ?? {};
    sumCostPerUnit += Number(curItem.costPerUnit || 0);
    sumSellingPerUnit += Number(getSellingPerUnitForRow(p) || 0);

    if (p === parentIndex) {
      if (items[p + 1]?.rowType === 'bundle' || computedItems[p + 1]?.rowType === 'bundle') {
        p += 1;
        continue;
      }
      break;
    }

    if (items[p + 1]?.rowType === 'bundle' || computedItems[p + 1]?.rowType === 'bundle') {
      p += 1;
      continue;
    }
    break;
  }

  const sumMarkupPerUnit = sumSellingPerUnit - sumCostPerUnit;
  return { sumCostPerUnit, sumMarkupPerUnit, sumSellingPerUnit };
};

export const getParentIndexForRow = (computedItems, index) => {
  if (!computedItems[index]?.rowType || computedItems[index].rowType !== 'bundle') return index;
  let p = index - 1;
  while (p >= 0 && computedItems[p]?.rowType === 'bundle') p -= 1;
  return p >= 0 ? p : index;
};