import React, { useMemo } from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { interest as calculateInterest } from "@/Utils/interest";

const InterestCalcuSum = () => {
  const { projectData } = useProjectData();

  // 1. Determine if contract type contains "outright"
  const isOutright = useMemo(() => {
    return projectData?.companyInfo?.contractType?.toLowerCase().includes('outright') || false;
  }, [projectData?.companyInfo?.contractType]);

  // Derived interest values (Safe-checked against outright contracts)
  const { percentMargin } = useMemo(() => {
    if (isOutright) {
      return { percentMargin: 0 };
    }
    return calculateInterest(projectData);
  }, [projectData, isOutright]);

  // Pull totals from context (saved by Totals.jsx useEffect)
  const totals = projectData?.totalProjectCost || {};
  const totalCost = Number(totals.grandTotalCost || 0);
  const totalROI = Number(totals.grandROI || 0);
  const roiPct = Number(totals.grandROIPercentage || 0);
  const totalSales = Number(totals.grandTotalRevenue || 0);

  // Updated Formatter: Returns blank string if value is 0
  const f = (num) => {
    const val = Number(num) || 0;
    if (val === 0) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Helper for percentage strings
  const formatPct = (num) => {
    const val = Number(num) || 0;
    if (val === 0) return "";
    return `${val.toFixed(2)}%`;
  };

  const annualInterestDisplay = isOutright
    ? "0%"
    : (projectData?.interest?.annualInterest ? `${projectData.interest.annualInterest}%` : "");

  const percentMarginDisplay = isOutright
    ? "0%"
    : (percentMargin ? `${percentMargin}%` : "");

  const mobileDetails = [
    { label: 'ANNUAL INTEREST', value: annualInterestDisplay || '---' },
    { label: 'PERCENT MARGIN', value: percentMarginDisplay || '---' },
    { label: 'TOTAL GROSS SALES', value: f(totalSales) || '---' },
    { label: 'TOTAL COST', value: f(totalCost) || '---' },
    {
      label: 'TOTAL ROI',
      value: f(totalROI) || '---',
      highlight: true,
      pctValue: formatPct(roiPct),
      pctPositive: roiPct > 0,
      pctNegative: roiPct < 0,
    },
  ];

  return (
    <>

{/* MOBILE: single box, CompanyInfoSum style */}
<div className='md:hidden mt-4 shadow rounded-xl overflow-hidden border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 bg-[#FBFFFA] print:hidden'>
  {/* Regular fields in a grid — padding only here */}
  <div className='grid grid-cols-2 sm:grid-cols-3 gap-4 px-4 py-4'>
    {mobileDetails
      .filter((item) => !item.highlight)
      .map((item, index) => (
        <div key={index} className='flex flex-col min-w-0'>
          <p className='text-[10px] text-gray-400 font-bold uppercase tracking-wider'>
            {item.label}
          </p>
          <p className='text-xs font-semibold pt-2 leading-tight break-words'>
            {item.value}
          </p>
        </div>
      ))}
  </div>

  {/* Total ROI: full-bleed footer bar, no side/bottom margin */}
  {mobileDetails
    .filter((item) => item.highlight)
    .map((item, index) => (
      <div
        key={index}
        className='flex flex-row items-center justify-between bg-[#E2F4D8] px-4 py-3'
      >
        <div className='flex flex-col'>
          <p className='text-[10px] text-gray-400 font-bold uppercase tracking-wider'>
            {item.label}
          </p>
          <p className='text-xs font-semibold pt-2 leading-tight break-words'>
            {item.value}
          </p>
        </div>

        {item.pctValue && (
          <div className='flex items-center justify-center flex-1'>
            <p
              className={`text-sm font-semibold ${
                item.pctPositive ? 'text-green-700' : item.pctNegative ? 'text-red-600' : ''
              }`}
            >
              ({item.pctValue})
            </p>
          </div>
        )}
      </div>
    ))}
</div>

      {/* DESKTOP (and print): original two-box table layout, unchanged */}
      <div className="hidden md:grid print:grid [grid-template-columns:40%_60%] items-start gap-4 mx-2 p-2 font-sans print:gap-2 print:p-0">
        {/* Left Table: Static Values */}
        <div className="overflow-hidden rounded-xl shadow border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 min-w-44 print:shadow-none print:border-[1px] print:border-gray-300">
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="w-[65%] bg-[#90E274]/10 py-2 px-2 pl-3 text-[11px] font-semibold print:font-medium">
                  Annual Interest
                </td>
                <td className="w-[35%] py-2 px-2 text-center font-medium border-l bg-white border-slate-300 text-xs">
                  {isOutright ? "0%" : (projectData?.interest?.annualInterest ? `${projectData.interest.annualInterest}%` : "")}
                </td>
              </tr>
              <tr>
                <td className="w-[65%] bg-[#90E274]/10 py-2 px-2 pl-3 text-[11px] font-semibold print:font-medium">
                  Percent Margin
                </td>
                <td className="w-[35%] py-2 px-2 text-center border-l font-medium bg-white border-slate-300 text-xs">
                  {isOutright ? "0%" : (percentMargin ? `${percentMargin}%` : "")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Column: Summary ROI Box */}
        <div className="flex justify-end w-full print:ml-2">
          <div className="shadow border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 rounded-xl overflow-hidden w-full mr-4 bg-white print:shadow-none print:border-[1px] print:border-gray-300">
            <table className="w-full text-[11px]">
              <colgroup>
                <col className="w-[40%] " />
                <col className="w-[60%] " />
              </colgroup>

              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold bg-[#E2F4D8]/20 text-[11px] print:font-medium">
                    Total Gross Sales
                  </td>
                  <td className="px-3 py-2 bg-white text-right border-l border-gray-300">
                    {f(totalSales)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold bg-[#E2F4D8]/20 text-[11px] print:font-medium">
                    Total Cost
                  </td>
                  <td className="px-3 py-2 bg-white text-right border-l border-gray-300">
                    {f(totalCost)}
                  </td>
                </tr>

                <tr className="bg-[#E2F4D8] font-semibold print:font-medium">
                  <td className="px-3 py-2 border-b border-gray-200">Total ROI</td>
                  <td className="px-3 py-2 text-right border-l border-y border-y-gray-200 border-gray-300">
                    {f(totalROI)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 text-[10px] text-gray-400 italic px-3"></td>
                  <td
                    className={`px-3 py-2 bg-white text-right border-l border-gray-300 ${
                      roiPct > 0 ? "text-green-700" : roiPct < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {formatPct(roiPct)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default InterestCalcuSum;