import InterestCalcuSum from '@/Components/roi/Entry/Summary1stYear/InterestCalcuSum';
import React from 'react'
import { FaFileContract } from "react-icons/fa6";

function Summary1stYear() {
    const info = {
        details: [
            { label: 'COMPANY NAME', value: 'Acme Corporation' },
            { label: 'CONTRACT TERM', value: '3 Years' },
            { label: 'CONTRACT TYPE', value: 'Service and Prints' },
            { label: 'REFERENCE #', value: '1234567' },
        ],
        purpose: 'Standard office fleet refresh across 3 regional headquarters including full lifecycle management and hardware replacement.'
    };

    return (
        <div className='mx-10 bg-[#B5EBA2]/20 border rounded-r-lg rounded-b-xl border-t-0 h-[100vh] border-b-[#B5EBA2] border-x-[#B5EBA2]'>
            <div className='mx-10 pt-8'>
                
                {/* The "One Piece" Illusion Container */}
                <div className='grid grid-cols-[70%_30%] items-stretch shadow-lg rounded-xl overflow-hidden border border-white/60'>
                    
                    {/* Left Side: White Card Content */}
                    <div className='flex flex-col bg-white px-8 py-6 gap-2'>
                        <div className='flex gap-2 items-center'>
                            <FaFileContract color='green' />
                            <p className='font-extrabold text-xs text-gray-500 tracking-tight uppercase'>Contract Info</p>
                        </div>
                    {/* Changed grid-cols-4 to a flex container with justify-between */}
                    <div className='flex justify-between items-start mt-4 w-full '>
                        {info.details.map((item, index) => (
                            <div key={index} className='flex flex-col gap-1'>
                                <p className='text-[10px] text-gray-400 font-bold uppercase tracking-wider'>
                                    {item.label}
                                </p>
                                <p className='text-sm font-semibold text-gray-800 leading-tight'>
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>
                    </div>

                    {/* Right Side: Purpose Section */}
                    {/* Using a solid off-white/mint tint to differentiate the zone while sharing the shadow */}
                    <div className='flex flex-col gap-2 p-6 bg-[#F9FBF9] border-l border-gray-100'>
                        <p className='text-[10px] text-gray-600 font-bold uppercase tracking-wider'>Purpose</p>
                        <p className='text-[11px] font-medium leading-relaxed text-gray-600 '>
                            {info.purpose}
                        </p>
                    </div>

                </div>




                {/* TOTAL MVP AND ANNUAL INTERESTS */}
               <div className='grid grid-cols-2 mt-4 items-center'>

                <div class="max-w-2xl mx-auto p-4">
                <div class="overflow-hidden rounded-2xl border border-gray-200 shadow-sm font-sans">
                    <table class="w-full text-left border-collapse bg-white">
                    <thead>
                        <tr class="bg-green-60 border-b border-gray-200">
                        <th class="px-6 py-4 text-sm font-bold uppercase tracking-wider text-gray-800">Total MPV</th>
                        <th class="px-6 py-4 text-sm font-bold uppercase tracking-wider text-gray-800 text-right">Monthly</th>
                        <th class="px-6 py-4 text-sm font-bold uppercase tracking-wider text-gray-800 text-right">Annual</th>
                        </tr>
                    </thead>
                    
                    <tbody class="text-gray-700">
                        <tr class="border-b border-gray-100">
                        <td class="px-6 py-4 pl-12 relative">
                            <span class="absolute left-6 top-0 bottom-0 border-l border-gray-300"></span>
                            <span class="absolute left-6 top-1/2 w-4 border-t border-gray-300"></span>
                            Mono AMPV
                        </td>
                        <td class="px-6 py-4 text-right font-mono text-sm">999,999.99</td>
                        <td class="px-6 py-4 text-right font-mono text-sm">999,999,999.99</td>
                        </tr>
                        
                        <tr class="border-b border-gray-100">
                        <td class="px-6 py-4 pl-12 relative">
                            <span class="absolute left-6 top-0 h-1/2 border-l border-gray-300"></span>
                            <span class="absolute left-6 top-1/2 w-4 border-t border-gray-300"></span>
                            Color AMPV
                        </td>
                        <td class="px-6 py-4 text-right font-mono text-sm">999,999.99</td>
                        <td class="px-6 py-4 text-right font-mono text-sm">999,999,999.99</td>
                        </tr>
                        
                        <tr>
                        <td class="px-6 py-4 font-medium">Periodic Maintenance Supplies Count</td>
                        <td class="px-6 py-4 text-right font-mono text-sm border-l border-gray-100">999,999.99</td>
                        <td class="px-6 py-4 text-right font-mono text-sm border-l border-gray-100">999,999,999.99</td>
                        </tr>
                    </tbody>
                    </table>
                </div>
                </div>
                  
                <div className='-mt-10'>
                   <InterestCalcuSum />
                </div>

                </div>
         </div>
    </div>
    )
}

export default Summary1stYear;