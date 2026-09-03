import React from 'react'
import { FaFileContract } from "react-icons/fa6";
import { useProjectData } from '@/Context/ProjectContext';

function CompanyInfoSum({ companyInfo: companyInfoProp, fields: fieldsProp, gridColsClass }) {
    const { projectData } = useProjectData();
    const companyInfo = companyInfoProp || projectData.companyInfo;

    const companyNameDisplay = companyInfo.companyName ? (
        companyInfo.companySapCode ? (
            <>
                {companyInfo.companyName}{' '}
                <span className="font-mono text-gray-500">({companyInfo.companySapCode})</span>
            </>
        ) : companyInfo.companyName
    ) : '---';

    const typeDisplay = companyInfo.type === 1 ? 'Existing' : 'Potential';

    // Every possible field, keyed so callers can pick a subset via `fields`
    const fieldBuilders = {
        companyName: { label: 'COMPANY NAME', value: companyNameDisplay, wide: true },
        contractTerm: {
            label: 'CONTRACT TERM',
            value: companyInfo.contractYears
                ? `${companyInfo.contractYears} ${companyInfo.contractYears === 1 ? 'Year' : 'Years'}`
                : '---'
        },
        contractType: { label: 'CONTRACT TYPE', value: companyInfo.contractType || '---' },
        reference: { label: 'REFERENCE #', value: companyInfo.reference || '---' },
        purpose: { label: 'PURPOSE', value: (companyInfo.purpose || 'No purpose provided for this contract.').toUpperCase() },
        type: { label: 'TYPE', value: typeDisplay },
    };

    const details = fieldsProp
        ? fieldsProp.map((key) => fieldBuilders[key])
        : [fieldBuilders.companyName, fieldBuilders.contractTerm, fieldBuilders.contractType, fieldBuilders.reference, fieldBuilders.purpose, fieldBuilders.type];

    const colsClass = gridColsClass || 'lg:grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr] print:grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr]';

    return (
        <div className='shadow rounded-xl overflow-hidden border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 bg-[#FBFFFA] print:border-[1px]print:border-gray-200 print:ml-0 print:shadow-none'>
            <div className='flex flex-col px-4 py-4 sm:px-9 sm:pr-10 sm:py-6 gap-2 print:px-5 print:pr-5 print:py-4'>
                <div className='flex gap-2 items-center'>
                    <FaFileContract color='green' />
                    <p className='font-bold text-xs text-gray-500 tracking-tight uppercase'>
                        Contract Info
                    </p>
                </div>

                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 mt-2 w-full ${colsClass}`}>
                    {details.map((item, index) => (
                        <div
                            key={index}
                            className={`flex flex-col min-w-0 ${item.wide ? 'col-span-2 sm:col-span-3 lg:col-span-1 print:col-span-1' : ''}`}
                        >
                            <p className='text-[10px] text-gray-400 font-bold uppercase tracking-wider print:font-medium'>
                                {item.label}
                            </p>
                            <p className='text-xs font-semibold pt-2 leading-tight break-words print:font-medium'>
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