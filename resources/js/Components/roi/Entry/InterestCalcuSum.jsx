import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { interest as calculateInterest } from '@/Utils/interest'; // Adjust path if needed

const InterestCalcuSum = () => {
  const { projectData } = useProjectData();

  // Use your util to get derived interest values
  const { monthlyInterest, monthlyMarginForContract, annualMargin, percentMargin } = calculateInterest(projectData);

  // Helper for formatting
  const formatNum = (val) =>
    (parseFloat(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const metrics = [
    { label: "Monthly Interest", value: formatNum(monthlyInterest) },
    { label: "Monthly Margin for Contract Duration", value: formatNum(monthlyMarginForContract) },
    { label: "Annual Margin", value: formatNum(annualMargin) },
  ];

  return (
    <div className='grid [grid-template-columns:40%_60%] items-start gap-4 mr-2 p-2 font-sans print:gap-2 print:p-0'>
      {/* Left Table: Static Values */}
      <div className="overflow-hidden rounded-lg border border-slate-300 ml-auto w-[90%] shadow-lg">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-[50%] bg-[#90E274]/10 py-3 px-3 text-[12px] font-bold text-gray-800 print:font-semibold">
                Annual Interest
              </td>
              <td className="w-[50%] py-3 px-3 text-center border-l bg-white border-slate-300 text-sm text-gray-700">
                {projectData.interest?.annualInterest}%
              </td>
            </tr>
            <tr>
              <td className="w-[50%] bg-[#90E274]/20 py-3 px-3 text-[12px] font-bold text-gray-800 print:font-semibold">
                Percent Margin
              </td>
              <td className="w-[50%] py-3 px-3 text-center border-l bg-white border-slate-300 text-sm text-gray-700">
                {percentMargin}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Right Column: Calculated Metrics */}
      <div className="flex flex-col w-full gap-1">
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
          <table className="w-full border-collapse">
            <tbody>
              {metrics.map((metric, index) => (
                <tr key={index} className={index !== metrics.length - 1 ? "border-b border-gray-300" : ""}>
                  <td className="w-[30%] py-2 text-center text-sm font-semibold text-gray-800">
                    {metric.value}
                  </td>
                  <td className="w-[70%] bg-[#90E274]/10 py-2 px-4 text-left border-l border-gray-300">
                    <span className="block text-[12px] font-bold leading-tight text-gray-800 tracking-tight print:font-semibold">
                      {metric.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InterestCalcuSum;
