import React, { useState, useEffect, useMemo } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { interest } from '@/utils/interest';

const InterestCalculator = () => {
  const { projectData, setProjectData } = useProjectData();

  // 1. Check if contract type contains "outright" (case-insensitive)
  const isOutright = useMemo(() => {
    return projectData?.companyInfo?.contractType?.toLowerCase().includes('outright') || false;
  }, [projectData?.companyInfo?.contractType]);

  // 2. Safely calculate or override calculations
  const { monthlyInterest, monthlyMarginForContract, annualMargin, percentMargin } = useMemo(() => {
    if (isOutright) {
      return {
        monthlyInterest: 0,
        monthlyMarginForContract: 0,
        annualMargin: 0,
        percentMargin: 0
      };
    }
    return interest(projectData);
  }, [projectData, isOutright]);

  // 3. Keep percentMargin synced, AND restore 12% if switching away from outright to a 0% state
  useEffect(() => {
    if (isOutright) return; // Do nothing if it's currently outright

    const currentAnnual = Number(projectData?.interest?.annualInterest) || 0;

    // If we are NOT outright, but the state was wiped out to 0, restore it to 12
    if (currentAnnual === 0) {
      setProjectData(prev => ({
        ...prev,
        interest: {
          ...prev.interest,
          annualInterest: 12, // Your fallback default rate
          percentMargin,
        }
      }));
    } else {
      // Just update the percent margin normally
      setProjectData(prev => ({
        ...prev,
        interest: {
          ...prev.interest,
          percentMargin,
        }
      }));
    }
  }, [percentMargin, isOutright, projectData?.interest?.annualInterest]);

  return (
    <div className='w-full items-start '>
      {/* LEFT: INPUTS */}
      <div className="overflow-hidden rounded-xl shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 max-w-60">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-2/3 bg-[#90E274]/10 py-2.5 px-3 text-[12px] font-bold text-gray-800">
                Annual Interest
              </td>
              <td className="w-1/3 p-1.5 text-center border-l bg-lightgreen/2">
                <div className="relative w-full">
                  <span className="top-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none">
                    {/* Visual shield: force 0 UI display if outright */}
                    {isOutright ? 0 : (projectData?.interest?.annualInterest || 0)}%
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
                  <span className="top-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none">
                    {isOutright ? 0 : percentMargin}%
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