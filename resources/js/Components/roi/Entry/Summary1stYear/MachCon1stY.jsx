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
    
   
     const machineMargin = machine.map(m=>m.machineMargin);
 



    return (
        <div className="gap-4 font-sans tracking-tight ">
            <div className="flex-[3] border border-gray-300 rounded-md overflow-hidden shadow-sm">
                <table className="w-full bg-white border-collapse table-fixed">
                    <colgroup>
                        <col className="w-[44%]" />
                        <col className="w-[13%]" />
                        <col className="w-[12%]" />
                        <col className="w-[9%]" />
                        <col className="w-[13%]" />
                        <col className="w-[9%]" />
                    </colgroup>
                    <thead className="bg-[#E2F4D8] border-b border-gray-300">
                        <tr>
                            <th className="px-3 py-2.5 text-[13px] font-medium border-l text-center print:font-semibold">MACHINE & CONSUMABLES</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">COST</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">YIELDS</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">COST CPP</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">SELLING PRICE</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">SELL CPP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Machine Section */}
                        <tr className="bg-[#E2F4D8]/40 border border-gray-200 grid-cols-6">
                            <td className="px-4 py-1 font-semibold border border-r-gray-300 text-[12px] border-gray-200 print:font-semibold">MACHINE</td>
                            <td  className="px-4 py-1 font-semibold"></td>
                            <td  className="px-4 py-1 font-semibold "></td>
                            <td  className="px-4 py-1 border-y font-semibold border-gray-200 "></td>
                            <td className="px-4 py-1 border-l font-semibold border-gray-300 "></td>
                            <td  className="px-4 py-1 border font-semibold border-gray-200 "></td>
                        </tr>
                        {filteredMachine.length > 0 ? filteredMachine.map((m, index) => (
                            <tr key={m.id || `m-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3 text-[12px] border-r border-gray-300 print:px-3 break-words uppercase">{m.sku}</td>
                                <td className="text-center py-2 flex flex-col gap-1 text-[12px] ">
                                    <p>{formatNum(m.inputtedCost)}</p>
                                    <p className='text-[11px] text-blue-700 italic'>{formatNum(m.machineMarginTotal)}</p>
                                </td>
                                <td className="text-center text-[12px] border-l border-gray-100">{Number(m.yields || 0).toLocaleString()}</td>
                                <td className="text-center text-[12px] border-l border-gray-100">{formatNum(m.costCpp)}</td>
                                <td className="text-center text-[12px] border-l border-gray-300">{formatNum(m.price)}</td>
                                <td className="text-center text-[12px] border-l border-gray-100">{formatNum(m.yields > 0 ? m.price / m.yields : 0, 4)}</td>
                            </tr>
                        )) : (
                            <tr className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3 text-[12px]">x</td>
                                <td className="text-center text-[12px] border-l border-gray-300">0</td>
                                <td className="text-center text-[12px] border-l border-gray-100">0</td>
                                <td className="text-center text-[12px] border-l border-gray-100">0</td>
                                <td className="text-center text-[12px] border-l border-gray-300">0</td>
                                <td className="text-center text-[12px] border-l border-gray-100">0</td>
                            </tr>
                        )}

                        {/* Consumable Section */}
                        <tr className="bg-[#E2F4D8]/40 text-[12px] grid-cols-6 border border-gray-200">
                            <td className="px-4 py-1 border font-semibold border-r-gray-300 print:font-semibold">CONSUMABLES</td>
                            <td  className="px-4 py-1 border-y border-l font-semibold border-gray-200 "></td>
                            <td  className="px-4 py-1 border-y border-gray-200 font-semibold "></td>
                            <td  className="px-4 py-1 border-y font-semibold border-gray-200 "></td>
                            <td className="px-4 py-1 font-semibold border-l border-gray-300 "></td>
                            <td  className="px-4 py-1 font-semibold"></td>
                        </tr>
                        {filteredConsumable.length > 0 ? filteredConsumable.map((c, index) => (
                            <tr key={c.id || `c-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3 text-[12px]">{c.sku}</td>
                                <td className="border-l text-[12px] border-gray-300 text-center px-2 py-1">{formatNum(c.cost)}</td>
                                <td className="border-l text-[12px] border-gray-100 text-center px-2 py-1">{Number(c.yields || 0).toLocaleString()}</td>
                                <td className="border-l text-[12px] border-gray-100 text-center px-2 py-1">{formatNum(c.yields > 0 ? c.cost / c.yields : 0, 2)}</td>
                                <td className="border-l text-[12px] border-gray-300 text-center px-2 py-1">{formatNum(c.price)}</td>
                                <td className="border-l text-[12px] border-gray-100 text-center px-2 py-1">{formatNum(c.yields > 0 ? c.price / c.yields : 0, 2)}</td>
                            </tr>
                        )) : (
                            <tr className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3 text-[12px]">x</td>
                                <td className="text-center text-[12px] border-l border-gray-300">0</td>
                                <td className="text-center text-[12px] border-l border-gray-100">0</td>
                                <td className="text-center text-[12px] border-l border-gray-100">0</td>
                                <td className="text-center text-[12px] border-l border-gray-300">0</td>
                                <td className="text-center text-[12px] border-l border-gray-100">0</td>
                            </tr>
                        )}
                    </tbody>

                    {/* FOOTER: Totals computed from MachineConfig */}
                    <tfoot className="bg-[#E2F4D8]/70 border-t">
                        <tr>
                            <td className="px-4 py-3 text-[12px] font-semibold text-left ">TOTALS</td>
                            <td className="text-center text-[12px] font-semibold border-l border-gray-300">
                                {formatNum(totals.unitCost)}
                            </td>
                            <td className="text-center text-[12px] font-semibold border-l border-gray-300">
                                {Number(totals.yields || 0).toLocaleString()}
                            </td>
                            <td className="text-center text-[12px] font-semibold border-l border-gray-300 text-green-700">
                                {formatNum(totals.costCpp)}
                            </td>
                            <td className="text-center text-[12px] font-semibold border-l border-gray-300">
                                {formatNum(totals.sellingPrice)}
                            </td>
                            <td className="text-center text-[12px] font-semibold border-l border-gray-300">
                                {formatNum(totals.sellCpp)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default MachCon1stY;
