import React from 'react'
import { FaFileContract } from "react-icons/fa6";
import { useProjectData } from '@/Context/ProjectContext'; // Adjust path as needed

function CompanyInfoSum() {
    const { projectData } = useProjectData();
    const { companyInfo } = projectData;

    // Map the context data to your display labels
    const details = [
        { label: 'COMPANY NAME', value: companyInfo.companyName || '---' },
        { 
            label: 'CONTRACT TERM', 
            value: companyInfo.contractYears 
                ? `${companyInfo.contractYears} ${companyInfo.contractYears === 1 ? 'Year' : 'Years'}` 
                : '---' 
        },
        { label: 'CONTRACT TYPE', value: companyInfo.contractType || '---' },
        { label: 'REFERENCE #', value: companyInfo.reference || '---' },
    ];

    const purpose = companyInfo.purpose || "No purpose provided for this contract.";

    return (
        <div className='grid grid-cols-[70%_30%] items-stretch shadow-lg rounded-xl overflow-hidden border border-white/60'>
            
            {/* Left Side: White Card Content */}
            <div className='flex flex-col bg-white px-8 py-6 gap-2'>
                <div className='flex gap-2 items-center'>
                    <FaFileContract color='green' />
                    <p className='font-extrabold text-xs text-gray-500 tracking-tight uppercase'>Contract Info</p>
                </div>

                <div className='flex justify-between items-start mt-4 w-full'>
                    {details.map((item, index) => (
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
            <div className='flex flex-col gap-2 p-6 bg-[#F9FBF9] border-l border-gray-100'>
                <p className='text-[10px] text-gray-600 font-bold uppercase tracking-wider'>Purpose</p>
                <p className='text-[11px] font-medium leading-relaxed text-gray-600 '>
                    {purpose}
                </p>
            </div>

        </div>
    )
}

export default CompanyInfoSum;