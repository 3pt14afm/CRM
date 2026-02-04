import React from 'react';

const InterestCalculator = ({ annualInterest, setAnnualInterest, percentMargin, setPercentMargin, contractYears }) => {
  
// Convert whole number inputs to decimals for math (e.g., 5 becomes 0.05)
  const annual = (parseFloat(annualInterest) || 0) / 100;
  const margin = (parseFloat(percentMargin) || 0) / 100;
  const years = parseFloat(contractYears) || 0;

  // Validation flag
  const isInvalid = years <= 0;

  // Formulas
  const monthlyInterest = annual / 12;
  const monthlyMargin = isInvalid ? 0 : margin / (12 * years);
  const annualMargin = isInvalid ? 0 : margin / years;

  const metrics = [
    { label: "Monthly Interest", value: `${monthlyInterest.toFixed(2)}%` },
    { label: "Monthly Margin for Contract Duration", value: isInvalid ? "0.00%" : `${monthlyMargin.toFixed(2)}%` },
    { label: "Annual Margin", value: isInvalid ? "0.00%" : `${annualMargin.toFixed(2)}%` },
  ];

  return (
    <div className='grid grid-cols-2 items-start gap-4 p-2'>
      {/* Left Table: Inputs */}
      <div className="overflow-hidden rounded-lg border border-slate-200 w-full  shadow-lg">
        <table className="w-full border-collapse">
            <tbody>
            <tr className="border-b border-slate-100">
                <td className="w-3/5 bg-[#f7fcf9] py-3 px-3 text-[12px] font-bold text-gray-800">
                Annual Interest
                </td>
                <td className="w-2/5 p-1.5 text-center border-l border-slate-100">
                {/* Wrapper for the input and the % sign */}
                <div className="relative flex items-center">
                    <input 
                    type="number" 
                    value={annualInterest || ''} 
                    onChange={(e) => setAnnualInterest(e.target.value)}
                    className="w-full text-xs rounded-md h-6 pl-1 pr-4 text-center border border-[#DDDDDD]/50 outline-none focus:ring-1 focus:ring-green-400 bg-[#DDDDDD]/40" 
                    placeholder="0.00"
                    />
                    <span className="absolute right-2 text-[10px] font-bold text-gray-500 pointer-events-none">
                    %
                    </span>
                </div>
                </td>
            </tr>
            <tr>
                <td className="w-3/5 bg-[#f7fcf9] py-2 px-3 text-[12px] font-bold text-gray-800">
                Percent Margin
                </td>
                <td className="w-2/5 p-1.5 text-center border-l border-slate-100">
                <div className="relative flex items-center">
                    <input 
                    type="number" 
                    value={percentMargin || ''} 
                    onChange={(e) => setPercentMargin(e.target.value)}
                    className="w-full text-xs rounded-md h-6 pl-1 pr-4 text-center border border-[#DDDDDD]/50 outline-none focus:ring-1 focus:ring-green-400 bg-[#DDDDDD]/40" 
                    placeholder="0.00"
                    />
                    <span className="absolute right-2 text-[10px] font-bold text-gray-500 pointer-events-none">
                    %
                    </span>
                </div>
                </td>
            </tr>
            </tbody>
        </table>
     </div>

      {/* Right Column: Table + Error Text Below */}
      <div className="flex flex-col w-[full]  gap-1">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <table className="w-full border-collapse">
            <tbody>
              {metrics.map((metric, index) => (
                <tr 
                  key={index} 
                  className={index !== metrics.length - 1 ? "border-b border-gray-100" : ""}
                >
                  <td className="w-1/3 py-2 text-center text-sm font-medium text-gray-700">
                    {metric.value}
                  </td>
                  <td className="w-2/3 bg-[#f7fcf9] py-2 px-3 text-left border-l border-gray-100">
                    <span className="block text-[12px] font-bold leading-tight text-gray-800 tracking-tight">
                      {metric.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Error text specifically below the right table */}
        {isInvalid && (
          <p className="text-[10px] font-bold text-red-500 italic pl-1">
            * Pls input contract years
          </p>
        )}
      </div>
    </div>
  );
};

export default InterestCalculator;