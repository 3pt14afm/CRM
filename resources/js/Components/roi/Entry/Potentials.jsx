import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function Potentials({ title = "1st Year Potential" }) {
  const { projectData } = useProjectData();
  
  // 1. Pull data directly from the standardized context key
  const databaseItems = projectData.machineConfiguration || [];

  const machines = databaseItems.filter((item) => item.type === 'machine');
  const consumables = databaseItems.filter((item) => item.type === 'consumable');

  // 2. Calculation Logic
  const totalMachineQty = machines.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalConsumableQty = consumables.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  
  const totalMachineCost = machines.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
  const totalConsumableCost = consumables.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);

  // Note: Using totalSell from our standardized state for Gross Sales
  const totalMachineSales = machines.reduce((sum, m) => sum + (Number(m.totalSell) || 0), 0);
  const totalConsumableSales = consumables.reduce((sum, c) => sum + (Number(c.totalSell) || 0), 0);

  const overallTotalCost = totalMachineCost + totalConsumableCost;
  const overallTotalSales = totalMachineSales + totalConsumableSales;
  const grossProfit = overallTotalSales - overallTotalCost;

  const roiPercentage = overallTotalCost > 0 
    ? (grossProfit / overallTotalCost) * 100 
    : 0;

  // 3. Compact Formatting Helper
  const format = (val) => (Number(val) || 0).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  return (
    <div className="">
      {/* TITLE SECTION */}
      <div className="text-center mb-1 pr-1">
        <span className="text-[12px] font-bold uppercase tracking-tight text-gray-700">
          {title}
        </span>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm mb-2">
        <table className="w-full bg-white border-collapse table-fixed">
          <thead className="bg-[#E2F4D8] border-b border-gray-300">
            <tr>
              <th className="w-1/4 px-1 py-3 text-[9px] text-center font-bold uppercase">Qty</th>
              <th className="w-3/8 px-1 py-3 text-[9px] text-center border-l border-gray-300 uppercase">Total Cost</th>
              <th className="w-3/8 px-1 py-3 text-[9px] text-center border-l border-gray-300 uppercase">Gross Sales</th>
            </tr>
          </thead>
          <tbody>
            {/* Machine Spacer */}
            <tr className="bg-[#E2F4D8]/20"><td colSpan="3" className="py-3"></td></tr>
            {machines.map((m, index) => (
              <tr key={`m-${index}`} className="border-b border-gray-100 last:border-b-0">
                <td className="px-1 py-3 text-[11px] text-center">{m.qty}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(m.totalCost)}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(m.totalSell)}</td>
              </tr>
            ))}

            {/* Consumable Spacer */}
            <tr className="bg-[#E2F4D8]/20 border-t border-gray-200"><td colSpan="3" className="py-3"></td></tr>
            {consumables.map((c, index) => (
              <tr key={`c-${index}`} className="border-b border-gray-100 last:border-b-0">
                <td className="px-1 py-3 text-[11px] text-center">{c.qty}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(c.totalCost)}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-1 py-3">{format(c.totalSell)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUMMARY CALCULATIONS */}
      <div className="flex flex-col items-end gap-2">
        
        {/* Sub-totals Box */}
        <div className="border border-gray-300 rounded-lg overflow-hidden w-full bg-white">
          <table className="w-full text-center table-fixed text-[11px]">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="w-1/4 py-3 border-r font-bold bg-gray-50">{totalMachineQty}</td>
                <td className="w-3/8 py-3 border-r text-gray-500">{format(totalMachineCost)}</td>
                <td className="w-3/8 py-3 text-gray-500">{format(totalMachineSales)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="w-1/4 py-3 border-r font-bold bg-gray-50">{totalConsumableQty}</td>
                <td className="w-3/8 py-3 border-r text-gray-500">{format(totalConsumableCost)}</td>
                <td className="w-3/8 py-3 text-gray-500">{format(totalConsumableSales)}</td>
              </tr>
              <tr className="bg-[#E2F4D8] font-bold text-gray-800">
                <td className="py-3 border-r border-gray-300"></td>
                <td className="py-3 border-r border-gray-300">{format(overallTotalCost)}</td>
                <td className="py-3">{format(overallTotalSales)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ROI Final Result Box */}
        <div className="border border-gray-300 rounded-lg overflow-hidden w-[75%] bg-white shadow-sm">
          <table className="w-full text-center table-fixed text-[11px]">
            <tbody>
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