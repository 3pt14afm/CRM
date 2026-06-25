import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function TotalMVP() {
    const { projectData } = useProjectData();
    const yieldData = projectData.yield || {};

    // Helper for currency/number formatting - Returns blank if zero
    const formatNum = (val) => {
        const num = parseFloat(val) || 0;
        if (num === 0) return "";
        return num.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    };

    // Compute annual dynamically
    const getAnnual = (monthly) => (parseFloat(monthly) || 0) * 12;
    
    const monoMonthly = yieldData.monoAmvpYields?.monthly || 0;
    const colorMonthly = yieldData.colorAmvpYields?.monthly || 0;

    const monoAnnual = getAnnual(monoMonthly);
    const colorAnnual = getAnnual(colorMonthly);

    const periodicTotal = monoAnnual + colorAnnual;

    return (
        <div className="overflow-hidden rounded-xl shadow border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 font-sans text-gray-800 print:shadow-none print:border-[1px] print:border-gray-300">
            <table className="w-full text-left border-collapse bg-white">
                <thead>
                    <tr className="bg-[#E2F4D8]/60 border-b border-gray-200">
                        <th className="px-4 py-2 print:py-1 border-r border-gray-300"></th>
                        <th className="px-4 py-2 print:px-3 print:py-1 text-xs font-semibold uppercase tracking-wider text-center border-r border-gray-300 print:font-medium">Monthly</th>
                        <th className="px-4 py-2 print:px-3 print:py-1 text-xs font-semibold uppercase tracking-wider text-center print:font-medium">Annual</th>
                    </tr>
                </thead>
                
                <tbody className="text-gray-700">
                    <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 print:py-1 font-medium border-r border-gray-300 text-xs print:text-xs">Mono AMVP</td>
                        <td className="px-4 py-2 print:py-1 text-right text-xs border-r border-gray-300">
                            {formatNum(monoMonthly)}
                        </td>
                        <td className="px-4 py-2 print:py-1 text-right text-xs">
                            {formatNum(monoAnnual)}
                        </td>
                    </tr>
                    
                    <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 print:py-1 font-medium border-r border-gray-300 text-xs print:text-xs">Color AMVP</td>
                        <td className="px-4 py-2 print:py-1 text-right text-xs border-r border-gray-300">
                            {formatNum(colorMonthly)}
                        </td>
                        <td className="px-4 py-2 print:py-1 text-right text-xs">
                            {formatNum(colorAnnual)}
                        </td>
                    </tr>
                    
                    <tr>
                        <td className="px-4 pr-3 py-2 print:py-1 font-medium border-r border-gray-300 text-xs print:text-xs">Periodic Maintenance Supplies Count</td>
                        <td className="px-4 py-2 print:py-1"></td>
                        <td className="px-4 py-2 print:py-1 text-right text-xs">
                            {formatNum(periodicTotal)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default TotalMVP;