import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

// ── Fee label primitives ───────────────────────────────────────────────────
const BASE_FEES   = ["Shipping", "Rebate", "Support Services"];
const CLICK_FEES  = ["A4/A3 MONO CLICK", "A4/LGL COLOR CLICK", "A3 COLOR CLICK"];
const RENTAL_FEE  = ["Rental"];

// ── Labels per contract type ───────────────────────────────────────────────
const LABELS_BY_CONTRACT = {
  "Free Use + per Cartridge":  [...BASE_FEES],
  "Rental + Click Charge":     [...BASE_FEES, ...RENTAL_FEE, ...CLICK_FEES],
  "Free Use + Click Charge":   [...BASE_FEES, ...CLICK_FEES],
  "Rental + per Cartridge":    [...BASE_FEES, ...RENTAL_FEE],
  "Fixed Monthly Only":        [...BASE_FEES, ...RENTAL_FEE],
  "Outright + Click Charge":   [...BASE_FEES, ...CLICK_FEES],
  "Outright + per Cartridge":  [...BASE_FEES],
  "Outright Only (1 year)":    ["Shipping", "Support Services"],
};

// ── Labels that are contract-specific (can be removed when contract changes) 
const CONTRACT_SPECIFIC_LABELS = [...CLICK_FEES, ...RENTAL_FEE];

// ── Labels whose qty is locked to a machine-side value ────────────────────
const CLICK_LABELS = [...CLICK_FEES, ...RENTAL_FEE];

// ── Helpers ────────────────────────────────────────────────────────────────
const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalize = (s) => (s || '').trim().toLowerCase();

const blankRow = () => ({
  id: makeId(),
  label: '',
  cost: 0,
  qty: 0,
  total: 0,
  remarks: '',
  isMachine: false,
  __fixed: false,
});

const getFixedQtyForLabel = (label, monoAnnual = 0, colorAnnual = 0) => {
  const l = normalize(label);
  if (l === "shipping")          return 1;
  if (l === "rebate")            return 1;
  if (l === "support services")  return 12;
  if (l === "rental")            return 12;
  if (l === "a4/a3 mono click")  return monoAnnual;
  if (l === "a4/lgl color click") return colorAnnual;
  if (l === "a3 color click")    return 0;
  return null;
};

const applyFixedQtyIfNeeded = (row, monoAnnual = 0, colorAnnual = 0) => {
  const fixedQty = getFixedQtyForLabel(row.label, monoAnnual, colorAnnual);
  if (fixedQty == null) return row;
  const cost = Number(row.cost) || 0;
  return { ...row, qty: fixedQty, total: cost * fixedQty };
};

const removeInactiveContractSpecificRows = (rows, activeFixedLabels) => {
  const activeSet          = new Set((activeFixedLabels || []).map(normalize));
  const contractSpecificSet = new Set(CONTRACT_SPECIFIC_LABELS.map(normalize));
  return rows.filter((r) => {
    const label = normalize(r.label);
    if (!label) return true;
    return contractSpecificSet.has(label) ? activeSet.has(label) : true;
  });
};

const ensureFixedRows = (rows, fixedLabels, monoAnnual = 0, colorAnnual = 0) => {
  const cleanedRows = removeInactiveContractSpecificRows(rows, fixedLabels);
  const remaining   = [...cleanedRows];

  const fixedRows = fixedLabels.map((fixedLabel) => {
    const idx           = remaining.findIndex(r => normalize(r.label) === normalize(fixedLabel));
    const isClickLabel  = CLICK_LABELS.some(c => normalize(c) === normalize(fixedLabel));

    if (idx >= 0) {
      const existing = remaining.splice(idx, 1)[0];
      return applyFixedQtyIfNeeded(
        { ...existing, label: fixedLabel, __fixed: true, isMachine: isClickLabel },
        monoAnnual, colorAnnual
      );
    }

    return applyFixedQtyIfNeeded({
      id: makeId(),
      label: fixedLabel,
      cost: 0,
      qty: 0,
      total: 0,
      remarks: '',
      isMachine: isClickLabel,
      __fixed: true,
    }, monoAnnual, colorAnnual);
  });

  return [...fixedRows, ...remaining.map(r => ({ ...r, __fixed: false }))];
};

const stripLocalFields = ({ __fixed, ...clean }) => clean;

// Module-level so it's not recreated on every render
const processRow = (r) => {
  const clean = stripLocalFields(r);
  const label = normalize(r.label);
  if (label === "one time charge" || label === "shipping") {
    clean.category = "one-time-fee";
  } else if (label === "support services") {
    clean.category = "yearlyFee";
  } else {
    delete clean.category;
  }
  return clean;
};

// ── Shared class strings ───────────────────────────────────────────────────
const cls = {
  input:
    'w-full capitalize min-w-0 h-8 text-[11px] xl:text-[12px] text-center rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
  readonly:
    'w-full h-8 text-[11px] xl:text-[12px] text-center rounded-sm text-slate-900 font-medium flex items-center justify-center',
  // Left-aligned variants — used in the mobile card view so field values
  // read naturally under their labels instead of sitting centered.
  inputLeft:
    'w-full capitalize min-w-0 h-8 text-[11px] xl:text-[12px] text-left rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
  readonlyLeft:
    'w-full h-8 text-[11px] xl:text-[12px] text-left rounded-sm text-slate-900 font-medium flex items-center justify-start px-2',
};

// ── FeeCard (mobile card) ────────────────────────────────────────────────
function FeeCard({ row, readOnly, isFixed, qtyLocked, fixedQty, canRemove, onUpdate, onAdd, onRemove, fmtNumber }) {
  return (
    <div
      className={[
        'rounded-xl border border-darkgreen/15 shadow-sm p-3 flex flex-col gap-3',
        isFixed ? 'bg-[#F6FDF5]' : 'bg-white',
      ].join(' ')}
    >
      {/* Header: checkbox + add/remove */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isFixed ? (
            <input
              type="checkbox"
              checked={row.isMachine}
              onChange={e => onUpdate(row.id, 'isMachine', e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 accent-green-600 border border-darkgreen/35 focus:ring-0 focus:outline-none cursor-pointer"
            />
          ) : (
            <span className="h-6 px-2 text-[10px] flex items-center justify-center rounded-sm border border-darkgreen/20 bg-slate-100 text-slate-500 select-none">
              Fixed
            </span>
          )}
        </div>

        <div className="flex gap-1">
          <button
            onClick={onAdd}
            disabled={readOnly}
            className={`w-7 h-7 flex items-center justify-center rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100 ${readOnly ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            +
          </button>
          <button
            onClick={() => onRemove(row.id)}
            disabled={!canRemove}
            title={readOnly ? "View only" : isFixed ? "Fixed row" : undefined}
            className={`w-7 h-7 flex items-center justify-center rounded border transition-colors ${
              canRemove
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-30'
            }`}
          >
            -
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Description</label>
        {isFixed ? (
          <div className="h-8 flex items-center text-[12px] font-semibold text-slate-800 px-2 rounded-sm border border-slate-200 bg-white">
            {row.label}
          </div>
        ) : (
          <input
            type="text"
            value={row.label}
            onChange={e => onUpdate(row.id, 'label', e.target.value)}
            placeholder="Shipping, Insurance, etc."
            disabled={readOnly}
            className={`${cls.inputLeft} ${!row.label ? 'border-orange-100' : ''}`}
          />
        )}
      </div>

      {/* Cost / Qty / Total grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Cost</label>
          <input
            type="number"
            value={row.cost === 0 || row.cost === "" ? "" : row.cost}
            placeholder="0"
            onChange={e => onUpdate(row.id, 'cost', e.target.value)}
            disabled={readOnly}
            className={cls.inputLeft}
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Qty</label>
          <input
            type="number"
            value={row.qty === 0 || row.qty === "" ? "" : row.qty}
            placeholder="0"
            onChange={e => onUpdate(row.id, 'qty', e.target.value)}
            disabled={qtyLocked || readOnly}
            title={qtyLocked ? `Fixed qty: ${fixedQty}` : undefined}
            className={`${cls.inputLeft} ${qtyLocked ? 'disabled:bg-lightgreen/5 border-none text-slate-700 cursor-not-allowed' : ''}`}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Total</label>
          <div className={`${cls.readonlyLeft} border border-slate-200 bg-slate-50`}>
            {fmtNumber(row.total)}
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Remarks</label>
        <input
          type="text"
          value={row.remarks}
          onChange={e => onUpdate(row.id, 'remarks', e.target.value)}
          placeholder="Enter remarks"
          disabled={readOnly}
          className={`${cls.inputLeft} normal-case ${readOnly ? 'border-none disabled:bg-lightgreen/5 text-slate-500 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  );
}

// ── MobileTotalFooter ────────────────────────────────────────────────────
// A single totals summary shown once, below all cards — never duplicated
// per card — and pinned to the bottom of the screen while scrolling.
function MobileTotalFooter({ grandTotal, fmtNumber }) {
  return (
    <div className="bottom-0 z-30 -mx-3 mt-1 px-3 pt-3 pb-4 bg-[#D9F2D0] border-t border-darkgreen/20 shadow-[0_-4px_10px_rgba(0,0,0,0.08)] rounded-b-xl">
      <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider">
        <span>Total Fees</span>
        <span className="text-[14px]">{fmtNumber(grandTotal)}</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
const Fees = ({ readOnly }) => {
  const { projectData, setProjectData } = useProjectData();

  const monoAnnual  = (Number(projectData?.yield?.monoAmvpYields?.monthly  || 0)) * 12;
  const colorAnnual = (Number(projectData?.yield?.colorAmvpYields?.monthly || 0)) * 12;

  const contractType    = projectData?.companyInfo?.contractType || "";
  const activeFixedLabels = LABELS_BY_CONTRACT[contractType] ?? null;
  const hasFixedRows    = Array.isArray(activeFixedLabels);

  const buildRows = (source) => {
    const cleaned = removeInactiveContractSpecificRows(source, activeFixedLabels);
    const withFixed = hasFixedRows
      ? ensureFixedRows(cleaned, activeFixedLabels, monoAnnual, colorAnnual)
      : cleaned.map(r => ({ ...r, __fixed: false }));
    return withFixed.map(r => applyFixedQtyIfNeeded(r, monoAnnual, colorAnnual));
  };

  const [rows, setRows] = useState(() => {
    const companyRows  = (projectData.additionalFees?.company  || []).map(f => ({ ...f, isMachine: false }));
    const customerRows = (projectData.additionalFees?.customer || []).map(f => ({ ...f, isMachine: true }));
    const initial      = companyRows.length + customerRows.length > 0
      ? [...companyRows, ...customerRows]
      : [blankRow()];
    return buildRows(initial);
  });

  // Re-sync rows when contract type or annual volumes change
  useEffect(() => {
    setRows(prev => buildRows(prev));
  }, [contractType, monoAnnual, colorAnnual]);

  // Sync rows → projectData
  useEffect(() => {
    const validRows   = rows.filter(r => r.label?.trim());
    const grandTotal  = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    setProjectData(prev => ({
      ...prev,
      additionalFees: {
        company:  validRows.filter(r => !r.isMachine).map(processRow),
        customer: validRows.filter(r =>  r.isMachine).map(processRow),
        total:    grandTotal,
      },
    }));
  }, [rows, setProjectData]);

  // ── Row mutations ──────────────────────────────────────────────────────
  const handleUpdate = (id, field, value) => {
    setRows(prev =>
      prev.map(row => {
        if (row.id !== id) return row;
        if (field === 'remarks' && readOnly) return row;
        if (hasFixedRows && row.__fixed && field === 'label') return row;

        const fixedQty = getFixedQtyForLabel(row.label, monoAnnual, colorAnnual);
        if (field === 'qty' && fixedQty != null) return row;

        const updated = { ...row, [field]: value };
        if (field === 'isMachine') updated.type = value ? 'Customer' : 'Company';

        if (field === 'cost' || field === 'qty') {
          const cost = field === 'cost' ? (value === '' ? 0 : parseFloat(value)) : (parseFloat(row.cost) || 0);
          const qty  = field === 'qty'  ? (value === '' ? 0 : parseFloat(value)) : (parseFloat(row.qty)  || 0);
          updated.cost  = cost;
          updated.qty   = fixedQty != null ? fixedQty : qty;
          updated.total = cost * updated.qty;
        }

        return applyFixedQtyIfNeeded(updated, monoAnnual, colorAnnual);
      })
    );
  };

  const addRow = () => setRows(prev => [...prev, blankRow()]);

  const removeRow = (id) => {
    setRows(prev => {
      const target = prev.find(r => r.id === id);
      if (hasFixedRows && target?.__fixed) return prev;
      const next = prev.filter(r => r.id !== id);
      return next.length > 0 ? next : [blankRow()];
    });
  };

  const grandTotal = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const fmtNumber  = (n) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-hidden rounded-xl shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 bg-lightgreen/5">

      {/* Desktop: table, unchanged */}
      <div className="hidden md:block w-full">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col style={{ width: "4%"  }} />
            <col style={{ width: "32%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "5%"  }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "10%"  }} />
            <col style={{ width: "25%" }} />
          </colgroup>

          <thead>
            <tr className="bg-lightgreen/25 text-[10px] uppercase text-slate-800">
              <th className="border-b border-r border-darkgreen/15 p-1 xl:p-2" />
              <th className="border-b border-r border-darkgreen/15 p-2 font-bold text-left">Description</th>
              <th className="border-b border-r border-darkgreen/15 p-1 xl:p-2 font-bold">Cost</th>
              <th className="border-b border-r border-darkgreen/15 p-1 xl:p-2 font-bold">Qty</th>
              <th className="border-b border-r border-darkgreen/15 p-1 xl:p-2 font-bold">Total</th>
              <th className="border-b border-r border-darkgreen/15 p-1 xl:p-2 font-bold">Actions</th>
              <th className="border-b border-darkgreen/15 p-2 font-bold text-left">Remarks</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(row => {
              const fixedQty   = getFixedQtyForLabel(row.label, monoAnnual, colorAnnual);
              const qtyLocked  = fixedQty != null;
              const isFixed    = hasFixedRows && row.__fixed;
              const canRemove  = !readOnly && !isFixed && rows.length > 1;

              return (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">

                  {/* Checkbox */}
                  <td className="border-b border-r border-darkgreen/15 text-center px-3 py-2">
                    {!isFixed && (
                      <input
                        type="checkbox"
                        checked={row.isMachine}
                        onChange={e => handleUpdate(row.id, 'isMachine', e.target.checked)}
                        disabled={readOnly}
                        className="w-4 h-4 checkboxes accent-green-600 border border-darkgreen/35 focus:ring-0 focus:outline-none cursor-pointer"
                      />
                    )}
                  </td>

                  {/* Description */}
                  <td className="border-b border-r border-darkgreen/15 p-1 bg-[#F6FDF5]/30">
                    {isFixed ? (
                      <div className="h-8 flex items-center text-[11px] xl:text-[12px] font-semibold text-slate-800 px-2">
                        {row.label}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={row.label}
                        onChange={e => handleUpdate(row.id, 'label', e.target.value)}
                        placeholder="Shipping, Insurance, etc."
                        disabled={readOnly}
                        className={`${cls.input} !text-left px-2 ${!row.label ? 'border-orange-100' : ''}`}
                      />
                    )}
                  </td>

                  {/* Cost */}
                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <input
                      type="number"
                      value={row.cost === 0 || row.cost === "" ? "" : row.cost}
                      placeholder="0"
                      onChange={e => handleUpdate(row.id, 'cost', e.target.value)}
                      disabled={readOnly}
                      className={`${cls.input} h-6 text-[10px] px-1 mx-auto block`}
                    />
                  </td>

                  {/* Qty */}
                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <input
                      type="number"
                      value={row.qty === 0 || row.qty === "" ? "" : row.qty}
                      placeholder="0"
                      onChange={e => handleUpdate(row.id, 'qty', e.target.value)}
                      disabled={qtyLocked || readOnly}
                      title={qtyLocked ? `Fixed qty: ${fixedQty}` : undefined}
                      className={`${cls.input} h-6 text-[10px] px-1 mx-auto block ${qtyLocked ? 'disabled:bg-lightgreen/5 border-none text-slate-700 cursor-not-allowed' : ''}`}
                    />
                  </td>

                  {/* Total */}
                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <div className={`${cls.readonly} min-h-[28px]`}>
                      {fmtNumber(row.total)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <div className="flex gap-1 justify-center items-center h-8">
                      <button
                        onClick={addRow}
                        disabled={readOnly}
                        className={`w-6 h-6 flex items-center justify-center rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100 ${readOnly ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >+</button>
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={!canRemove}
                        title={readOnly ? "View only" : isFixed ? "Fixed row" : undefined}
                        className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${
                          canRemove
                            ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                            : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-30'
                        }`}
                      >-</button>
                    </div>
                  </td>

                  {/* Remarks */}
                  <td className="border-b border-darkgreen/15 p-1">
                    <input
                      type="text"
                      value={row.remarks}
                      onChange={e => handleUpdate(row.id, 'remarks', e.target.value)}
                      placeholder="Enter remarks"
                      disabled={readOnly}
                      className={`${cls.input} !text-left px-2 normal-case ${readOnly ? 'border-none disabled:bg-lightgreen/5 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-[#D9F2D0] font-bold text-[12px]">
              <td colSpan="2" className="p-2 border-r border-darkgreen/15 text-center uppercase tracking-wider">
                TOTAL FEES
              </td>
              <td className="border-r border-slate-200" />
              <td className="border-r border-slate-200" />
              <td className="p-2 border-r border-l border-darkgreen/15 text-center">
                {fmtNumber(grandTotal)}
              </td>
              <td colSpan="2" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile: stacked cards + single sticky totals footer */}
      {/* --- Added Header Once Here --- */}
  <div className="bg-[#D9F2D0] md:hidden lg:hidden px-4 py-3 rounded-t-xl border border-darkgreen/20 flex items-center justify-between shadow-sm">
    <span className="text-[15px] font-bold uppercase tracking-wider text-darkgreen">
      Other Fees
    </span>
  </div>
      <div className="md:hidden px-3 pt-2 flex flex-col gap-3">
        {rows.map(row => {
          const fixedQty  = getFixedQtyForLabel(row.label, monoAnnual, colorAnnual);
          const qtyLocked = fixedQty != null;
          const isFixed   = hasFixedRows && row.__fixed;
          const canRemove = !readOnly && !isFixed && rows.length > 1;

          return (
            <FeeCard
              key={row.id}
              row={row}
              readOnly={readOnly}
              isFixed={isFixed}
              qtyLocked={qtyLocked}
              fixedQty={fixedQty}
              canRemove={canRemove}
              onUpdate={handleUpdate}
              onAdd={addRow}
              onRemove={removeRow}
              fmtNumber={fmtNumber}
            />
          );
        })}
        <MobileTotalFooter grandTotal={grandTotal} fmtNumber={fmtNumber} />
      </div>
    </div>
  );
};

export default Fees;