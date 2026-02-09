import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function Potentials({ title = "1st Year Potential" }) {
  const { projectData } = useProjectData();

  // 1. DATA DESTRUCTURING
  const config = projectData?.machineConfiguration || {};
  const machines = config.machine || [];
  const consumables = config.consumable || [];

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], grandTotal: 0 };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];

  // 2. CALCULATION LOGIC
  const totalMachineQty = machines.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalMachineCost = machines.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
  const totalMachineSales = machines.reduce((sum, m) => sum + (Number(m.totalSell) || 0), 0);

  const totalConsumableQty = consumables.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalConsumableCost = consumables.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);
  const totalConsumableSales = consumables.reduce((sum, c) => sum + (Number(c.totalSell) || 0), 0);

  const totalFeesQty = [...companyFees, ...customerFees].reduce((sum, f) => sum + (Number(f.qty) || 0), 0);
  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);

  const overallTotalCost = totalMachineCost + totalConsumableCost;
  const overallTotalSales = totalMachineSales + totalConsumableSales;
  
  const grandtotalCost = totalMachineCost + totalConsumableCost + totalCompanyFeesAmount;
  const grandtotalSell = totalMachineSales + totalConsumableSales + totalCustomerFeesAmount;

  const grossProfit = grandtotalSell - grandtotalCost; // Adjusted logic to use grand totals
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  const format = (val) => (Number(val) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="p-4">
      {/* TITLE SECTION */}
      <div className="text-center mb-2 pr-1">
        <span className="text-[17px] font-bold uppercase tracking-tight text-gray-700">
          {title}
        </span>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full bg-white border-collapse table-fixed">
          <thead className="bg-[#E2F4D8] border-b border-gray-300">
            <tr>
              <th className="w-1/4 px-1 py-3 text-[11px] text-center font-bold uppercase">Qty</th>
              <th className="w-3/8 px-1 py-3 text-[11px] text-center border-l border-gray-300 uppercase">Total Cost</th>
              <th className="w-3/8 px-1 py-3 text-[11px] text-center border-l border-gray-300 uppercase">Gross Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#E2F4D8]/20"><td colSpan="3" className="py-3"></td></tr>
            
            {machines.length > 0 ? (
              machines.map((m, index) => (
                <tr key={`m-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-1 py-3 text-[11px] text-center">{m.qty}</td>
                  <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(m.totalCost)}</td>
                  <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(m.totalSell)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100">
                <td className="px-1 py-3 text-[11px] text-center">0</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(0)}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(0)}</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8]/20 border-t border-gray-200">
              <td colSpan="3" className="py-3"></td>
            </tr>

            {consumables.length > 0 ? (
              consumables.map((c, index) => (
                <tr key={`c-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-1 py-3 text-[11px] text-center">{c.qty}</td>
                  <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(c.totalCost)}</td>
                  <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(c.totalSell)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100">
                <td className="px-1 py-3 text-[11px] text-center">0</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(0)}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(0)}</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8] border-b border-gray-100 last:border-b-0">
              <td className="px-1 py-3 text-[11px] text-center font-bold ">{totalMachineQty + totalConsumableQty}</td>
              <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3 font-bold ">{format(totalMachineCost + totalConsumableCost)}</td>
              <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3 font-bold ">{format(totalMachineSales + totalConsumableSales)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SUMMARY CALCULATIONS */}
      <div className="flex flex-col items-end gap-2 mt-16">
        <div className="border border-gray-300 rounded-lg overflow-hidden w-full bg-white">
          <table className="w-full text-center table-fixed text-[11px]">
            <tbody>
              {[...companyFees, ...customerFees].length > 0 ? (
                [...companyFees, ...customerFees].map((fee, index) => {
                  const isCompany = companyFees.includes(fee);
                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="w-1/4 py-3 border-r font-bold bg-gray-50 text-center">{fee.qty || 0}</td>
                      <td className="w-3/8 py-3 border-r text-gray-500 text-center">{isCompany ? format(fee.total) : format(0)}</td>
                      <td className="w-3/8 py-3 text-gray-500 text-center">{!isCompany ? format(fee.total) : format(0)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-b border-gray-100">
                  <td className="py-3 border-r font-bold text-center">0</td>
                  <td className="py-3 border-r font-bold text-center">0.00</td>
                  <td className="py-3 font-bold text-center">0.00</td>
                </tr>
              )}

              <tr className="bg-[#E2F4D8] font-bold text-gray-800">
                <td className="py-3 border-r border-gray-300"></td>
                <td className="py-3 border-r border-gray-300">{format(grandtotalCost)}</td>
                <td className="py-3">{format(grandtotalSell)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ROI Final Result Box */} 
        <div className="border border-gray-300 rounded-lg overflow-hidden w-[75%] bg-white shadow-sm"> 
          <table className="w-full text-center table-fixed text-[11px]"> 
            <tbody> 
                   <tr className=" border-b border-gray-300">
                <td className="py-3 border-r font-bold border-gray-300 uppercase text-[10px]">{grandtotalCost}</td> 
                <td className="py-3 font-bold text-gray-800">{grandtotalSell}</td>
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

export default Potentials;