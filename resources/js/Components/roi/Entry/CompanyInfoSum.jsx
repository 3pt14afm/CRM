import React from 'react'
import { FaFileContract } from "react-icons/fa6";
import { useProjectData } from '@/Context/ProjectContext';

function CompanyInfoSum() {
    const { projectData } = useProjectData();
    const { companyInfo } = projectData;

    const companyNameDisplay = companyInfo.companyName ? (
        companyInfo.companySapCode ? (
            <>
                {companyInfo.companyName}{' '}
                <span className="font-mono text-gray-500">({companyInfo.companySapCode})</span>
            </>
        ) : companyInfo.companyName
    ) : '---';

    const typeDisplay = companyInfo.type === 1 ? 'Existing' : 'Potential';

    const details = [
        { label: 'COMPANY NAME', value: companyNameDisplay },
        {
            label: 'CONTRACT TERM',
            value: companyInfo.contractYears
                ? `${companyInfo.contractYears} ${companyInfo.contractYears === 1 ? 'Year' : 'Years'}`
                : '---'
        },
        { label: 'CONTRACT TYPE', value: companyInfo.contractType || '---' },
        { label: 'REFERENCE #', value: companyInfo.reference || '---' },
        { label: 'PURPOSE', value: (companyInfo.purpose || 'No purpose provided for this contract.').toUpperCase() },
        { label: 'TYPE', value: typeDisplay },
    ];

    console.log(projectData.companyInfo);
    return (
        <div className='shadow rounded-xl overflow-hidden border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 bg-[#FBFFFA] print:ml-0 print:shadow-sm'>
            <div className='flex flex-col px-9 pr-10 py-6 gap-2 print:px-5 print:pr-5 print:py-4'>
                <div className='flex gap-2 items-center'>
                    <FaFileContract color='green' />
                    <p className='font-bold text-xs text-gray-500 tracking-tight uppercase'>
                        Contract Info
                    </p>
                </div>

                <div className='grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 mt-2 w-full print:grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr]'>
                    {details.map((item, index) => (
                        <div key={index} className='flex flex-col min-w-0'>
                            <p className='text-[10px] text-gray-400 font-bold uppercase tracking-wider print:font-medium'>
                                {item.label}
                            </p>
                            <p className={`text-xs font-semibold pt-2 leading-tight break-words print:font-medium`}>
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default CompanyInfoSum;