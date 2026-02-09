import { useProjectData } from '@/Context/ProjectContext';
import React, { useState, useEffect } from 'react';

function CompanyInfo() {
  const { projectData, setProjectData } = useProjectData();

   const handleChange = (field, value) =>  {
      setProjectData(prev => ({
         ...prev,
         companyInfo: {
            ...prev.companyInfo,
            [field] : value
         }
      }));
      console.log(projectData);
   };

  return (
    <div className='flex flex-col bg-white shadow-[0px_1px_10px_3px_rgba(0,_0,_0,_0.1)] rounded-lg p-8 gap-1 w-[60%]'>
      <div className='flex justify-between items-center'>
        <div className='flex flex-col gap-1 w-[70%]'>
          <p className='font-bold text-[11px] uppercase text-slate-600'>Company Name</p>
          <input 
            className='rounded-md border px-2 text-sm outline-none focus:border-[#289800] border-[#A6E28A]/60 h-10' 
            type="text" 
            value={projectData.companyInfo.companyName}
            onChange={(e) => handleChange( "companyName", e.target.value)}
          />
        </div>

        <div className='flex flex-col gap-1'>
          <p className='font-bold text-[11px] uppercase text-slate-600'>Contract Years</p>
          <input 
            className='rounded-md border px-2 text-sm border-[#A6E28A]/60 h-10 w-32 outline-none focus:border-[#289800] bg-green-50/30' 
            type="number" 
            value={projectData.companyInfo.contractYears}
            onChange={(e)=> 
              handleChange("contractYears", Number(e.target.value))} // UPDATES CONTEXT INSTANTLY
            placeholder="0"
          />
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <div className='flex flex-col mt-2 gap-1'>
          <p className='font-bold text-[11px] uppercase text-slate-600'>Contract Type</p>
          <input 
            className='rounded-md border px-2 text-sm border-[#A6E28A]/60 h-10 outline-none focus:border-[#289800]' 
            type="text" 
            value={projectData.companyInfo.contractType}
            onChange={(e) =>handleChange("contractType", e.target.value)}
          />
        </div>
        <div className='flex flex-col'>
          <p className='font-bold text-[11px] uppercase text-slate-600'>Purpose</p>
          <input 
            className='rounded-md border px-2 text-sm border-[#A6E28A]/60 h-10 outline-none focus:border-[#289800]' 
            type="text" 
            value={projectData.companyInfo.purpose}
            onChange={(e) => handleChange("purpose", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default CompanyInfo;