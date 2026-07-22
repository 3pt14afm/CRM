import React, { useState } from 'react';
import { LuTrash } from 'react-icons/lu';
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md';

const peso = (value) => {
  if (value === '' || value === null || value === undefined) return '';

  return Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const blankIfEmpty = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  return value;
};

const formatCurrencyInput = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  let str = String(val).replace(/[^0-9.]/g, '');
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }
  const finalParts = str.split('.');
  finalParts[0] = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (finalParts.length > 1) {
    finalParts[1] = finalParts[1].slice(0, 2); // Strictly 2 decimals
    return `${finalParts[0]}.${finalParts[1]}`;
  }
  return finalParts[0];
};

const truncateToTwoDecimals = (val) => {
  const parts = val.split('.');
  if (parts.length > 1) {
    return `${parts[0]}.${parts[1].slice(0, 2)}`;
  }
  return val;
};

const parseCurrencyInput = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const clean = String(val).replace(/,/g, '');
  return truncateToTwoDecimals(clean); // Enforce before returning
};

/**
 * Mobile card list for the Other Expense table (below `md`).
 * Rendered by SprfOtherExpenseTable.jsx — shares the same onUpdateExpense /
 * onAddExpenseRow / onRemoveExpenseRow handlers as the desktop table, so
 * behavior stays in sync between the two views.
 *
 * Unlike SprfItemsCardList (one card per item lot), Other Expense has no
 * grouping — it's a single flat list — so this renders as one card with a
 * static "Other Expense" header (no per-row add button), each expense as a
 * row inside it, and a single "+ Add New Expense" bar at the bottom in the
 * same spot/style item lots use for "+ Add new item lot".
 */
export default function SprfOtherExpenseCardList({
  otherExpenses,
  computedExpenses,
  onUpdateExpense,
  onAddExpenseRow,
  onRemoveExpenseRow,
  totalOtherExpense,
  readOnly = false,
  rebateLocked = false,
}) {
  const showActionColumn = !readOnly;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="md:hidden">
      <div className="rounded-t-xl border border-[#CAD6C2] bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between bg-lightgreen/30 border-b border-[#CAD6C2]/80 px-3 py-2"
        >
          <span className="text-[11px] font-bold text-darkgreen uppercase tracking-wide">
            Other Expense
          </span>
          {isExpanded ? (
            <MdKeyboardArrowDown size={16} className="text-slate-600" />
          ) : (
            <MdKeyboardArrowRight size={16} className="text-slate-600" />
          )}
        </button>

        {/* Rows */}
        {isExpanded && (
        <div className="divide-y divide-darkgreen/20">
          {computedExpenses.map((row, index) => {
            const sourceRow = otherExpenses[index];
            const isFixed = Boolean(sourceRow?.isFixed);
            const isRebateRow = sourceRow?.expenseKey === 'rebate';
            const rowLocked = isRebateRow && rebateLocked;

            return (
              <div
                key={`expense-card-${index}`}
                className={`p-3 ${index % 2 === 1 ? 'bg-lightgreen/5' : 'bg-white'}`}
              >
                <div className="grid grid-cols-3 gap-x-1.5">
                  <div className="col-span-1">
                    <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                      Product Code
                    </label>
                    {readOnly || isFixed ? (
                      <div className="text-xs pt-0.5">{blankIfEmpty(sourceRow?.productCode)}</div>
                    ) : (
                      <input
                        type="text"
                        value={sourceRow.productCode}
                        onChange={(e) => onUpdateExpense(index, 'productCode', e.target.value)}
                        className="w-full text-xs normal-case border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-slate-400"
                        placeholder="Enter product code"
                      />
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                      Item Description
                    </label>
                    {readOnly || rowLocked ? (
                      <div className="text-xs leading-snug pt-0.5">
                        {rowLocked && !sourceRow?.itemDescription ? (
                          <span className="text-slate-400 italic">Cannot add rebate</span>
                        ) : (
                          blankIfEmpty(sourceRow?.itemDescription)
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={sourceRow.itemDescription}
                        onChange={(e) => onUpdateExpense(index, 'itemDescription', e.target.value)}
                        className="w-full text-xs normal-case border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-slate-400"
                        placeholder="Enter item description"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 pt-3 gap-x-1.5">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                      Qty
                    </label>
                    {readOnly || rowLocked ? (
                      <div className="text-xs pt-0.5 font-medium">{peso(sourceRow?.qty)}</div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={sourceRow.qty}
                        onChange={(e) => {
                          const value = e.target.value;
                          onUpdateExpense(
                            index,
                            'qty',
                            value === '' ? '' : String(Math.floor(Number(value)))
                          );
                        }}
                        className="w-full text-xs border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-slate-400 [appearance-none] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                      Unit Price
                    </label>
                    {readOnly || rowLocked ? (
                      <div className="text-xs pt-0.5 font-medium">{peso(sourceRow?.unitPrice)}</div>
                    ) : (
                      <input
                        type="text"
                        value={formatCurrencyInput(sourceRow.unitPrice)}
                        onChange={(e) => {
                          const rawValue = parseCurrencyInput(e.target.value);
                          onUpdateExpense(index, 'unitPrice', rawValue);
                        }}
                        className="w-full text-xs border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-slate-400"
                        placeholder="0.00"
                        title={rowLocked ? 'Rebate is only editable once value reaches ₱1,000,000' : undefined}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                      Total
                    </label>
                    <div className="text-xs pt-0.5 font-medium">{peso(row.total)}</div>
                  </div>
                </div>

                {showActionColumn && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onRemoveExpenseRow(index)}
                      disabled={isFixed}
                      className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center leading-none ${
                        isFixed
                          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      }`}
                      title={isFixed ? 'Fixed rows cannot be removed' : 'Remove row'}
                    >
                      <LuTrash size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        {/* Add new expense — same spot/style as "+ Add new item lot" */}
        {showActionColumn && (
          <div className="border-t border-darkgreen/10 p-2">
            <button
              type="button"
              onClick={() => onAddExpenseRow(computedExpenses.length - 1)}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-green-700 bg-lightgreen/40 rounded-lg py-1.5"
            >
              + Add New Expense
            </button>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="rounded-b-xl border border-[#CAD6C2] border-t-0 bg-[#D9F2D0] px-4 py-2 flex items-center justify-between text-[11px] font-semibold">
        <span>TOTAL EXPENSES</span>
        <span>{peso(totalOtherExpense)}</span>
      </div>
    </div>
  );
}