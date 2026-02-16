import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

const FIXED_FEE_LABELS_FREE_USE = [
  "One Time Charge",
  "Shipping",
  "Rebate",
  "Support Services",
];

const FIXED_FEE_LABELS_RENTAL_CLICK = [
  "One Time Charge",
  "Shipping",
  "Monthly Rental",
  "Support Services",
  "Rebate",
  "A4/A3 MONO CLICK",
  "A4/LGL COLOR CLICK",
  "A3 COLOR CLICK",
];

const FIXED_FEE_LABELS_MONTHLY_RENTAL = [
  "One Time Charge",
  "Shipping",
  "Rebate",
  "Support Services",
  "Monthly Rental",
];

// a safer id generator than Date.now() alone
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
  __fixed: false, // local-only flag
});

const ensureFixedRows = (rows, fixedLabels) => {
  const normalize = (s) => (s || '').trim().toLowerCase();
  const remaining = [...rows];

  const fixedRows = fixedLabels.map((fixedLabel) => {
    const idx = remaining.findIndex(r => normalize(r.label) === normalize(fixedLabel));
    if (idx >= 0) {
      const existing = remaining.splice(idx, 1)[0];
      return { ...existing, label: fixedLabel, __fixed: true };
    }
    return {
      id: makeId(),
      label: fixedLabel,
      cost: 0,
      qty: 0,
      total: 0,
      remarks: '',
      isMachine: false,
      __fixed: true,
    };
  });

  const nonFixed = remaining.map(r => ({ ...r, __fixed: false }));
  return [...fixedRows, ...nonFixed];
};

const stripLocalFields = (row) => {
  const { __fixed, ...clean } = row;
  return clean;
};

const Fees = () => {
  const { projectData, setProjectData } = useProjectData();

  const contractType = projectData?.companyInfo?.contractType || "";
  const isFreeUse = contractType === "Free Use";
  const isRentalClick = contractType === "Rental + Click";
  const isMonthlyRental = contractType === "Monthly Rental";

  const activeFixedLabels =
    isFreeUse
      ? FIXED_FEE_LABELS_FREE_USE
      : isRentalClick
        ? FIXED_FEE_LABELS_RENTAL_CLICK
        : isMonthlyRental
          ? FIXED_FEE_LABELS_MONTHLY_RENTAL
          : null;

  const hasFixedRows = Array.isArray(activeFixedLabels);

  // 1️⃣ Initialize local state
  const [rows, setRows] = useState(() => {
    const companyRows = (projectData.additionalFees?.company || []).map(f => ({ ...f, isMachine: false }));
    const customerRows = (projectData.additionalFees?.customer || []).map(f => ({ ...f, isMachine: true }));
    const initialRows = [...companyRows, ...customerRows];

    const seeded = initialRows.length > 0 ? initialRows : [blankRow()];

    return hasFixedRows
      ? ensureFixedRows(seeded, activeFixedLabels)
      : seeded.map(r => ({ ...r, __fixed: false }));
  });

  // 1.5️⃣ When contract type changes (apply fixed rows for Free Use / Rental+Click / Monthly Rental)
  useEffect(() => {
    setRows(prev => {
      if (hasFixedRows) return ensureFixedRows(prev, activeFixedLabels);
      return prev.map(r => ({ ...r, __fixed: false }));
    });
  }, [hasFixedRows, contractType]); // contractType included so it re-runs when switching between fixed modes

  // 2️⃣ Sync rows with context (logic updated for categories)
  useEffect(() => {
    const validRows = rows.filter(r => r.label && r.label.trim() !== '');

    const processRow = (r) => {
      const clean = stripLocalFields(r);
      const label = (r.label || '').trim().toLowerCase();

      // Categorization logic (unchanged)
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
      },
      totalProjectCost: {
        ...prev.totalProjectCost,
      }
    }));
  }, [rows, setProjectData]);

  // 3️⃣ Update a row
  const handleUpdate = (id, field, value) => {
    setRows(prev =>
      prev.map(row => {
        if (row.id !== id) return row;

        // lock label editing for fixed rows (Free Use / Rental+Click / Monthly Rental)
        if (hasFixedRows && row.__fixed && field === 'label') return row;

        const updatedRow = { ...row, [field]: value };
        if (field === 'isMachine') updatedRow.type = value ? 'Customer' : 'Company';

        if (field === 'cost' || field === 'qty') {
          const nextCost =
            field === 'cost'
              ? (value === '' ? 0 : parseFloat(value))
              : (parseFloat(row.cost) || 0);

          const nextQty =
            field === 'qty'
              ? (value === '' ? 0 : parseFloat(value))
              : (parseFloat(row.qty) || 0);

          updatedRow.total = nextCost * nextQty;
        }

        return updatedRow;
      })
    );
  };

  // 4️⃣ Add / Remove rows
  const addRow = () => setRows(prev => [...prev, blankRow()]);

  const removeRow = (id) => {
    setRows(prev => {
      const target = prev.find(r => r.id === id);
      if (hasFixedRows && target?.__fixed) return prev;

      const next = prev.filter(r => r.id !== id);
      return next.length > 0 ? next : [blankRow()];
    });
  };

  // 5️⃣ Classes
  const inputClass =
    "w-full capitalize min-w-0 h-8 text-[12px] text-center rounded-sm border border-slate-200 outline-none focus:border-green-400 bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const readonlyClass =
    "w-full h-8 text-[12px] text-center rounded-sm border border-slate-100 text-slate-900 font-medium flex items-center justify-center";

  const currentGrandTotal = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  return (
    <div className="overflow-hidden rounded-md border border-darkgreen/15 shadow-md mx-4 mb-5 bg-lightgreen/5">
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
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="border-b border-r border-darkgreen/15 text-center px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.isMachine}
                    onChange={e => handleUpdate(row.id, 'isMachine', e.target.checked)}
                    className="w-4 h-4 accent-green-600"
                  />
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1 bg-[#F6FDF5]/30">
                  {hasFixedRows && row.__fixed ? (
                    <div className="h-8 flex items-center text-[12px] font-semibold text-slate-800 px-2 text-left">
                      {row.label}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={row.label}
                      onChange={e => handleUpdate(row.id, 'label', e.target.value)}
                      placeholder="Shipping, Insurance, etc."
                      className={`${inputClass} !text-left bg-white w-full px-2 ${!row.label ? 'border-orange-100' : ''}`}
                    />
                  )}
                </td>

                <td className="border-b border-r border-darkgreen/15 p-1">
                  <input
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
                    className={`${inputClass} h-6 text-[10px] px-1 mx-auto block`}
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
                      className="w-6 h-6 flex items-center justify-center rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={(hasFixedRows && row.__fixed) || rows.length <= 1}
                      className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${
                        (hasFixedRows && row.__fixed) || rows.length <= 1
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                      title={(hasFixedRows && row.__fixed) ? "Fixed row" : "Remove row"}
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
                    placeholder="Notes..."
                    className={`${inputClass} !text-left px-2 w-full`}
                  />
                </td>
              </tr>
            ))}
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
