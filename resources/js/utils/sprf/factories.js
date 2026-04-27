import { FIXED_OTHER_EXPENSE_ROWS } from './constants';

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