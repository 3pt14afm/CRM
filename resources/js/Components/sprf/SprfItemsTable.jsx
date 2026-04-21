const peso = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SprfItemsTable({
  items,
  computedItems,
  onUpdateItem,
  onAddItemRow,
  onRemoveItemRow,
  totals,
  readOnly = false,
}) {
  const inputClass =
    'w-full min-w-0 h-8 text-xs text-center rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none hover:border-[#28980080]';

  const readonlyClass =
    'w-full h-8 text-xs text-center px-1 flex items-center justify-end';

  const readonlyTextClass =
    'w-full min-w-0 h-8 text-xs rounded-sm px-1 flex items-center bg-white';

  const footerCellClass =
    'bg-[#D9F2D0] p-2 text-xs font-bold text-center text-end';

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[#CAD6C2] bg-[#FBFFFA]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-[11px]">
          <colgroup>
            <col style={{ width: '3.5%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '19%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9.5%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
          </colgroup>

          <thead>
            <tr className="bg-lightgreen/30 text-[10px] uppercase">
              <th className="border-b border-r border-darkgreen/15 p-2">Item Lot</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Product Code</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Item Description</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Qty</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Disty</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Cost/unit</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Total Cost</th>
              <th className="border-b border-r border-darkgreen/15 p-2">
                Selling Price/unit (VAT INC)
              </th>
              <th className="border-b border-r border-darkgreen/15 p-2">
                Total Selling Price (VAT INC)
              </th>
              <th className="border-b border-r border-darkgreen/15 p-2">Mark Up Value</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Mark-up %</th>
              <th className="border-b border-darkgreen/15 p-2">+/-</th>
            </tr>
          </thead>

          <tbody>
            {computedItems.map((row, index) => (
              <tr
                key={`item-${index}`}
                className="border-b relative hover:bg-lightgreen/5 hover:shadow-[inset_0px_0px_4px_1px_rgba(0,_0,_0,_0.1)] transition-all duration-100"
              >
                <td className="border-b border-r border-darkgreen/15 p-1">
                  <div className="w-full h-8 flex items-center justify-center text-[13px]">
                    {index + 1}
                  </div>
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  {readOnly ? (
                    <div className={readonlyTextClass}>
                      {items[index]?.productCode || '—'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={items[index].productCode}
                      onChange={(e) => onUpdateItem(index, 'productCode', e.target.value)}
                      className={`${inputClass} normal-case`}
                    />
                  )}
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  {readOnly ? (
                    <div className={`${readonlyTextClass} justify-start`}>
                      {items[index]?.itemDescription || '—'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={items[index].itemDescription}
                      onChange={(e) => onUpdateItem(index, 'itemDescription', e.target.value)}
                      className={`${inputClass} normal-case text-left`}
                    />
                  )}
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  {readOnly ? (
                    <div className={readonlyClass}>{peso(items[index]?.qty)}</div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={items[index].qty}
                      onChange={(e) => onUpdateItem(index, 'qty', e.target.value)}
                      className={inputClass}
                      placeholder="0"
                    />
                  )}
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  {readOnly ? (
                    <div className={`${readonlyTextClass} justify-start`}>
                      {items[index]?.disty || '—'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={items[index].disty}
                      onChange={(e) => onUpdateItem(index, 'disty', e.target.value)}
                      className={`${inputClass} normal-case`}
                    />
                  )}
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  {readOnly ? (
                    <div className={readonlyClass}>{peso(items[index]?.costPerUnit)}</div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={items[index].costPerUnit}
                      onChange={(e) => onUpdateItem(index, 'costPerUnit', e.target.value)}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  )}
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  <div className={readonlyClass}>
                    {peso(row.totalCost)}
                  </div>
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  <div className={readonlyClass}>
                    {peso(row.sellingPricePerUnitVatInc)}
                  </div>
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  <div className={readonlyClass}>
                    {peso(row.totalSellingPriceVatInc)}
                  </div>
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  <div className={readonlyClass}>
                    {peso(row.markupValue)}
                  </div>
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  <div className={readonlyClass}>
                    {row.markupPercent.toFixed(2)}%
                  </div>
                </td>

                <td className="border-b border-darkgreen/15 p-1">
                  {readOnly ? (
                    <div className="w-full h-8" />
                  ) : (
                    <div className="flex gap-1 justify-center">
                      <button
                        type="button"
                        onClick={() => onAddItemRow(index)}
                        className="w-6 h-6 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveItemRow(index)}
                        className="w-6 h-6 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                      >
                        -
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td className={`${footerCellClass} rounded-bl-xl`}></td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}>TOTAL</td>
              <td className={footerCellClass}>{peso(totals.ttlCost)}</td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}>{peso(totals.ttlRev)}</td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}></td>
              <td className={`${footerCellClass} rounded-br-xl`}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}