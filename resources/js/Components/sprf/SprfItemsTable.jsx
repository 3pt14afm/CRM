import React, { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { MdSubdirectoryArrowRight, MdKeyboardArrowDown, MdKeyboardArrowRight, MdOutlineDelete } from 'react-icons/md';
import {
  peso,
  blankIfEmpty,
  percent,
  getChildSums,
  getGroupUnitSums,
  getParentIndexForRow,
} from '../../utils/sprf/calculations';

export default function SprfItemsTable({
  items,
  computedItems,
  onUpdateItem,
  onAddItemRow,
  onAddBundleItemRow,
  onRemoveItemRow,
  totals,
  readOnly = false,
}) {
  const showActionColumn = !readOnly;

  const [collapsedParents, setCollapsedParents] = useState({});
  const toggleParent = (key) => setCollapsedParents((p) => ({ ...p, [key]: !p[key] }));

  const inputClass =
    'w-full min-w-0 h-8 text-[11px] xl:text-xs text-center rounded-sm border-0 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-transparent px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none hover:border-[#28980080]';

  // bundle-specific smaller input and readonly sizes
  const bundleInputClass =
    'w-full min-w-0 h-7 text-[11px] xl:text-xs text-center rounded-sm bg-transparent px-2 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none hover:border-[#28980080]';
  const bundleInputLeftClass = bundleInputClass.replace('text-center', 'text-center');

  const readonlyClass =
    'w-full h-8 text-[11px] xl:text-xs text-center px-1 flex items-center justify-end font-medium';
  const readonlyClassBundle = 'w-full h-6 text-[11px] xl:text-xs text-center px-1 flex items-center justify-end';

  const readonlyTextClass =
    'w-full min-w-0 h-8 text-xs rounded-sm px-1 flex items-center';
  const readonlyTextClassBundle = 'w-full min-w-0 h-6 text-xs rounded-sm px-1 flex items-center';

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
              <th className="border-r border-darkgreen/15 py-2 px-1">
                Selling Price/unit (VAT INC)
              </th>
              <th className="border-r border-darkgreen/15 p-2">
                Total Selling Price (VAT INC)
              </th>
              <th className="border-r border-darkgreen/15 p-2">Mark Up Value</th>

              <th
                className={`border-darkgreen/15 p-2 ${
                  showActionColumn ? 'border-r' : ''
                }`}
              >
                Mark-up %
              </th>

              {showActionColumn && (
                <th className="border-darkgreen/15 p-1 xl:p-2">+/-</th>
              )}
            </tr>
          </thead>

          <tbody>
            {computedItems.map((row, index) => {
              const item = items[index] ?? {};
              const isBundleRow = item.rowType === 'bundle';
              // compute visible row number (counts only non-bundle rows)
              const rowNumber = computedItems
                .slice(0, index + 1)
                .filter((itemRow) => itemRow?.rowType !== 'bundle').length;

              // determine parent index (parent for bundles, self for parent rows)
              let parentIndex = index;
              if (isBundleRow) {
                let p = index - 1;
                while (p >= 0 && computedItems[p]?.rowType === 'bundle') p -= 1;
                parentIndex = p >= 0 ? p : index;
              }

              // determine parent key for bundle rows (previous non-bundle row)
              let parentKey;
              if (isBundleRow) {
                let p = index - 1;
                while (p >= 0 && computedItems[p]?.rowType === 'bundle') p--;
                parentKey = items[p]?.rowKey ?? `item-${p}`;
              } else {
                parentKey = item.rowKey ?? `item-${index}`;
              }

              // whether this parent has bundle children directly after it
              const hasBundles = computedItems[parentIndex + 1]?.rowType === 'bundle';

              // hide bundle rows when their parent is collapsed
              if (isBundleRow && collapsedParents[parentKey]) return null;

              // compute parent parity for row background (parent + its bundles share same bg)
              let parentIndexForParity = parentIndex;
              const parentRowNumber = computedItems
                .slice(0, parentIndexForParity + 1)
                .filter((itemRow) => itemRow?.rowType !== 'bundle').length;
              const isOddParent = parentRowNumber % 2 === 1;
              const rowBgClass = isOddParent ? 'bg-neutral-200/35' : 'bg-white';

              return (
              <tr
                key={item.rowKey ?? `item-${index}`}
                className={`border-t relative transition-all duration-100 ${rowBgClass}`}
              >
                <td className={`border-t border-darkgreen/15 ${isBundleRow ? 'p-0 border-t-0' : 'p-1'}`}>
                  <div
                    className={`w-full h-full flex items-stretch ${
                      isBundleRow
                        ? 'justify-start pl-10 text-[10px] font-semibold uppercase text-slate-400'
                        : 'justify-center text-[11px] xl:text-[13px]'
                    }`}
                  >
                    {isBundleRow ? (
                      <span className="shrink-0 h-9 w-6 flex items-center justify-center pl-1 text-slate-400"></span>
                    ) : (
                      <div className="flex items-center gap-1 justify-center">
                        <div className="text-[11px] xl:text-[13px] pl-2">{rowNumber}</div>

                        {hasBundles && (
                          <button
                            type="button"
                            onClick={() => toggleParent(parentKey)}
                            className="w-3 h-6 flex items-center justify-end text-slate-600 hover:cursor-pointer rounded"
                            aria-label={collapsedParents[parentKey] ? 'Expand bundles' : 'Collapse bundles'}
                          >
                            {collapsedParents[parentKey] ? (
                              <MdKeyboardArrowRight size={14} />
                            ) : (
                              <MdKeyboardArrowDown size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                <td className={`border-t border-darkgreen/15 ${isBundleRow ? 'py-0.1 px-1 border-r' : 'p-1 border-r'}`}>
                  {readOnly ? (
                    <div className={`${isBundleRow ? readonlyTextClassBundle + ' pl-4' : readonlyTextClass}`}>
                      {blankIfEmpty(item?.productCode)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={item.productCode}
                      onChange={(e) => onUpdateItem(index, 'productCode', e.target.value)}
                      className={`${isBundleRow ? bundleInputClass : inputClass} normal-case placeholder:text-slate-400`}
                      placeholder="Enter product code"
                    />
                  )}
                </td>

                <td className={`border-t border-r border-darkgreen/15 ${isBundleRow ? 'py-0.1 px-1' : 'p-1'}`}>
                  {readOnly ? (
                    <div className={`${isBundleRow ? readonlyTextClassBundle + ' pl-5 text-slate-600' : readonlyTextClass}`}>
                      {isBundleRow && blankIfEmpty(item?.itemDescription) ? '' : blankIfEmpty(item?.itemDescription)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {/* Icon moved to first column for bundle rows */}

                      <input
                        type="text"
                        value={item.itemDescription}
                        onChange={(e) => onUpdateItem(index, 'itemDescription', e.target.value)}
                        className={`${isBundleRow ? bundleInputLeftClass : inputClass} normal-case text-left placeholder:text-slate-400`}
                        placeholder="Enter item description"
                      />

                      {!isBundleRow && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddBundleItemRow(index);
                            const key = parentKey ?? `item-${index}`;
                            setCollapsedParents((p) => ({ ...p, [key]: false }));
                          }}
                          title="Add bundled item"
                          className="shrink-0 w-6 h-6 rounded border border-darkgreen/20 bg-lightgreen/40 text-green-700 hover:bg-green-100 flex items-center justify-center"
                        >
                          <PackagePlus size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </td>

                <td className={`border-t border-r border-darkgreen/15 ${isBundleRow ? 'py-0.1 px-1' : 'p-1'}`}>
                  {readOnly ? (
                    <div className={isBundleRow ? readonlyClassBundle : readonlyClass}>{peso(item?.qty)}</div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.qty}
                      onChange={(e) => {
                        const value = e.target.value;
                        onUpdateItem(
                          index,
                          'qty',
                          value === '' ? '' : String(Math.floor(Number(value)))
                        );
                      }}
                      className={`${isBundleRow ? bundleInputClass : inputClass}`}
                      placeholder="0"
                    />
                  )}
                </td>

                <td className={`border-t border-r border-darkgreen/15 ${isBundleRow ? 'py-0.1 px-1' : 'p-1'}`}>
                  {readOnly ? (
                    <div className={`${isBundleRow ? readonlyTextClassBundle : readonlyTextClass} justify-start`}>
                      {blankIfEmpty(item?.disty)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={item.disty}
                      onChange={(e) => onUpdateItem(index, 'disty', e.target.value)}
                      className={`${isBundleRow ? bundleInputClass : inputClass} normal-case placeholder:text-slate-400`}
                      placeholder="Enter disty"
                    />
                  )}
                </td>

                <td className={`border-t border-r border-darkgreen/15 ${isBundleRow ? 'py-0.1 px-1' : 'p-1'}`}>
                  {readOnly ? (
                    <div className={isBundleRow ? readonlyClassBundle : readonlyClass}>{peso(item?.costPerUnit)}</div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.costPerUnit}
                      onChange={(e) => onUpdateItem(index, 'costPerUnit', e.target.value)}
                      className={`${isBundleRow ? bundleInputClass : inputClass}`}
                      placeholder="0.00"
                    />
                  )}
                </td>

                <td className={`border-t border-r border-darkgreen/15 ${isBundleRow ? 'py-0.1 px-1' : 'p-1'}`}>
                  <div className={isBundleRow ? readonlyClassBundle : readonlyClass}>
                    {peso(row.totalCost)}
                  </div>
                </td>

                <td className={`border-t border-r border-darkgreen/15 ${isBundleRow ? 'py-0.1 px-1' : 'p-1'}`}>
                  <div className={isBundleRow ? readonlyClassBundle : readonlyClass}>
                    {(() => {
                      if (isBundleRow) return '';
                      const { sumCostPerUnit, sumMarkupPerUnit } = getGroupUnitSums(computedItems, items, parentIndex);
                      const finalSellingPerUnit = Number(sumCostPerUnit || 0) + Number(sumMarkupPerUnit || 0);
                      return peso(finalSellingPerUnit);
                    })()}
                  </div>
                </td>

                <td className={`border-t border-r border-darkgreen/15 p-1`}>
                  <div className={isBundleRow ? readonlyClassBundle : readonlyClass}>
                    {(() => {
                      if (isBundleRow) return '';
                      const { sumCostPerUnit, sumMarkupPerUnit } = getGroupUnitSums(computedItems, items, parentIndex);
                      const finalSellingPerUnit = Number(sumCostPerUnit || 0) + Number(sumMarkupPerUnit || 0);
                      const qty = Number(item.qty || 0);
                      return peso(finalSellingPerUnit * qty);
                    })()}
                  </div>
                </td>

                <td className={`border-t border-r border-darkgreen/15 p-1`}>
                  <div className={isBundleRow ? readonlyClassBundle : readonlyClass}>
                    {(() => {
                      if (isBundleRow) return '';
                      const { sumMarkupPerUnit } = getGroupUnitSums(computedItems, items, parentIndex);
                      const qty = Number(item.qty || 0);
                      return peso(Number(sumMarkupPerUnit || 0) * qty);
                    })()}
                  </div>
                </td>

                <td
                  className={`border-t border-darkgreen/15 xl:p-1 ${
                    showActionColumn ? 'border-r' : ''
                  }`}
                >
                  {readOnly ? (
                    <div className={isBundleRow ? readonlyClassBundle : readonlyClass}>{percent(row.markupPercent)}</div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.markupPercent}
                      onChange={(e) => onUpdateItem(index, 'markupPercent', e.target.value)}
                      className={`${isBundleRow ? bundleInputClass : inputClass}`}
                      placeholder="0"
                    />
                  )}
                </td>

                {showActionColumn && (
                  <td className={`border-t border-darkgreen/15 flex items-center justify-center ${isBundleRow ? 'p-2' : 'p-1 xl:py-2'}`}>
                    {!isBundleRow ? (
                      <div className="flex flex-col xl:flex-row gap-0.5 xl:gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => onAddItemRow(index)}
                          className="w-5 h-5 xl:w-6 xl:h-6 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveItemRow(index)}
                          className="w-5 h-5 xl:w-6 xl:h-6 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        >
                          -
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => onRemoveItemRow(index)}
                          className="w-4 h-4 xl:w-5 xl:h-5 flex items-center justify-center rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                          title="Remove bundled item"
                        >
                          <MdOutlineDelete className="text-[10px] md:text-[11px] lg:text-xs xl:text-[13px]" />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
              );
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
              <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>
                {peso(totals.ttlCost)}
              </td>
              <td className={`${footerCellClass} border-r border-darkgreen/15`}></td>
              <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>
                {peso(totals.ttlRev)}
              </td>
              <td className={`${footerCellClass} border-r border-darkgreen/15`}></td>

              <td
                className={`${footerCellClass} ${
                  showActionColumn
                    ? 'border-r border-darkgreen/15'
                    : 'rounded-br-xl'
                }`}
              ></td>

              {showActionColumn && (
                <td className={`${footerCellClass} rounded-br-xl`}></td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
