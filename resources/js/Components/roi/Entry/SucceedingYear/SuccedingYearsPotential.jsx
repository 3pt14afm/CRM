import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function SucceedingYearsPotential({ yearNumber = 2 }) {
  const { projectData } = useProjectData();

  // Always use the selected succeeding-year data (default: 2nd year)
  const yearData = projectData?.yearlyBreakdown?.[yearNumber] || {};

  const {
    machines = [],
    consumables = [],
  } = yearData;

  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0); // starts at 2nd year

  const format = (val) =>
    (Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatQty = (val) => (Number(val) || 0).toLocaleString();

  const n = (val) => Number(val) || 0;

  const getOrdinal = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (k >= 11 && k <= 13) return `${num}th`;
    if (j === 1) return `${num}st`;
    if (j === 2) return `${num}nd`;
    if (j === 3) return `${num}rd`;
    return `${num}th`;
  };

  const rangeTitle =
    contractYears > 2
      ? `2nd-${getOrdinal(contractYears)} Year Potential`
      : '2nd Year Potential';

  // Succeeding years totals should only use consumables
  const consumablesOnlyTotalCost = consumables.reduce(
    (sum, c) => sum + (Number(c.totalCost) || 0),
    0
  );

  const consumablesOnlyTotalSales = consumables.reduce(
    (sum, c) => sum + (Number(c.totalSell) || 0),
    0
  );

  const renderTable = ({ title, multiplier = 1 }) => (
    <div className="flex-1 min-w-0">
      {/* TITLE SECTION */}
      <div className="text-center mb-2 pr-1">
        <span className="text-[17px] print:text-sm print:font-medium font-bold uppercase tracking-tight text-gray-700">
          {title}
        </span>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm">
        <table className="w-full bg-white border-collapse table-fixed">
          <thead className="bg-[#E2F4D8] border-b border-gray-300">
            <tr>
              <th className="w-1/4 px-1 py-2.5 text-[13px] text-center font-medium uppercase print:text-xs print:font-semibold">
                Qty
              </th>
              <th className="w-3/8 px-1 py-2.5 text-[13px] text-center font-medium border-l print:text-xs print:font-semibold border-gray-300 uppercase">
                Total Cost
              </th>
              <th className="w-3/8 px-1 py-2.5 text-[13px] text-center font-medium border-l print:text-xs print:font-semibold border-gray-300 uppercase">
                Gross Sales
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Blank row for machines section */}
            <tr className="bg-[#E2F4D8]/40 border-b h-[27px] print:h-[24px]">
              <td className="py-3 print:py-2"></td>
              <td className="py-3 print:py-2"></td>
              <td className="py-3 print:py-2"></td>
            </tr>

            {/* Machines are shown for reference only in succeeding years (all values = 0) */}
            {machines.length > 0 ? (
              machines.map((_, index) => (
                <tr key={`m-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-1 py-3 text-[12px] text-center print:py-2">
                    {formatQty(0)}
                  </td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-2 flex flex-col gap-1 print:py-2">
                    <p>{format(0)}</p>
                    <p className="text-[11px] text-blue-700 italic">{format(0)}</p>
                  </td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">
                    {format(0)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100">
                <td className="px-1 py-3 text-[12px] text-center print:py-2">0</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-2 flex flex-col gap-1 print:py-2">
                  <p>{format(0)}</p>
                  <p className="text-[11px] text-blue-700 italic">{format(0)}</p>
                </td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">
                  {format(0)}
                </td>
              </tr>
            )}

            {/* Blank row for consumables section (same style as Potentials) */}
            <tr className="bg-[#E2F4D8]/40 border-b h-[27px] print:h-[24px]">
              <td className="py-3 print:py-2"></td>
              <td className="py-3 print:py-2"></td>
              <td className="py-3 print:py-2"></td>
            </tr>

            {consumables.length > 0 ? (
              consumables.map((c, index) => (
                <tr key={`c-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-1 py-3 text-[12px] text-center print:py-2">
                    {formatQty(n(c.qty) * multiplier)}
                  </td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">
                    {format(n(c.totalCost) * multiplier)}
                  </td>
                  <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">
                    {format(n(c.totalSell) * multiplier)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100">
                <td className="px-1 py-3 text-[12px] text-center print:py-2">0</td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">
                  {format(0)}
                </td>
                <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 print:py-2">
                  {format(0)}
                </td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8] border-b font-semibold print:font-normal border-gray-100 last:border-b-0">
              <td className="px-1 py-3 text-[12px] text-center font-bold"></td>
              <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 font-bold">
                {format(consumablesOnlyTotalCost * multiplier)}
              </td>
              <td className="border-l text-[12px] border-gray-100 text-center px-1 py-3 font-bold">
                {format(consumablesOnlyTotalSales * multiplier)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="pt-0 print:px-1">
      <div className="flex flex-row gap-4 items-start">
        {renderTable({
          title: rangeTitle,
          multiplier: 1,
        })}

        {renderTable({
          title: 'Total Succeeding Years',
          multiplier: succeedingYearCount,
        })}
      </div>
    </div>
  );
}

export default SucceedingYearsPotential;