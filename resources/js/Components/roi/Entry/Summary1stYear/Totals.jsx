import React, { useMemo, useEffect } from 'react'; // Added useEffect
import { useProjectData } from '@/Context/ProjectContext';
import { calculateProjectPotentials } from '@/utils/calculations/freeuse/calculatProjectPotentials';

function Totals() {
    const { projectData, updateSection } = useProjectData(); // Added updateSection
   
    // 1. DATA DESTRUCTURING
    const config = projectData?.machineConfiguration || {};
    const machineTotals = config.totals || {}; 
    
    const addFeesObj = projectData?.additionalFees || { company: [], customer: [], total: 0 };
    const grandTotalCostFees = addFeesObj.total || 0;

    const allAdditionalFees = [
        ...(addFeesObj.company || []), 
        ...(addFeesObj.customer || [])
    ];

    // 2. FORMATTING HELPER
    const f = (num) => new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
    }).format(num || 0);

    // 3. DYNAMIC CALCULATIONS
    const totalItemsCost = machineTotals.totalCost || 0;
    const totalMachineSales = machineTotals.totalSell || 0;
    
    const totalCompanyFees = (addFeesObj.company || []).reduce((sum, fee) => sum + (Number(fee.total) || 0), 0);
    const totalCustomerFees = (addFeesObj.customer || []).reduce((sum, fee) => sum + (Number(fee.total) || 0), 0);

    const finalTotalCost = totalItemsCost + totalCompanyFees;
    const finalTotalRevenue = totalMachineSales + totalCustomerFees;
    const finalTotalROI = finalTotalRevenue - finalTotalCost;
    const roiPercentage = finalTotalCost !== 0 ? (finalTotalROI / finalTotalCost) * 100 : 0;

    const lifetime = useMemo(() => 
        calculateProjectPotentials(projectData.yearlyBreakdown), 
        [projectData.yearlyBreakdown]
    );

    // --- ADDED USEEFFECT TO SAVE TO CONTEXT ---
    useEffect(() => {
        updateSection('totalProjectCost', {
            grandTotalCost: lifetime.totalCost,
            grandTotalRevenue: lifetime.totalRevenue,
            grandROI: lifetime.totalGrossProfit,
            grandROIPercentage: lifetime.totalRoiPercentage
        });
    }, [finalTotalCost, finalTotalRevenue, finalTotalROI, roiPercentage, updateSection]);
    // ------------------------------------------

    return (
        <div className="mt-2 space-y-8 font-sans font-bold tracking-tight text-[10px]">
            <div className="items-start text-[12px]">
                <div> 
                    {/* 1. ADDITIONAL FEES TABLE */}
                    <div className="flex-none w-[57%]">
                        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full bg-white table-fixed">
                                <thead className="bg-[#E2F4D8] border-b border-gray-300 text-[11px]">
                                    <tr>
                                        <th className="px-3 py-1.5 text-center w-[96%] uppercase">OTHERS</th>
                                        <th className="px-3 py-1.5 text-center border-l border-gray-300 w-[28%] uppercase">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {allAdditionalFees.length > 0 ? (
                                        allAdditionalFees.map((fee, idx) => (
                                            <tr key={fee.id || idx} className="border-b border-gray-100 last:border-b-0">
                                                <td className="px-4 py-2 text-[12px] text-gray-600 truncate border-r">
                                                    {fee.label}
                                                </td>
                                                <td className=" pr-4 font-medium text-[11px] text-right">
                                                    {f(fee.total)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="border-b border-gray-100">
                                            <td className="px-4 py-3 text-[11px] text-gray-600 truncate border-r">X</td>
                                            <td className="text-right text-[11px] pr-4 font-medium">0.00</td>
                                        </tr>
                                    )}
                                    <tr className="bg-[#E2F4D8] border-t font-bold">
                                        <td className="px-3 py-2 text-[11px] uppercase border-r">Total</td>
                                        <td className="text-right text-[11px] pr-4">{f(grandTotalCostFees)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 2. SUMMARY ROI BOX */}
                    <div className="flex justify-end w-full pr-8 mt-1">
                        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm w-[400px]">
                            <table className="w-full text-[11px]">
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="px-4 py-3 font-bold bg-[#E2F4D8]/20 text-[11px] text-gray-500 ">Total Cost</td>
                                        <td className="px-4 py-3 bg-white text-right border-l border-gray-100">{f(lifetime.totalCost)}</td>
                                    </tr>
                                    <tr className="bg-[#E2F4D8] font-bold">
                                        <td className="px-4 py-3 ">Total ROI</td>
                                        <td className="px-4 py-3 text-right border-l border-gray-300">{f(lifetime.totalGrossProfit)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 text-[10px] text-gray-400 italic px-4"></td>
                                        <td className={`px-4 py-2 bg-white text-right border-l border-gray-100 ${roiPercentage >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                            {lifetime.totalRoiPercentage.toFixed(2)}%
                                        </td>
                                    </tr>
                                    <tr className="font-bold border-t border-gray-200">
                                        <td className="px-4 py-3 text-[11px] text-gray-500 ">Total Revenue</td>
                                        <td className="px-4 py-3 bg-white text-right border-l border-gray-100">{f(lifetime.totalRevenue)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Totals;