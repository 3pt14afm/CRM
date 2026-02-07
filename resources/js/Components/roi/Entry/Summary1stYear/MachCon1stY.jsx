import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachCon1stY() {
    const { projectData } = useProjectData();
    
    // 1. Destructure based on your updated Object-based Context structure
    const { 
        machine = [], 
        consumable = [], 
        totals = {} // This is now a direct object
    } = projectData.machineConfiguration || {};

    // 2. Formatting Helper
    const formatNum = (val, decimals = 2) => 
        (Number(val) || 0).toLocaleString(undefined, { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals 
        });

    return (
        <div className="w-full gap-4 font-sans uppercase font-bold tracking-tight text-gray-800">
            
            <div className="flex-[3] border border-gray-300 rounded-xl overflow-hidden shadow-sm">
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
                        {/* Machine Section */}
                        <tr className="bg-[#E2F4D8]/50">
                            <td colSpan="6" className="px-3 py-1 border-b text-[11px] border-gray-200 text-black">Machine</td>
                        </tr>
                        {machine.length > 0 ? machine.map((m, index) => (
                            <tr key={m.id || `m-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-6 py-3 text-[11px]">{m.sku}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.cost)}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{Number(m.yields).toLocaleString()}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.costCpp, 4)}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.price)}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.sellCpp, 4)}</td>
                            </tr>
                        )) : (
                            <tr className="border-b border-gray-100 last:border-b-0">
                                <td className="px-6 py-3 text-[11px]">x</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                            </tr>
                        )}

                        {/* Consumable Section */}
                        <tr className="bg-[#E2F4D8]/50 text-[11px] border-t border-gray-200">
                            <td colSpan="6" className="px-3 py-1 border-b border-gray-200 text-black">Consumables</td>
                        </tr>
                        {consumable.length > 0 ? consumable.map((c, index) => (
                            <tr key={c.id || `c-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-6 py-3 text-[11px] text-gray-600 font-medium">{c.sku}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.cost)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{Number(c.yields || 0).toLocaleString()}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.costCpp, 4)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.price)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.sellCpp, 4)}</td>
                            </tr>
                        )) : (
                            <tr className="border-b border-gray-100 last:border-b-0">
                                <td className="px-6 py-3 text-[11px]">x</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                            </tr>
                        )}
                    </tbody>

                    {/* FOOTER: Now pulls directly from totals object */}
                    <tfoot className="bg-[#E2F4D8]/70 border-t-2 border-gray-300">
                        <tr>
                            <td className="px-3 py-3 text-[11px] font-black text-left text-black ">Totals</td>
                            <td className="text-center text-[11px] border-l border-gray-300">
                                {formatNum(totals.totalUnitCost)}
                            </td>
                            <td className="text-center text-[11px] border-l border-gray-300">
                                {Number(totals.totalYields || 0).toLocaleString()}
                            </td>
                            <td className="text-center text-[11px]  border-l border-gray-300 text-green-700">
                                {formatNum(totals.totalCostCpp, 4)}
                            </td>
                            <td className="text-center text-[11px]  border-l border-gray-300">
                                {formatNum(totals.totalSellingPrice)}
                            </td>
                            <td className="text-center text-[11px] border-l border-gray-300 ">
                                {formatNum(totals.totalSellCpp, 4)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default MachCon1stY;