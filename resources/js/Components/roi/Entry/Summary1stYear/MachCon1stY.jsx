import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachCon1stY() {
    const { projectData } = useProjectData();
    
    // Using the standardized key from Context
    const databaseItems = projectData.machineConfiguration || [];

    // Filter based on the 'type' we standardized in the Input component
    const machines = databaseItems.filter(item => item.type === 'machine');
    const consumables = databaseItems.filter(item => item.type === 'consumable');

    // Helper for formatting numbers
    const formatNum = (val, decimals = 2) => 
        (Number(val) || 0).toLocaleString(undefined, { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals 
        });

    return (
        <div className="w-full gap-4 font-sans uppercase font-bold tracking-tight text-gray-800">
            
            {/* LEFT TABLE: MACHINE & CONSUMABLES */}
            <div className="flex-[3] border border-gray-300 rounded-xl  overflow-hidden shadow-sm">
                <table className="w-full bg-white border-collapse">
                    <thead className="bg-[#E2F4D8] border-b border-gray-300">
                        <tr>
                            <th className="px-3 py-3 text-[11px] font-bold text-left w-1/4">Machine & Consumables</th>
                            <th className="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Cost</th>
                            <th className="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Yields</th>
                            <th className="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Cost CPP</th>
                            <th className="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Selling Price</th>
                            <th className="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Sell CPP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Machine Header */}
                        <tr className="bg-[#E2F4D8]/50">
                            <td colSpan="6" className="px-3 py-1 border-b text-[11px] border-gray-200 text-black">Machine</td>
                        </tr>
                       {machines.length > 0 ? machines.map((m, index) => (
                        <tr key={m.id || `m-${index}`} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-6 py-3 text-[11px]">{m.sku}</td>
                            <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.cost)}</td>
                            <td className="text-center text-[11px] border-l border-gray-100">{Number(m.yields).toLocaleString()}</td>
                            <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.costCpp, 4)}</td>
                            <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.price)}</td>
                            <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.sellCpp, 4)}</td>
                        </tr>
                        )) : (
                            <tr><td colSpan="6" className="px-6 py-2 text-[10px] text-gray-400 normal-case italic">No machines configured</td></tr>
                        )}

                        {/* Consumable Header */}
                        <tr className="bg-[#E2F4D8]/50 text-[11px] border-t border-gray-200">
                            <td colSpan="6" className="px-3 py-1 border-b border-gray-200 text-black">Consumables</td>
                        </tr>
                        {consumables.length > 0 ? consumables.map((c, index) => (
                            <tr key={c.id || `c-${index}`} className="border-b border-gray-100 last:border-b-0">
                                {/* FIXED: Changed c.name to c.sku to match standardization */}
                                <td className="px-6 py-3 text-[11px] text-gray-600 font-medium">{c.sku}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.cost)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{Number(c.yields || 0).toLocaleString()}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.costCpp, 4)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.price)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.sellCpp, 4)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" className="px-6 py-2 text-[10px] text-gray-400 normal-case italic">No consumables configured</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* RIGHT TABLE: 1ST YEAR POTENTIAL */}
            {/* <div className="flex-1 self-start -mt-8">
                <div className="text-center mb-1 pr-1">
                    <span className="text-lg font-bold uppercase tracking-tight text-gray-700">
                        1st Year Potential
                    </span>
                </div>

                <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full bg-white border-collapse">
                        <thead className="bg-[#E2F4D8] border-b border-gray-300">
                            <tr>
                                <th className="px-2 py-2 text-[11px] text-center font-bold uppercase">Qty</th>
                                <th className="px-2 py-2 text-[11px] text-center border-l border-gray-300 uppercase">Total Cost</th>
                                <th className="px-2 py-2 text-[11px] text-center border-l border-gray-300 uppercase">Gross Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-[#E2F4D8]/50 border-b border-gray-200">
                                <td colSpan="3" className="py-1">&nbsp;</td>
                            </tr>
                            {machines.map((m, index) => (
                                <tr key={`pot-m-${index}`} className="border-b border-gray-100 last:border-b-0">
                                    <td className="px-2 py-3 text-[11px] text-center">{m.qty}</td>
                                    <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(m.totalCost)}</td>
                                    <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(m.totalSell)}</td>
                                </tr>
                            ))}

                            <tr className="bg-[#E2F4D8]/50 border-t-2 border-gray-300 border-b">
                                <td colSpan="3" className="py-1">&nbsp;</td>
                            </tr>
                            {consumables.map((c, index) => (
                                <tr key={`pot-c-${index}`} className="border-b border-gray-100 last:border-b-0">
                                    <td className="px-2 py-3 text-[11px] text-center">{c.qty}</td>
                                    <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.totalCost)}</td>
                                    <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.totalSell)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div> */}
        </div>
    );
}

export default MachCon1stY;