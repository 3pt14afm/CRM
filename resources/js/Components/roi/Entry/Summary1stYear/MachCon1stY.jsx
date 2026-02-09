import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachCon1stY() {
    const { projectData } = useProjectData();
    
    const { machine = [], consumable = [], totals = {} } = projectData.machineConfiguration || {};

    // Only include rows with SKU/label
    const filteredMachine = machine.filter(m => m.sku && m.sku.trim() !== '');
    const filteredConsumable = consumable.filter(c => c.sku && c.sku.trim() !== '');

    // Formatting helper
    const formatNum = (val, decimals = 2) => 
        (Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    return (
        <div className="gap-4 font-sans font-bold tracking-tight text-gray-800">
            <div className="flex-[3] border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full bg-white border-collapse">
                    <thead className="bg-[#E2F4D8] border-b border-gray-300">
                        <tr>
                            <th className="px-3 py-3 text-sm font-bold text-center w-1/4">MACHINE & CONSUMABLES</th>
                            <th className="px-2 py-3 text-sm font-bold text-center border-l border-gray-300">COST</th>
                            <th className="px-2 py-3 text-sm font-bold text-center border-l border-gray-300">YIELDS</th>
                            <th className="px-2 py-3 text-sm font-bold text-center border-l border-gray-300">COST CPP</th>
                            <th className="px-2 py-3 text-sm font-bold text-center border-l border-gray-300">SELLING PRICE</th>
                            <th className="px-2 py-3 text-sm font-bold text-center border-l border-gray-300">SELL CPP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Machine Section */}
                        <tr className="bg-[#E2F4D8]/50">
                            <td colSpan="6" className="px-4 py-1 border-b text-[11px] border-gray-200 text-black">MACHINE</td>
                        </tr>
                        {filteredMachine.length > 0 ? filteredMachine.map((m, index) => (
                            <tr key={m.id || `m-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3 text-[11px]">{m.sku}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.cost)}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{Number(m.yields || 0).toLocaleString()}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.yields > 0 ? m.cost / m.yields : 0, 4)}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.price)}</td>
                                <td className="text-center text-[11px] border-l border-gray-100">{formatNum(m.yields > 0 ? m.price / m.yields : 0, 4)}</td>
                            </tr>
                        )) : (
                            <tr className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3 text-[11px]">x</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                            </tr>
                        )}

                        {/* Consumable Section */}
                        <tr className="bg-[#E2F4D8]/50 text-[11px] border-t border-gray-200">
                            <td colSpan="6" className="px-4 py-1 border-b border-gray-200 text-black">CONSUMABLES</td>
                        </tr>
                        {filteredConsumable.length > 0 ? filteredConsumable.map((c, index) => (
                            <tr key={c.id || `c-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3 text-[11px] text-gray-600 font-medium">{c.sku}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.cost)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{Number(c.yields || 0).toLocaleString()}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.yields > 0 ? c.cost / c.yields : 0, 2)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.price)}</td>
                                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{formatNum(c.yields > 0 ? c.price / c.yields : 0, 2)}</td>
                            </tr>
                        )) : (
                            <tr className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3 text-[11px]">x</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                                <td className="text-center text-[11px] border-l border-gray-100">0</td>
                            </tr>
                        )}
                    </tbody>

                    {/* FOOTER: Totals computed from MachineConfig */}
                    <tfoot className="bg-[#E2F4D8]/70 border-t">
                        <tr>
                            <td className="px-4 py-3 text-[11px] font-bold text-left text-black ">TOTALS</td>
                            <td className="text-center text-[11px] border-l border-gray-300">
                                {formatNum(totals.unitCost)}
                            </td>
                            <td className="text-center text-[11px] border-l border-gray-300">
                                {Number(totals.yields || 0).toLocaleString()}
                            </td>
                            <td className="text-center text-[11px] border-l border-gray-300 text-green-700">
                                {formatNum(totals.yields > 0 ? totals.unitCost / totals.yields : 0, 4)}
                            </td>
                            <td className="text-center text-[11px] border-l border-gray-300">
                                {formatNum(totals.sellingPrice)}
                            </td>
                            <td className="text-center text-[11px] border-l border-gray-300">
                                {formatNum(totals.yields > 0 ? totals.sellingPrice / totals.yields : 0, 4)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default MachCon1stY;
