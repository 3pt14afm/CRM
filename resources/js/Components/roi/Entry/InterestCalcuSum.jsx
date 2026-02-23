import React from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { interest as calculateInterest } from "@/Utils/interest"; // adjust if your path is different

const InterestCalcuSum = () => {
  const { projectData } = useProjectData();

  // derived interest values
  const { percentMargin } = calculateInterest(projectData);

  // pull totals from context (saved by Totals.jsx useEffect)
  const totals = projectData?.totalProjectCost || {};
  const totalCost = Number(totals.grandTotalCost || 0);
  const totalROI = Number(totals.grandROI || 0);
  const roiPct = Number(totals.grandROIPercentage || 0);

  const f = (num) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(num || 0));

  return (
    <div className="grid [grid-template-columns:40%_60%] items-start gap-4 mx-2 p-2 font-sans print:gap-2 print:p-0">
      {/* Left Table: Static Values */}
      <div className="overflow-hidden rounded-md border border-slate-300 min-w-44 shadow-sm">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-[65%] bg-[#90E274]/10 py-2 px-2 pl-3 text-[12px] font-medium text-gray-800 print:font-semibold">
                Annual Interest
              </td>
              <td className="w-[35%] py-2 px-2 text-center font-medium border-l bg-white border-slate-300 text-xs text-gray-700">
                {projectData?.interest?.annualInterest}%
              </td>
            </tr>
            <tr>
              <td className="w-[65%] bg-[#90E274]/10 py-2 px-2 pl-3 text-[12px] font-medium text-gray-800 print:font-semibold">
                Percent Margin
              </td>
              <td className="w-[35%] py-2 px-2 text-center border-l font-medium bg-white border-slate-300 text-xs text-gray-700">
                {percentMargin}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Right Column: Summary ROI Box */}
      <div className="flex justify-end w-full print:ml-2">
        <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm w-full mr-4 bg-white">
          <table className="w-full text-[11px]">
            <colgroup>
            <col className="w-[40%] " />
            <col className="w-[60%] " />
          </colgroup>

            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-4 py-2.5 font-bold bg-[#E2F4D8]/20 text-[11px]">
                  Total Cost
                </td>
                <td className="px-4 py-2.5 bg-white text-right border-l border-gray-300">
                  {f(totalCost)}
                </td>
              </tr>

              <tr className="bg-[#E2F4D8] font-bold">
                <td className="px-4 py-2 border-b border-gray-200">Total ROI</td>
                <td className="px-4 py-2 text-right border-l border-y border-y-gray-200 border-gray-300">
                  {f(totalROI)}
                </td>
              </tr>

              <tr className="border-b border-gray-100">
                <td className="py-2 text-[10px] text-gray-400 italic px-4"></td>
                <td
                  className={`px-4 py-2 bg-white text-right border-l border-gray-300 ${
                    roiPct >= 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {roiPct.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InterestCalcuSum;
