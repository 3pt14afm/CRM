import React from 'react';

/**
 * @param {string} title - The header text (e.g., "1st Year Potential")
 * @param {Array} data - Array of objects containing type, qty, totalCost, grossSales, etc.
 */
function Potentials({ title = "Potential", data = [] }) {
  const machines = data.filter((item) => item.type === 'machine');
  const consumables = data.filter((item) => item.type === 'consumable');
 
    
        const totalMachineQty = machines.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

        // Sum of Consumable Quantities
        const totalConsumableQty = consumables.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
                // Filtered totals
        const totalMachineCost = machines.reduce((sum, m) => sum + m.totalCost, 0);
        const totalConsumableCost = consumables.reduce((sum, c) => sum + c.totalCost, 0);

        const totalMachineSales = machines.reduce((sum, m) => sum + m.grossSales, 0);
        const totalConsumableSales = consumables.reduce((sum, c) => sum + c.grossSales, 0);

        // Grand totals
        const overallTotalCost = totalMachineCost + totalConsumableCost;
        const overallTotalSales = totalMachineSales + totalConsumableSales;

        const grossProfit = overallTotalSales - overallTotalCost;

        // ROI Percentage Formula
        const roiPercentage = overallTotalCost > 0 
        ? (grossProfit / overallTotalCost) * 100 
        : 0;

  return (
    <div className="flex-1 self-start mt-8">
      {/* TITLE SECTION */}
      <div className="text-center mb-1 pr-1">
        <span className="text-lg font-bold uppercase tracking-tight text-gray-700">
          {title}
        </span>
      </div>

      {/* THE MAIN TABLE */}
      <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full bg-white border-collapse table-fixed">
          <thead className="bg-[#E2F4D8] border-b border-gray-300">
            <tr>
              {/* Added w-1/3 to ensure three equal columns */}
              <th className="w-1/3 px-2 py-2 text-[11px] text-center font-bold uppercase">Qty</th>
              <th className="w-1/3 px-2 py-2 text-[11px] text-center border-l border-gray-300 uppercase">Total Cost</th>
              <th className="w-1/3 px-2 py-2 text-[11px] text-center border-l border-gray-300 uppercase">Gross Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#E2F4D8]/50 border-b border-gray-200">
              <td colSpan="3" className="py-1">&nbsp;</td>
            </tr>
            {machines.map((m, index) => (
              <tr key={`machine-${index}`} className="border-b border-gray-100 last:border-b-0">
                <td className="px-2 py-3 text-[11px] text-center">{m.qty}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.totalCost}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.grossSales}</td>
              </tr>
            ))}

            <tr className="bg-[#E2F4D8]/50 border-t-2 border-gray-300 border-b">
              <td colSpan="3" className="py-1">&nbsp;</td>
            </tr>
            {consumables.map((c, index) => (
              <tr key={`consumable-${index}`} className="border-b border-gray-100 last:border-b-0">
                <td className="px-2 py-3 text-[11px] text-center">{c.qty}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.totalCost}</td>
                <td className="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.grossSales}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ROI BREAKDOWN BOXES */}
      <div className="flex flex-col items-end gap-6 mt-4">
        
        {/* TOP ROI BOX: Aligned to all 3 columns (Width: 100%) */}
        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm w-full">
          <table className="w-full text-center table-fixed">
            <tbody>
                
              <tr className="border-b bg-white border-gray-100">
                {/* machines qty total */}
                <td className="w-1/3 py-2 border-r border-gray-100 font-bold">{totalMachineQty}</td>
                {/* machine total cost */}
                <td className="w-1/3 py-2 border-r border-gray-100 text-gray-500">{totalMachineCost}</td>
                {/* consumable total gross sales */}
                <td className="w-1/3 py-2 text-gray-500">{totalMachineSales}</td>
              </tr>
              {/* Consumable qty total */}
                 <tr className="border-b bg-white border-gray-100">
                    {/* Consumable qty total */}
                <td className="w-1/3 py-2 border-r border-gray-100 font-bold">{totalConsumableQty}</td>
                     {/* Consumable total Cost */}
                <td className="w-1/3 py-2 border-r border-gray-100 text-gray-500">{totalConsumableCost}</td>
                     {/* consumable total gross sales */}
                <td className="w-1/3 py-2 text-gray-500">{totalConsumableSales}</td>
              </tr>
              <tr className="bg-[#E2F4D8] font-bold">
                <td className="py-2 border-r border-gray-300"></td>
                {/* overall total cost */}
                <td className="py-2 border-r border-gray-300 text-xs">{overallTotalCost}</td>
                {/* overall total sales */}
                <td className="py-2 text-xs">{overallTotalSales}</td>
              </tr>
            </tbody>
          </table>
        </div>
        

        {/* BOTTOM ROI BOX: Aligned to the last 2 columns (Width: 66.6%) */}
        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm w-[66.66%]">
          <table className="w-full text-center table-fixed">
            <tbody>
              <tr className="border-b bg-white border-gray-100">
                <td className="w-1/2 py-2 border-r border-gray-100">{overallTotalCost}</td>
                <td className="w-1/2 py-2">{overallTotalSales}</td>
              </tr>
              <tr className="bg-[#E2F4D8] ">
                <td className="py-2 border-r  font-bold border-gray-300 uppercase text-[11px]">ROI</td>
                <td className="py-2 text-[11px]">{grossProfit}</td>
              </tr>
              <tr>
                <td className="py-2 bg-white border-r border-gray-100"></td>
                <td className="py-2 bg-white font-semibold text-green-700">{roiPercentage.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Potentials;