import React, { useState } from 'react';
import { MdKeyboardArrowDown, MdKeyboardArrowRight, MdOutlineDelete } from 'react-icons/md';
import { peso, blankIfEmpty, percent } from '../../utils/sprf/calculations';
import { PackagePlus } from 'lucide-react';

export default function SprfItemsTable({
  items,
  computedItems,
  onUpdateSubitem,
  onAddGroup,
  onAddSubitem,
  onRemoveSubitem,
  totals,
  summary = {},
  readOnly = false,
}) {
  const showActionColumn = !readOnly;
  const [expanded, setExpanded] = useState({});
  const toggleExpand = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const inputClass =
    'w-full min-w-0 min-h-5 text-[11px] xl:text-xs text-center rounded-sm border-darkgreen/0 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-transparent px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none hover:border-[#28980080]';

  const readonlyClass =
    'w-full h-5 text-[11px] xl:text-xs text-center px-1 flex items-center justify-end font-medium';

  const readonlyTextClass =
    'w-full min-w-0 text-xs rounded-sm px-1 flex items-center leading-snug';

  const footerCellClass =
    'bg-[#D9F2D0] p-2 text-[11px] xl:text-xs font-semibold xl:font-bold';

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[#CAD6C2] bg-[#FBFFFA] shadow-md">
        <table className="w-full table-fixed border-separate border-spacing-0 text-[11px]">
          <colgroup>
            <col className="w-[3.5%]" />
            <col className="w-[10%]" />
            <col className="w-[19%]" />
            <col className="w-[4%] xl:w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[7%] xl:w-[9%]" />
            <col className="w-[9.5%]" />
            <col className="w-[9%] xl:w-[11%]" />
            <col className="w-[9%] xl:w-[11%]" />
            <col className="w-[8%] xl:w-[6%]" />
            <col className="w-[6%]" />
            {showActionColumn && <col className="w-[3%] xl:w-[5%]" />}
          </colgroup>

          <thead>
            <tr className="bg-lightgreen/30 text-[10px] uppercase">
              <th className="border-r border-darkgreen/15 py-2">Item Lot</th>
              <th className="border-r border-darkgreen/15 p-2">Product Code</th>
              <th className="border-r border-darkgreen/15 py-2">Item Description</th>
              <th className="border-r border-darkgreen/15 py-2">Qty</th>
              <th className="border-r border-darkgreen/15 py-2">Disty</th>
              <th className="border-r border-darkgreen/15 py-2">Cost / unit</th>
              <th className="border-r border-darkgreen/15 py-2">Total Cost</th>
              <th className="border-r border-darkgreen/15 py-2 px-1">Selling Price/unit (VAT INC)</th>
              <th className="border-r border-darkgreen/15 p-2">Total Selling Price (VAT INC)</th>
              <th className="border-r border-darkgreen/15 p-2">Mark Up Value</th>
              <th className={`border-darkgreen/15 p-2 ${showActionColumn ? 'border-r' : ''}`}>Mark-up %</th>
              {showActionColumn && <th className="border-darkgreen/15 p-1 xl:p-2">+/-</th>}
            </tr>
          </thead>

          <tbody>
            {computedItems.map((group, groupIndex) => {
              const isExpanded = expanded[group.rowKey] !== false;
              const subitems = group.computedSubitems || [];
              const isOdd = groupIndex % 2 === 1;
              const rowBgClass = isOdd ? 'bg-neutral-200/35' : 'bg-white';

              // ── COLLAPSED: single blank row, aggregates only ──────────────────
              if (!isExpanded) {
                return (
                  <tr key={group.rowKey} className={`border-t relative ${rowBgClass}`}>
                    {/* Item Lot # + expand toggle */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[11px] xl:text-[13px]">{groupIndex + 1}</span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(group.rowKey)}
                          className="w-5 h-5 flex items-center justify-center text-slate-600 hover:cursor-pointer rounded"
                        >
                          <MdKeyboardArrowRight size={14} />
                        </button>
                      </div>
                    </td>

                    {/* Product Code — same as Item Lot number */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className={`${readonlyTextClass} justify-center text-slate-400`}>
                        Item Lot {groupIndex + 1}
                      </div>
                    </td>

                    {/* Item Description — item count label, with expand+add shortcut */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className="flex items-center gap-1">
                        <div className={`${readonlyTextClass} flex-1 justify-center text-slate-400`}>
                          {subitems.length} item{subitems.length === 1 ? '' : 's'}
                        </div>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              setExpanded((p) => ({ ...p, [group.rowKey]: true }));
                            }}
                            title="Expand to view/edit items"
                            className="shrink-0 w-6 h-6 rounded border border-darkgreen/20 bg-lightgreen/40 text-green-700 hover:bg-green-100 flex items-center justify-center"
                          >
                            <PackagePlus size={14} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Qty — blank */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className={readonlyClass}></div>
                    </td>

                    {/* Disty — blank */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className={readonlyTextClass}></div>
                    </td>

                    {/* Cost/Unit — blank */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className={readonlyClass}></div>
                    </td>

                    {/* Total Cost — GROUP aggregate */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className={readonlyClass}>{peso(group.totalCost)}</div>
                    </td>

                    {/* Selling Price/unit — group aggregate */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className="w-full h-full flex items-center justify-center text-[11px] xl:text-xs font-medium">
                        {peso(group.sellingPricePerUnitVatInc)}
                      </div>
                    </td>

                    {/* Total Selling Price — group aggregate */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className="w-full h-full flex items-center justify-center text-[11px] xl:text-xs font-medium">
                        {peso(group.totalSellingPriceVatInc)}
                      </div>
                    </td>

                    {/* Mark Up Value — group aggregate */}
                    <td className="border-t border-r border-darkgreen/15 px-1">
                      <div className="w-full h-full flex items-center justify-center text-[11px] xl:text-xs font-medium">
                        {peso(group.markupValue)}
                      </div>
                    </td>

                    {/* Markup % — blank */}
                    <td className={`border-t border-darkgreen/15 xl:px-1 ${showActionColumn ? 'border-r' : ''}`}>
                      <div className={readonlyClass}></div>
                    </td>

                    {/* Actions */}
                    {showActionColumn && (
                      <td className="border-t border-darkgreen/15 flex items-center justify-center p-1 xl:py-1.5">
                        <div className="flex flex-col xl:flex-row gap-0.5 xl:gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => onAddGroup()}
                            className="w-5 h-5 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100"
                            title="Add new item lot"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoveSubitem(groupIndex, 0)}
                            className="w-5 h-5 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            title="Remove item"
                          >
                            -
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              }

              // ── EXPANDED: all subitems, fully editable ────────────────────────
              const rowSpanCount = subitems.length || 1;
              const rows = subitems.length > 0 ? subitems : [{}];

              return rows.map((sub, subIndex) => (
                <tr key={sub.rowKey ?? `${group.rowKey}-${subIndex}`} className={`border-t relative ${rowBgClass}`}>
                  {subIndex === 0 && (
                    <td className="border-t border-r border-darkgreen/15 px-1" rowSpan={rowSpanCount}>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[11px] xl:text-[13px]">{groupIndex + 1}</span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(group.rowKey)}
                          className="w-5 h-5 flex items-center justify-center text-slate-600 hover:cursor-pointer rounded"
                        >
                          <MdKeyboardArrowDown size={14} />
                        </button>
                      </div>
                    </td>
                  )}

                  {/* Product Code */}
                  <td className="border-t border-r border-darkgreen/15 px-1">
                    {readOnly ? (
                      <div className={readonlyTextClass}>{blankIfEmpty(sub.productCode)}</div>
                    ) : (
                      <input
                        type="text"
                        value={sub.productCode ?? ''}
                        onChange={(e) => onUpdateSubitem(groupIndex, subIndex, 'productCode', e.target.value)}
                        className={`${inputClass} normal-case placeholder:text-slate-400 py-0.5`}
                        placeholder="Enter product code"
                      />
                    )}
                  </td>

                  {/* Item Description */}
                  <td className="border-t border-r border-darkgreen/15 px-1">
                    {readOnly ? (
                      <div className={readonlyTextClass}>{blankIfEmpty(sub.itemDescription)}</div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <textarea
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = el.scrollHeight + 'px';
                            }
                          }}
                          rows={1}
                          value={sub.itemDescription ?? ''}
                          onChange={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                            onUpdateSubitem(groupIndex, subIndex, 'itemDescription', e.target.value);
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          className={`${inputClass.replace('text-center', 'text-left')} placeholder:text-slate-400 resize-none overflow-hidden leading-snug py-0.5 whitespace-pre-wrap [overflow-wrap:anywhere] transition-[height] duration-150 ease-out`}
                          placeholder="Enter item description"
                        />

                        <button
                          type="button"
                          onClick={() => onAddSubitem(groupIndex, subIndex)}
                          title="Add item to this lot"
                          className="shrink-0 w-6 h-6 rounded border border-darkgreen/20 bg-lightgreen/40 text-green-700 hover:bg-green-100 flex items-center justify-center"
                        >
                          <PackagePlus size={14} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Qty */}
                  <td className="border-t border-r border-darkgreen/15 px-1">
                    {readOnly ? (
                      <div className={readonlyClass}>{peso(sub.qty)}</div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={sub.qty ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          onUpdateSubitem(groupIndex, subIndex, 'qty', value === '' ? '' : String(Math.floor(Number(value))));
                        }}
                        className={`${inputClass} py-0.5`}
                        placeholder="0"
                      />
                    )}
                  </td>

                  {/* Disty */}
                  <td className="border-t border-r border-darkgreen/15 px-1">
                    {readOnly ? (
                      <div className={`${readonlyTextClass} justify-start`}>{blankIfEmpty(sub.disty)}</div>
                    ) : (
                      <input
                        type="text"
                        value={sub.disty ?? ''}
                        onChange={(e) => onUpdateSubitem(groupIndex, subIndex, 'disty', e.target.value)}
                        className={`${inputClass} normal-case placeholder:text-slate-400 py-0.5`}
                        placeholder="Enter disty"
                      />
                    )}
                  </td>

                  {/* Cost / Unit */}
                  <td className="border-t border-r border-darkgreen/15 px-1">
                    {readOnly ? (
                      <div className={readonlyClass}>{peso(sub.costPerUnit)}</div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sub.costPerUnit ?? ''}
                        onChange={(e) => onUpdateSubitem(groupIndex, subIndex, 'costPerUnit', e.target.value)}
                        className={`${inputClass} py-0.5`}
                        placeholder="0.00"
                      />
                    )}
                  </td>

                  {/* Total Cost — per subitem */}
                  <td className="border-t border-r border-darkgreen/15 px-1">
                    <div className={readonlyClass}>{peso(sub.totalCost)}</div>
                  </td>

                  {/* Group aggregates — first row only, spans all subitems */}
                  {subIndex === 0 && (
                    <>
                      <td className="border-t border-r border-darkgreen/15 px-1" rowSpan={rowSpanCount}>
                        <div className="w-full h-full flex items-center justify-center text-[11px] xl:text-xs font-medium">
                          {peso(group.sellingPricePerUnitVatInc)}
                        </div>
                      </td>
                      <td className="border-t border-r border-darkgreen/15 px-1" rowSpan={rowSpanCount}>
                        <div className="w-full h-full flex items-center justify-center text-[11px] xl:text-xs font-medium">
                          {peso(group.totalSellingPriceVatInc)}
                        </div>
                      </td>
                      <td className="border-t border-r border-darkgreen/15 px-1" rowSpan={rowSpanCount}>
                        <div className="w-full h-full flex items-center justify-center text-[11px] xl:text-xs font-medium">
                          {peso(group.markupValue)}
                        </div>
                      </td>
                    </>
                  )}

                  {/* Markup % */}
                  <td className={`border-t border-darkgreen/15 xl:px-1 ${showActionColumn ? 'border-r' : ''}`}>
                    {readOnly ? (
                      <div className={readonlyClass}>{percent(sub.markupPercent)}</div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sub.markupPercent ?? ''}
                        onChange={(e) => onUpdateSubitem(groupIndex, subIndex, 'markupPercent', e.target.value)}
                        className={`${inputClass} py-0.5`}
                        placeholder="0"
                      />
                    )}
                  </td>

                  {/* Actions */}
                  {showActionColumn && (
                    <td className="border-t border-darkgreen/15 flex items-center justify-center p-1 xl:py-1.5">
                      <div className="flex flex-col xl:flex-row gap-0.5 xl:gap-1 justify-center">
                        {subIndex === 0 && (
                          <button
                            type="button"
                            onClick={() => onAddGroup()}
                            className="w-5 h-5 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100"
                            title="Add new item lot"
                          >
                            +
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onRemoveSubitem(groupIndex, subIndex)}
                          className="w-5 h-5 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                          title="Remove item"
                        >
                          -
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ));
            })}
          </tbody>

          <tfoot>
            <tr>
              <td className={`${footerCellClass} rounded-bl-xl`}></td>
              <td className={footerCellClass}></td>
              <td className={`${footerCellClass} text-center`}>TOTAL</td>
              <td className={footerCellClass}></td>
              <td className={footerCellClass}></td>
              <td className={`${footerCellClass} border-r border-darkgreen/15`}></td>
              <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>{peso(totals.ttlCost)}</td>
              <td className={`${footerCellClass} border-r border-darkgreen/15`}></td>
              <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>{peso(totals.ttlRev)}</td>
              <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>{peso(summary.gpValue)}</td>
              <td className={`${footerCellClass} ${showActionColumn ? 'border-r border-darkgreen/15' : 'rounded-br-xl'}`}></td>
              {showActionColumn && <td className={`${footerCellClass} rounded-br-xl`}></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}