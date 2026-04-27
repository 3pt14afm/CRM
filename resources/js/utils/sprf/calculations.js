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

  if (totalGpPercent <= 15) {
    return APPROVAL_LEVEL.PRESIDENT_AND_CEO;
  }

  if (totalGpPercent > 15 || revenue > 1000000) {
    return APPROVAL_LEVEL.VP_AND_CCTO;
  }

  return APPROVAL_LEVEL.ESD_ONLY;
};

export const finalApprovalLevelNumber = (approvalLevel) => {
  if (approvalLevel === APPROVAL_LEVEL.PRESIDENT_AND_CEO) return 5;
  if (approvalLevel === APPROVAL_LEVEL.VP_AND_CCTO) return 4;

  return 3;
};