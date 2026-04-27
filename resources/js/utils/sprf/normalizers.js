import { FIXED_OTHER_EXPENSE_ROWS } from './constants';
import { makeExpenseRow, makeItemRow } from './factories';

export const normalizeExpenseRows = (rows = []) => {
  const incoming = Array.isArray(rows) ? rows : [];

  const incomingByKey = new Map(
    incoming
      .filter((row) => row?.expenseKey)
      .map((row) => [row.expenseKey, row])
  );

  const fixedRows = FIXED_OTHER_EXPENSE_ROWS.map((fixed) => {
    const existing = incomingByKey.get(fixed.key);

    return makeExpenseRow({
      expenseKey: fixed.key,
      isFixed: true,
      productCode: fixed.productCode,
      itemDescription: existing?.itemDescription ?? '',
      qty: existing?.qty ?? '',
      unitPrice: existing?.unitPrice ?? '',
    });
  });

  const extraRows = incoming
    .filter(
      (row) =>
        !row?.isFixed &&
        !FIXED_OTHER_EXPENSE_ROWS.some(
          (fixed) => fixed.key === row?.expenseKey
        )
    )
    .map((row) =>
      makeExpenseRow({
        expenseKey: row?.expenseKey ?? null,
        isFixed: false,
        productCode: row?.productCode ?? '',
        itemDescription: row?.itemDescription ?? '',
        qty: row?.qty ?? '',
        unitPrice: row?.unitPrice ?? '',
      })
    );

  return [...fixedRows, ...extraRows];
};

export const normalizeRemarksRows = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((row) => String(row ?? '')) : [''];
  }

  const text = String(value ?? '');

  if (!text.trim()) {
    return [''];
  }

  const rows = text.split(/\r?\n/).map((row) => row.trimEnd());

  return rows.length > 0 ? rows : [''];
};

export const normalizeItemRows = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [makeItemRow()];
  }

  return items.map((row) => ({
    productCode: row?.productCode ?? '',
    itemDescription: row?.itemDescription ?? '',
    qty: row?.qty ?? '',
    disty: row?.disty ?? '',
    costPerUnit: row?.costPerUnit ?? '',
    markupPercent: row?.markupPercent ?? '',
  }));
};