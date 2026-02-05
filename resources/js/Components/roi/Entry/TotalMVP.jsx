import React from 'react'

function TotalMVP() {
  return (
    <div class="overflow-hidden rounded-2xl border border-gray-200 shadow-sm font-sans text-gray-800">
                    <table class="w-full text-left border-collapse bg-white">
                        <thead>
                            <tr class="bg-[#90E274]/30 border-b border-gray-200">
                                <th class="px-4 py-2 border-r border-gray-200"></th>
                                <th class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-center border-r border-gray-200">Monthly</th>
                                <th class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-center">Annual</th>
                            </tr>
                        </thead>
                        
                        <tbody class="text-gray-700">
                            <tr class="border-b border-gray-100">
                                <td class="px-4 py-2 font-medium border-r border-gray-100 text-sm">Mono AMPV</td>
                                <td class="px-4 py-2 text-right text-sm border-r border-gray-100">999,999.99</td>
                                <td class="px-4 py-2 text-right text-sm">999,999,999.99</td>
                            </tr>
                            
                            <tr class="border-b border-gray-100">
                                <td class="px-4 py-2 font-medium border-r border-gray-100 text-sm">Color AMPV</td>
                                <td class="px-4 py-2 text-right text-sm border-r border-gray-100">999,999.99</td>
                                <td class="px-4 py-2 text-right text-sm">999,999,999.99</td>
                            </tr>
                            
                            <tr>
                                <td class="px-4 py-2 font-medium border-r border-gray-100 text-sm">Periodic Maintenance Supplies Count</td>
                                <td class="px-4 py-2 text-right text-sm border-r border-gray-100">999,999.99</td>
                                <td class="px-4 py-2 text-right text-sm">999,999,999.99</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
  )
}

export default TotalMVP