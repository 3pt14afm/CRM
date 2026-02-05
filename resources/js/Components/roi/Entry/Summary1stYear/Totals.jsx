import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function Totals() {
    const { projectData } = useProjectData();

    // 1. DATA DESTRUCTURING & SAFETY
    const machineConfig = projectData?.machineConfiguration || [];
    const additionalFee = Array.isArray(projectData?.additionalFee) ? projectData.additionalFee : [];

    // 2. FORMATTING HELPER
    const f = (num) => new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
    }).format(num || 0);

    // 3. DYNAMIC CALCULATIONS
    // Summing costs and sales from the machine configuration
    const totalItemsCost = machineConfig.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const totalGrossSales = machineConfig.reduce((sum, item) => sum + (Number(item.totalSell) || 0), 0);
    
    // Summing all additional fees from the project data
    const totalOtherAmount = additionalFee.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

    // Grand Totals
    const finalTotalCost = totalItemsCost + totalOtherAmount;
    const finalTotalROI = totalGrossSales - finalTotalCost;
    const roiPercentage = finalTotalCost !== 0 ? (finalTotalROI / finalTotalCost) * 100 : 0;

    return (
        <div className="mt-5 space-y-8 font-sans uppercase font-bold tracking-tight text-gray-800 text-[10px]">
            <div className="items-start text-[11px]">
                <div className='flex gap-1'>
                    
                    {/* 1. ADDITIONAL FEES TABLE (LEFT) */}
                    <div className="flex-none w-full min-w-[90px] max-w-[50%]">
                        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full bg-white table-fixed">
                                <thead className="bg-[#E2F4D8] border-b border-gray-300 text-[11px]">
                                    <tr>
                                        <th className="px-3 py-3 text-center w-[60%] uppercase">Additional Fees</th>
                                        <th className="px-3 py-3 text-center border-l border-gray-300 w-[40%] uppercase">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {additionalFee.length > 0 ? (
                                        additionalFee.map((fee, idx) => (
                                            <tr key={fee.id || idx} className="border-b border-gray-100 last:border-b-0">
                                                <td className="px-4 py-2 text-gray-600 truncate">{fee.label || 'Fee'}</td>
                                                <td className="text-right pr-4 font-medium">{f(fee.total)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" className="px-4 py-4 text-center text-gray-400 italic normal-case font-normal">
                                                No fees recorded
                                            </td>
                                        </tr>
                                    )}
                                    <tr className="bg-[#E2F4D8] border-t-2 border-gray-300 font-bold">
                                        <td className="px-3 py-2 uppercase">Total Others</td>
                                        <td className="text-right pr-4">{f(totalOtherAmount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 2. SUMMARY ROI BOX (CENTER) */}
                    <div className="flex justify-center mt-10 w-full">
                        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm w-[400px]">
                            <table className="w-full text-[11px]">
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="px-4 py-3 font-bold bg-[#E2F4D8]/20 text-[11px] text-gray-500 uppercase">Total Project Cost</td>
                                        <td className="px-4 py-3 bg-white text-right border-l border-gray-100">{f(finalTotalCost)}</td>
                                    </tr>
                                    <tr className="bg-[#E2F4D8] font-bold">
                                        <td className="px-4 py-3 uppercase">Total Net ROI</td>
                                        <td className="px-4 py-3 text-right border-l border-gray-300">{f(finalTotalROI)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="px-4 py-2 text-[10px] text-gray-400 italic">ROI Percentage</td>
                                        <td className={`px-4 py-2 bg-white text-right border-l border-gray-100 font-black ${roiPercentage >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                            {roiPercentage.toFixed(2)}%
                                        </td>
                                    </tr>
                                    <tr className="font-bold border-t border-gray-200">
                                        <td className="px-4 py-3 text-[11px] text-gray-500 uppercase">Total Expected Revenue</td>
                                        <td className="px-4 py-3 bg-white text-right border-l border-gray-100">{f(totalGrossSales)}</td>
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