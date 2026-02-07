import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachineConfig({ buttonClicked }) {
    const { setProjectData, projectData } = useProjectData();

    // 1. INITIALIZATION
    const [rows, setRows] = useState(() => {
        const config = projectData.machineConfiguration;
        const existingMachines = config?.machine || [];
        const existingConsumables = config?.consumable || [];
        const combined = [...existingMachines, ...existingConsumables];
        
        return combined.length > 0 ? combined : [{ 
            id: Date.now(), sku: '', cost: 0, qty: 0, yields: 0, price: 0, remarks: '', type: 'consumable' 
        }];
    });

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

    // Calculate Table-Wide Totals for the Footer
    const tableTotals = rows.reduce((acc, row) => {
        const calcs = getRowCalculations(row);
        acc.unitCost += parseFloat(row.cost) || 0;
        acc.qty += parseFloat(row.qty) || 0;
        acc.totalCost += calcs.totalCost;
        acc.yields += parseFloat(row.yields) || 0;
        acc.costCpp += calcs.costCpp;
        acc.sellingPrice += parseFloat(row.price) || 0;
        acc.totalSell += calcs.totalSell;
        acc.sellCpp += calcs.sellCpp;
        return acc;
    }, { unitCost: 0, qty: 0, totalCost: 0, yields: 0, costCpp: 0, sellingPrice: 0, totalSell: 0, sellCpp: 0 });

    // 2. SAVE LOGIC with Empty SKU Filter
    useEffect(() => {
        if (buttonClicked) {
            const validRows = rows.filter(r => r.sku && r.sku.trim() !== "");

            const processedRows = validRows.map(r => ({
                ...r,
                ...getRowCalculations(r),
                cost: Number(r.cost) || 0,
                price: Number(r.price) || 0,
                qty: Number(r.qty) || 0,
                yields: Number(r.yields) || 0
            }));

            const machines = processedRows.filter(r => r.type === 'machine');
            const consumables = processedRows.filter(r => r.type === 'consumable');

            const totalsObj = {
                totalUnitCost: processedRows.reduce((s, r) => s + r.cost, 0),
                totalQty: processedRows.reduce((s, r) => s + r.qty, 0),
                totalCost: processedRows.reduce((s, r) => s + r.totalCost, 0),
                totalYields: processedRows.reduce((s, r) => s + r.yields, 0),
                totalCostCpp: processedRows.reduce((s, r) => s + r.costCpp, 0),
                totalSellingPrice: processedRows.reduce((s, r) => s + r.price, 0),
                totalSell: processedRows.reduce((s, r) => s + r.totalSell, 0),
                totalSellCpp: processedRows.reduce((s, r) => s + r.sellCpp, 0)
            };

            setProjectData(prev => ({
                ...prev,
                machineConfiguration: {
                    machine: machines,
                    consumable: consumables,
                    totals: totalsObj
                }
            }));
        }
    }, [buttonClicked]);

    const handleInputChange = (id, field, value) => {
        setRows(rows.map(row => {
            if (row.id === id) {
                if (field === 'isMachine') {
                    return { ...row, type: value ? 'machine' : 'consumable' };
                }
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const addRow = () => setRows([...rows, { 
        id: Date.now(), sku: '', cost: 0, qty: 0, yields: 0, price: 0, remarks: '', type: 'consumable' 
    }]);

    const removeRow = (id) => {
        if (rows.length > 1) setRows(rows.filter(row => row.id !== id));
    };

    const formatNum = (num) => (Number(num) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const inputClass = "w-full h-8 text-[10px] text-center rounded-md border border-slate-200 outline-none focus:border-green-400 bg-white px-1";
    const readonlyClass = "w-full h-8 text-[10px] text-center rounded-md border border-slate-100 bg-slate-50 text-slate-500 font-medium px-1 flex items-center justify-center";
    const footerCellClass ="bg-[#F6FDF5] p-2 text-[10px] font-bold text-center ";

    return (
        <div className="mx-10 mb-10">
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
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
                                <th className="border-b border-r border-slate-200 p-2 w-24">Total Sell</th>
                                <th className="border-b border-r border-slate-200 p-2 w-20">Sell CPP</th>
                                <th className="border-b border-r border-slate-200 p-2 w-20">+/-</th>
                                <th className="border-b border-slate-200 p-2 min-w-[120px]">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const calcs = getRowCalculations(row);
                                return (
                                    <tr className='border-b' key={row.id}>
                                        <td className=" border-r border-slate-100 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 accent-green-600 cursor-pointer" 
                                                checked={row.type === 'machine'}
                                                onChange={(e) => handleInputChange(row.id, 'isMachine', e.target.checked)}
                                            />
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <input type="text" value={row.sku} onChange={(e) => handleInputChange(row.id, 'sku', e.target.value)} className={`${inputClass} ${!row.sku ? 'border-orange-200' : ''}`} placeholder="SKU-XXX" />
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <input type="number" value={row.cost} onChange={(e) => handleInputChange(row.id, 'cost', e.target.value)} className={inputClass} />
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <input type="number" value={row.qty} onChange={(e) => handleInputChange(row.id, 'qty', e.target.value)} className={inputClass} />
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <div className={readonlyClass}>{formatNum(calcs.totalCost)}</div>
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <input type="number" value={row.yields} onChange={(e) => handleInputChange(row.id, 'yields', e.target.value)} className={inputClass} />
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <div className={readonlyClass}>{formatNum(calcs.costCpp)}</div>
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <input type="number" value={row.price} onChange={(e) => handleInputChange(row.id, 'price', e.target.value)} className={inputClass} />
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <div className={readonlyClass}>{formatNum(calcs.totalSell)}</div>
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <div className={readonlyClass}>{formatNum(calcs.sellCpp)}</div>
                                        </td>
                                        <td className=" border-r border-slate-100 p-1">
                                            <div className="flex gap-1 justify-center">
                                                <button onClick={addRow} className="w-6 h-6 flex items-center justify-center rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100">+</button>
                                                <button onClick={() => removeRow(row.id)} className="w-6 h-6 flex items-center justify-center rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">-</button>
                                            </div>
                                        </td>
                                        <td className=" border-slate-100 p-1">
                                            <input type="text" value={row.remarks} onChange={(e) => handleInputChange(row.id, 'remarks', e.target.value)} className={inputClass} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className=''>
                            <tr>
                                <td className={footerCellClass}></td>
                                <td className={`${footerCellClass} `}>TOTALS</td>
                                <td className={footerCellClass}>{formatNum(tableTotals.unitCost)}</td>
                                <td className={footerCellClass}>{tableTotals.qty}</td>
                                <td className={`${footerCellClass} `}>{formatNum(tableTotals.totalCost)}</td>
                                <td className={footerCellClass}>{formatNum(tableTotals.yields)}</td>
                                <td className={footerCellClass}>{formatNum(tableTotals.costCpp)}</td>
                                <td className={footerCellClass}>{formatNum(tableTotals.sellingPrice)}</td>
                                <td className={`${footerCellClass} `}>{formatNum(tableTotals.totalSell)}</td>
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