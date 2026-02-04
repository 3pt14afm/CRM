import React, { useState } from 'react';

function MachineConfig() {
    const emptyRow = { 
        id: Date.now(), 
        sku: '', 
        unitCost: 0, 
        qty: 0, 
        yields: 0, 
        sellingprice: 0, 
        remarks: '' 
    };
    
    const [rows, setRows] = useState([emptyRow]);

    const handleInputChange = (id, field, value) => {
        const updatedRows = rows.map(row => {
            if (row.id === id) return { ...row, [field]: value };
            return row;
        });
        setRows(updatedRows);
    };

    const addRow = () => setRows([...rows, { ...emptyRow, id: Date.now() }]);
    const removeRow = (id) => {
        if (rows.length > 1) setRows(rows.filter(row => row.id !== id));
    };

    const getRowCalculations = (row) => {
        const unitCost = parseFloat(row.unitCost) || 0;
        const qty = parseFloat(row.qty) || 0;
        const yields = parseFloat(row.yields) || 0;
        const sellingPrice = parseFloat(row.sellingprice) || 0;

        const totalCost = unitCost * qty;
        const costCpp = yields > 0 ? totalCost / yields : 0;
        const totalSell = sellingPrice * qty;
        const sellCpp = yields > 0 ? totalSell / yields : 0;

        return { totalCost, costCpp, totalSell, sellCpp };
    };

    const formatNum = (num) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const inputClass = "w-full h-8 text-[10px] text-center rounded-md border border-slate-200 outline-none focus:border-green-400 bg-white px-1";
    const readonlyClass = "w-full h-8 text-[10px] text-center rounded-md border border-slate-100 bg-slate-50 text-slate-500 font-medium px-1 flex items-center justify-center";

    // --- FOOTER CALCULATIONS ---
    const totalCostAll = rows.reduce((s, r) => s + getRowCalculations(r).totalCost, 0);
    const totalYieldsAll = rows.reduce((s, r) => s + (Number(r.yields) || 0), 0);
    const totalSellingAll = rows.reduce((s, r) => s + getRowCalculations(r).totalSell, 0);
    
    // Grand Total CPPs
    const grandCostCpp = totalYieldsAll > 0 ? totalCostAll / totalYieldsAll : 0;
    const grandSellCpp = totalYieldsAll > 0 ? totalSellingAll / totalYieldsAll : 0;

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm mx-10 mb-5">
            <div className="bg-[#D9F2D0] py-2 text-center border-b border-slate-200">
                <h2 className="text-[14px] font-bold tracking-wider uppercase">Machine Configuration</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-[#F6FDF5] text-[11px] uppercase font-bold text-black">
                            <th className="border-b border-r border-slate-200 p-2 w-10">H</th>
                            <th className="border-b border-r border-slate-200 p-2 ">Item SKU</th>
                            <th className="border-b border-r border-slate-200 p-2 w-24">Unit Cost</th>
                            <th className="border-b border-r border-slate-200 p-2 w-16">Qty</th>
                            <th className="border-b border-r border-slate-200 p-2 w-24">Total Cost</th>
                            <th className="border-b border-r border-slate-200 p-2 w-20">Yields</th>
                            <th className="border-b border-r border-slate-200 p-2 w-20">Cost CPP</th>
                            <th className="border-b border-r border-slate-200 p-2 w-24">Selling Price</th>
                            <th className="border-b border-r border-slate-200 p-2 w-24">Total</th>
                            <th className="border-b border-r border-slate-200 p-2 w-20">Sell CPP</th>
                            <th className="border-b border-r border-slate-200 p-2 w-20">+/-</th>
                            <th className="border-b border-slate-200 p-2 min-w-[120px]">Remarks</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {rows.map((row) => {
                            const calcs = getRowCalculations(row);
                            return (
                                <tr key={row.id}>
                                    <td className="border-b border-r border-slate-100 text-center"><input type="checkbox" className="w-3 h-3" /></td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <input type="text" value={row.sku} onChange={(e) => handleInputChange(row.id, 'sku', e.target.value)} className={inputClass} placeholder="SKU-XXX" />
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <input type="number" value={row.unitCost} onChange={(e) => handleInputChange(row.id, 'unitCost', e.target.value)} className={inputClass} />
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <input type="number" value={row.qty} onChange={(e) => handleInputChange(row.id, 'qty', e.target.value)} className={inputClass} />
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <div className={readonlyClass}>{formatNum(calcs.totalCost)}</div>
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <input type="number" value={row.yields} onChange={(e) => handleInputChange(row.id, 'yields', e.target.value)} className={inputClass} />
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <div className={readonlyClass}>{formatNum(calcs.costCpp)}</div>
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <input type="number" value={row.sellingprice} onChange={(e) => handleInputChange(row.id, 'sellingprice', e.target.value)} className={inputClass} />
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <div className={readonlyClass}>{formatNum(calcs.totalSell)}</div>
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <div className={readonlyClass}>{formatNum(calcs.sellCpp)}</div>
                                    </td>
                                    <td className="border-b border-r border-slate-100 p-1">
                                        <div className="flex gap-1 justify-center">
                                            <button onClick={addRow} className="w-6 h-6 flex items-center justify-center rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100">+</button>
                                            <button onClick={() => removeRow(row.id)} className="w-6 h-6 flex items-center justify-center rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">-</button>
                                        </div>
                                    </td>
                                    <td className="border-b border-slate-100 p-1">
                                        <input type="text" value={row.remarks} onChange={(e) => handleInputChange(row.id, 'remarks', e.target.value)} className={inputClass} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-[#F6FDF5] font-bold text-[10px] text-slate-700">
                            <td colSpan="2" className="p-2 border-r border-slate-200 text-center uppercase">Totals</td>
                            <td className="p-2 border-r border-slate-200 text-center">{formatNum(rows.reduce((s, r) => s + (Number(r.unitCost) || 0), 0))}</td>
                            <td className="p-2 border-r border-slate-200 text-center"></td>
                            <td className="p-2 border-r border-slate-200 text-center">{formatNum(totalCostAll)}</td>
                            <td className="p-2 border-r border-slate-200 text-center">{totalYieldsAll.toLocaleString()}</td>
                            {/* Corrected Cost CPP Total */}
                            <td className="p-2 border-r border-slate-200 text-center text-green-700">{formatNum(grandCostCpp)}</td>
                            <td className="p-2 border-r border-slate-200 text-center">{formatNum(rows.reduce((s, r) => s + (Number(r.sellingprice) || 0), 0))}</td>
                            <td className="p-2 border-r border-slate-200 text-center">{formatNum(totalSellingAll)}</td>
                            {/* Added Sell CPP Total for completeness */}
                            <td className="p-2 border-r border-slate-200 text-center text-blue-700">{formatNum(grandSellCpp)}</td>
                            <td colSpan="2" className="bg-[#F6FDF5]"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default MachineConfig;