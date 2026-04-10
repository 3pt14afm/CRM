import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

const FIXED_FEE_LABELS_FREE_USE = [
  "Shipping",
  "Rebate",
  "Support Services",
];

const FIXED_FEE_LABELS_RENTAL_CLICK = [
  "Shipping",
  "Rebate",
  "Support Services",
  "Rental + Supplies",
  "A4/A3 MONO CLICK",
  "A4/LGL COLOR CLICK",
  "A3 COLOR CLICK",
];

const FIXED_FEE_LABELS_FIX_CLICK = [
  "Shipping",
  "Rebate",
  "Support Services",
  "A4/A3 MONO CLICK",
  "A4/LGL COLOR CLICK",
  "A3 COLOR CLICK",
];

const FIXED_FEE_LABELS_MONTHLY_RENTAL = [
  "Shipping",
  "Rebate",
  "Support Services",
  "Rental + Supplies",
];

const CONTRACT_SPECIFIC_LABELS = [
  "Rental + Supplies",
  "A4/A3 MONO CLICK",
  "A4/LGL COLOR CLICK",
  "A3 COLOR CLICK",
];

const CLICK_LABELS = [
  "A4/A3 MONO CLICK",
  "A4/LGL COLOR CLICK",
  "A3 COLOR CLICK",
];

const makeId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

const normalize = (s) => (s || '').trim().toLowerCase();

const getFixedQtyForLabel = (label, monoAnnual = 0, colorAnnual = 0) => {
  const l = normalize(label);
  // if (l === "one time charge") return 1;
  if (l === "shipping") return 1;
  if (l === "rebate") return 1;
  if (l === "support services") return 12;
  if (l === "rental + supplies") return 12;
  if (l === "a4/a3 mono click") return monoAnnual;
  if (l === "a4/lgl color click") return colorAnnual;
  if (l === "a3 color click") return 0;
  return null;
};

const applyFixedQtyIfNeeded = (row, monoAnnual = 0, colorAnnual = 0) => {
  const fixedQty = getFixedQtyForLabel(row.label, monoAnnual, colorAnnual);
  if (fixedQty == null) return row;
  const nextCost = Number(row.cost) || 0;
  return {
    ...row,
    qty: fixedQty,
    total: nextCost * fixedQty,
  };
};

const removeInactiveContractSpecificRows = (rows, activeFixedLabels) => {
  const activeSet = new Set((activeFixedLabels || []).map(normalize));
  const contractSpecificSet = new Set(CONTRACT_SPECIFIC_LABELS.map(normalize));

  return rows.filter((r) => {
    const label = normalize(r.label);
    if (!label) return true;
    if (contractSpecificSet.has(label)) {
      return activeSet.has(label);
    }
    return true;
  });
};

const ensureFixedRows = (rows, fixedLabels, monoAnnual = 0, colorAnnual = 0) => {
  const cleanedRows = removeInactiveContractSpecificRows(rows, fixedLabels);
  const remaining = [...cleanedRows];

  const fixedRows = fixedLabels.map((fixedLabel) => {
    const idx = remaining.findIndex(r => normalize(r.label) === normalize(fixedLabel));
    
    // Logic: If it's a fixed row but NOT a click label, it defaults to Customer (isMachine: true)
    const isClickLabel = CLICK_LABELS.some(c => normalize(c) === normalize(fixedLabel));
    const defaultIsMachine = !isClickLabel;

    if (idx >= 0) {
      const existing = remaining.splice(idx, 1)[0];
      return applyFixedQtyIfNeeded({ 
        ...existing, 
        label: fixedLabel, 
        __fixed: true,
        isMachine: defaultIsMachine ? true : existing.isMachine 
      }, monoAnnual, colorAnnual);
    }

    return applyFixedQtyIfNeeded({
      id: makeId(),
      label: fixedLabel,
      cost: 0,
      qty: 0,
      total: 0,
      remarks: '',
      isMachine: defaultIsMachine, 
      __fixed: true,
    }, monoAnnual, colorAnnual);
  });

  const nonFixed = remaining.map(r => ({ ...r, __fixed: false }));
  return [...fixedRows, ...nonFixed];
};

const stripLocalFields = (row) => {
  const { __fixed, ...clean } = row;
  return clean;
};

const Fees = ({ readOnly }) => {
  const { projectData, setProjectData } = useProjectData();

  const monoRaw = projectData?.yield?.monoAmvpYields?.monthly ?? "";
  const colorRaw = projectData?.yield?.colorAmvpYields?.monthly ?? "";

  const monoMonthlyNum = Number(monoRaw || 0);
  const colorMonthlyNum = Number(colorRaw || 0);

  const monoAnnual = monoMonthlyNum * 12;
  const colorAnnual = colorMonthlyNum * 12;

  const contractType = projectData?.companyInfo?.contractType || "";
  const isFreeUse = contractType === "Free Use + per Cartridge";
  const isRentalClick = contractType === "Rental + Click Charge";
  const isFixClick = contractType === "Free Use + Click Charge";
  const isMonthlyRental = contractType === "Rental + per Cartridge";

  const activeFixedLabels =
    isFreeUse ? FIXED_FEE_LABELS_FREE_USE :
    isRentalClick ? FIXED_FEE_LABELS_RENTAL_CLICK :
    isFixClick ? FIXED_FEE_LABELS_FIX_CLICK :
    isMonthlyRental ? FIXED_FEE_LABELS_MONTHLY_RENTAL : null;

  const hasFixedRows = Array.isArray(activeFixedLabels);

  const [rows, setRows] = useState(() => {
    const companyRows = (projectData.additionalFees?.company || []).map(f => ({ ...f, isMachine: false }));
    const customerRows = (projectData.additionalFees?.customer || []).map(f => ({ ...f, isMachine: true }));
    const initialRows = [...companyRows, ...customerRows];

    const seeded = initialRows.length > 0 ? initialRows : [blankRow()];
    const cleanedSeeded = removeInactiveContractSpecificRows(seeded, activeFixedLabels);

    const withFixed = hasFixedRows
      ? ensureFixedRows(cleanedSeeded, activeFixedLabels, monoAnnual, colorAnnual)
      : cleanedSeeded.map(r => ({ ...r, __fixed: false }));

    return withFixed.map(r => applyFixedQtyIfNeeded(r, monoAnnual, colorAnnual));
  });

  useEffect(() => {
    setRows(prev => {
      const cleanedPrev = removeInactiveContractSpecificRows(prev, activeFixedLabels);
      const next = hasFixedRows
        ? ensureFixedRows(cleanedPrev, activeFixedLabels, monoAnnual, colorAnnual)
        : cleanedPrev.map(r => ({ ...r, __fixed: false }));

      return next.map(r => applyFixedQtyIfNeeded(r, monoAnnual, colorAnnual));
    });
  }, [hasFixedRows, contractType, monoAnnual, colorAnnual]);

  useEffect(() => {
    const validRows = rows.filter(r => r.label && r.label.trim() !== '');
    const processRow = (r) => {
      const clean = stripLocalFields(r);
      const label = (r.label || '').trim().toLowerCase();

      if (label === "one time charge" || label === "shipping") {
        clean.category = "one-time-fee";
      } else if (label === "support services") {
        clean.category = "yearlyFee";
      } else {
        delete clean.category;
      }
      return clean;
    };

    const customerFees = validRows.filter(r => r.isMachine).map(processRow);
    const companyFees = validRows.filter(r => !r.isMachine).map(processRow);
    const grandTotal = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    setProjectData(prev => ({
      ...prev,
      additionalFees: {
        company: companyFees,
        customer: customerFees,
        total: grandTotal
      }
    }));
  }, [rows, setProjectData]);

  const handleUpdate = (id, field, value) => {
    setRows(prev =>
      prev.map(row => {
        if (row.id !== id) return row;
        if (field === 'remarks' && readOnly) return row;
        if (hasFixedRows && row.__fixed && field === 'label') return row;

        const fixedQty = getFixedQtyForLabel(row.label, monoAnnual, colorAnnual);
        if (field === 'qty' && fixedQty != null) return row;

        const updatedRow = { ...row, [field]: value };
        if (field === 'isMachine') updatedRow.type = value ? 'Customer' : 'Company';

        if (field === 'cost' || field === 'qty') {
          const nextCost = field === 'cost' ? (value === '' ? 0 : parseFloat(value)) : (parseFloat(row.cost) || 0);
          const nextQtyFromInput = field === 'qty' ? (value === '' ? 0 : parseFloat(value)) : (parseFloat(row.qty) || 0);
          const nextQty = fixedQty != null ? fixedQty : nextQtyFromInput;

          updatedRow.cost = nextCost;
          updatedRow.qty = nextQty;
          updatedRow.total = nextCost * nextQty;
        }
        return applyFixedQtyIfNeeded(updatedRow, monoAnnual, colorAnnual);
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

  const inputClass = "w-full capitalize min-w-0 h-8 text-[12px] text-center rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const readonlyClass = "w-full h-8 text-[12px] text-center rounded-sm text-slate-900 font-medium flex items-center justify-center";
  const currentGrandTotal = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  return (
    <div className="flex-1 overflow-hidden rounded-md border border-darkgreen/15 shadow-md bg-lightgreen/5">
      <div className="w-full">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "37%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>

          <thead>
            <tr className="bg-lightgreen/25 text-[10px] uppercase text-slate-800">
              <th className="border-b border-r border-darkgreen/15 p-2"></th>
              <th className="border-b border-r border-darkgreen/15 p-2 font-bold text-left">Description</th>
              <th className="border-b border-r border-darkgreen/15 p-2 font-bold">Cost</th>
              <th className="border-b border-r border-darkgreen/15 p-2 font-bold">Qty</th>
              <th className="border-b border-r border-darkgreen/15 p-2 font-bold">Total</th>
              <th className="border-b border-r border-darkgreen/15 p-2 font-bold">Actions</th>
              <th className="border-b border-darkgreen/15 p-2 font-bold text-left">Remarks</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(row => {
              const fixedQty = getFixedQtyForLabel(row.label, monoAnnual, colorAnnual);
              const qtyLocked = fixedQty != null;
              
              // LOGIC: Show checkbox only if it's NOT a fixed row, OR if it's one of the 3 specific CLICK labels
              const isClickRow = CLICK_LABELS.some(c => normalize(c) === normalize(row.label));
              const showCheckbox = !row.__fixed || isClickRow;

              return (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="border-b border-r border-darkgreen/15 text-center px-3 py-2">
                    {showCheckbox ? (
                      <input 
                        disabled={readOnly}
                        type="checkbox"
                        checked={row.isMachine}
                        onChange={e => handleUpdate(row.id, 'isMachine', e.target.checked)}
                        className="w-4 h-4 checkboxes accent-green-600 border border-darkgreen/35 focus:ring-0 focus:outline-none cursor-pointer"
                      />
                    ) : null}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1 bg-[#F6FDF5]/30">
                    {hasFixedRows && row.__fixed ? (
                      <div className="h-8 flex items-center text-[12px] font-semibold text-slate-800 px-2 text-left">
                        {row.label}
                      </div>
                    ) : (
                      <input disabled={readOnly}
                        type="text"
                        value={row.label}
                        onChange={e => handleUpdate(row.id, 'label', e.target.value)}
                        placeholder="Shipping, Insurance, etc."
                        className={`${inputClass} !text-left bg-white w-full px-2 ${!row.label ? 'border-orange-100' : ''}`}
                      />
                    )}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <input disabled={readOnly}
                      type="number"
                      value={row.cost === 0 || row.cost === "" ? "" : row.cost}
                      placeholder="0"
                      onChange={e => handleUpdate(row.id, 'cost', e.target.value)}
                      className={`${inputClass} h-6 text-[10px] px-1 mx-auto block`}
                    />
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <input 
                      type="number"
                      value={row.qty === 0 || row.qty === "" ? "" : row.qty}
                      placeholder="0"
                      onChange={e => handleUpdate(row.id, 'qty', e.target.value)}
                      disabled={qtyLocked || readOnly}
                      className={`${inputClass} h-6 text-[10px] px-1 mx-auto block ${qtyLocked ? 'disabled:bg-lightgreen/5 border-none text-slate-700 cursor-not-allowed' : ''}`}
                      title={qtyLocked ? `Fixed Qty: ${fixedQty}` : undefined}
                    />
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <div className={`${readonlyClass} flex items-center justify-center min-h-[28px]`}>
                      {(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-1">
                    <div className="flex gap-1 justify-center items-center h-8">
                      <button
                        onClick={addRow}
                        disabled={readOnly}
                        className={`w-6 h-6 flex items-center justify-center rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100 ${readOnly ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={readOnly || (hasFixedRows && row.__fixed) || rows.length <= 1}
                        className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${
                          readOnly
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-30'
                            : (hasFixedRows && row.__fixed) || rows.length <= 1
                              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                        title={readOnly ? "View only" : (hasFixedRows && row.__fixed) ? "Fixed row" : "Remove row"}
                      >
                        -
                      </button>
                    </div>
                  </td>
                  <td className="border-b border-darkgreen/15 p-1">
                    <input
                      type="text"
                      value={row.remarks}
                      onChange={e => handleUpdate(row.id, 'remarks', e.target.value)}
                      placeholder="Enter remarks"
                      disabled={readOnly}
                      className={`${inputClass} !text-left px-2 w-full normal-case ${readOnly ? 'border-none disabled:bg-lightgreen/5 text-slate-500 cursor-not-allowed' : ''}`}
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
              <td className="border-r border-slate-200"></td>
              <td className="border-r border-slate-200"></td>
              <td className="p-2 border-r border-l border-darkgreen/15 text-center bg-[#D9F2D0]">
                {currentGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td colSpan="2" className="bg-[#D9F2D0]"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default Fees;