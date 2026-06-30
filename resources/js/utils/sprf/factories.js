import { FIXED_OTHER_EXPENSE_ROWS } from './constants';

export const makeRowKey = (prefix = 'row') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Subitem row used inside an item group (sprfEntry items table). Same shape
// as makeItemRow() plus a stable rowKey for React list rendering.
export const makeSubitemRow = ({
  rowKey = makeRowKey('sub'),
  productCode = '',
  itemDescription = '',
  qty = '',
  disty = '',
  costPerUnit = '',
  markupPercent = '',
} = {}) => ({
  rowKey,
  productCode,
  itemDescription,
  qty,
  disty,
  costPerUnit,
  markupPercent,
});

// A "group" is a bundle of one or more subitem rows. computeGroup() in
// calculations.js operates on group.subitems.
export const makeGroupRow = ({
  rowKey = makeRowKey('group'),
  subitems = [makeSubitemRow()],
} = {}) => ({
  rowKey,
  subitems,
});

export const makeItemRow = () => ({
  productCode: '',
  itemDescription: '',
  qty: '',
  disty: '',
  costPerUnit: '',
  markupPercent: '',
});

export const makeExpenseRow = ({
  expenseKey = null,
  isFixed = false,
  productCode = '',
  itemDescription = '',
  qty = '',
  unitPrice = '',
} = {}) => ({
  expenseKey,
  isFixed,
  productCode,
  itemDescription,
  qty,
  unitPrice,
});

export const makeInitialExpenseRows = () =>
  FIXED_OTHER_EXPENSE_ROWS.map((row) =>
    makeExpenseRow({
      expenseKey: row.key,
      isFixed: true,
      productCode: row.productCode,
      itemDescription: '',
      qty: '',
      unitPrice: '',
    })
  );