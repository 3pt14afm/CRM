import React, { useMemo, useEffect } from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { calculateProjectPotentials } from "@/utils/calculations/freeuse/calculatProjectPotentials";

function Totals() {
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

  // 2. FORMATTING HELPER (Potentials-style)
  const format = (val) =>
    (Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // 3. DYNAMIC CALCULATIONS (EXACTLY your original Totals calculations)
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

  // Keep this display as you already had (left Amount total)
  const grandTotalCostFees = Number(addFeesObj.total || 0);

  return (
    <div className="my-2 font-sans font-medium w-full tracking-tight text-[10px]">
      <div className="items-start text-[12px]">
        <div>
          <div className="w-full ">
            <div className=" border-gray-300 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full bg-white table-fixed ">
                  <colgroup>
                    <col className="w-[31%]" /> {/* OTHERS */}
                    <col className="w-[9%]" /> {/* Amount */}
                    <col className="w-[32%]" /> {/* label column / extra column */}
                    <col className="w-[7%]" /> {/* Qty */}
                    <col className="w-[11%]" /> {/* Company */}
                    <col className="w-[11%]" /> {/* Customer */}
                  </colgroup>

                  <thead className="bg-[#E2F4D8]/70 border border-gray-300 text-[11px]">
                    <tr>
                      <th className="px-3 py-1 text-center uppercase border border-gray-300">OTHERS</th>
                      <th className="px-3 py-1 text-center border border-gray-300 uppercase">
                        Amount
                      </th>

                      {/* 3rd column header intentionally blank */}
                      <th className="px-3 py-1 text-center border border-gray-300"></th>

                      {/* last 3 headers intentionally blank */}
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                      <th className="px-3 py-1 text-center border border-gray-300"></th>
                    </tr>
                  </thead>

                  <tbody className="text-[10px]">
                    {allAdditionalFees.length > 0 ? (
                      allAdditionalFees.map((fee, idx) => {
                        // EXACT Potentials Summary Calculations logic:
                        const isCompany = companyFees.some((cf) => cf.id === fee.id);

                        return (
                          <tr
                            key={fee.id || idx}
                            className="border border-x-gray-300 border-gray-100 last:border-b-0"
                          >
                            <td className="px-4 py-2 text-[12px] truncate border-r">
                              {fee.label}
                            </td>

                            <td className="px-3 py-2 text-[11px] text-right border-r">
                              {format(fee.total)}
                            </td>

                            {/* 3rd column blank for fee rows */}
                            <td className="px-3 py-2 text-[11px] text-center border-r"></td>

                            {/* moved SUMMARY CALCULATIONS columns */}
                            <td className="w-1/4 py-2 border-r  text-center">
                              {fee.qty || 0}
                            </td>
                            <td className="w-3/8 py-2 border-r text-center">
                              {isCompany ? format(fee.total) : format(0)}
                            </td>
                            <td className="w-3/8 py-2 text-center">
                              {!isCompany ? format(fee.total) : format(0)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border border-gray-100">
                        <td className="px-4 py-3 text-[11px] text-gray-600 truncate border-r">
                          X
                        </td>
                        <td className="px-3 py-3 text-right text-[11px] font-medium border-r">
                          0.00
                        </td>
                        <td className="px-3 py-3 text-center text-[11px] border-r"></td>

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

                      <td className="px-3 py-2 text-center text-[11px] border-r border-y border-gray-300"></td>

                      <td className="py-2 border-r border-t border-gray-300"></td>
                      <td className="py-2 border-r border-t border-gray-300 text-center">
                        {format(finalTotalCost)}
                      </td>
                      <td className="py-2 text-center border-r border-t border-gray-300 ">
                        {format(finalTotalRevenue)}
                      </td>
                    </tr>

                    {/* EXTRA ROW 1: Total (label in 4th column) */}
                    <tr className="bg-[#B5EBA2]/5">
                      {/* one big blank white block covering col 1 + 2 + 3 across 3 rows */}
                      <td colSpan={3} rowSpan={3} className=" border-0 p-0"></td>

                      <td className="py-3 border border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">
                        Total
                      </td>
                      <td className="py-3 border-t border-r border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(finalTotalCost)}
                      </td>
                      <td className="py-3 border-t border-r border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(finalTotalRevenue)}
                      </td>
                    </tr>

                    {/* EXTRA ROW 2: ROI (label in 4th column) */}
                    <tr className="bg-[#B5EBA2]/5">
                      
                      <td className="py-3"></td>
                      <td className="py-3 border-x border-y border-t-gray-300 border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">
                        ROI
                      </td>
                      <td className="py-3 border-x border-y border-gray-300 border-r-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[11px]">
                        {format(finalTotalROI)}
                      </td>
                    </tr>

                    {/* EXTRA ROW 3: blank label (4th column) + ROI % */}
                    <tr className="bg-[#B5EBA2]/5">
                      <td className="py-3  italic text-gray-400 text-center text-[9px]"></td>
                      <td className="py-3"></td>
                      <td
                        className={`py-3 border-b border-x border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[10px] ${
                          roiPercentage >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {roiPercentage.toFixed(2)}%
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

export default Totals;