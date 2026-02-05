import React from 'react';

const InterestCalcuSum = () => {
  const metrics = [
    { label: "Monthly Interest", value: 0.00 },
    { label: "Monthly Margin for Contract Duration", value: 0.00 },
    { label: "Annual Margin", value: 0.00},
  ];

  return (
    <div className='grid grid-cols-2 items-start gap-4 p-2 font-sans'>
      {/* Left Table: Static Values (No Inputs = No Arrows) */}
      <div className="overflow-hidden rounded-lg border border-slate-300 w-full shadow-lg">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-3/5 bg-[#90E274]/10 py-3 px-3 text-[12px] font-bold text-gray-800">
                Annual Interest
              </td>
              <td className="w-2/5 py-3 px-3 text-center border-l bg-white border-slate-300  text-sm text-gray-700">
                {/* Displaying as pure text prevents any browser UI like arrows */}
                0.00%
              </td>
            </tr>
            <tr>
              <td className="w-3/5 bg-[#90E274]/20 py-3 px-3 text-[12px] font-bold text-gray-800">
                Percent Margin
              </td>
              <td className="w-2/5 py-3 px-3 text-center border-l bg-white border-slate-300  text-sm text-gray-700">
                0.00%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Right Column: Metrics Table */}
      <div className="flex flex-col w-full gap-1">
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
          <table className="w-full border-collapse">
            <tbody>
              {metrics.map((metric, index) => (
                <tr 
                  key={index} 
                  className={index !== metrics.length - 1 ? "border-b border-gray-300" : ""}
                >
                  <td className="w-1/3 py-2 text-center text-sm  font-medium text-gray-700">
                    {metric.value}
                  </td>
                  <td className="w-2/3 bg-[#90E274]/10 py-2 px-3 text-left border-l border-gray-300">
                    <span className="block text-[12px] font-bold leading-tight text-gray-800 tracking-tight">
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