import React, { useMemo, useEffect } from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { calculateProjectPotentials } from "@/utils/calculations/freeuse/calculatProjectPotentials";
import { succeedingYears } from "@/utils/calculations/freeuse/succeedingYears";

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
const companyTotal = companyFees.reduce(
  (sum, fee) => sum + Number(fee.total || 0),
  0
);

const customerTotal = customerFees.reduce(
  (sum, fee) => sum + Number(fee.total || 0),
  0
);
  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  // Per-year values (2nd year block)
  const year2Cost = grandtotalCost;
  const year2Revenue = grandtotalSell;
  const year2ROI = grossProfit;

  // Overall succeeding years block (per-year x count)
  const overallSucceCost = grandtotalCost * succeedingYearCount;
  const overallSucceRevenue = grandtotalSell * succeedingYearCount;
  const overallSucceROI = grossProfit * succeedingYearCount;
  const overallSucceRoiPercentage =
    overallSucceCost !== 0 ? (overallSucceROI / overallSucceCost) * 100 : 0;

  // 2. FORMATTING HELPERS
  const format = (val) =>
    (Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const n = (val) => Number(val) || 0;

  // For Amount column total — grand total of all fees (company + customer)
  const grandTotalCostFees = Number(addFeesObj.total || 0);

  // 3. LIFETIME CONTEXT UPDATE (unchanged)
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
    <div className="my-2 font-sans font-medium tracking-tight text-[10px]">
      <div className="items-start text-[12px]">
        <div>
          <div className="w-full ">
            <div className="border-gray-300 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full bg-white table-fixed ">
                  <colgroup>
                    <col className="w-[30.7%]" />
                    <col className="w-[9.1%]" />
                    <col className="w-[1.4%]" />
                    <col className="w-[7.3%]" />
                    <col className="w-[10.7%]" />
                    <col className="w-[10.7%]" />
                    <col className="w-[1.4%]" />
                    <col className="w-[7.3%]" />
                    <col className="w-[10.7%]" />
                    <col className="w-[10.7%]" />
                  </colgroup>

                  <thead className="bg-[#E2F4D8]/70 text-[11px]">
                    <tr>
                      <th className="px-3 py-1 text-center uppercase border border-gray-300">OTHERS</th>
                      <th className="px-3 py-1 text-center border border-gray-300 uppercase print:text-[10px]">Amount</th>
                      <th className="px-3 py-1 text-center bg-white"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center bg-white"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                    </tr>
                  </thead>

                  <tbody className="text-[10px]">
                    {allAdditionalFees.length > 0 ? (
                      allAdditionalFees.map((fee, idx) => {
                        const isCompany = companyFees.some((cf) => cf.id === fee.id);
                        const feeQty = n(fee.qty);

                        return (
                          <tr key={fee.id || idx} className="border-x-gray-300 last:border-b-0">
                            <td className="border border-x-gray-300 border-gray-100 px-4 py-2 text-[12px] truncate border-r">
                              {fee.label}
                            </td>
                            <td className="border border-x-gray-300 border-gray-100 px-3 py-2 text-[11px] text-right border-r">
                              {format(fee.cost)}
                            </td>
                            <td className="py-2 border-r border-gray-300 bg-white"></td>

                            {/* 1st summary block (per year) */}
                            <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                              {feeQty}
                            </td>
                            <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                              {isCompany ? format(fee.total) : format(0)}
                            </td>
                            <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                              {!isCompany ? format(fee.total) : format(0)}
                            </td>

                            <td className="py-2 border-r border-gray-300 bg-white"></td>

                            {/* 2nd summary block (overall succeeding years) */}
                            <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                              {feeQty * succeedingYearCount}
                            </td>
                            <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                              {isCompany ? format(n(fee.total) * succeedingYearCount) : format(0)}
                            </td>
                            <td className="border border-x-gray-300 border-gray-100 py-2 text-center">
                              {!isCompany ? format(n(fee.total) * succeedingYearCount) : format(0)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="border border-gray-100 px-4 py-3 text-[11px] text-gray-600 truncate border-r">X</td>
                        <td className="border border-gray-100 px-3 py-3 text-right text-[11px] font-medium border-r">0.00</td>
                        <td className="py-2 border-r border-gray-300 bg-white"></td>
                        <td className="py-2 border-r font-bold text-center">0</td>
                        <td className="py-2 border-r font-bold text-center">0.00</td>
                        <td className="py-2 border-r font-bold text-center">0.00</td>
                        <td className="py-2 border-r border-gray-300 bg-white"></td>
                        <td className="py-2 border-r font-bold text-center">0</td>
                        <td className="py-2 border-r font-bold text-center">0.00</td>
                        <td className="py-2 font-bold text-center">0.00</td>
                      </tr>
                    )}

                    {/* TOTAL ROW */}
                    <tr className="bg-[#E2F4D8]/70 font-bold text-gray-800 shadow-sm">
                      <td className="px-3 py-2 text-[11px] uppercase border border-gray-300">Total</td>
                      <td className="px-3 py-2 text-right text-[11px] border-r border-y border-gray-300">
                      
                      </td>
                      <td className="py-2 border-r border-gray-300 bg-white"></td>
                      <td className="py-2 border-r border-t border-gray-300"></td>
                      <td className="py-2 border-r border-t border-gray-300 text-center">{format(companyTotal)}</td>
                      <td className="py-2 border-r border-t border-gray-300 text-center">{format(customerTotal)}</td>
                      <td className="py-2 border-r border-gray-300 bg-white"></td>
                      <td className="py-2 border-r border-t border-gray-300"></td>
                      <td className="py-2 border-r border-t border-gray-300 text-center">{format(companyTotal*succeedingYearCount)}</td>
                      <td className="py-2 text-center border-r border-t border-gray-300">{format(customerTotal*succeedingYearCount)}</td>
                    </tr>

                    {/* EXTRA ROW 1: Total */}
                    <tr className="bg-[#B5EBA2]/5">
                      <td colSpan={3} rowSpan={3} className="border-0 p-0"></td>
                      <td className="py-3 border border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">Total</td>
                      <td className="py-3 border-t border-r border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2Cost)}</td>
                      <td className="py-3 border-t border-r border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2Revenue)}</td>
                      <td rowSpan={3} className="border-0 p-0 bg-white"></td>
                      <td className="py-3 border border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">Total</td>
                      <td className="py-3 border-t border-r border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceCost)}</td>
                      <td className="py-3 border-t border-r border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceRevenue)}</td>
                    </tr>

                    {/* EXTRA ROW 2: ROI */}
                    <tr className="bg-[#B5EBA2]/5">
                      <td className="py-3"></td>
                      <td className="py-3 border-x border-y border-t-gray-300 border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">ROI</td>
                      <td className="py-3 border-x border-y border-gray-300 border-r-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2ROI)}</td>
                      <td className="py-3"></td>
                      <td className="py-3 border-x border-y border-t-gray-300 border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">ROI</td>
                      <td className="py-3 border-x border-y border-gray-300 border-r-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceROI)}</td>
                    </tr>

                    {/* EXTRA ROW 3: ROI % */}
                    <tr className="bg-[#B5EBA2]/5">
                      <td className="py-3 italic text-gray-400 text-center text-[9px]"></td>
                      <td className="py-3"></td>
                      <td className={`py-3 border-b border-x border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[10px] ${roiPercentage >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {roiPercentage.toFixed(2)}%
                      </td>
                      <td className="py-3 italic text-gray-400 text-center text-[9px]"></td>
                      <td className="py-3"></td>
                      <td className={`py-3 border-b border-x border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[10px] ${overallSucceRoiPercentage >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {overallSucceRoiPercentage.toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SucceTotals;