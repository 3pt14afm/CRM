import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function SucceedingYearsPotential({ title = "2nd Year Potential", yearNumber = 2 }) {
  const { projectData } = useProjectData();

  // Fetch data for the specific year from the context
  const yearData = projectData?.yearlyBreakdown?.[yearNumber] || {};

  const {
    totalMachineQty = 0,
    totalMachineCost = 0,
    totalMachineSales = 0,
    totalConsumableQty = 0,
    totalConsumableCost = 0,
    totalConsumableSales = 0,
    grandtotalCost = 0,
    grandtotalSell = 0,
    grossProfit = 0,
    roiPercentage = 0,
    machines = [],
    consumables = [],
    companyFees = [],
    customerFees = []
  } = yearData;

  const format = (val) => (Number(val) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="p-4 pt-0 max-w-lg print:px-1">
      {/* TITLE SECTION */}
      <div className="text-center mb-2 pr-1">
        <span className="text-[17px] print:text-sm print:font-medium font-bold uppercase tracking-tight text-gray-700">
          {title}
        </span>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full bg-white border-collapse table-fixed">
          <thead className="bg-[#E2F4D8] border-b border-gray-300">
            <tr>
              <th className="w-1/4 px-1 py-2.5 text-[13px] text-center font-bold uppercase print:text-xs print:font-semibold">Qty</th>
              <th className="w-3/8 px-1 py-2.5 text-[13px] text-center font-bold border-l print:text-xs print:font-semibold border-gray-300 uppercase">Total Cost</th>
              <th className="w-3/8 px-1 py-2.5 text-[13px] text-center font-bold border-l print:text-xs print:font-semibold border-gray-300 uppercase">Gross Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#E2F4D8]/20 border-b h-[25px]">
              <td className="py-3 print:py-2"></td>
              <td className="py-3 print:py-2"></td>
              <td className="py-3 print:py-2"></td>
            </tr>
            
            {machines.length > 0 ? (
              machines.map((m, index) => (
                <tr key={`m-${index}`} className="border-b font-semibold print:font-normal border-gray-100 last:border-b-0">
                  <td className="px-1 py-3 text-[12px] text-center print:py-2">{m.qty}</td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-2 flex flex-col gap-1 print:py-2">
                    <p>{format(m.cost)}</p>
                    <p className='text-[11px] text-blue-700 italic'>{format(m.machineMargin || 0)}</p>
                  </td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(m.totalSell)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b font-semibold print:font-normal border-gray-100">
                <td className="px-1 py-3 text-[12px] text-center">0</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3">{format(0)}</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3">{format(0)}</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8]/20 border-b h-[25px]">
              <td className="py-3 print:py-2"></td>
              <td className="py-3 print:py-2"></td>
              <td className="py-3 print:py-2"></td>
            </tr>

            {consumables.length > 0 ? (
              consumables.map((c, index) => (
                <tr key={`c-${index}`} className="border-b font-semibold print:font-normal border-gray-100 last:border-b-0">
                  <td className="px-1 py-3 text-[12px] text-center print:py-2">{c.qty}</td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(c.totalCost)}</td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(c.totalSell)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b font-semibold print:font-normal border-gray-100">
                <td className="px-1 py-3 text-[12px] text-center print:py-2">0</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(0)}</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(0)}</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8] border-b font-semibold print:font-normal border-gray-100 last:border-b-0">
              <td className="px-1 py-3 text-[12px] text-center font-bold "></td>
              <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 font-bold ">{format(totalMachineCost + totalConsumableCost)}</td>
              <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 font-bold ">{format(totalMachineSales + totalConsumableSales)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SUMMARY CALCULATIONS */}
      <div className="flex flex-col items-end gap-2 mt-14 print:mt-3">
        <div className="border border-gray-300 rounded-lg overflow-hidden w-full bg-white">
          <table className="w-full text-center table-fixed text-[11px]">
            <tbody>
              {[...companyFees, ...customerFees].length > 0 ? (
                [...companyFees, ...customerFees].map((fee, index) => {
                  // Using ID check for reliability in identifying fee ownership
                  const isCompany = companyFees.some(cf => cf.id === fee.id);
                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="w-1/4 py-2 border-r font-bold bg-gray-50 text-center">{fee.qty || 0}</td>
                      <td className="w-3/8 py-2 border-r text-gray-500 text-center">{isCompany ? format(fee.total) : format(0)}</td>
                      <td className="w-3/8 py-2 text-gray-500 text-center">{!isCompany ? format(fee.total) : format(0)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-b border-gray-100">
                  <td className="py-2 border-r font-bold text-center">0</td>
                  <td className="py-2 border-r font-bold text-center">0.00</td>
                  <td className="py-2 font-bold text-center">0.00</td>
                </tr>
              )}

              <tr className="bg-[#E2F4D8] font-bold text-gray-800">
                <td className="py-2 border-r border-gray-300"></td>
                <td className="py-2 border-r border-gray-300">{format(grandtotalCost)}</td>
                <td className="py-2">{format(grandtotalSell)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ROI Final Result Box */} 
        <div className="border border-gray-300 rounded-lg overflow-hidden w-[75%] mt-5 bg-white shadow-sm"> 
          <table className="w-full text-center table-fixed text-[11px]"> 
            <tbody> 
              <tr className=" border-b border-gray-300">
                <td className="py-3 border-r font-bold border-gray-300 uppercase text-[10px]">{format(grandtotalCost)}</td> 
                <td className="py-3 font-bold text-gray-800">{format(grandtotalSell)}</td>
              </tr>
              <tr className="bg-[#E2F4D8] border-b border-gray-300">
                <td className="py-3 border-r font-bold border-gray-300 uppercase text-[10px]">ROI</td> 
                <td className="py-3 font-bold text-gray-800">{format(grossProfit)}</td>
              </tr>
              <tr> 
                <td className="py-3 border-r border-gray-100 italic text-gray-400 text-[9px]"></td> 
                <td className={`py-3 font-black ${roiPercentage >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {roiPercentage.toFixed(2)}%
                </td> 
              </tr> 
            </tbody> 
          </table>
        </div> 
      </div> 
    </div>
  );
}

export default SucceedingYearsPotential;