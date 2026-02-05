import { useProjectData } from '@/Context/ProjectContext';
import React, { useState, useEffect } from 'react';

function CompanyInfo({ buttonClicked }) {
  const { projectData, setProjectData } = useProjectData();

  // 1. Local State for all fields
  const [localInfo, setLocalInfo] = useState({
    companyName: projectData.companyInfo.companyName || '',
    contractYears: projectData.companyInfo.contractYears || '',
    contractType: projectData.companyInfo.contractType || '',
    purpose: projectData.companyInfo.purpose || ''
  });

  // 2. SAVE EVERYTHING ELSE (Only when buttonClicked is true)
  useEffect(() => {
    if (buttonClicked) {
      setProjectData(prev => ({
        ...prev,
        companyInfo: {
          ...prev.companyInfo,
          ...localInfo,
          contractYears: Number(localInfo.contractYears) || 0 
        }
      }));
      console.log("--- Full Company Info Saved ---", localInfo);
    }
  }, [buttonClicked]);

  // 3. SPECIAL HANDLER: Updates local state AND global context immediately for years
  const handleYearsChange = (e) => {
    const val = e.target.value;
    
    // Update local UI immediately
    setLocalInfo(prev => ({ ...prev, contractYears: val }));

    // Sync to Context immediately so InterestCalculator sees it
    setProjectData(prev => ({
      ...prev,
      companyInfo: {
        ...prev.companyInfo,
        contractYears: Number(val) || 0
      }
    }));
  };

  // Standard handler for other fields (Local only)
  const handleLocalChange = (field, value) => {
    setLocalInfo(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className='flex flex-col bg-white shadow-[0px_1px_10px_3px_rgba(0,_0,_0,_0.1)] rounded-lg p-8 gap-1 w-[60%]'>
      <div className='flex justify-between items-center'>
        <div className='flex flex-col gap-1 w-[70%]'>
          <p className='font-bold text-[11px] uppercase text-slate-600'>Company Name</p>
          <input 
            className='rounded-md border px-2 text-sm outline-none focus:border-[#289800] border-[#A6E28A]/60 h-10' 
            type="text" 
            value={localInfo.companyName}
            onChange={(e) => handleLocalChange('companyName', e.target.value)}
          />
        </div>

        <div className='flex flex-col gap-1'>
          <p className='font-bold text-[11px] uppercase text-slate-600'>Contract Years</p>
          <input 
            className='rounded-md border px-2 text-sm border-[#A6E28A]/60 h-10 w-32 outline-none focus:border-[#289800] bg-green-50/30' 
            type="number" 
            value={localInfo.contractYears}
            onChange={handleYearsChange} // UPDATES CONTEXT INSTANTLY
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
            value={localInfo.contractType}
            onChange={(e) => handleLocalChange('contractType', e.target.value)}
          />
        </div>
        <div className='flex flex-col'>
          <p className='font-bold text-[11px] uppercase text-slate-600'>Purpose</p>
          <input 
            className='rounded-md border px-2 text-sm border-[#A6E28A]/60 h-10 outline-none focus:border-[#289800]' 
            type="text" 
            value={localInfo.purpose}
            onChange={(e) => handleLocalChange('purpose', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default CompanyInfo;