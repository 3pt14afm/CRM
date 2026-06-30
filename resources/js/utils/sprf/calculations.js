import { APPROVAL_LEVEL } from './constants';

export const isBlank = (value) =>
  value === '' || value === null || value === undefined;

export const toNumber = (value) => Number(value || 0);

export const computeItem = (row) => {
  const qtyBlank = isBlank(row.qty);
  const costBlank = isBlank(row.costPerUnit);
  const markupBlank = isBlank(row.markupPercent);

  const qty = toNumber(row.qty);
  const costPerUnit = toNumber(row.costPerUnit);
  const markupPercent = toNumber(row.markupPercent);

  const totalCost = qtyBlank || costBlank ? '' : qty * costPerUnit;

  const sellingPricePerUnitVatInc =
    costBlank || markupBlank
      ? ''
      : costPerUnit * (1 + markupPercent / 100);

  const totalSellingPriceVatInc =
    qtyBlank || sellingPricePerUnitVatInc === ''
      ? ''
      : qty * sellingPricePerUnitVatInc;

  const markupValue =
    totalSellingPriceVatInc === '' || totalCost === ''
      ? ''
      : totalSellingPriceVatInc - totalCost;

  return {
    ...row,
    totalCost,
    sellingPricePerUnitVatInc,
    totalSellingPriceVatInc,
    markupValue,
    markupPercent: row.markupPercent,
  };
};

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

export const computeSummary = (computedItems, computedExpenses) => {
  const revenue = computedItems.reduce(
    (sum, row) => sum + toNumber(row.totalSellingPriceVatInc),
    0
  );

  const cogs = computedItems.reduce(
    (sum, row) => sum + toNumber(row.totalCost),
    0
  );

  const otherExpense = computedExpenses.reduce(
    (sum, row) => sum + toNumber(row.total),
    0
  );

  const totalExpense = cogs + otherExpense;
  const gpValue = revenue - totalExpense;
  const totalGpPercent = revenue > 0 ? (gpValue / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    otherExpense,
    totalExpense,
    gpValue,
    totalGpPercent,
  };
};

export const computeItemTotals = (computedItems) => ({
  ttlCost: computedItems.reduce((sum, row) => sum + toNumber(row.totalCost), 0),
  ttlRev: computedItems.reduce(
    (sum, row) => sum + toNumber(row.totalSellingPriceVatInc),
    0
  ),
});

export const computeRebateTotal = (computedExpenses) =>
  computedExpenses
    .filter((row) => row.expenseKey === 'rebate')
    .reduce((sum, row) => sum + toNumber(row.total), 0);

export const resolveApprovalLevel = ({
  revenue,
  totalGpPercent,
  hasRebate,
}) => {
  if (hasRebate) {
    return APPROVAL_LEVEL.PRESIDENT_AND_CEO;
  }

  if (revenue <= 0) {
    return APPROVAL_LEVEL.ESD_ONLY;
  }

  if (totalGpPercent < 16) {
    return APPROVAL_LEVEL.PRESIDENT_AND_CEO;
  }

  if (totalGpPercent >= 16 || revenue > 1000000) {
    return APPROVAL_LEVEL.VP_AND_CCTO;
  }

  return APPROVAL_LEVEL.ESD_ONLY;
};

export const finalApprovalLevelNumber = (approvalLevel) => {
  if (approvalLevel === APPROVAL_LEVEL.PRESIDENT_AND_CEO) return 5;
  if (approvalLevel === APPROVAL_LEVEL.VP_AND_CCTO) return 4;

  return 3;
};

// Formatting helpers used by UI
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

// Helpers to compute child/group sums used by SprfItemsTable
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
  // include parent and any subsequent bundle rows
  while (p < computedItems.length) {
    const curItem = items[p] ?? {};
    sumCostPerUnit += Number(curItem.costPerUnit || 0);
    sumSellingPerUnit += Number(getSellingPerUnitForRow(p) || 0);

    // if at parent and next is bundle, consume bundles
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