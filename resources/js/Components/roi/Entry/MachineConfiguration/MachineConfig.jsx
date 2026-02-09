import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachineConfig() {
  const { setProjectData, projectData } = useProjectData();

  // Initialize rows from context or default
  const [rows, setRows] = useState(() => {
    const { machine = [], consumable = [] } = projectData.machineConfiguration || {};
    const combined = [...machine, ...consumable];
    return combined.length > 0 ? combined : [{
      id: Date.now(),
      sku: '',
      cost: '',
      qty: '',
      yields: '',
      price: '',
      remarks: '',
      type: 'consumable'
    }];
  });

  // Row calculations
  const getRowCalculations = (row) => {
    const cost = parseFloat(row.cost) || 0;
    const qty = parseFloat(row.qty) || 0;
    const yields = parseFloat(row.yields) || 0;
    const price = parseFloat(row.price) || 0;

    return {
      totalCost: cost * qty,
      costCpp: yields > 0 ? cost / yields : 0,
      totalSell: price * qty,
      sellCpp: yields > 0 ? price / yields : 0,
    };
  };

  // Totals for table footer
  const computeTotals = (rows) => rows.reduce((acc, r) => {
    const calcs = getRowCalculations(r);
    acc.unitCost += parseFloat(r.cost) || 0;
    acc.qty += parseFloat(r.qty) || 0;
    acc.totalCost += calcs.totalCost;
    acc.yields += parseFloat(r.yields) || 0;
    acc.costCpp += calcs.costCpp;
    acc.sellingPrice += parseFloat(r.price) || 0;
    acc.totalSell += calcs.totalSell;
    acc.sellCpp += calcs.sellCpp;
    return acc;
  }, { unitCost: 0, qty: 0, totalCost: 0, yields: 0, costCpp: 0, sellingPrice: 0, totalSell: 0, sellCpp: 0 });

  // Handle input changes (update local rows only)
  const handleInputChange = (id, field, value) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === id) {
          if (field === 'isMachine') return { ...row, type: value ? 'machine' : 'consumable' };
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  // Add / Remove row
  const addRow = () => setRows([...rows, { id: Date.now(), sku: '', cost: '', qty: '', yields: '', price: '', remarks: '', type: 'consumable' }]);
  const removeRow = (id) => { if (rows.length > 1) setRows(rows.filter(r => r.id !== id)) };

  // Format numbers
  const formatNum = (num) => (Number(num) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Live update context whenever rows change
 // Live update context whenever rows change
        useEffect(() => {
        // Only include rows that have a SKU
        const machines = rows.filter(r => r.type === 'machine' && r.sku?.trim() !== '');
        const consumables = rows.filter(r => r.type === 'consumable' && r.sku?.trim() !== '');
        
        const totalsObj = computeTotals(rows);

        setProjectData(prev => ({
            ...prev,
            machineConfiguration: { machine: machines, consumable: consumables, totals: totalsObj }
        }));
        }, [rows]);


  const inputClass = "w-full min-w-0 h-8 text-[13px] text-center rounded-md border border-slate-200 outline-none focus:border-green-400 bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const readonlyClass = "w-full h-8 text-[13px] text-center px-1 flex items-center justify-center";
  const footerCellClass ="bg-[#F6FDF5] p-2 text-[12px] font-bold text-center ";
  const tableTotals = computeTotals(rows);

  return (
    <div className="mx-10 mb-10">
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
        <div className="bg-[#D9F2D0] py-2 text-center border-b border-slate-200">
          <h2 className="text-[14px] font-bold tracking-wider uppercase">Machine Configuration</h2>
        </div>
        <div className="w-full">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
              {/* remaining columns can share what's left */}
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "16%" }} /> {/* remarks */}
            </colgroup>
            <thead>
              <tr className="bg-[#F6FDF5] text-[11px] uppercase font-bold text-black">
                <th className="border-b border-r border-slate-200 p-2">H</th>
                <th className="border-b border-r border-slate-200 p-2">Item SKU</th>
                <th className="border-b border-r border-slate-200 p-2 ">Unit Cost</th>
                <th className="border-b border-r border-slate-200 p-2 ">Qty</th>
                <th className="border-b border-r border-slate-200 p-2 ">Total Cost</th>
                <th className="border-b border-r border-slate-200 p-2 ">Yields</th>
                <th className="border-b border-r border-slate-200 p-2 ">Cost CPP</th>
                <th className="border-b border-r border-slate-200 p-2 ">Selling Price</th>
                <th className="border-b border-r border-slate-200 p-2 ">Total Sell</th>
                <th className="border-b border-r border-slate-200 p-2 ">Sell CPP</th>
                <th className="border-b border-r border-slate-200 p-2 ">+/-</th>
                <th className="border-b border-slate-200 p-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const calcs = getRowCalculations(row);
                return (
                  <tr key={row.id} className='border-b'>
                    <td className="border-r border-slate-100 text-center">
                      <input type="checkbox" className="w-4 h-4 accent-green-600 cursor-pointer"
                        checked={row.type === 'machine'}
                        onChange={e => handleInputChange(row.id, 'isMachine', e.target.checked)} />
                    </td>
                    <td className="border-r border-slate-100 p-1">
                      <input type="text" value={row.sku} onChange={e => handleInputChange(row.id, 'sku', e.target.value)} className={`${inputClass} ${!row.sku ? 'border-orange-200' : ''}`} placeholder="SKU-XXX" />
                    </td>
                    <td className="border-r border-slate-100 p-1"><input type="number" value={row.cost} onChange={e => handleInputChange(row.id, 'cost', e.target.value)} className={inputClass} placeholder="0" /></td>
                    <td className="border-r border-slate-100 p-1"><input type="number" value={row.qty} onChange={e => handleInputChange(row.id, 'qty', e.target.value)} className={inputClass} placeholder="0" /></td>
                    <td className="border-r border-slate-100 p-1"><div className={readonlyClass}>{formatNum(calcs.totalCost)}</div></td>
                    <td className="border-r border-slate-100 p-1"><input type="number" value={row.yields} onChange={e => handleInputChange(row.id, 'yields', e.target.value)} className={inputClass} placeholder="0" /></td>
                    <td className="border-r border-slate-100 p-1"><div className={readonlyClass}>{formatNum(calcs.costCpp)}</div></td>
                    <td className="border-r border-slate-100 p-1"><input type="number" value={row.price} onChange={e => handleInputChange(row.id, 'price', e.target.value)} className={inputClass} placeholder="0" /></td>
                    <td className="border-r border-slate-100 p-1"><div className={readonlyClass}>{formatNum(calcs.totalSell)}</div></td>
                    <td className="border-r border-slate-100 p-1"><div className={readonlyClass}>{formatNum(calcs.sellCpp)}</div></td>
                    <td className="border-r border-slate-100 p-1">
                      <div className="flex gap-1 justify-center">
                        <button onClick={addRow} className="w-6 h-6 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100">+</button>
                        <button onClick={() => removeRow(row.id)} className="w-6 h-6 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">-</button>
                      </div>
                    </td>
                    <td className="border-slate-100 p-1"><input type="text" value={row.remarks} onChange={e => handleInputChange(row.id, 'remarks', e.target.value)} className={inputClass} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className={footerCellClass}></td>
                <td className={footerCellClass}>TOTALS</td>
                <td className={footerCellClass}>{formatNum(tableTotals.unitCost)}</td>
                <td className={footerCellClass}>{tableTotals.qty}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.totalCost)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.yields)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.costCpp)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.sellingPrice)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.totalSell)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.sellCpp)}</td>
                <td colSpan="2" className={footerCellClass}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MachineConfig;
