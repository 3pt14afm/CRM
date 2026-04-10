import React, { useMemo, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { calculateProjectPotentials } from '@/utils/calculations/freeuse/calculatProjectPotentials';
import { get1YrPotential } from '@/utils/calculations/freeuse/get1YrPotential';

function MachCon1stYearMerged({ title = "1st Year Potential", yearNumber = 1 }) {
  const { projectData, updateSection } = useProjectData();

  // =========================
  // FROM MachCon1stY
  // =========================
  const { machine = [], consumable = [], totals = {} } = projectData.machineConfiguration || {};

  const contractType = projectData?.companyInfo?.contractType || "";
  const isOutright = contractType.toLowerCase().includes("outright");

  const filteredMachine = machine.filter(m => m.sku && m.sku.trim() !== '');
  const filteredConsumable = consumable.filter(c => c.sku && c.sku.trim() !== '');

  const normalMachines = filteredMachine.filter(
    m => m.mode !== 'others' && m.type !== 'others'
  );

  const othersMachines = filteredMachine.filter(
    m => m.mode === 'others' || m.type === 'others'
  );

  const manualTotalSellingPrice = [
    ...normalMachines.map(m => isOutright ? (Number(m.price) || 0) : 0),
    ...othersMachines.map(m => isOutright ? (Number(m.price) || 0) : 0),
    ...filteredConsumable.map(c => (Number(c.price) || 0))
  ].reduce((sum, val) => sum + val, 0);

  const manualTotalSellCpp =
    totals.yields > 0 ? manualTotalSellingPrice / totals.yields : 0;

  const formatNum = (val, decimals = 2) =>
    (Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

  // =========================
  // FROM Potentials
  // =========================
  const yearData = projectData?.yearlyBreakdown?.[yearNumber] || {};

  const {
    machines = [],
    consumables = [],
    bundleDeduction,
    firstYearTotalCost,
    fistYearTotalSell,
  } = yearData;

  const normalizedContractType = String(contractType).trim().toLowerCase();

  const isRentalClick =
    normalizedContractType === "rental + click" ||
    normalizedContractType === "rental+click";

  const isFixClick =
    normalizedContractType === "fix click" ||
    normalizedContractType === "fixed click";

  const usesExactClickQtyDisplay = isRentalClick || isFixClick;

  const format = (val) => (Number(val) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

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

  const normalPotentialMachines = machines.filter(
    m => m.mode !== 'others' && m.type !== 'others'
  );

  const othersPotentialMachines = machines.filter(
    m => m.mode === 'others' || m.type === 'others'
  );

  // =========================
  // FROM Totals
  // =========================
  const firstYear = useMemo(() => get1YrPotential(projectData), [projectData]);

  const {
    grandtotalCost: finalTotalCost,
    grandtotalSell: finalTotalRevenue,
    grossProfit: finalTotalROI,
    roiPercentage,
    companyFees,
    customerFees,
  } = firstYear;

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
  // ROW MATCHING HELPERS
  // =========================
  const buildRows = (leftRows, rightRows) => {
    const max = Math.max(leftRows.length, rightRows.length);
    return Array.from({ length: max }, (_, i) => ({
      left: leftRows[i] || null,
      right: rightRows[i] || null,
    }));
  };

  const machineRows = buildRows(normalMachines, normalPotentialMachines);
  const consumableRows = buildRows(filteredConsumable, consumables);
  const othersRows = buildRows(othersMachines, othersPotentialMachines);

  return (
    <div className="font-sans tracking-tight">
      <div className="grid grid-cols-[69.3%_1.4%_29.3%] mb-2">
        <div></div>
        <div></div>
        <div className="text-center pr-1">
          <span className="text-[17px] font-bold print:font-medium print:text-sm uppercase tracking-tight text-gray-700">
            {title}
          </span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden">
        <table className="w-full bg-[#f8f8f8] border-collapse table-fixed">
          <colgroup>
            <col className="w-[30.7%]" />
            <col className="w-[9.1%]" />
            <col className="w-[8.4%]" />
            <col className="w-[6%]" />
            <col className="w-[9.1%]" />
            <col className="w-[6.3%]" />
            <col className="w-[1.4%]" />
            <col className="w-[7.3%]" />
            <col className="w-[10.7%]" />
            <col className="w-[10.7%]" />
          </colgroup>

          <thead className="bg-[#E2F4D8] border-x border-gray-300">
            <tr className="h-14">
              <th className="px-3 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                MACHINE & CONSUMABLES
              </th>
              <th className="px-2 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                COST
              </th>
              <th className="px-2 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                YIELDS
              </th>
              <th className="px-2 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                COST <br /> CPP
              </th>
              <th className="px-2 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                SELLING <br /> PRICE
              </th>
              <th className="px-2 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                SELL CPP
              </th>
              <th className="bg-[#f8f8f8] border-r border-gray-300"></th>
              <th className="px-2 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                QTY
              </th>
              <th className="px-2 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                TOTAL <br /> COST
              </th>
              <th className="px-2 py-2.5 text-[13px] font-medium text-center border border-gray-300">
                GROSS <br /> SALES
              </th>
            </tr>
          </thead>

          <tbody className="text-[12px]">
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={6} className="px-4 py-1 font-semibold border-r border-b border-gray-300">
                MACHINE
              </td>
              <td className="bg-[#f8f8f8] border-r border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
            </tr>

            {machineRows.length > 0 ? (
              machineRows.map((row, index) => {
                const m = row.left;
                const p = row.right;

                const effectivePrice = m ? (isOutright ? (m.price || 0) : 0) : 0;
                const effectiveSellCpp = m && m.yields > 0 ? effectivePrice / m.yields : 0;

                return (
                  <tr key={`machine-row-${index}`} className="border-x border-x-gray-300 border-gray-100 bg-white align-middle">
                    <td className="px-7 py-3 border-r border-gray-200 uppercase">
                      {m ? m.sku : ''}
                    </td>
                    <td className="text-center py-3 border-r border-b border-gray-200">
                      {m ? formatNum(m.inputtedCost || m.cost) : ''}
                    </td>
                    <td className="text-center border-r border-b border-gray-200">
                      {m ? Number(m.yields || 0).toLocaleString() : ''}
                    </td>
                    <td className="text-center border-r border-b border-gray-200">
                      {m ? formatNum(m.costCpp) : ''}
                    </td>
                    <td className="text-center border-r border-b border-gray-200 font-medium">
                      {m ? formatNum(effectivePrice) : ''}
                    </td>
                    <td className="text-center border-r border-b border-gray-200">
                      {m ? formatNum(effectiveSellCpp) : ''}
                    </td>

                    <td className="bg-[#f8f8f8] border-r border-gray-300"></td>

                    <td className="px-1 py-3 text-center border-b border-gray-200">
                      {p ? p.qty : (normalPotentialMachines.length === 0 && index === 0 ? 0 : '')}
                    </td>
                    <td className="border border-gray-200 text-center px-1 py-2">
                      {p ? (
                        <div className="flex flex-col gap-1">
                          <p>{format(p.totalCost)}</p>
                          <p className="text-[11px] text-blue-700 italic">
                            {format(p.machineMarginTotal || 0)}
                          </p>
                        </div>
                      ) : (normalPotentialMachines.length === 0 && index === 0 ? format(0) : '')}
                    </td>
                    <td className="border border-gray-200 text-center px-1 py-3">
                      {p ? format(p.totalSell) : (normalPotentialMachines.length === 0 && index === 0 ? format(0) : '')}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-x border-x-gray-300 border-gray-100 bg-white">
                <td className="px-7 py-3 border-r border-gray-300"></td>
                <td className="text-center py-3 border-r border-gray-100"></td>
                <td className="text-center border-r border-gray-100"></td>
                <td className="text-center border-r border-gray-100"></td>
                <td className="text-center border-r border-gray-300"></td>
                <td className="text-center border-r border-gray-300"></td>
                <td className="bg-[#f8f8f8] border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center">0</td>
                <td className="border-l text-center px-1 py-3">{format(0)}</td>
                <td className="border-l text-center px-1 py-3">{format(0)}</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={6} className="px-4 py-1 font-semibold border-y border-r border-r-gray-300 border-gray-200">
                CONSUMABLES
              </td>
              <td className="bg-[#f8f8f8] border-r border-gray-300"></td>
              <td className="py-1 border-y border-gray-200"></td>
              <td className="py-1 border-y border-gray-200"></td>
              <td className="py-1 border-y border-gray-200"></td>
            </tr>

            {consumableRows.length > 0 ? (
              consumableRows.map((row, index) => {
                const c = row.left;
                const p = row.right;

                return (
                  <tr key={`consumable-row-${index}`} className="border-x border-x-gray-300 border-gray-100 bg-white align-middle">
                    <td className="px-7 py-3 border border-gray-200">
                      {c ? c.sku : ''}
                    </td>
                    <td className="border border-gray-200 text-center py-3">
                      {c ? formatNum(c.cost) : ''}
                    </td>
                    <td className="border border-gray-200 text-center">
                      {c ? Number(c.yields || 0).toLocaleString() : ''}
                    </td>
                    <td className="border border-gray-200 text-center">
                      {c ? formatNum(c.yields > 0 ? c.cost / c.yields : 0) : ''}
                    </td>
                    <td className="border border-gray-200 text-center font-medium">
                      {c ? formatNum(c.price) : ''}
                    </td>
                    <td className="border border-gray-200 text-center">
                      {c ? formatNum(c.yields > 0 ? c.price / c.yields : 0) : ''}
                    </td>

                    <td className="bg-[#f8f8f8] border-r border-gray-300"></td>

                    <td className="px-1 py-3 text-center border border-gray-200">
                      {p ? formatConsumableQty(p.qty) : (consumables.length === 0 && index === 0 ? formatConsumableQty(0) : '')}
                    </td>
                    <td className="border-l text-center px-1 py-3 border border-gray-200">
                      {p ? format(p.totalCost) : (consumables.length === 0 && index === 0 ? format(0) : '')}
                    </td>
                    <td className="border-l text-center px-1 py-3 border border-gray-200">
                      {p ? format(p.totalSell) : (consumables.length === 0 && index === 0 ? format(0) : '')}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-x border-x-gray-300 border-gray-100 bg-white">
                <td className="px-7 py-3 border-r border-gray-300"></td>
                <td className="text-center py-3 border-r border-gray-100"></td>
                <td className="text-center border-r border-gray-100"></td>
                <td className="text-center border-r border-gray-100"></td>
                <td className="text-center border-r border-gray-300"></td>
                <td className="text-center border-r border-gray-300"></td>
                <td className="bg-[#f8f8f8] border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center">{formatConsumableQty(0)}</td>
                <td className="border-l text-center px-1 py-3">{format(0)}</td>
                <td className="border-l text-center px-1 py-3">{format(0)}</td>
              </tr>
            )}

            {othersRows.length > 0 && (
              <>
                <tr className="bg-[#E2F4D8]/30 border-x border-x-gray-300 border-gray-200">
                  <td colSpan={6} className="px-4 py-1 font-semibold border-y border-r border-r-gray-300 border-gray-200">
                    OTHERS
                  </td>
                  <td className="bg-[#f8f8f8] border-r border-gray-300"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                </tr>

                {othersRows.map((row, index) => {
                  const m = row.left;
                  const p = row.right;

                  const effectivePrice = m ? (isOutright ? (m.price || 0) : 0) : 0;
                  const effectiveSellCpp = m && m.yields > 0 ? effectivePrice / m.yields : 0;

                  return (
                    <tr key={`others-row-${index}`} className="border-x border-x-gray-300 border-gray-100 bg-white align-middle">
                      <td className="px-7 py-3 border border-gray-200 uppercase">
                        {m ? m.sku : ''}
                      </td>
                      <td className="text-center py-3 border border-gray-200">
                        {m ? formatNum(m.inputtedCost || m.cost) : ''}
                      </td>
                      <td className="text-center border border-gray-200">
                        {m ? Number(m.yields || 0).toLocaleString() : ''}
                      </td>
                      <td className="text-center border border-gray-200">
                        {m ? formatNum(m.costCpp) : ''}
                      </td>
                      <td className="text-center border border-gray-200 font-medium">
                        {m ? formatNum(effectivePrice) : ''}
                      </td>
                      <td className="text-center border border-gray-200">
                        {m ? formatNum(effectiveSellCpp) : ''}
                      </td>

                      <td className="bg-[#f8f8f8] border-r border-gray-300"></td>

                      <td className="px-1 py-3 text-center border-b border-gray-200">
                        {p ? p.qty : ''}
                      </td>
                      <td className="border-l text-center px-1 py-3 border-b border-gray-200">
                        {p ? format(p.totalCost) : ''}
                      </td>
                      <td className="border-l text-center px-1 py-3 border-b border-gray-200">
                        {p ? format(p.totalSell) : ''}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            <tr className="bg-[#E2F4D8]/70 font-semibold border-x border-x-gray-300 text-[12px]">
              <td className="px-4 py-3 text-left border border-gray-300">TOTALS</td>
              <td className="text-center border border-gray-300">
                {formatNum(totals.unitCost)}
              </td>
              <td className="text-center border border-gray-300">
                {Number(totals.yields || 0).toLocaleString()}
              </td>
              <td className="text-center border border-gray-300 text-green-700">
                {formatNum(totals.costCpp)}
              </td>
              <td className="text-center border border-gray-300">
                {formatNum(manualTotalSellingPrice)}
              </td>
              <td className="text-center border border-gray-300">
                {formatNum(manualTotalSellCpp)}
              </td>

              <td className="bg-[#f8f8f8]"></td>

              <td className="px-1 py-3 text-center border border-gray-300"></td>
              <td className="border border-gray-300 text-center px-1 py-3">
                <div>
                  <p>{format(firstYearTotalCost)}</p>
                  {bundleDeduction > 0 && (
                    <p className="text-[10px] text-red-700">
                      -{format(bundleDeduction)}
                    </p>
                  )}
                </div>
              </td>
              <td className="border border-gray-300 text-center px-1 py-3 font-semibold">
                {format(fistYearTotalSell)}
              </td>
            </tr>

            <tr>
              <td colSpan={10} className="py-2 bg-[#f8f8f8]"></td>
            </tr>

            <tr className="bg-[#E2F4D8] text-[11px] font-semibold border-x border-gray-300">
              <td className="px-3 py-1 text-center uppercase border-y border-gray-300">OTHERS</td>
              <td className="px-3 py-1 text-center border border-gray-300 uppercase">AMOUNT</td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-l-0"></td>
              <td className="bg-[#f8f8f8] border-r border-gray-300"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-r-0 border-x-0"></td>
            </tr>

            {allAdditionalFees.length > 0 ? (
              allAdditionalFees.map((fee, idx) => {
                const isCompany = companyFees.some((cf) => cf.id === fee.id);

                return (
                  <tr
                    key={fee.id || idx}
                    className=" border-x border-x-gray-300 border-gray-100 text-[11px] align-middle bg-white"
                  >
                    <td className="px-4 py-2 text-[12px] truncate border-r border-b border-gray-200">
                      {fee.label}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-right border-r border-b border-gray-200">
                      {format(fee.cost)}
                    </td>
                    <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                    <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                    <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                    <td className="px-3 py-2 text-center border-r border-r-gray-300 border-b border-gray-200"></td>

                    <td className="bg-[#f8f8f8] border-r border-gray-300"></td>

                    <td className="py-2 text-center border-r border-b border-gray-200">
                      {fee.qty || 0}
                    </td>
                    <td className="py-2 text-center border-r border-b border-gray-200">
                      {isCompany ? format(fee.total) : format(0)}
                    </td>
                    <td className="py-2 text-center border-b border-gray-200">
                      {!isCompany ? format(fee.total) : format(0)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-gray-100 text-[11px]">
                <td className="px-4 py-3 text-gray-600 truncate border-r border-gray-200">X</td>
                <td className="px-3 py-3 text-right font-medium border-r border-gray-200">0.00</td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="bg-[#f8f8f8] border-r border-gray-300"></td>
                <td className="py-2 font-bold text-center border-r border-gray-200">0</td>
                <td className="py-2 font-bold text-center border-r border-gray-200">0.00</td>
                <td className="py-2 font-bold text-center">0.00</td>
              </tr>
            )}

            <tr className="bg-[#E2F4D8]/70 font-bold border-x border-x-gray-300 text-gray-800 text-[11px]">
              <td className="px-3 py-2 uppercase border border-gray-300">TOTAL</td>
              <td className="px-3 py-2 text-right border-y border-gray-300"></td>
              <td className="px-3 py-2 text-center border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-r border-gray-300"></td>

              <td className="bg-[#f8f8f8] border-r border-gray-300"></td>

              <td className="py-2 border-r border-t border-gray-300"></td>
              <td className="py-2 border-r border-t border-gray-300 text-center">
                {format(companyTotal)}
              </td>
              <td className="py-2 text-center border-t border-gray-300">
                {format(customerTotal)}
              </td>
            </tr>

            <tr className="text-[11px]">
              <td colSpan={6} rowSpan={3} className="border-0 p-0"></td>
              <td className="bg-[#f8f8f8] border-r border-darkgreen/30"></td>
              <td className="py-3 border border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase">
                Total
              </td>
              <td className="py-3 border-t border-r border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center">
                {format(finalTotalCost)}
              </td>
              <td className="py-3 border-t border-r border-darkgreen/30 bg-[#E2F4D8] font-bold text-center">
                {format(finalTotalRevenue)}
              </td>
            </tr>

            <tr className="text-[11px]">
              <td className="bg-[#f8f8f8]"></td>
              <td className="bg-[#f8f8f8] border-r border-t-gray-300 border-darkgreen/30"></td>
              <td className="py-3 border-x border-y border-t-gray-300 border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase">
                ROI
              </td>
              <td className="py-3 border-x border-y border-gray-300 border-r-darkgreen/30 bg-[#E2F4D8] font-bold text-center">
                {format(finalTotalROI)}
              </td>
            </tr>

            <tr className="text-[11px]">
              <td className="bg-[#f8f8f8]"></td>
              <td className="bg-[#f8f8f8]"></td>
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
  );
}

export default MachCon1stYearMerged;