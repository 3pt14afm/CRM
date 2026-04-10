import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachCon1stY() {
    const { projectData } = useProjectData();
    
    const { machine = [], consumable = [], totals = {} } = projectData.machineConfiguration || {};

    // --- CONTRACT LOGIC ---
    const contractType = projectData?.companyInfo?.contractType || "";
    const isOutright = contractType.toLowerCase().includes("outright");

    // Filter rows with SKU
    const filteredMachine = machine.filter(m => m.sku && m.sku.trim() !== '');
    const filteredConsumable = consumable.filter(c => c.sku && c.sku.trim() !== '');

    // Separate machines: Normal vs Others
    const normalMachines = filteredMachine.filter(m => 
        m.mode !== 'others' && m.type !== 'others'
    );
    
    const othersMachines = filteredMachine.filter(m => 
        m.mode === 'others' || m.type === 'others'
    );

    // ✅ NEW: MANUAL TOTAL CALCULATION
    // This ignores machine prices if not Outright, matching your row logic exactly
    const manualTotalSellingPrice = [
        ...normalMachines.map(m => isOutright ? (Number(m.price) || 0) : 0),
        ...othersMachines.map(m => isOutright ? (Number(m.price) || 0) : 0),
        ...filteredConsumable.map(c => (Number(c.price) || 0))
    ].reduce((sum, val) => sum + val, 0);

    const manualTotalSellCpp = totals.yields > 0 ? manualTotalSellingPrice / totals.yields : 0;

    // Formatting helper
    const formatNum = (val, decimals = 2) => 
        (Number(val) || 0).toLocaleString(undefined, { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals 
        });

    return (
        <div className="gap-4 font-sans tracking-tight">
            <div className="flex-[3] border border-gray-300 rounded-md overflow-hidden shadow-sm">
                <table className="w-full bg-white border-collapse table-fixed">
                    {/* ... colgroup remains same ... */}
                    <colgroup>
                        <col className="w-[44%]" />
                        <col className="w-[13%]" />
                        <col className="w-[12%]" />
                        <col className="w-[9%]" />
                        <col className="w-[13%]" />
                        <col className="w-[9%]" />
                    </colgroup>

                    <thead className="bg-[#E2F4D8] border-b border-gray-300">
                        {/* ... thead remains same ... */}
                        <tr>
                            <th className="px-3 py-2.5 text-[13px] font-medium border-l text-center print:font-semibold">MACHINE & CONSUMABLES</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">COST</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">YIELDS</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">COST CPP</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">SELLING PRICE</th>
                            <th className="px-2 py-2.5 text-[13px] font-medium text-center border-l border-gray-300 print:font-semibold">SELL CPP</th>
                        </tr>
                    </thead>

                    <tbody className="text-[12px]">
                        {/* ... Machine Section remains same (using effectivePrice) ... */}
                        <tr className="bg-[#E2F4D8]/40 border border-gray-200">
                            <td colSpan={6} className="px-4 py-1 font-semibold border-r-gray-300">MACHINE</td>
                        </tr>
                        {normalMachines.map((m, index) => {
                            const effectivePrice = isOutright ? (m.price || 0) : 0;
                            const effectiveSellCpp = m.yields > 0 ? effectivePrice / m.yields : 0;
                            return (
                                <tr key={m.id || `m-${index}`} className="border-b border-gray-100 last:border-b-0">
                                    <td className="px-7 py-3 border-r border-gray-300 uppercase">{m.sku}</td>
                                    <td className="text-center py-4">{formatNum(m.inputtedCost || m.cost)}</td>
                                    <td className="text-center border-l border-gray-100">{Number(m.yields || 0).toLocaleString()}</td>
                                    <td className="text-center border-l border-gray-100">{formatNum(m.costCpp)}</td>
                                    <td className="text-center border-l border-gray-300 font-medium">{formatNum(effectivePrice)}</td>
                                    <td className="text-center border-l border-gray-100">{formatNum(effectiveSellCpp)}</td>
                                </tr>
                            );
                        })}

                        {/* ... Consumables Section remains same ... */}
                        <tr className="bg-[#E2F4D8]/40 border border-gray-200">
                            <td colSpan={6} className="px-4 py-1 border font-semibold border-r-gray-300">CONSUMABLES</td>
                        </tr>
                        {filteredConsumable.map((c, index) => (
                            <tr key={c.id || `c-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-7 py-3">{c.sku}</td>
                                <td className="border-l border-gray-300 text-center">{formatNum(c.cost)}</td>
                                <td className="border-l border-gray-100 text-center">{Number(c.yields || 0).toLocaleString()}</td>
                                <td className="border-l border-gray-100 text-center">{formatNum(c.yields > 0 ? c.cost / c.yields : 0)}</td>
                                <td className="border-l border-gray-300 text-center font-medium">{formatNum(c.price)}</td>
                                <td className="border-l border-gray-100 text-center">{formatNum(c.yields > 0 ? c.price / c.yields : 0)}</td>
                            </tr>
                        ))}

                        {/* ... Others Section remains same ... */}
                        {othersMachines.length > 0 && (
                            <>
                                <tr className="bg-[#E2F4D8]/30 border-t border-gray-200">
                                    <td colSpan={6} className="px-4 py-1 font-semibold border-r-gray-300">OTHERS</td>
                                </tr>
                                {othersMachines.map((m, index) => {
                                    const effectivePrice = isOutright ? (m.price || 0) : 0;
                                    const effectiveSellCpp = m.yields > 0 ? effectivePrice / m.yields : 0;
                                    return (
                                        <tr key={m.id || `o-${index}`} className="border-b border-gray-100 last:border-b-0">
                                            <td className="px-7 py-3 border-r border-gray-300 uppercase">{m.sku}</td>
                                            <td className="text-center py-3">{formatNum(m.inputtedCost || m.cost)}</td>
                                            <td className="text-center border-l border-gray-100">{Number(m.yields || 0).toLocaleString()}</td>
                                            <td className="text-center border-l border-gray-100">{formatNum(m.costCpp)}</td>
                                            <td className="text-center border-l border-gray-300 font-medium">{formatNum(effectivePrice)}</td>
                                            <td className="text-center border-l border-gray-100">{formatNum(effectiveSellCpp)}</td>
                                        </tr>
                                    );
                                })}
                            </>
                        )}
                    </tbody>

                    {/* ✅ UPDATED FOOTER */}
                    <tfoot className="bg-[#E2F4D8]/70 border-t">
                        <tr className="font-semibold text-[12px]">
                            <td className="px-4 py-3 text-left">TOTALS</td>
                            <td className="text-center border-l border-gray-300">{formatNum(totals.unitCost)}</td>
                            <td className="text-center border-l border-gray-300">{Number(totals.yields || 0).toLocaleString()}</td>
                            <td className="text-center border-l border-gray-300 text-green-700">{formatNum(totals.costCpp)}</td>
                            
                            {/* Force display our calculated manualTotalSellingPrice */}
                            <td className="text-center border-l border-gray-300">
                                {formatNum(manualTotalSellingPrice)}
                            </td>
                            
                            {/* Recalculate CPP based on the logic-restricted total */}
                            <td className="text-center border-l border-gray-300">
                                {formatNum(manualTotalSellCpp)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default MachCon1stY;