import React from 'react';

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

export default function SprfOtherExpenseTable({
  otherExpenses,
  computedExpenses,
  onUpdateExpense,
  onAddExpenseRow,
  onRemoveExpenseRow,
  totalOtherExpense,
  readOnly = false,
}) {
  const showActionColumn = !readOnly;

  const inputClass =
    'w-full min-w-0 h-5 xl:h-6 text-[11px] xl:text-xs text-center rounded-sm border border-slate-200/0 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none hover:border-[#28980080]';

  const readonlyCellClass =
    'w-full h-6 text-[11px] xl:text-xs md:px-2 flex items-center rounded-sm';

  const readonlyAmountClass =
    'w-full h-6 text-[11px] xl:text-xs text-center px-1 flex items-center justify-end';

  const footerCellClass =
    'bg-[#D9F2D0] p-2 text-[11px] xl:text-xs font-semibold xl:font-bold';

  return (
    <div className="w-full md:w-[80%] xl:w-[65%]">
      <div className="mb-1 text-[11px] xl:text-xs ml-3 font-bold uppercase text-[#111]">
        Other Expense
      </div>

      <div className="rounded-xl border border-[#CAD6C2] bg-white shadow-md overflow-hidden">
        <div className="overflow-x-auto touch-pan-x">
        <table className="w-full min-w-[560px] xl:min-w-0 table-fixed border-separate border-spacing-0 text-[11px]">
          <colgroup>
            <col className="w-[5.5%]" />
            <col className="w-[15%]" />
            <col className="w-[35%] xl:w-[39%]" />
            <col className="w-[5%] xl:w-[6%]" />
            <col className="w-[11%] xl:w-[14%]" />
            <col className="w-[10%] xl:w-[16%]" />

            {showActionColumn && <col className="w-[6%] xl:w-[6.5%]" />}
          </colgroup>

          <thead>
            <tr className="bg-lightgreen/30 text-[9px] sm:text-[10px] uppercase">
              <th className="border-b border-r border-darkgreen/15 py-2 text-center">
                Item No.
              </th>
              <th className="border-b border-r border-darkgreen/15 p-2">
                Product Code
              </th>
              <th className="border-b border-r border-darkgreen/15 p-2">
                Item Description
              </th>
              <th className="border-b border-r border-darkgreen/15 sm:p-2">
                Qty
              </th>
              <th className="border-b border-r border-darkgreen/15 p-2">
                Unit Price
              </th>

              <th
                className={`border-b border-darkgreen/15 p-2 ${
                  showActionColumn ? 'border-r' : ''
                }`}
              >
                Total
              </th>

              {showActionColumn && (
                <th className="border-b border-darkgreen/15 p-2">+/-</th>
              )}
            </tr>
          </thead>

          <tbody>
            {computedExpenses.map((row, index) => {
              const sourceRow = otherExpenses[index];
              const isFixed = Boolean(sourceRow?.isFixed);

              return (
                <tr
                  key={`expense-${index}`}
                  className="border-b relative transition-all duration-100 hover:bg-lightgreen/5 hover:shadow-[inset_0px_0px_4px_1px_rgba(0,_0,_0,_0.1)]"
                >
                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <div className="w-full h-6 flex items-center justify-center text-[11px] xl:text-[13px]">
                      {index + 1}
                    </div>
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    {readOnly || isFixed ? (
                      <div className={readonlyCellClass}>
                        {blankIfEmpty(sourceRow?.productCode)}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={sourceRow.productCode}
                        onChange={(e) =>
                          onUpdateExpense(index, 'productCode', e.target.value)
                        }
                        className={`${inputClass} normal-case text-start pl-2`}
                        placeholder="Enter product code"
                      />
                    )}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    {readOnly ? (
                      <div className={readonlyCellClass}>
                        {blankIfEmpty(sourceRow?.itemDescription)}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={sourceRow.itemDescription}
                        onChange={(e) =>
                          onUpdateExpense(index, 'itemDescription', e.target.value)
                        }
                        className={`${inputClass} normal-case text-start pl-2`}
                        placeholder="Enter item description"
                      />
                    )}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    {readOnly ? (
                      <div className={readonlyAmountClass}>
                        {peso(sourceRow?.qty)}
                      </div>
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
                        className={inputClass}
                        placeholder="0"
                      />
                    )}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    {readOnly ? (
                      <div className={readonlyAmountClass}>
                        {peso(sourceRow?.unitPrice)}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formatCurrencyInput(sourceRow.unitPrice)}
                        onChange={(e) => {
                          const rawValue = parseCurrencyInput(e.target.value);
                          onUpdateExpense(index, 'unitPrice', rawValue);
                        }}
                        className={inputClass}
                        placeholder="0.00"
                      />
                    )}
                  </td>

                  <td
                    className={`border-b border-darkgreen/15 p-1 ${
                      showActionColumn ? 'border-r' : ''
                    }`}
                  >
                    <div className={readonlyAmountClass}>{peso(row.total)}</div>
                  </td>

                  {showActionColumn && (
                    <td className="border-b border-darkgreen/15 p-1">
                      <div className="flex gap-0.5 xl:gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => onAddExpenseRow(index)}
                          className="w-6 h-6 px-1 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100"
                          title="Add row"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveExpenseRow(index)}
                          disabled={isFixed}
                          className={`w-6 h-6 px-1 rounded border ${
                            isFixed
                              ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          }`}
                          title={isFixed ? 'Fixed rows cannot be removed' : 'Remove row'}
                        >
                          -
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td className={`${footerCellClass} rounded-none sm:rounded-bl-xl`}></td>
              <td className={footerCellClass}></td>
              <td className={`${footerCellClass} text-center`}>TOTAL</td>
              <td className={footerCellClass}></td>
              <td className={`${footerCellClass} border-r border-darkgreen/15`}></td>

              <td
                className={`${footerCellClass} text-end ${
                  showActionColumn
                    ? 'border-r border-darkgreen/15'
                    : 'rounded-br-xl'
                }`}
              >
                {peso(totalOtherExpense)}
              </td>

              {showActionColumn && (
                <td className={`${footerCellClass} rounded-none sm:rounded-br-xl`}></td>
              )}
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  );
}