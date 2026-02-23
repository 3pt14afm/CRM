import React, { useMemo, useEffect } from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { calculateProjectPotentials } from "@/utils/calculations/freeuse/calculatProjectPotentials";

function SucceTotals() {
  const { projectData, updateSection } = useProjectData();

  // 1. DATA DESTRUCTURING (same as your original Totals)
  const config = projectData?.machineConfiguration || {};
  const machineTotals = config.totals || {};

  const addFeesObj =
    projectData?.additionalFees || { company: [], customer: [], total: 0 };

  const companyFees = (addFeesObj.company || []).map((f) => ({
    ...f,
    __source: "company",
  }));
  const customerFees = (addFeesObj.customer || []).map((f) => ({
    ...f,
    __source: "customer",
  }));

  const allAdditionalFees = [...companyFees, ...customerFees];

  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  // 2. FORMATTING HELPER
  const format = (val) =>
    (Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const n = (val) => Number(val) || 0;

  // 3. DYNAMIC CALCULATIONS (same base logic)
  const totalItemsCost = machineTotals.totalCost || 0;
  const totalMachineSales = machineTotals.totalSell || 0;

  const totalCompanyFees = (addFeesObj.company || []).reduce(
    (sum, fee) => sum + (Number(fee.total) || 0),
    0
  );
  const totalCustomerFees = (addFeesObj.customer || []).reduce(
    (sum, fee) => sum + (Number(fee.total) || 0),
    0
  );

  const finalTotalCost = totalItemsCost + totalCompanyFees;
  const finalTotalRevenue = totalMachineSales + totalCustomerFees;
  const finalTotalROI = finalTotalRevenue - finalTotalCost;
  const roiPercentage =
    finalTotalCost !== 0 ? (finalTotalROI / finalTotalCost) * 100 : 0;

  // 2nd-year block (same as current values)
  const year2Cost = finalTotalCost;
  const year2Revenue = finalTotalRevenue;
  const year2ROI = finalTotalROI;

  // Overall succeeding-years block (2nd year x count of succeeding years)
  const overallSucceCost = finalTotalCost * succeedingYearCount;
  const overallSucceRevenue = finalTotalRevenue * succeedingYearCount;
  const overallSucceROI = finalTotalROI * succeedingYearCount;
  const overallSucceRoiPercentage =
    overallSucceCost !== 0 ? (overallSucceROI / overallSucceCost) * 100 : 0;

  // Keep your existing context update (unchanged)
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

  const grandTotalCostFees = Number(addFeesObj.total || 0);

  return (
    <div className="my-2 font-sans font-medium tracking-tight text-[10px]">
      <div className="items-start text-[12px]">
        <div>
          <div className="w-full ">
            <div className="border-gray-300 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full bg-white table-fixed ">
                  <colgroup>
                    <col className="w-[30.7%]" /> {/* OTHERS */}
                    <col className="w-[9.1%]" /> {/* Amount */}

                    {/* NEW separator after Amount */}
                    <col className="w-[1.4%]" />

                    {/* 1st summary block */}
                    <col className="w-[7.3%]" />  {/* Qty */}
                    <col className="w-[10.7%]" /> {/* Company */}
                    <col className="w-[10.7%]" /> {/* Customer */}

                    {/* separator between summary blocks */}
                    <col className="w-[1.4%]" />

                    {/* 2nd summary block */}
                    <col className="w-[7.3%]" />  {/* Qty */}
                    <col className="w-[10.7%]" /> {/* Company */}
                    <col className="w-[10.7%]" /> {/* Customer */}
                  </colgroup>

                  <thead className="bg-[#E2F4D8]/70 text-[11px]">
                    <tr>
                      <th className="px-3 py-1 text-center uppercase border border-gray-300">
                        OTHERS
                      </th>
                      <th className="px-3 py-1 text-center border border-gray-300 uppercase">
                        Amount
                      </th>

                      {/* NEW separator after Amount */}
                      <th className="px-3 py-1 text-center bg-white"></th>

                      {/* 1st summary block headers intentionally blank */}
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>

                      {/* separator between summary blocks */}
                      <th className="px-3 py-1 text-center bg-white"></th>

                      {/* 2nd summary block headers intentionally blank */}
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
                          <tr
                            key={fee.id || idx}
                            className=" border-x-gray-300  last:border-b-0"
                          >
                            <td className="border border-x-gray-300 border-gray-100 px-4 py-2 text-[12px] truncate border-r">
                              {fee.label}
                            </td>

                            <td className="border border-x-gray-300 border-gray-100 px-3 py-2 text-[11px] text-right border-r">
                              {format(fee.total)}
                            </td>

                            {/* NEW separator after Amount */}
                            <td className="py-2 border-r border-gray-300 bg-white"></td>

                            {/* 1st summary block (2nd year) */}
                            <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                              {feeQty}
                            </td>
                            <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                              {isCompany ? format(fee.total) : format(0)}
                            </td>
                            <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                              {!isCompany ? format(fee.total) : format(0)}
                            </td>

                            {/* separator between summary blocks */}
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
                      <tr >
                        <td className="border border-gray-100 px-4 py-3 text-[11px] text-gray-600 truncate border-r">
                          X
                        </td>
                        <td className="border border-gray-100 px-3 py-3 text-right text-[11px] font-medium border-r">
                          0.00
                        </td>

                        {/* NEW separator after Amount */}
                        <td className="py-2 border-r border-gray-300 bg-white"></td>

                        {/* 1st summary block */}
                        <td className="py-2 border-r font-bold text-center">0</td>
                        <td className="py-2 border-r font-bold text-center">0.00</td>
                        <td className="py-2 border-r font-bold text-center">0.00</td>

                        {/* separator between summary blocks */}
                        <td className="py-2 border-r border-gray-300 bg-white"></td>

                        {/* 2nd summary block */}
                        <td className="py-2 border-r font-bold text-center">0</td>
                        <td className="py-2 border-r font-bold text-center">0.00</td>
                        <td className="py-2 font-bold text-center">0.00</td>
                      </tr>
                    )}

                    {/* TOTAL ROW (summary calculations total row) */}
                    <tr className="bg-[#E2F4D8]/70 font-bold text-gray-800 shadow-sm">
                      <td className="px-3 py-2 text-[11px] uppercase border border-gray-300">
                        Total
                      </td>

                      <td className="px-3 py-2 text-right text-[11px] border-r border-y border-gray-300">
                        {format(grandTotalCostFees)}
                      </td>

                      {/* NEW separator after Amount */}
                      <td className="py-2 border-r border-gray-300 bg-white"></td>

                      {/* 1st summary block totals */}
                      <td className="py-2 border-r border-t border-gray-300"></td>
                      <td className="py-2 border-r border-t border-gray-300 text-center">
                        {format(year2Cost)}
                      </td>
                      <td className="py-2 border-r border-t border-gray-300 text-center">
                        {format(year2Revenue)}
                      </td>

                      {/* separator between summary blocks */}
                      <td className="py-2 border-r  border-gray-300 bg-white"></td>

                      {/* 2nd summary block totals */}
                      <td className="py-2 border-r border-t border-gray-300"></td>
                      <td className="py-2 border-r border-t border-gray-300 text-center">
                        {format(overallSucceCost)}
                      </td>
                      <td className="py-2 text-center border-r border-t border-gray-300">
                        {format(overallSucceRevenue)}
                      </td>
                    </tr>

                    {/* EXTRA ROW 1: Total */}
                    <tr className="bg-[#B5EBA2]/5">
                      {/* one big blank white block covering col 1 + 2 + new separator across 3 rows */}
                      <td colSpan={3} rowSpan={3} className="border-0 p-0"></td>

                      {/* 1st summary ROI box */}
                      <td className="py-3 border border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">
                        Total
                      </td>
                      <td className="py-3 border-t border-r border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(year2Cost)}
                      </td>
                      <td className="py-3 border-t border-r border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(year2Revenue)}
                      </td>

                      {/* separator column between summary blocks across 3 rows */}
                      <td rowSpan={3} className="border-0 p-0 bg-white"></td>

                      {/* 2nd summary ROI box */}
                      <td className="py-3 border border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">
                        Total
                      </td>
                      <td className="py-3 border-t border-r border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(overallSucceCost)}
                      </td>
                      <td className="py-3 border-t border-r border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(overallSucceRevenue)}
                      </td>
                    </tr>

                    {/* EXTRA ROW 2: ROI */}
                    <tr className="bg-[#B5EBA2]/5">
                      {/* 1st summary ROI row */}
                      <td className="py-3"></td>
                      <td className="py-3 border-x border-y border-t-gray-300 border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">
                        ROI
                      </td>
                      <td className="py-3 border-x border-y border-gray-300 border-r-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(year2ROI)}
                      </td>

                      {/* 2nd summary ROI row */}
                      <td className="py-3"></td>
                      <td className="py-3 border-x border-y border-t-gray-300 border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">
                        ROI
                      </td>
                      <td className="py-3 border-x border-y border-gray-300 border-r-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(overallSucceROI)}
                      </td>
                    </tr>

                    {/* EXTRA ROW 3: ROI % */}
                    <tr className="bg-[#B5EBA2]/5">
                      {/* 1st summary ROI % */}
                      <td className="py-3 italic text-gray-400 text-center text-[9px]"></td>
                      <td className="py-3"></td>
                      <td
                        className={`py-3 border-b border-x border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[10px] ${
                          roiPercentage >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {roiPercentage.toFixed(2)}%
                      </td>

                      {/* 2nd summary ROI % */}
                      <td className="py-3 italic text-gray-400 text-center text-[9px]"></td>
                      <td className="py-3"></td>
                      <td
                        className={`py-3 border-b border-x border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[10px] ${
                          overallSucceRoiPercentage >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {overallSucceRoiPercentage.toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SUMMARY ROI BOX REMOVED */}
        </div>
      </div>
    </div>
  );
}

export default SucceTotals;