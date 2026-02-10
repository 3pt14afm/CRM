import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function TotalMVP() {
    const { projectData } = useProjectData();
    const yieldData = projectData.yield || {};

    // Helper for currency/number formatting
    const formatNum = (val) =>
        (parseFloat(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Compute annual dynamically
    const getAnnual = (monthly) => (parseFloat(monthly) || 0) * 12;
    
  const monoAnnual = getAnnual(yieldData.monoAmvpYields?.monthly);
  const colorAnnual = getAnnual(yieldData.colorAmvpYields?.monthly);

  const periodicTotal = monoAnnual + colorAnnual;

    

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm font-sans text-gray-800">
            <table className="w-full text-left border-collapse bg-white">
                <thead>
                    <tr className="bg-[#90E274]/30 border-b border-gray-200">
                        <th className="px-4 py-2 border-r border-gray-200"></th>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-center border-r border-gray-200">Monthly</th>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-center">Annual</th>
                    </tr>
                </thead>
                
                <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium border-r border-gray-100 text-sm">Mono AMVP</td>
                        <td className="px-4 py-2 text-right text-sm border-r border-gray-100">
                            {formatNum(yieldData.monoAmvpYields?.monthly)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                            {formatNum(getAnnual(yieldData.monoAmvpYields?.monthly))}
                        </td>
                    </tr>
                    
                    <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium border-r border-gray-100 text-sm">Color AMVP</td>
                        <td className="px-4 py-2 text-right text-sm border-r border-gray-100">
                            {formatNum(yieldData.colorAmvpYields?.monthly)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                            {formatNum(getAnnual(yieldData.colorAmvpYields?.monthly))}
                        </td>
                    </tr>
                    
                    <tr>
                        <td className="px-4 py-2 font-medium border-r border-gray-100 text-sm">Periodic Maintenance Supplies Count</td>
                        <td className="px-4 py-2 ">
                          
                        </td>
                        <td className="px-4 py-2 text-center text-sm">
                            {formatNum(periodicTotal)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default TotalMVP;
