import React from 'react'
import { FaFileContract } from "react-icons/fa6";

function CompanyInfoSum() {

     const info = {
        details: [
            { label: 'COMPANY NAME', value: 'Acme Corporation' },
            { label: 'CONTRACT TERM', value: '3 Years' },
            { label: 'CONTRACT TYPE', value: 'Service and Prints' },
            { label: 'REFERENCE #', value: '123456789' },
        ],
        purpose: 'Standard office fleet refresh across 3 regional headquarters including full lifecycle management and hardware replacement.'
    };
    
  return (
      <div className='grid grid-cols-[60%_40%] items-stretch shadow-lg ml-4 rounded-xl overflow-hidden border border-white/60'>
                    
                    {/* Left Side: White Card Content */}
                    <div className='flex flex-col bg-white px-9 py-6 pr-10 gap-2'>
                        <div className='flex gap-2 items-center'>
                            <FaFileContract color='green' />
                            <p className='font-bold text-xs text-gray-500 tracking-tight uppercase'>Contract Info</p>
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
  )
}

export default CompanyInfoSum