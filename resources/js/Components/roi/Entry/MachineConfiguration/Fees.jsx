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
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
            {/* Checkbox Column - Added px-3 for consistent spacing */}
            <td className="border-b border-r border-slate-100 text-center px-3 py-2">
              <input type="checkbox" className="w-3 h-3 accent-green-600" />
            </td>

            {/* Label Column - Standardized p-2 */}
            <td className="border-b border-r border-slate-100 p-2 bg-[#F6FDF5]/30 max-w-[200px]">
              {row.isStatic ? (
                <span className="text-[11px] font-bold text-slate-700 block px-1">{row.label}</span>
              ) : (
                <input 
                  type="text"
                  value={row.label}
                  onChange={(e) => handleUpdate(row.id, 'label', e.target.value)}
                  placeholder="New Item Name"
                  className={`${inputClass} !text-left italic bg-white w-full px-2`}
                />
              )}
            </td>

              {/* COST COLUMN */}
          <td className="border-b border-r border-slate-100 p-1 w-28">
            <input 
              type="number"
              value={row.cost}
              onChange={(e) => handleUpdate(row.id, 'cost', e.target.value)}
              /* Controlled width (w-16), shorter height (h-6), and smaller font */
              className={`${inputClass} w-16 h-6 text-[10px] px-1 mx-auto block`}
            />
          </td>

          {/* QTY COLUMN */}
          <td className="border-b border-r border-slate-100 p-1 w-14">
            <input 
              type="number"
              value={row.qty}
              onChange={(e) => handleUpdate(row.id, 'qty', e.target.value)}
              /* Even narrower width (w-10) for small quantity numbers */
              className={`${inputClass} w-10 h-6 text-[10px] px-1 mx-auto block`}
            />
          </td>

            {/* Total Column - Vertical alignment fix */}
            <td className="border-b border-r border-slate-100 p-2 w-20">
              <div className={`${readonlyClass} flex items-center justify-center min-h-[28px]`}>
                {row.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
            </td>

            {/* Actions Column */}
            <td className="border-b border-r border-slate-100 p-2">
              <div className="flex gap-1.5 justify-center">
                <button onClick={addRow} className="w-7 h-7 flex items-center justify-center rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors">+</button>
                <button 
                  onClick={() => removeRow(row.id, row.isStatic)}
                  disabled={row.isStatic}
                  className={`w-7 h-7 flex items-center justify-center rounded border transition-colors ${
                    row.isStatic ? "border-slate-100 bg-slate-50 text-slate-300" : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  -
                </button>
              </div>
            </td>

            {/* Remarks Column */}
            <td className="border-b border-slate-100 p-2">
              <input 
                type="text"
                value={row.remarks}
                onChange={(e) => handleUpdate(row.id, 'remarks', e.target.value)}
                placeholder="Remarks..."
                className={`${inputClass} !text-left px-2 w-full`}
              />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-[#F6FDF5] font-bold text-[11px] text-slate-800">
          <td colSpan="2" className="p-3 border-r border-slate-200 text-center uppercase tracking-wider">TOTAL</td>
          <td className="border-r border-slate-200"></td>
          <td className="border-r border-slate-200"></td>
          <td className="p-3 border-r border-slate-200 text-center bg-[#F6FDF5] shadow-inner">
            {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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