import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

const InterestCalculator = ({ buttonClicked }) => {
  const { setProjectData, projectData } = useProjectData();

  // 1. Local State for live typing
  const [localAnnual, setLocalAnnual] = useState(projectData.interest.annualInterest || '');
  const [localMargin, setLocalMargin] = useState(projectData.interest.percentMargin || '');

  // 2. LIVE CALCULATIONS
  const annualVal = parseFloat(localAnnual) || 0;
  const marginVal = parseFloat(localMargin) || 0;
  
  // Dependency: Contract Years from Company Info Tab
  const contractYears = parseFloat(projectData.companyInfo.contractYears) || 0;
  const hasValidYears = contractYears > 0;

  const liveMonthlyInterest = annualVal / 12;
  const liveMonthlyMargin = hasValidYears ? (marginVal / (12 * contractYears)) : 0;
  const liveAnnualMargin = hasValidYears ? (marginVal / contractYears) : 0;

  // 3. SAVE TO CONTEXT (Only on Submit click)
// ... inside InterestCalculator.jsx
useEffect(() => {
  if (buttonClicked) {
    setProjectData(prev => ({
      ...prev,
      interest: {
        ...prev.interest,
        annualInterest: annualVal,
        percentMargin: marginVal,
        monthlyInterest: Number(liveMonthlyInterest.toFixed(2)),
        // FIXED NAME HERE:
        monthlyMarginForContract: Number(liveMonthlyMargin.toFixed(2)), 
        annualMargin: Number(liveAnnualMargin.toFixed(2))
      }
    }));
  }
}, [buttonClicked]);

  const metrics = [
    { label: "Monthly Interest", value: `${liveMonthlyInterest.toFixed(2)}%` },
    { label: "Monthly Margin for Contract Duration", value: `${liveMonthlyMargin.toFixed(2)}%` },
    { label: "Annual Margin", value: `${liveAnnualMargin.toFixed(2)}%` },
  ];

  return (
    <div className='grid grid-cols-2 items-start gap-4 p-2'>
      {/* LEFT: INPUTS */}
      <div className="overflow-hidden rounded-lg border border-slate-300 w-full shadow-lg">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-3/5 bg-[#90E274]/10 py-3 px-3 text-[12px] font-bold text-gray-800 italic uppercase">
                Annual Interest
              </td>
              <td className="w-2/5 p-1.5 text-center border-l bg-white border-slate-300">
                <input 
                  type="number" 
                  value={localAnnual} 
                  onChange={(e) => setLocalAnnual(e.target.value)}
                  className="w-full text-xs rounded-md h-6 text-center border border-gray-200 outline-none focus:ring-1 focus:ring-green-400 bg-gray-50" 
                />
              </td>
            </tr>
            <tr>
              <td className="w-3/5 bg-[#90E274]/20 py-2 px-3 text-[12px] font-bold text-gray-800 italic uppercase">
                Percent Margin
              </td>
              <td className="w-2/5 p-1.5 text-center border-l bg-white border-slate-300">
                <input 
                  type="number" 
                  value={localMargin} 
                  onChange={(e) => setLocalMargin(e.target.value)}
                  className="w-full text-xs rounded-md h-6 text-center border border-gray-200 outline-none focus:ring-1 focus:ring-green-400 bg-gray-50" 
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RIGHT: RESULTS & ERROR */}
      <div className="flex flex-col gap-1.5">
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
          <table className="w-full border-collapse">
            <tbody>
              {metrics.map((metric, index) => (
                <tr key={index} className={index !== metrics.length - 1 ? "border-b border-gray-300" : ""}>
                  <td className={`w-1/3 py-2 text-center text-sm font-medium ${!hasValidYears && index > 0 ? 'text-red-500' : 'text-gray-700'}`}>
                    {metric.value}
                  </td>
                  <td className="w-2/3 bg-[#90E274]/10 py-2 px-3 text-left border-l border-gray-300">
                    <span className="block text-[11px] font-bold leading-tight text-gray-800 uppercase">
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
          <p className="text-[10px] text-red-600 font-bold px-1 italic">
            * Please set Contract Years in Company Info to calculate margins.
          </p>
        )}
      </div>
    </div>
  );
};

export default InterestCalculator;