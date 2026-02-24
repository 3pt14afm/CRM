import React, { useState, useEffect, useMemo } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { interest } from '@/utils/interest';

const InterestCalculator = () => {
  const { projectData, setProjectData } = useProjectData();

  // Memoize interest calculation
  const { monthlyInterest, monthlyMarginForContract, annualMargin, hasValidYears, percentMargin } = useMemo(() => {
    return interest(projectData);
  }, [
    projectData?.interest?.annualInterest,
    projectData?.interest?.percentMargin,
    projectData?.companyInfo?.contractYears
  ]);

  useEffect(() => {
    setProjectData(prev => ({
      ...prev,
      interest: {
        ...prev.interest,
        percentMargin,
      }
    }));
  }, [projectData?.companyInfo?.contractYears]);


  const handleChange = (field, value) => {
    setProjectData(prev => ({
      ...prev,
      interest: {
        ...prev.interest,
        [field]: value
      }
    }));
  };

  const metrics = [
    { label: "Monthly Interest", value: `${monthlyInterest.toFixed(2)}%` },
    { label: "Monthly Margin for Contract Duration", value: `${monthlyMarginForContract.toFixed(2)}%` },
    { label: "Annual Margin", value: `${annualMargin.toFixed(2)}%` },
  ];

  return (
    <div className='w-full items-start'>
      {/* LEFT: INPUTS */}
      <div className="overflow-hidden rounded-md border border-slate-300 max-w-60 shadow-md">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-2/3 bg-[#90E274]/10 py-2.5 px-3 text-[12px] font-bold text-gray-800">
                Annual Interest
              </td>
              <td className="w-1/3 p-1.5 text-center border-l bg-lightgreen/2">
                <div className="relative w-full">
                  <span className="  top-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none">
                    {projectData?.interest?.annualInterest}%
                  </span>
                </div>
              </td>
            </tr>

            <tr>
              <td className="w-2/3 bg-[#90E274]/10 py-2 px-3 text-[12px] font-bold text-gray-800">
                Percent Margin
              </td>
              <td className="w-1/3 p-1.5 text-center border-l bg-lightgreen/2">
                <div className="relative w-full">
                  <span className=" top-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none">
                    {percentMargin}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>


      
    </div>
  );
};

export default InterestCalculator;