import React, { useState } from 'react';

const Fees = () => {
  const initialData = [
    { id: 1, label: 'One Time Charge', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
    { id: 2, label: 'Advance Payment', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
    { id: 4, label: 'Monthly Rental', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
    { id: 5, label: 'Click Charge Mono (A4)', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
    { id: 6, label: 'Click Charge CLR (A4)', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
    { id: 7, label: 'Click Charge Mono (A3)', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
    { id: 8, label: 'Click Charge CLR (A3)', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
    { id: 10, label: 'Shipping Cost', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
    { id: 11, label: 'Support Services', cost: 0, qty: 0, total: 0, remarks: '', isStatic: true },
  ];

  const [rows, setRows] = useState(initialData);

  // Standard style classes for consistency
  const inputClass = "w-full h-8 text-[11px] text-center rounded-md border border-slate-200 outline-none focus:border-green-400 bg-white px-1";
  const readonlyClass = "w-full h-8 text-[11px] text-center rounded-md border border-slate-100 bg-slate-50 text-slate-500 font-bold flex items-center justify-center";

  const addRow = () => {
    setRows([...rows, { 
      id: Date.now(), label: '', cost: 0, qty: 0, total: 0, remarks: '', isStatic: false 
    }]);
  };

  const removeRow = (id, isStatic) => {
    if (isStatic) return; 
    setRows(rows.filter(row => row.id !== id));
  };

  const handleUpdate = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        if (field === 'cost' || field === 'qty') {
          updatedRow.total = (parseFloat(updatedRow.cost) || 0) * (parseFloat(updatedRow.qty) || 0);
        }
        return updatedRow;
      }
      return row;
    }));
  };

  const grandTotal = rows.reduce((sum, row) => sum + (row.total || 0), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm mx-4 mb-5 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#F6FDF5] text-[10px] uppercase font-bold text-slate-600">
              <th className="border-b border-r border-slate-200 p-2 w-10">H</th>
              <th className="border-b border-r border-slate-200 p-2 min-w-[180px] text-left">Description</th>
              <th className="border-b border-r border-slate-200 p-2 w-32">Unit Cost</th>
              <th className="border-b border-r border-slate-200 p-2 w-20">Qty</th>
              <th className="border-b border-r border-slate-200 p-2 w-32">Total</th>
              <th className="border-b border-r border-slate-200 p-2 w-20">+/-</th>
              <th className="border-b border-slate-200 p-2 min-w-[150px] text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border-b border-r border-slate-100 text-center">
                  <input type="checkbox" className="w-3 h-3" />
                </td>

                <td className="border-b border-r border-slate-100 p-2 bg-[#F6FDF5]/30">
                  {row.isStatic ? (
                    <span className="text-[11px] font-bold text-slate-700 pl-1">{row.label}</span>
                  ) : (
                    <input 
                      type="text"
                      value={row.label}
                      onChange={(e) => handleUpdate(row.id, 'label', e.target.value)}
                      placeholder="New Item Name"
                      className={`${inputClass} !text-left italic bg-white`}
                    />
                  )}
                </td>

                <td className="border-b border-r border-slate-100 p-1">
                  <input 
                    type="number"
                    value={row.cost}
                    onChange={(e) => handleUpdate(row.id, 'cost', e.target.value)}
                    className={inputClass}
                  />
                </td>

                <td className="border-b border-r border-slate-100 p-1">
                  <input 
                    type="number"
                    value={row.qty}
                    onChange={(e) => handleUpdate(row.id, 'qty', e.target.value)}
                    className={inputClass}
                  />
                </td>

                <td className="border-b border-r border-slate-100 p-1">
                  <div className={readonlyClass}>
                    {row.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </td>

                <td className="border-b border-r border-slate-100 p-1">
                  <div className="flex gap-1 justify-center">
                    <button onClick={addRow} className="w-6 h-6 flex items-center justify-center rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100">+</button>
                    <button 
                      onClick={() => removeRow(row.id, row.isStatic)}
                      disabled={row.isStatic}
                      className={`w-6 h-6 flex items-center justify-center rounded border ${
                        row.isStatic ? "border-slate-100 bg-slate-50 text-slate-300" : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      -
                    </button>
                  </div>
                </td>

                <td className="border-b border-slate-100 p-1">
                  <input 
                    type="text"
                    value={row.remarks}
                    onChange={(e) => handleUpdate(row.id, 'remarks', e.target.value)}
                    placeholder="Remarks..."
                    className={`${inputClass} !text-left px-2`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F6FDF5] font-bold text-[11px] text-slate-800">
              <td colSpan="2" className="p-2 border-r border-slate-200 text-center uppercase">TOTAL</td>
              <td className="border-r border-slate-200"></td>
              <td className="border-r border-slate-200"></td>
              <td className="p-2 border-r border-slate-200 text-center bg-[#F6FDF5]shadow-inner">
                {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default Fees;