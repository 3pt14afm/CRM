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
        <div className="overflow-hidden rounded-xl shadow border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 font-sans text-gray-800">
            <table className="w-full text-left border-collapse bg-white">
                <thead>
                    <tr className="bg-[#E2F4D8]/60 border-b border-gray-200">
                        <th className="px-4 py-2 border-r border-gray-200"></th>
                        <th className="px-4 py-2 print:px-3 text-xs font-bold uppercase tracking-wider text-center border-r border-gray-200">Monthly</th>
                        <th className="px-4 py-2 print:px-3 text-xs font-bold uppercase tracking-wider text-center">Annual</th>
                    </tr>
                </thead>
                
                <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium border-r border-gray-100 text-xs print:text-xs">Mono AMVP</td>
                        <td className="px-4 py-2 text-right text-xs border-r border-gray-100">
                            {formatNum(monoMonthly)}
                        </td>
                        <td className="px-4 py-2 text-right text-xs">
                            {formatNum(monoAnnual)}
                        </td>
                    </tr>
                    
                    <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium border-r border-gray-100 text-xs print:text-xs">Color AMVP</td>
                        <td className="px-4 py-2 text-right text-xs border-r border-gray-100">
                            {formatNum(colorMonthly)}
                        </td>
                        <td className="px-4 py-2 text-right text-xs">
                            {formatNum(colorAnnual)}
                        </td>
                    </tr>
                    
                    <tr>
                        <td className="px-4 py-2 font-medium border-r border-gray-100 text-xs print:text-xs">Periodic Maintenance Supplies Count</td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-right text-xs">
                            {formatNum(periodicTotal)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default TotalMVP;