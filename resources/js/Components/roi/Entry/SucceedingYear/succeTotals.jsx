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

  // =========================
  // MOBILE CARD HELPERS
  // =========================
  const MobileStat = ({ label, value, className = "" }) => (
    <div className="flex flex-col min-w-0">
      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-semibold pt-1 leading-tight break-words ${className}`}>{value}</p>
    </div>
  );

  const FeeCard = ({ fee }) => {
    const isA3ColorClick = fee.label?.toLowerCase().includes("a3 color click");
    const isCompany = companyFees.some((cf) => cf.id === fee.id);
    const feeQty = n(fee.qty);
    const feeCost = n(fee.cost);

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold truncate">{fee.label}</p>
          <MobileStat label="Cost" value={isA3ColorClick ? "" : format(fee.cost)} className="text-right" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 mt-1 border-t border-gray-100">
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Per Year</p>
            <MobileStat label="Qty" value={feeCost !== 0 ? nFormat(feeQty) : ""} />
            <MobileStat
              label={isCompany ? "Company Total" : "Customer Total"}
              value={format(fee.total)}
            />
          </div>
          <div className="flex flex-col gap-1.5 pl-3 border-l border-gray-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Succeeding Yrs</p>
            <MobileStat label="Qty" value={feeCost !== 0 ? nFormat(feeQty * succeedingYearCount) : ""} />
            <MobileStat
              label={isCompany ? "Company Total" : "Customer Total"}
              value={format(n(fee.total) * succeedingYearCount)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="my-2 font-sans tracking-tight text-[10px]">
      {/* ============================================================ */}
      {/* MOBILE VIEW: CARD-BASED LAYOUT                                */}
      {/* ============================================================ */}
      <div className="md:hidden print:hidden flex flex-col gap-4">

        {/* ADDITIONAL FEES SECTION */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-gray-600 bg-[#E2F4D8]/70 rounded px-3 py-1.5">
            Others (Fees)
          </p>
          {allAdditionalFees.length > 0 && (
            allAdditionalFees.map((fee, idx) => <FeeCard key={fee.id || idx} fee={fee} />)
          )}

          {/* FEES TOTAL CARD */}
          <div className="rounded-lg bg-[#E2F4D8]/70 p-3 flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase text-gray-800">Fees Total</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Per Year</p>
                <MobileStat label="Company Total" value={format(companyTotal)} />
                <MobileStat label="Customer Total" value={format(customerTotal)} />
              </div>
              <div className="flex flex-col gap-1.5 pl-3 border-l border-gray-300">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Succeeding Yrs</p>
                <MobileStat label="Company Total" value={format(companyTotal * succeedingYearCount)} />
                <MobileStat label="Customer Total" value={format(customerTotal * succeedingYearCount)} />
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY: TOTAL / ROI FOOTER */}
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <div className="grid grid-cols-2 gap-3 bg-[#E2F4D8] px-4 py-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Per Year</p>
              <MobileStat label="Total Cost" value={format(year2Cost)} />
              <MobileStat label="Total Revenue" value={format(year2Revenue)} />
            </div>
            <div className="flex flex-col gap-1.5 pl-3 border-l border-white/60">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Succeeding Yrs</p>
              <MobileStat label="Total Cost" value={format(overallSucceCost)} />
              <MobileStat label="Total Revenue" value={format(overallSucceRevenue)} />
            </div>
          </div>

          <div className="flex flex-row items-center justify-between bg-[#E2F4D8] px-4 py-3 border-t border-white/60">
            <div className="flex flex-col">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ROI (Per Year)</p>
              <p className="text-xs font-semibold pt-1 leading-tight break-words">
                {format(year2ROI)}
              </p>
            </div>
            <div className="flex items-center justify-center flex-1">
              <p
                className={`text-xs font-semibold ${
                  roiPercentage >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {roiPercentage !== 0 ? `(${roiPercentage.toFixed(2)}%)` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-row items-center justify-between bg-[#E2F4D8] px-4 py-3 border-t border-white/60">
            <div className="flex flex-col">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ROI (Succeeding Yrs)</p>
              <p className="text-xs font-semibold pt-1 leading-tight break-words">
                {format(overallSucceROI)}
              </p>
            </div>
            <div className="flex items-center justify-center flex-1">
              <p
                className={`text-xs font-semibold ${
                  overallSucceRoiPercentage >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {overallSucceRoiPercentage !== 0 ? `(${overallSucceRoiPercentage.toFixed(2)}%)` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP VIEW: ORIGINAL TABLE LAYOUT (unchanged)                */}
      {/* ============================================================ */}
      <div className="hidden md:block print:block items-start text-[12px]">
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