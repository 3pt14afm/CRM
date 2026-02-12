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
        <div className='grid grid-cols-[60%_40%] items-stretch shadow-lg ml-4 rounded-xl overflow-hidden border border-white/60 print:ml-0 print:border-gray-300 print:grid-cols-[70%_30%] print:shadow-md'>
            
            {/* Left Side: White Card Content */}
            <div className='flex flex-col bg-white px-9 pr-10 py-6 gap-2 print:px-5 print:pr-5 print:py-4'>
                <div className='flex gap-2 items-center'>
                    <FaFileContract color='green' />
                    <p className='font-bold text-xs text-gray-500 tracking-tight uppercase'>Contract Info</p>
                </div>

                <div className='flex justify-between items-start mt-4 w-full'>
                    {details.map((item, index) => (
                        <div key={index} className='flex flex-col w-[25%]'>
                            <p className='text-[10px] text-gray-400 font-bold uppercase tracking-wider print:font-semibold'>
                                {item.label}
                            </p>
                            <p className='text-sm font-semibold pt-2 text-gray-800 leading-tight print:font-medium'>
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Side: Purpose Section */}
            <div className='flex flex-col gap-2 p-6 bg-[#F9FBF9] border-l border-gray-100 print:p-4'>
                <p className='text-[10px] text-gray-600 font-bold uppercase tracking-wider'>Purpose</p>
                <p className='text-[11px] font-medium leading-relaxed text-gray-600 '>
                    {purpose}
                </p>
            </div>

        </div>
    )
}

export default CompanyInfoSum;