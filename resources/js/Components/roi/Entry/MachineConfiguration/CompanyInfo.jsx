import React from 'react'

function CompanyInfo({
  companyName, 
  contractYears, 
  companyType, 
  purpose, 
  setCompanyName, 
  setCompanyType, 
  setContractYears, 
  setPurpose
}) {
     
  return (
    <div className='flex flex-col bg-white shadow-[0px_1px_10px_3px_rgba(0,_0,_0,_0.1)] rounded-lg p-8  gap-1 w-[60%]'>
      {/* company name and contract years */}
      <div className='flex justify-between items-center'>
        <div className='flex flex-col gap-1 w-[70%]'>
          <p className='font-bold text-[11px] uppercase'>Company Name</p>
          <input 
            className='rounded-md border px-2 text-sm outline-none focus:outline-none border-[#A6E28A]/60 h-10' 
            type="text" 
            placeholder='Enter Company Name'
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div className='flex flex-col gap-1'>
          <p className='font-bold text-[11px] uppercase'>Contract Years</p>
          <input 
            className='rounded-md border px-2 text-sm border-[#A6E28A]/60 h-10 w-32 outline-none' 
            type="number" 
            placeholder='0'
            value={contractYears}
            onChange={(e) => setContractYears(e.target.value)}
          />
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <div className='flex flex-col mt-2 gap-1'>
          <p className='font-bold text-[11px] uppercase'>Company Type</p>
          <input 
            className='rounded-md border px-2 text-sm border-[#A6E28A]/60 h-10 outline-none' 
            type="text" 
            placeholder='Enter type'
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
          />
        </div>
        <div className='flex flex-col'>
          <p className='font-bold text-[11px] uppercase'>Purpose</p>
          <input 
            className='rounded-md border px-2 text-sm border-[#A6E28A]/60 h-10 outline-none' 
            type="text" 
            placeholder='Enter purpose'
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export default CompanyInfo