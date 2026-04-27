import { DEFAULT_SPRF_NO } from './constants';
import { makeInitialExpenseRows, makeItemRow, makeExpenseRow } from './factories';
import {
  normalizeExpenseRows,
  normalizeItemRows,
  normalizeRemarksRows,
} from './normalizers';

export const createSprfFormState = (sourceProject = null) => {
  if (!sourceProject) {
    return {
      sprfNo: DEFAULT_SPRF_NO,
      companyInfo: {
        subCategory: '',
        account: '',
        accountManager: '',
      },
      remarks: [''],
      rebateJustification: '',
      items: [makeItemRow()],
      otherExpenses: makeInitialExpenseRows(),
    };
  }

  return {
    sprfNo: sourceProject?.sprf_no ?? DEFAULT_SPRF_NO,
    companyInfo: {
      subCategory: sourceProject?.company_info?.subCategory ?? '',
      account: sourceProject?.company_info?.account ?? '',
      accountManager: sourceProject?.company_info?.accountManager ?? '',
    },
    remarks: normalizeRemarksRows(sourceProject?.remarks ?? ''),
    rebateJustification: sourceProject?.rebate_justification ?? '',
    items: normalizeItemRows(sourceProject?.items),
    otherExpenses: normalizeExpenseRows(sourceProject?.other_expenses ?? []),
  };
};

export const createClearedSprfFormState = (sourceProject = null) => ({
  sprfNo: sourceProject?.sprf_no ?? DEFAULT_SPRF_NO,
  companyInfo: {
    subCategory: '',
    account: '',
    accountManager: '',
  },
  remarks: [''],
  rebateJustification: '',
  items: [makeItemRow()],
  otherExpenses: makeInitialExpenseRows(),
});

export const sprfFormReducer = (state, action) => {
  switch (action.type) {
    case 'HYDRATE_PROJECT':
      return createSprfFormState(action.sourceProject);

    case 'CLEAR_FORM':
      return createClearedSprfFormState(action.sourceProject);

    case 'SET_COMPANY_INFO':
      return {
        ...state,
        companyInfo: action.value,
      };

    case 'SET_REMARKS':
      return {
        ...state,
        remarks: action.value,
      };

    case 'SET_REBATE_JUSTIFICATION':
      return {
        ...state,
        rebateJustification: action.value,
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((row, index) =>
          index === action.index
            ? {
                ...row,
                [action.field]: action.value,
              }
            : row
        ),
      };

    case 'ADD_ITEM_ROW': {
      const nextItems = [...state.items];
      nextItems.splice(action.index + 1, 0, makeItemRow());

      return {
        ...state,
        items: nextItems,
      };
    }

    case 'REMOVE_ITEM_ROW':
      return {
        ...state,
        items:
          state.items.length === 1
            ? state.items
            : state.items.filter((_, index) => index !== action.index),
      };

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        otherExpenses: state.otherExpenses.map((row, index) => {
          if (index !== action.index) return row;

          if (row.isFixed && action.field === 'productCode') {
            return row;
          }

          return {
            ...row,
            [action.field]: action.value,
          };
        }),
      };

    case 'ADD_EXPENSE_ROW': {
      const nextExpenses = [...state.otherExpenses];
      nextExpenses.splice(action.index + 1, 0, makeExpenseRow());

      return {
        ...state,
        otherExpenses: nextExpenses,
      };
    }

    case 'REMOVE_EXPENSE_ROW':
      return {
        ...state,
        otherExpenses:
          state.otherExpenses.length === 1 ||
          state.otherExpenses[action.index]?.isFixed
            ? state.otherExpenses
            : state.otherExpenses.filter((_, index) => index !== action.index),
      };

    default:
      return state;
  }
};