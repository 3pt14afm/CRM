import React from 'react';
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md';
import { peso, blankIfEmpty, percent } from '../../utils/sprf/calculations';
import { PackagePlus } from 'lucide-react';
import { LuTrash } from 'react-icons/lu';

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

// Same as formatCurrencyInput/parseCurrencyInput but with configurable decimal
// precision — used for fields like Markup % that need more than 2 decimals,
// matching SprfItemsTable.jsx (the authoritative calculation source).
const formatNumberInput = (val, maxDecimals = 2) => {
  if (val === '' || val === null || val === undefined) return '';

  let str = String(val).replace(/[^0-9.]/g, '');

  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }

  const finalParts = str.split('.');
  finalParts[0] = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (finalParts.length > 1) {
    finalParts[1] = finalParts[1].slice(0, maxDecimals);
    return `${finalParts[0]}.${finalParts[1]}`;
  }

  return finalParts[0];
};

const truncateDecimals = (val, maxDecimals = 2) => {
  const parts = val.split('.');

  if (parts.length > 1) {
    return `${parts[0]}.${parts[1].slice(0, maxDecimals)}`;
  }

  return val;
};

const parseNumberInput = (val, maxDecimals = 2) => {
  if (val === '' || val === null || val === undefined) return '';

  const clean = String(val).replace(/,/g, '');

  return truncateDecimals(clean, maxDecimals);
};

/**
 * Mobile card list for SPRF item lots (below `md`).
 * Rendered by SprfItemsTable.jsx — shares the same `expanded` state and the
 * same onUpdateSubitem / onAddGroup / onAddSubitem / onRemoveSubitem handlers
 * as the desktop table, so behavior stays in sync between the two views.
 */
export default function SprfItemsCardList({
  computedItems,
  expanded,
  toggleExpand,
  onUpdateSubitem,
  onAddGroup,
  onAddSubitem,
  onRemoveSubitem,
  totals,
  readOnly = false,
}) {
  // One card per item lot (below md)
  return (
    <div className="md:hidden flex flex-col gap-2 border border-[#CAD6C2]/70 p-2 rounded-xl bg-[#B5EBA2]/5 shadow-inner">
        {computedItems.map((group, groupIndex) => {
            const isExpanded = expanded[group.rowKey] !== false;
            const subitems = group.computedSubitems || [];
            const rows = subitems.length > 0 ? subitems : [{}];

            return (
                <div
                    key={group.rowKey}
                    className="rounded-xl border border-[#CAD6C2] bg-white shadow-sm overflow-hidden"
                >
                    {/* Lot header */}
                    <div className="w-full flex items-center justify-between border-b border-[#CAD6C2]/80 bg-lightgreen/30 px-3 py-2">
                        <button
                            type="button"
                            onClick={() => toggleExpand(group.rowKey)}
                            className="flex flex-1 items-center gap-2 text-left"
                        >
                            <span className="text-xs font-bold text-darkgreen">
                            Item Lot {groupIndex + 1}
                            </span>
                            <span className="text-[10px] text-slate-500">
                            {subitems.length} item{subitems.length === 1 ? '' : 's'}
                            </span>
                            {isExpanded ? (
                                <MdKeyboardArrowDown size={16} className="text-slate-600" />
                            ) : (
                                <MdKeyboardArrowRight size={16} className="text-slate-600" />
                            )}
                        </button>

                        {!readOnly && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Pass groupIndex and last subIndex to append item
                                    onAddSubitem(groupIndex, rows.length - 1);
                                }}
                                className="shrink-0 flex items-center justify-center w-6 h-6 ml-2 text-lg font-semibold text-green-700 bg-white/40 hover:bg-white/60 border border-darkgreen/20 rounded"
                                title="Add item to this lot"
                            >
                                <PackagePlus size={16} />
                            </button>
                        )}
                    </div>

                    {/* Lot aggregates */}
                    <div className="grid grid-cols-3 gap-px bg-[#CAD6C2] border-b border-[#CAD6C2]/20 text-[10px] text-center">
                        <div className="bg-white px-2 py-1.5 flex flex-col items-center gap-0.5">
                            <span className="text-slate-400">Total Cost</span>
                            <span className="font-semibold text-[11px]">{peso(group.totalCost)}</span>
                        </div>
                        <div className="bg-white px-2 py-1.5 flex flex-col items-center gap-0.5">
                            <span className="text-slate-400">Total Selling</span>
                            <span className="font-semibold text-[11px]">{peso(group.totalSellingPriceVatInc)}</span>
                        </div>
                        <div className="bg-white px-2 py-1.5 flex flex-col items-center gap-0.5">
                            <span className="text-slate-400">Markup Value</span>
                            <span className="font-semibold text-[11px]">{peso(group.markupValue)}</span>
                        </div>
                    </div>

                    {/* Subitems */}
                    {isExpanded && (
                        <div className="divide-y divide-darkgreen/20">
                            {rows.map((sub, subIndex) => (
                            <div key={sub.rowKey ?? `${group.rowKey}-${subIndex}-card`} 
                                className={`p-3 space-y-2.5 ${subIndex % 2 === 1 ? 'bg-lightgreen/5' : 'bg-white'}`}>
                                <div className="grid grid-cols-3 gap-x-1">
                                    <div className="flex items-start gap-2 col-span-1">
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                                            Product Code
                                            </label>
                                            {readOnly ? (
                                            <div className="text-xs pt-0.5">{blankIfEmpty(sub.productCode)}</div>
                                            ) : (
                                            <input
                                                type="text"
                                                value={sub.productCode ?? ''}
                                                onChange={(e) => onUpdateSubitem(groupIndex, subIndex, 'productCode', e.target.value)}
                                                className="w-full text-xs normal-case border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-gray-300/85"
                                                placeholder="Enter product code"
                                            />
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                                            Item Description
                                        </label>
                                        {readOnly ? (
                                            <div className="text-xs leading-snug pt-0.5">
                                            {blankIfEmpty(sub.itemDescription)}
                                            </div>
                                        ) : (
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
                                            className="w-full text-xs border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent resize-none overflow-hidden leading-snug whitespace-pre-wrap [overflow-wrap:anywhere] transition-[height] duration-150 ease-out placeholder:text-gray-300/85"
                                            placeholder="Enter item description"
                                            />
                                        )}
                                    </div>
                                </div>
                                

                                <div className="grid grid-cols-3 gap-x-1 gap-y-2.5">
                                    <div>
                                        <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                                        Qty
                                        </label>
                                        {readOnly ? (
                                        <div className="text-xs pt-0.5 font-medium">{sub.qty}</div>
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
                                            className="w-full text-xs border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-gray-300/85 [appearance-none] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="0"
                                        />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                                        Disty
                                        </label>
                                        {readOnly ? (
                                        <div className="text-[12px] pt-0.5">{blankIfEmpty(sub.disty)}</div>
                                        ) : (
                                        <input
                                            type="text"
                                            value={sub.disty ?? ''}
                                            onChange={(e) => onUpdateSubitem(groupIndex, subIndex, 'disty', e.target.value)}
                                            className="w-full text-xs normal-case border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-gray-300/85"
                                            placeholder="Enter disty"
                                        />
                                        )}
                                    </div>

                                    
                                    <div>
                                        <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                                        Mark-up %
                                        </label>
                                        {readOnly ? (
                                        <div className="text-[12px] pt-0.5 font-medium">{percent(sub.markupPercent)}</div>
                                        ) : (
                                        <input
                                            type="text"
                                            value={formatNumberInput(sub.markupPercent, 4)}
                                            onChange={(e) => {
                                            const rawValue = parseNumberInput(e.target.value, 4);
                                            onUpdateSubitem(groupIndex, subIndex, 'markupPercent', rawValue);
                                            }}
                                            className="w-full text-xs border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-gray-300/85"
                                            placeholder="0"
                                        />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                                        Cost / Unit
                                        </label>
                                        {readOnly ? (
                                        <div className="text-[12px] pt-0.5 font-medium">{peso(sub.costPerUnit)}</div>
                                        ) : (
                                        <input
                                            type="text"
                                            value={formatCurrencyInput(sub.costPerUnit)}
                                            onChange={(e) => {
                                            const rawValue = parseCurrencyInput(e.target.value);
                                            onUpdateSubitem(groupIndex, subIndex, 'costPerUnit', rawValue);
                                            }}
                                            className="w-full text-xs border-b border-darkgreen/20 focus:border-[#289800] focus:ring-0 outline-none p-1 bg-transparent placeholder:text-gray-300/85"
                                            placeholder="0.00"
                                        />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[9px] uppercase tracking-wide text-slate-400 mb-1">
                                        Total Cost
                                        </label>
                                        <div className="text-xs pt-0.5 font-medium">{peso(sub.totalCost)}</div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end justify-end gap-0.5">
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => onRemoveSubitem(groupIndex, subIndex)}
                                                className="shrink-0 w-6 h-6 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center justify-center leading-none"
                                                title="Remove item"
                                            >
                                                <LuTrash size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                    )}

                    {/* Restored Add Group Button */}
                    {!readOnly && (
                    <div className="border-t border-darkgreen/10 p-2">
                        <button
                        type="button"
                        onClick={() => onAddGroup()}
                        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-green-700 bg-lightgreen/40 rounded-lg py-1.5"
                        >
                        + Add new item lot
                        </button>
                    </div>
                    )}
                </div>
            );
        })}

        {/* Mobile totals */}
        <div className="rounded-xl border border-[#CAD6C2] bg-white shadow px-4 py-3 flex flex-col gap-1.5 text-[11px] font-semibold">
            <div className="flex justify-between">
            <span>Total Cost</span>
            <span>{peso(totals.ttlCost)}</span>
            </div>
            <div className="flex justify-between">
            <span>Total Selling Price</span>
            <span>{peso(totals.ttlRev)}</span>
            </div>
            <div className="flex justify-between">
            <span>Total Markup Value</span>
            <span>{peso(totals.ttlMarkupValue ?? totals.totalMarkupValue)}</span>
            </div>
        </div>
    </div>
  );
}