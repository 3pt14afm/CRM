import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function TotalMVP() {
    const { projectData } = useProjectData();
    const { interest } = projectData;

    // Helper for currency/number formatting
    const formatNum = (val) => 
        (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                            {formatNum(interest.monoAmvpYields?.monthly)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                            {formatNum(interest.monoAmvpYields?.annual)}
                        </td>
                    </tr>
                    
                    <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium border-r border-gray-100 text-sm">Color AMVP</td>
                        <td className="px-4 py-2 text-right text-sm border-r border-gray-100">
                            {formatNum(interest.colorAmvpYields?.monthly)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                            {formatNum(interest.colorAmvpYields?.annual)}
                        </td>
                    </tr>
                    
                    {/* Placeholder: Update these fields once you add the Periodic Maintenance logic to your context */}
                    <tr>
                        <td className="px-4 py-2 font-medium border-r border-gray-100 text-sm">Periodic Maintenance Supplies Count</td>
                        <td className="px-4 py-2 text-right text-sm border-r border-gray-100">
                            {formatNum(0)} 
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                            {formatNum(0)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default TotalMVP;