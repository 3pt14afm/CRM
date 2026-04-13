import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachConSucceMerged() {
  const { projectData } = useProjectData();

  // =========================
  // FROM MachConSucce
  // =========================
  const { machine = [], consumable = [] } = projectData.machineConfiguration || {};

  const filteredMachine = machine.filter((m) => m.sku && m.sku.trim() !== '');
  const filteredConsumable = consumable.filter((c) => c.sku && c.sku.trim() !== '');

  const normalMachines = filteredMachine.filter(
    (m) => m.mode !== 'others' && m.type !== 'others'
  );

  const othersMachines = filteredMachine.filter(
    (m) => m.mode === 'others' || m.type === 'others'
  );

  const formatNum = (val, decimals = 2) =>
    (Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  // =========================
  // FROM SucceedingYearsPotential
  // =========================
  const yearData = projectData?.yearlyBreakdown?.[2] || {};
  const { machines = [], consumables = [] } = yearData;

  const contractType = projectData?.companyInfo?.contractType || '';
  const normalizedContractType = String(contractType).trim().toLowerCase();

  const isRentalClick =
    normalizedContractType === 'rental + click' ||
    normalizedContractType === 'rental+click';

  const isFixClick =
    normalizedContractType === 'fix click' ||
    normalizedContractType === 'fixed click';

  const usesExactClickQtyDisplay = isRentalClick || isFixClick;

  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  const format = (val) =>
    (Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatQty = (val) => (Number(val) || 0).toLocaleString();

  const formatConsumableQty = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return usesExactClickQtyDisplay ? '0.00' : 0;

    if (usesExactClickQtyDisplay) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return (Number(val) || 0).toLocaleString();
  };

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

  const normalPotentialMachines = machines.filter(
    (m) => m.mode !== 'others' && m.type !== 'others'
  );

  const othersPotentialMachines = machines.filter(
    (m) => m.mode === 'others' || m.type === 'others'
  );

  const consumablesOnlyTotalCost = consumables.reduce(
    (sum, c) => sum + (Number(c.totalCost) || 0),
    0
  );

  const consumablesOnlyTotalSales = consumables.reduce(
    (sum, c) => sum + (Number(c.totalSell) || 0),
    0
  );

  // =========================
  // ROW MATCHING HELPERS
  // =========================
  const buildRows = (leftRows, middleRows, rightRows) => {
    const max = Math.max(leftRows.length, middleRows.length, rightRows.length);
    return Array.from({ length: max }, (_, i) => ({
      left: leftRows[i] || null,
      middle: middleRows[i] || null,
      right: rightRows[i] || null,
    }));
  };

  const machineRows = buildRows(
    normalMachines,
    normalPotentialMachines,
    normalPotentialMachines
  );

  const consumableRows = buildRows(
    filteredConsumable,
    consumables,
    consumables
  );

  const othersRows = buildRows(
    othersMachines,
    othersPotentialMachines,
    othersPotentialMachines
  );

  return (
    <div className="font-sans tracking-tight mb-4">
      <div className="grid grid-cols-[30.7%_9.1%_1.4%_7.3%_10.7%_10.7%_1.4%_7.3%_10.7%_10.7%] mb-2">
        <div className="col-span-3"></div>

        <div className="col-span-3 text-center pr-1">
          <span className="text-[17px] print:text-sm print:font-medium font-bold uppercase tracking-tight text-gray-700">
            {rangeTitle}
          </span>
        </div>

        <div></div>

        <div className="col-span-3 text-center pr-1">
          <span className="text-[17px] print:text-sm print:font-medium font-bold uppercase tracking-tight text-gray-700">
            Total Succeeding Years
          </span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden ">
        <table className="w-full bg-[#f8f8f8] print:bg-white border-collapse table-fixed">
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

          <thead className="bg-[#E2F4D8] border-x border-gray-300">
            <tr className="h-14">
              <th className="px-3 py-2.5 text-[13px] font-medium text-center border-r border-t border-gray-300">
                MACHINE & CONSUMABLES
              </th>
              <th className="px-3 py-2.5 text-[13px] font-medium text-center border-r border-t border-gray-300">
                COST
              </th>
              <th className="bg-[#f8f8f8] print:bg-white"></th>
              <th className="px-1 py-2.5 text-[13px] text-center font-medium border-x border-t border-gray-300 uppercase">
                Qty
              </th>
              <th className="px-1 py-2.5 text-[13px] text-center font-medium border-r border-t border-gray-300 uppercase">
                Total Cost
              </th>
              <th className="px-1 py-2.5 text-[13px] text-center font-medium border-r border-t border-gray-300 uppercase">
                Gross Sales
              </th>
              <th className="bg-[#f8f8f8] print:bg-white"></th>
              <th className="px-1 py-2.5 text-[13px] text-center font-medium border-x border-t border-gray-300 uppercase">
                Qty
              </th>
              <th className="px-1 py-2.5 text-[13px] text-center font-medium border-r border-t border-gray-300 uppercase">
                Total Cost
              </th>
              <th className="px-1 py-2.5 text-[13px] text-center font-medium border-t border-gray-300 uppercase">
                Gross Sales
              </th>
            </tr>
          </thead>

          <tbody className="text-[12px]">
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300">
              <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x-0 border-l border-l-gray-300">
                MACHINE
              </td>
              <td className="bg-[#f8f8f8] print:bg-white border-x border-gray-300"></td>
              <td className="py-1 border border-gray-200 border-x-0 border-l border-l-gray-300"></td>
              <td className="py-1 border border-gray-200 border-x-0"></td>
              <td className="py-1 border border-gray-200 border-x-0 border-r border-r-gray-300"></td>
              <td className="bg-[#f8f8f8] print:bg-white"></td>
              <td className="py-1 border border-gray-200 border-x-0 border-l border-l-gray-300"></td>
              <td className="py-1 border border-gray-200 border-x-0"></td>
              <td className="py-1 border border-gray-200 border-x-0 border-r border-r-gray-300"></td>
            </tr>

            {machineRows.length > 0 ? (
              machineRows.map((row, index) => {
                const left = row.left;

                return (
                  <tr
                    key={`machine-row-${index}`}
                    className=" border-x border-x-gray-300 border-gray-100 bg-white align-middle"
                  >
                    <td className="px-7 py-3 text-[12px] break-words uppercase border-r border-gray-200">
                      {left ? left.sku : ''}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-center border-r border-gray-300">
                      {left ? formatNum(0) : ''}
                    </td>
                    <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                    <td className="px-1 py-3 text-[12px] text-center border-x border-gray-200">
                      {formatQty(0)}
                    </td>
                    <td className="text-[12px] text-center px-1 py-3 border-x border-gray-200">
                      {format(0)}
                    </td>
                    <td className="text-[12px] text-center px-1 py-3 border-r border-gray-300">
                      {format(0)}
                    </td>

                    <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                    <td className="px-1 py-3 text-[12px] text-center border-x border-gray-200">
                      {formatQty(0)}
                    </td>
                    <td className="text-[12px] text-center px-1 py-3 border-x border-gray-200">
                      {format(0)}
                    </td>
                    <td className="text-[12px] text-center px-1 py-3 border-r border-gray-300">
                      {format(0)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-x border-x-gray-300 border-gray-100 bg-white">
                <td className="px-7 py-3 text-[12px] border-r border-gray-300">—</td>
                <td className="px-3 py-3 text-[12px] text-center border-r border-gray-300">
                  {formatNum(0)}
                </td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-[12px] text-center">0</td>
                <td className="text-[12px] text-center px-1 py-3">{format(0)}</td>
                <td className="text-[12px] text-center px-1 py-3 border-r border-gray-300">
                  {format(0)}
                </td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-[12px] text-center">0</td>
                <td className="text-[12px] text-center px-1 py-3">{format(0)}</td>
                <td className="text-[12px] text-center px-1 py-3">{format(0)}</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x border-x-gray-300">
                CONSUMABLES
              </td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
              <td className="py-1 border border-gray-200 border-x-0"></td>
              <td className="py-1 border-y border-gray-200"></td>
              <td className="py-1 border-y border-gray-200 border-r border-r-gray-300"></td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
              <td className="py-1 border border-gray-200 border-x-0"></td>
              <td className="py-1 border-y border-gray-200"></td>
              <td className="py-1 border-y border-gray-200 border-r border-r-gray-300"></td>
            </tr>

            {consumableRows.length > 0 ? (
              consumableRows.map((row, index) => {
                const left = row.left;
                const middle = row.middle;
                const right = row.right;

                return (
                  <tr
                    key={`consumable-row-${index}`}
                    className=" border-x border-x-gray-300 border-gray-100 bg-white align-middle"
                  >
                    <td className="px-7 py-3 text-[12px] break-words border-r border-b border-gray-200">
                      {left ? left.sku : ''}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-center border-r border-r-gray-300 border-b border-gray-200">
                      {left ? formatNum(left.cost) : ''}
                    </td>
                    <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                    <td className="px-1 py-3 text-[12px] text-center border-r border-r-gray-200 border-b border-gray-200">
                      {middle ? formatConsumableQty(n(middle.qty)) : ''}
                    </td>
                    <td className="text-[12px] text-center px-1 py-3 border-b border-gray-200">
                      {middle ? format(n(middle.totalCost)) : ''}
                    </td>
                    <td className="text-[12px] text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">
                      {middle ? format(n(middle.totalSell)) : ''}
                    </td>

                    <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                    <td className="px-1 py-3 text-[12px] text-center border-r border-r-gray-200 border-b border-gray-200">
                      {right ? formatConsumableQty(n(right.qty) * succeedingYearCount) : ''}
                    </td>
                    <td className="text-[12px] text-center px-1 py-3 border-b border-gray-200">
                      {right ? format(n(right.totalCost) * succeedingYearCount) : ''}
                    </td>
                    <td className="text-[12px] text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">
                      {right ? format(n(right.totalSell) * succeedingYearCount) : ''}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-x border-x-gray-300 border-gray-100 bg-white">
                <td className="px-7 py-3 text-[12px] border-r border-gray-300">—</td>
                <td className="px-3 py-3 text-[12px] text-center border-r border-gray-300">
                  {formatNum(0)}
                </td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-[12px] text-center">{formatConsumableQty(0)}</td>
                <td className="text-[12px] text-center px-1 py-3">{format(0)}</td>
                <td className="text-[12px] text-center px-1 py-3 border-r border-gray-300">
                  {format(0)}
                </td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-[12px] text-center">{formatConsumableQty(0)}</td>
                <td className="text-[12px] text-center px-1 py-3">{format(0)}</td>
                <td className="text-[12px] text-center px-1 py-3">{format(0)}</td>
              </tr>
            )}

            {othersRows.length > 0 && (
              <>
                <tr className="bg-[#E2F4D8]/30 border-x border-x-gray-300 border-gray-200">
                  <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x border-x-gray-300">
                    OTHERS
                  </td>
                  <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                  <td className="py-1 border border-gray-200 border-x-0"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                  <td className="py-1 border-y border-gray-200 border-r border-r-gray-300"></td>
                  <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                  <td className="py-1 border border-gray-200 border-x-0"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                  <td className="py-1 border-y border-gray-200 border-r border-r-gray-300"></td>
                </tr>

                {othersRows.map((row, index) => {
                  const left = row.left;

                  return (
                    <tr
                      key={`others-row-${index}`}
                      className=" border-x border-x-gray-300 border-gray-100 bg-white align-middle"
                    >
                      <td className="px-7 py-3 text-[12px] break-words uppercase border-r border-b border-gray-200">
                        {left ? left.sku : ''}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-center border-r border-r-gray-300 border-b border-gray-200">
                        {left ? formatNum(0) : ''}
                      </td>
                      <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                      <td className="px-1 py-3 text-[12px] text-center border-r border-r-gray-200 border-b border-gray-200">
                        {formatQty(0)}
                      </td>
                      <td className="text-[12px] text-center px-1 py-3 border-b border-gray-200">
                        {format(0)}
                      </td>
                      <td className="text-[12px] text-center px-1 py-3  border-r border-r-gray-300 border-b border-x border-gray-200 ">
                        {format(0)}
                      </td>

                      <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                      <td className="px-1 py-3 text-[12px] text-center border-r border-r-gray-200 border-b border-gray-200">
                        {formatQty(0)}
                      </td>
                      <td className="text-[12px] text-center px-1 py-3 border-b border-gray-200">
                        {format(0)}
                      </td>
                      <td className="text-[12px] text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">
                        {format(0)}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            <tr className="bg-[#E2F4D8] border-x border-x-gray-300 font-semibold border-gray-100">
              <td className="px-4 py-3 text-[12px] text-left font-bold border border-gray-300"></td>
              <td className="px-3 py-3 text-[12px] text-center border border-gray-300"></td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300 border-b-0"></td>

              <td className="px-1 py-3 text-[12px] text-center font-bold border border-gray-300"></td>
              <td className="text-[12px] text-center px-1 py-3 font-bold border border-gray-300">
                {format(consumablesOnlyTotalCost)}
              </td>
              <td className="text-[12px] text-center px-1 py-3 font-bold border border-gray-300">
                {format(consumablesOnlyTotalSales)}
              </td>

              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300 border-b-0"></td>

              <td className="px-1 py-3 text-[12px] text-center font-bold border border-gray-300"></td>
              <td className="text-[12px] text-center px-1 py-3 font-bold border border-gray-300">
                {format(consumablesOnlyTotalCost * succeedingYearCount)}
              </td>
              <td className="text-[12px] text-center px-1 py-3 font-bold border border-gray-300">
                {format(consumablesOnlyTotalSales * succeedingYearCount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MachConSucceMerged;