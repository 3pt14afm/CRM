import { FIXED_OTHER_EXPENSE_ROWS } from './constants';
import { makeExpenseRow, makeItemRow, makeRowKey, makeSubitemRow, makeGroupRow } from './factories';
import { isBlank } from './calculations';

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

// Rehydrates the grouped/bundled item-table shape used by sprfEntry.jsx
// (array of groups, each with a `subitems` array) from whatever the API
// returns, filling in stable rowKeys and coercing numeric fields.
export const flattenItemsFromApi = (apiItems = []) => {
  if (!Array.isArray(apiItems) || apiItems.length === 0) {
    return [makeGroupRow()];
  }

  return apiItems.map((group) =>
    makeGroupRow({
      rowKey: group.rowKey || makeRowKey('group'),
      subitems:
        (group.subitems || []).length > 0
          ? group.subitems.map((sub) =>
              makeSubitemRow({
                rowKey: sub.rowKey || makeRowKey('sub'),
                productCode: sub.productCode ?? '',
                itemDescription: sub.itemDescription ?? '',
                qty: sub.qty ?? '',
                disty: sub.disty ?? '',
                costPerUnit: isBlank(sub.costPerUnit) ? '' : Number(sub.costPerUnit),
                markupPercent: isBlank(sub.markupPercent) ? '' : Number(sub.markupPercent),
              })
            )
          : [makeSubitemRow()],
    })
  );
};