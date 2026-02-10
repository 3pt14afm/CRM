import React, { useState, useEffect, useMemo } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { interest } from '@/utils/interest';

const InterestCalculator = () => {
  const { projectData, setProjectData } = useProjectData();

  // Memoize interest calculation
  const { monthlyInterest, monthlyMarginForContract, annualMargin, hasValidYears } = useMemo(() => {
    return interest(projectData);
  }, [
    projectData?.interest?.annualInterest,
    projectData?.interest?.percentMargin,
    projectData?.companyInfo?.contractYears
  ]);
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
    <div className='grid [grid-template-columns:40%_60%] items-start gap-4 p-2 pt-0'>
      {/* LEFT: INPUTS */}
      <div className="overflow-hidden rounded-md border border-slate-300 w-full shadow-md">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-[50%] bg-[#90E274]/10 py-2.5 px-3 text-[12px] font-bold text-gray-800">
                Annual Interest
              </td>
              <td className="w-[50%] p-1.5 text-center border-l bg-lightgreen/2">
                <div className="relative w-full">
                  <input
                    type="number"
                    value={
                        projectData?.interest?.annualInterest === 0
                        ? ""
                        : projectData?.interest?.annualInterest ?? ""
                    }
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value; // string
                      handleChange("annualInterest", v === "" ? "" : v);
                    }}
                    className="w-full text-sm rounded-sm h-6 text-center pr-6 py-3.5 border border-slate-200 outline-none focus:ring-1 focus:ring-green-400 bg-white
                              [appearance:textfield]
                              [&::-webkit-outer-spin-button]:appearance-none
                              [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-gray-500 pointer-events-none">
                    %
                  </span>
                </div>
              </td>
            </tr>

            <tr>
              <td className="w-[50%] bg-[#90E274]/10 py-2 px-3 text-[12px] font-bold text-gray-800">
                Percent Margin
              </td>
              <td className="w-[50%] p-1.5 text-center border-l bg-lightgreen/2">
                <div className="relative w-full">
                  <input
                    type="number"
                    value={
                      projectData?.interest?.percentMargin === 0
                        ? ""
                        : projectData?.interest?.percentMargin ?? ""
                    }
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value;
                      handleChange("percentMargin", v === "" ? "" : v);
                    }}
                    className="w-full text-sm rounded-sm h-6 text-center pr-6 py-3.5 border border-slate-200 outline-none focus:ring-1 focus:ring-green-400 bg-white
                              [appearance:textfield]
                              [&::-webkit-outer-spin-button]:appearance-none
                              [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-gray-500 pointer-events-none">
                    %
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>


      {/* RIGHT: RESULTS & ERROR */}
      <div className="flex flex-col gap-1.5">
        <div className="overflow-hidden rounded-md border border-gray-300 bg-white shadow-md">
          <table className="w-full border-collapse">
            <tbody>
              {metrics.map((metric, index) => (
                <tr key={index} className={index !== metrics.length - 1 ? "border-b border-gray-300" : ""}>
                  <td className={`w-1/3 py-2.5 text-center text-[13px] font-medium ${!hasValidYears && index > 0 ? 'text-gray-700' : 'text-gray-700'}`}>
                    {metric.value}
                  </td>
                  <td className="w-2/3 bg-[#90E274]/10 py-2 px-3 text-left border-l border-gray-300">
                    <span className="block text-[11px] font-bold leading-tight text-gray-800">
                      {metric.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* COMPACT ERROR MESSAGE */}
        {!hasValidYears && (
          <p className="text-[10px] text-red-600 font-bold px-1">
            * Please set Contract Years in Company Info.
          </p>
        )}
      </div>
    </div>
  );
};

export default InterestCalculator;