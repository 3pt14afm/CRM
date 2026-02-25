import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function Potentials({ title = "1st Year Potential", yearNumber = 1 }) {
  const { projectData } = useProjectData();

  // Get data directly from the yearlyBreakdown in context
  // Fallback to an empty object if the year hasn't been calculated/saved yet
  const yearData = projectData?.yearlyBreakdown?.[yearNumber] || {};

  // Destructure with defaults to prevent "undefined" errors in UI
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
    customerFees = [],
    bundleDeduction,
    firstYearTotalCost,
    fistYearTotalSell,
  } = yearData;

  const contractType = projectData?.companyInfo?.contractType || "";
  const normalizedContractType = String(contractType).trim().toLowerCase();

  const isRentalClick =
    normalizedContractType === "rental + click" ||
    normalizedContractType === "rental+click";
  const isFixClick =
    normalizedContractType === "fix click" ||
    normalizedContractType === "fixed click";

  // ✅ Rental + Click and Fix Click share the same display formatting for qty
  const usesExactClickQtyDisplay = isRentalClick || isFixClick;

  const format = (val) => (Number(val) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // ✅ For Rental + Click / Fix Click:
  // keep exact qty in calculations, but DISPLAY with 2 decimals only
  const formatConsumableQty = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return usesExactClickQtyDisplay ? "0.00" : 0;

    if (usesExactClickQtyDisplay) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return val;
  };

  return (
    <div className="pr-4 pt-0 print:px-2">
      {/* TITLE SECTION */}
      <div className="text-center mb-2 pr-1">
        <span className="text-[17px] font-bold print:font-medium print:text-sm uppercase tracking-tight text-gray-700">
          {title}
        </span>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm">
        <table className="w-full bg-white border-collapse table-fixed">
          <thead className="bg-[#E2F4D8] border-b border-gray-200">
            <tr>
              <th className="w-1/4 px-1 py-2.5 text-[13px] text-center font-medium print:font-semibold uppercase">Qty</th>
              <th className="w-3/8 px-1 py-2.5 text-[13px] text-center font-medium print:font-semibold border-l border-gray-300 uppercase">Total Cost</th>
              <th className="w-3/8 px-1 py-2.5 text-[13px] text-center font-medium print:font-semibold border-l border-gray-300 uppercase ">Gross Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#E2F4D8]/40 border-b h-[27px] print:h-[24px]">
              <td className="py-3 print:py-2"></td><td className="py-3 print:py-2"></td><td className="py-3 print:py-2"></td>
            </tr>
            
            {machines.length > 0 ? (
              machines.map((m, index) => (
                <tr key={`m-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-1 py-3 text-[12px] text-center print:py-2">{m.qty}</td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-2 flex flex-col gap-1 print:py-2.5">
                    <p>{format(m.totalCost)}</p>
                    <p className='text-[11px] text-blue-700 italic'>{format(m.machineMarginTotal || 0)}</p>
                  </td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(m.totalSell)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100">
                <td className="px-1 py-3 text-[12px] text-center print:py-2">0</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(0)}</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(0)}</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8]/40 border-b h-[27px] print:h-[24px]">
              <td className="py-3 print:py-2"></td><td className="py-3 print:py-2"></td><td className="py-3 print:py-2"></td>
            </tr>

            {consumables.length > 0 ? (
              consumables.map((c, index) => (
                <tr key={`c-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-1 py-3 text-[12px] text-center">
                    {formatConsumableQty(c.qty)}
                  </td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">
                    {format(c.totalCost)}
                  </td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">
                    {format(c.totalSell)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100">
                <td className="px-1 py-3 text-[12px] text-center">
                  {formatConsumableQty(0)}
                </td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(0)}</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">{format(0)}</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8]/70 font-medium last:border-b-0">
              <td className="px-1 py-3 text-[12px] border-t border-gray-300 text-center "></td>
              <td className="border-l border-t text-[12px] border-gray-300 text-center px-1 py-3 ">
                <p>{format(firstYearTotalCost)}</p>
                
                {/* Only show if bundleDeduction exists and is greater than 0 */}
                {bundleDeduction > 0 && (
                  <p className='text-[10px] text-red-700'>
                    -{format(bundleDeduction)}
                  </p>
                )}
              </td>
              <td className="border-t border-l text-[12px] border-gray-300 text-center px-1 py-3 font-semibold ">
                {format(fistYearTotalSell)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Potentials;