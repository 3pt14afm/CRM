const peso = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SprfOtherExpenseTable({
  otherExpenses,
  computedExpenses,
  onUpdateExpense,
  onAddExpenseRow,
  onRemoveExpenseRow,
  totalOtherExpense,
}) {
  const inputClass =
    'w-full min-w-0 h-8 text-xs text-center rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none hover:border-[#28980080]';

  const readonlyCellClass =
    'w-full h-8 text-xs px-2 flex items-center rounded-sm text-slate-700';

  const readonlyAmountClass =
    'w-full h-8 text-xs text-center px-1 flex items-center justify-end';

  const footerCellClass =
    'bg-[#D9F2D0] p-2 text-xs font-bold text-end';

  return (
    <div className="w-full xl:w-[65%]">
      <div className="mb-1 text-[12px] ml-3 font-bold uppercase text-[#111]">
        Other Expense
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#CAD6C2] bg-[#FBFFFA]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-[11px]">
          <colgroup>
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '39%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '6.5%' }} />
          </colgroup>

          <thead>
            <tr className="bg-lightgreen/30 text-[10px] uppercase">
              <th className="border-b border-r border-darkgreen/15 p-2 text-center">Item No.</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Product Code</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Item Description</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Qty</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Unit Price</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Total</th>
              <th className="border-b border-darkgreen/15 p-2">+/-</th>
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
                    <div className="w-full h-8 flex items-center justify-center text-[13px]">
                      {index + 1}
                    </div>
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    {isFixed ? (
                      <div className={readonlyCellClass}>
                        {sourceRow.productCode || '—'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={sourceRow.productCode}
                        onChange={(e) => onUpdateExpense(index, 'productCode', e.target.value)}
                        className={`${inputClass} normal-case text-left`}
                        placeholder="Enter product code"
                      />
                    )}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <input
                      type="text"
                      value={sourceRow.itemDescription}
                      onChange={(e) => onUpdateExpense(index, 'itemDescription', e.target.value)}
                      className={`${inputClass} normal-case text-left`}
                      placeholder="Enter item description"
                    />
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <input
                      type="number"
                      min="0"
                      value={sourceRow.qty}
                      onChange={(e) => onUpdateExpense(index, 'qty', e.target.value)}
                      className={inputClass}
                      placeholder="0"
                    />
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={sourceRow.unitPrice}
                      onChange={(e) => onUpdateExpense(index, 'unitPrice', e.target.value)}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <div className={readonlyAmountClass}>
                      {peso(row.total)}
                    </div>
                  </td>

                  <td className="border-b border-darkgreen/15 p-1">
                    <div className="flex gap-1 justify-center">
                      <button
                        type="button"
                        onClick={() => onAddExpenseRow(index)}
                        className="w-6 h-6 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100"
                        title="Add row"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveExpenseRow(index)}
                        disabled={isFixed}
                        className={`w-6 h-6 rounded border ${
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
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td className={`${footerCellClass} rounded-bl-xl`}></td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}>TOTAL</td>
              <td className={footerCellClass}>{peso(totalOtherExpense)}</td>
              <td className={`${footerCellClass} rounded-br-xl`}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}