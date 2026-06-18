import React, { useMemo, useEffect } from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { calculateProjectPotentials } from "@/utils/roi/calculations/calculatProjectPotentials";
import { succeedingYears } from "@/utils/roi/calculations/succeedingYears";

function SucceTotals() {
  const { projectData, updateSection } = useProjectData();

  // 1. SINGLE SOURCE OF TRUTH — pull everything from succeeding years calculation
  const succYear = useMemo(() => succeedingYears(projectData), [projectData]);

  const {
    grandtotalCost,
    grandtotalSell,
    grossProfit,
    roiPercentage,
    companyFees,
    customerFees,
    addFeesObj,
  } = succYear;

  const allAdditionalFees = [
    ...companyFees.map((f) => ({ ...f, __source: "company" })),
    ...customerFees.map((f) => ({ ...f, __source: "customer" })),
  ];

  const companyTotal = companyFees.reduce((sum, fee) => sum + Number(fee.total || 0), 0);
  const customerTotal = customerFees.reduce((sum, fee) => sum + Number(fee.total || 0), 0);
  
  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  // Per-year values
  const year2Cost = grandtotalCost;
  const year2Revenue = grandtotalSell;
  const year2ROI = grossProfit;

  // Overall succeeding years
  const overallSucceCost = grandtotalCost * succeedingYearCount;
  const overallSucceRevenue = grandtotalSell * succeedingYearCount;
  const overallSucceROI = grossProfit * succeedingYearCount;
  const overallSucceRoiPercentage =
    overallSucceCost !== 0 ? (overallSucceROI / overallSucceCost) * 100 : 0;

  // 2. UPDATED FORMATTING HELPERS (BLANK IF ZERO)
  const format = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return ""; // Return blank instead of 0.00
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const nFormat = (val) => {
    const num = Number(val) || 0;
    return num === 0 ? "" : num; // Return blank instead of 0 for Qty
  };

  const n = (val) => Number(val) || 0;

  // 3. LIFETIME CONTEXT UPDATE
  const lifetime = useMemo(
    () => calculateProjectPotentials(projectData.yearlyBreakdown),
    [projectData.yearlyBreakdown]
  );

  useEffect(() => {
    if (lifetime) {
      updateSection("totalProjectCost", {
        grandTotalCost: lifetime.totalCost,
        grandTotalRevenue: lifetime.totalRevenue,
        grandROI: lifetime.totalGrossProfit,
        grandROIPercentage: lifetime.totalRoiPercentage,
      });
    }
  }, [lifetime, updateSection]);

  return (
    <div className="my-2 font-sans tracking-tight text-[10px]">
      <div className="items-start text-[12px]">
        <div className="w-full">
          <div className="border-gray-300 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[30.7%]" />
                  <col className="w-[9.7%]" />
                  <col className="w-[1.2%]" />
                  <col className="w-[7.2%]" />
                  <col className="w-[10.7%]" />
                  <col className="w-[10.7%]" />
                  <col className="w-[1.2%]" />
                  <col className="w-[7.2%]" />
                  <col className="w-[10.7%]" />
                  <col className="w-[10.7%]" />
                </colgroup>

                <thead className="bg-[#E2F4D8]/70 text-[11px]">
                  <tr className="font-medium">
                    <th className="px-3 py-1 text-center uppercase border border-gray-300 font-medium">OTHERS</th>
                    <th className="px-3 py-1 text-center border border-gray-300 uppercase print:text-[10px] font-medium">Amount</th>
                    <th className="px-3 py-1 text-center bg-[#f8f8f8] print:bg-white"></th>
                    <th colSpan={3} className="px-3 py-1 text-center border border-gray-300"></th>
                    <th className="px-3 py-1 text-center bg-[#f8f8f8] print:bg-white"></th>
                    <th colSpan={3} className="px-3 py-1 text-center border border-gray-300"></th>
                  </tr>
                </thead>

                <tbody className="text-[10px]">
                 {allAdditionalFees.length > 0 ? (
                    allAdditionalFees.map((fee, idx) => {
                      const isA3ColorClick = fee.label?.toLowerCase().includes("a3 color click");
                      const isCompany = companyFees.some((cf) => cf.id === fee.id);
                      const feeQty = n(fee.qty);
                      const feeCost = n(fee.cost); // Added to check for zero cost
                      const displayTotal = isA3ColorClick ? 0 : (Number(fee.total) || 0);
                      return (
                        <tr key={fee.id || idx} className="border-x-gray-300">
                          <td className="border border-x-gray-300 border-gray-100 px-4 py-2 text-[12px] truncate border-r">
                            {fee.label}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 px-3 py-2 text-[11px] text-right border-r">
                           {/* If it's A3, show empty or 0 as cost too */}
                          {isA3ColorClick ? '' : format(fee.cost)}
                          </td>
                          <td className="py-2 border-r border-gray-300 bg-[#f8f8f8] print:bg-white"></td>

                          {/* 1st summary block (per year) */}
                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {/* Logic: Blank if cost is zero */}
                            {feeCost !== 0 ? nFormat(feeQty) : ""}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {isCompany ? format(fee.total) : ""}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {!isCompany ? format(fee.total) : ""}
                          </td>

                          <td className="py-2 border-r border-gray-300 bg-[#f8f8f8] print:bg-white"></td>

                          {/* 2nd summary block (overall succeeding years) */}
                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {/* Logic: Blank if cost is zero */}
                            {feeCost !== 0 ? nFormat(feeQty * succeedingYearCount) : ""}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {isCompany ? format(n(fee.total) * succeedingYearCount) : ""}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 py-2 text-center">
                            {!isCompany ? format(n(fee.total) * succeedingYearCount) : ""}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 text-[11px] text-gray-600 truncate">—</td>
                      <td className="border border-gray-300 px-3 py-3 text-right"></td>
                      <td className="py-2 border-r border-gray-300 bg-[#f8f8f8] print:bg-white"></td>
                      <td colSpan={3} className="border border-gray-300"></td>
                      <td className="py-2 border-r border-gray-300 bg-[#f8f8f8] print:bg-white"></td>
                      <td colSpan={3} className="border border-gray-300"></td>
                    </tr>
                  )}

                  {/* TOTAL ROW */}
                  <tr className="bg-[#E2F4D8]/70 font-bold text-gray-800 shadow-sm">
                    <td className="px-3 py-2 text-[11px] uppercase border border-gray-300">Total</td>
                    <td className="px-3 py-2 text-right text-[11px] border-r border-y border-gray-300"></td>
                    <td className="py-2 border-r border-gray-300 bg-[#f8f8f8] print:bg-white"></td>
                    <td className="py-2 border-r border-t border-gray-300"></td>
                    <td className="py-2 border-r border-t border-gray-300 text-center">{format(companyTotal)}</td>
                    <td className="py-2 border-r border-t border-gray-300 text-center">{format(customerTotal)}</td>
                    <td className="py-2 border-r border-gray-300 bg-[#f8f8f8] print:bg-white"></td>
                    <td className="py-2 border-r border-t border-gray-300"></td>
                    <td className="py-2 border-r border-t border-gray-300 text-center">{format(companyTotal * succeedingYearCount)}</td>
                    <td className="py-2 text-center border-r border-t border-gray-300">{format(customerTotal * succeedingYearCount)}</td>
                  </tr>

                  {/* GRAND TOTAL ROW */}
                  <tr className="bg-[#f8f8f8] print:bg-white">
                    <td colSpan={3} rowSpan={3} className="border-0 p-0"></td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">Total</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2Cost)}</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2Revenue)}</td>
                    <td rowSpan={3} className="border-0 p-0 bg-[#f8f8f8] print:bg-white"></td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">Total</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceCost)}</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceRevenue)}</td>
                  </tr>

                  {/* ROI ROW */}
                  <tr className="bg-[#f8f8f8] print:bg-white">
                    <td className="py-3"></td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">ROI</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2ROI)}</td>
                    <td className="py-3"></td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">ROI</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceROI)}</td>
                  </tr>

                  {/* ROI % ROW */}
                  <tr className="bg-[#f8f8f8] print:bg-white">
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className={`py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[10px] ${roiPercentage >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {roiPercentage !== 0 ? `${roiPercentage.toFixed(2)}%` : ""}
                    </td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className={`py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[10px] ${overallSucceRoiPercentage >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {overallSucceRoiPercentage !== 0 ? `${overallSucceRoiPercentage.toFixed(2)}%` : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SucceTotals;