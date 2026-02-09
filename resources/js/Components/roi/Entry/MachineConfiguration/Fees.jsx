import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

const Fees = () => {
  const { projectData, setProjectData } = useProjectData();

  // 1️⃣ Initialize local state
  const [rows, setRows] = useState(() => {
    const companyRows = (projectData.additionalFees?.company || []).map(f => ({ ...f, isMachine: false }));
    const customerRows = (projectData.additionalFees?.customer || []).map(f => ({ ...f, isMachine: true }));
    const initialRows = [...companyRows, ...customerRows];
    return initialRows.length > 0 ? initialRows : [{ id: Date.now(), label: '', cost: 0, qty: 0, total: 0, remarks: '', isMachine: false }];
  });

  // 2️⃣ Sync rows with context (only valid rows with labels)
  useEffect(() => {
    const validRows = rows.filter(r => r.label && r.label.trim() !== '');
    const customerFees = validRows.filter(r => r.isMachine);
    const companyFees = validRows.filter(r => !r.isMachine);
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
        grandTotalCost: grandTotal
      }
    }));
  }, [rows]);

  // 3️⃣ Update a row
  const handleUpdate = (id, field, value) => {
    setRows(prev =>
      prev.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };

          // Assign type for context
          if (field === 'isMachine') updatedRow.type = value ? 'Customer' : 'Company';

          // Update total when cost or qty changes
          if (field === 'cost' || field === 'qty') {
            const nextCost =
              field === 'cost' ? (value === '' ? 0 : parseFloat(value)) : (parseFloat(row.cost) || 0);

            const nextQty =
              field === 'qty' ? (value === '' ? 0 : parseFloat(value)) : (parseFloat(row.qty) || 0);

            updatedRow.total = nextCost * nextQty;
          }

          return updatedRow;
        }
        return row;
      })
    );
  };

  // 4️⃣ Add / Remove rows
  const addRow = () => setRows(prev => [...prev, { id: Date.now(), label: '', cost: 0, qty: 0, total: 0, remarks: '', isMachine: false }]);
  const removeRow = id => setRows(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));

  // 5️⃣ Classes
  const inputClass = "w-full min-w-0 h-8 text-[12px] text-center rounded-md border border-slate-200 outline-none focus:border-green-400 bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const readonlyClass = "w-full h-8 text-[12px] text-center rounded-md border border-slate-100 bg-slate-50 text-slate-500 font-bold flex items-center justify-center";

  const currentGrandTotal = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);


  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm mx-4 mb-5 bg-white">
      <div className="w-full">
        <table className="w-full table-fixed border-separate border-spacing-0">
           <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "6%" }} /> {/* actions */}
            <col style={{ width: "20%" }} /> {/* remarks */}
          </colgroup>
          <thead>
            <tr className="bg-slate-100 text-[10px] uppercase text-slate-600">
              <th className="border-b border-r border-slate-100 p-2 font-semibold"></th>
              <th className="border-b border-r border-slate-100 p-2 font-semibold text-left">Description</th>
              <th className="border-b border-r border-slate-100 p-2 font-semibold">Cost</th>
              <th className="border-b border-r border-slate-100 p-2 font-semibold">Qty</th>
              <th className="border-b border-r border-slate-100 p-2 font-semibold">Total</th>
              <th className="border-b border-r border-slate-100 p-2 font-semibold">Actions</th>
              <th className="border-b border-slate-100 p-2 font-semibold text-left">Remarks</th>
            </tr>
          </thead>

          {/* 7️⃣ Render all rows in order */}
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                {/* Checkbox */}
                <td className="border-b border-r border-slate-100 text-center px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.isMachine}
                    onChange={e => handleUpdate(row.id, 'isMachine', e.target.checked)}
                    className=" w-4 h-4 accent-green-600"
                  />
                </td>

                {/* Label */}
                <td className="border-b border-r border-slate-100 p-2 bg-[#F6FDF5]/30  ">
                  <input
                    type="text"
                    value={row.label}
                    onChange={e => handleUpdate(row.id, 'label', e.target.value)}
                    placeholder="Shipping, Insurance, etc."
                    className={`${inputClass} !text-left bg-white w-full px-2 ${!row.label ? 'border-orange-100' : ''}`}
                  />
                </td>

                {/* Cost, Qty, Total */}
                <td className="border-b border-r border-slate-100 p-1 ">
                  <input
                    type="number"
                    value={row.cost === 0 || row.cost === "" ? "" : row.cost}
                    placeholder="0"
                    onChange={e => handleUpdate(row.id, 'cost', e.target.value)}
                    className={`${inputClass} h-6 text-[10px] px-1 mx-auto block`}
                  />
                </td>
                <td className="border-b border-r border-slate-100 p-1 ">
                  <input
                    type="number"
                    value={row.qty === 0 || row.qty === "" ? "" : row.qty}
                    placeholder="0"
                    onChange={e => handleUpdate(row.id, 'qty', e.target.value)}
                    className={`${inputClass} h-6 text-[10px] px-1 mx-auto block`}
                  />

                </td>
                <td className="border-b border-r border-slate-100 p-2 ">
                  <div className={`${readonlyClass} flex items-center justify-center min-h-[28px]`}>
                    {(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>

                {/* Actions */}
                <td className="border-b border-r border-slate-100 p-1">
                  <div className="flex gap-1 justify-center items-center h-8">
                    <button onClick={addRow} className="w-6 h-6 flex items-center justify-center rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100">+</button>
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1}
                      className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${
                        rows.length <= 1
                          ? 'border-slate-100 bg-slate-50 text-slate-300'
                          : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >-</button>
                  </div>
                </td>

                {/* Remarks */}
                <td className="border-b border-slate-100 p-2">
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

          {/* 8️⃣ Footer */}
          <tfoot>
            <tr className="bg-[#F6FDF5] font-bold text-[11px]">
              <td colSpan="2" className="p-3 border-r border-slate-200 text-center uppercase tracking-wider">TOTAL FEES</td>
              <td className="border-r border-slate-200"></td>
              <td className="border-r border-slate-200"></td>
              <td className="p-3 border-r border-slate-200 text-center bg-[#F6FDF5]">
                {currentGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td colSpan="2" className="bg-white"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default Fees;
