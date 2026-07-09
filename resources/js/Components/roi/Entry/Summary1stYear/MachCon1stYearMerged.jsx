import React, { useMemo, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { calculateProjectPotentials } from '@/utils/roi/calculations/calculatProjectPotentials';
import { get1YrPotential } from '@/utils/roi/calculations/get1YrPotential';

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

  // Sum of the individual Sell CPPs for Machines
  const machineSellCppTotal = [...normalMachines, ...othersMachines].reduce((sum, m) => {
    const effectivePrice = isOutright ? (Number(m.price) || 0) : 0;
    const yields = Number(m.yields) || 0;
    const itemCpp = yields > 0 ? effectivePrice / yields : 0;
    return sum + itemCpp;
  }, 0);

  // Sum of the individual Sell CPPs for Consumables
  const consumableSellCppTotal = filteredConsumable.reduce((sum, c) => {
    const price = Number(c.price) || 0;
    const yields = Number(c.yields) || 0;
    const itemCpp = yields > 0 ? price / yields : 0;
    return sum + itemCpp;
  }, 0);

  // Combine for the final Total Sell CPP
  const manualTotalSellCpp = machineSellCppTotal + consumableSellCppTotal;

  const formatNum = (val, decimals = 2) => {
    const num = Number(val) || 0;
    if (num === 0) return '';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const format = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return '';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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

  const formatConsumableQty = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num) || num === 0) return '';

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

  // =========================
  // MOBILE CARD HELPERS
  // =========================
  const MobileStat = ({ label, value, className = '' }) => (
    <div className="flex flex-col min-w-0">
      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-semibold pt-1 leading-tight break-words ${className}`}>{value}</p>
    </div>
  );

  const MachineCard = ({ m, p, sectionLabel }) => {
    if (!m && !p) return null;
    const effectivePrice = m ? (isOutright ? (Number(m.price) || 0) : 0) : 0;
    const effectiveSellCpp = m && m.yields > 0 ? effectivePrice / m.yields : 0;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase truncate">{m ? m.sku : ''}</p>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 shrink-0">
            {sectionLabel}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MobileStat label="Cost" value={m ? formatNum(m.inputtedCost || m.cost) : ''} />
          <MobileStat label="Yields" value={m && Number(m.yields || 0) !== 0 ? Number(m.yields).toLocaleString() : ''} />
          <MobileStat label="Cost CPP" value={m ? formatNum(m.costCpp) : ''} />
          <MobileStat label="Selling Price" value={m ? formatNum(effectivePrice) : ''} />
          <MobileStat label="Sell CPP" value={m ? formatNum(effectiveSellCpp) : ''} />
          <MobileStat label="Qty" value={p ? (p.qty !== 0 ? p.qty : '') : ''} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 mt-1 border-t border-gray-100">
          <MobileStat label="Total Cost" value={p ? format(p.totalCost) : ''} />
          <MobileStat label="Gross Sales" value={p ? format(p.totalSell) : ''} />
        </div>
        {p && (Number(p.machineMarginTotal) || 0) !== 0 && (
          <p className="text-[10px] text-blue-700 italic">
            {format(p.machineMarginTotal)}
          </p>
        )}
      </div>
    );
  };

  const ConsumableCard = ({ c, p }) => {
    if (!c && !p) return null;
    const costCpp = c && c.yields > 0 ? c.cost / c.yields : 0;
    const sellCpp = c && c.yields > 0 ? c.price / c.yields : 0;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase truncate">{c ? c.sku : ''}</p>
        <div className="grid grid-cols-3 gap-2">
          <MobileStat label="Cost" value={c ? formatNum(c.cost) : ''} />
          <MobileStat label="Yields" value={c && Number(c.yields || 0) !== 0 ? Number(c.yields).toLocaleString() : ''} />
          <MobileStat label="Cost CPP" value={c ? formatNum(costCpp) : ''} />
          <MobileStat label="Selling Price" value={c ? formatNum(c.price) : ''} />
          <MobileStat label="Sell CPP" value={c ? formatNum(sellCpp) : ''} />
          <MobileStat label="Qty" value={p ? formatConsumableQty(p.qty) : ''} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 mt-1 border-t border-gray-100">
          <MobileStat label="Total Cost" value={p ? format(p.totalCost) : ''} />
          <MobileStat label="Gross Sales" value={p ? format(p.totalSell) : ''} />
        </div>
      </div>
    );
  };

  const FeeCard = ({ fee }) => {
    const isA3ColorClick = fee.label?.toLowerCase().includes("a3 color click");
    const isCompany = companyFees.some((cf) => cf.id === fee.id);
    const feeCost = Number(fee.cost) || 0;
    const feeQty = Number(fee.qty) || 0;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2">
        <p className="text-xs font-bold truncate">{fee.label}</p>
        <div className="grid grid-cols-3 gap-2">
          <MobileStat label="Cost" value={isA3ColorClick ? '' : format(fee.cost)} />
          <MobileStat label="Qty" value={feeCost !== 0 && feeQty !== 0 ? feeQty : ''} />
          <MobileStat
            label={isCompany ? 'Company Total' : 'Customer Total'}
            value={format(fee.total)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans tracking-tight">
      <div className="hidden md:grid print:grid grid-cols-[69.3%_1.4%_29.3%] mb-2">
        <div></div>
        <div></div>
        <div className="text-center pr-1">
          <span className="text-[17px] font-bold print:font-medium print:text-sm uppercase tracking-tight text-gray-700">
            {title}
          </span>
        </div>
      </div>

      {/* Mobile title (shown once, simpler) */}
      <div className="md:hidden print:hidden text-center mb-3">
        <span className="text-sm font-bold uppercase tracking-tight text-gray-700">
          {title}
        </span>
      </div>

      {/* ============================================================ */}
      {/* MOBILE VIEW: CARD-BASED LAYOUT                                */}
      {/* ============================================================ */}
      <div className="md:hidden print:hidden flex flex-col gap-4">

        {/* MACHINE SECTION */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-gray-600 bg-[#E2F4D8]/60 rounded px-3 py-1.5">
            Machine
          </p>
          {machineRows.length > 0 ? (
            machineRows.map((row, index) => (
              <MachineCard key={`m-mobile-${index}`} m={row.left} p={row.right} sectionLabel="Machine" />
            ))
          ) : (
            <p className="text-[11px] text-gray-400 italic px-3">No machines added.</p>
          )}
        </div>

        {/* CONSUMABLES SECTION */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-gray-600 bg-[#E2F4D8]/60 rounded px-3 py-1.5">
            Consumables
          </p>
          {consumableRows.length > 0 ? (
            consumableRows.map((row, index) => (
              <ConsumableCard key={`c-mobile-${index}`} c={row.left} p={row.right} />
            ))
          ) : (
            <p className="text-[11px] text-gray-400 italic px-3">No consumables added.</p>
          )}
        </div>

        {/* OTHERS SECTION */}
        {othersRows.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase text-gray-600 bg-[#E2F4D8]/40 rounded px-3 py-1.5">
              Others
            </p>
            {othersRows.map((row, index) => (
              <MachineCard key={`o-mobile-${index}`} m={row.left} p={row.right} sectionLabel="Others" />
            ))}
          </div>
        )}

        {/* TOTALS CARD */}
        <div className="rounded-lg bg-[#E2F4D8]/70 p-3 flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-gray-700">Totals</p>
          <div className="grid grid-cols-3 gap-2">
            <MobileStat label="Unit Cost" value={formatNum(totals.unitCost)} />
            <MobileStat label="Yields" value={Number(totals.yields || 0) !== 0 ? Number(totals.yields).toLocaleString() : ''} />
            <MobileStat label="Cost CPP" value={formatNum(totals.costCpp)} className="text-green-700" />
            <MobileStat label="Selling Price" value={formatNum(manualTotalSellingPrice)} />
            <MobileStat label="Sell CPP" value={formatNum(manualTotalSellCpp)} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 mt-1 border-t border-gray-300">
            <div className="flex flex-col">
              <MobileStat label="Total Cost" value={format(firstYearTotalCost)} />
              {(Number(bundleDeduction) || 0) > 0 && (
                <p className="text-[10px] text-red-700 pt-0.5">-{format(bundleDeduction)}</p>
              )}
            </div>
            <MobileStat label="Gross Sales" value={format(fistYearTotalSell)} />
          </div>
        </div>

        {/* ADDITIONAL FEES SECTION */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-gray-600 bg-[#E2F4D8] rounded px-3 py-1.5">
            Others (Fees)
          </p>
          {allAdditionalFees.length > 0 && (
            allAdditionalFees.map((fee, idx) => <FeeCard key={fee.id || idx} fee={fee} />)
          )}

          {/* FEES TOTAL CARD */}
          <div className="rounded-lg bg-[#E2F4D8]/70 p-3 flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase text-gray-800">Fees Total</p>
            <div className="grid grid-cols-2 gap-2">
              <MobileStat label="Company Total" value={format(companyTotal)} />
              <MobileStat label="Customer Total" value={format(customerTotal)} />
            </div>
          </div>
        </div>

        {/* SUMMARY: TOTAL / ROI FOOTER */}
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <div className="grid grid-cols-2 gap-4 bg-[#E2F4D8] px-4 py-3">
            <MobileStat label="Total Cost" value={format(finalTotalCost)} />
            <MobileStat label="Total Revenue" value={format(finalTotalRevenue)} />
          </div>
          <div className="flex flex-row items-center justify-between bg-[#E2F4D8] px-4 py-3 border-t border-white/60">
            <div className="flex flex-col">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ROI</p>
              <p className="text-xs font-semibold pt-1 leading-tight break-words">
                {format(finalTotalROI)}
              </p>
            </div>
            <div className="flex items-center justify-center flex-1">
              <p
                className={`text-xs font-semibold ${
                  roiPercentage >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                ({roiPercentage.toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP VIEW: ORIGINAL TABLE LAYOUT (unchanged)                */}
      {/* ============================================================ */}
      <div className="hidden md:block print:block rounded-xl overflow-hidden">
        <table className="w-full bg-[#f8f8f8] print:bg-white border-collapse table-fixed">
          <colgroup>
            <col className="w-[30.7%]" />
            <col className="w-[9.1%]" />
            <col className="w-[8.4%]" />
            <col className="w-[7.3%]" />
            <col className="w-[9.1%]" />
            <col className="w-[7.3%]" />
            <col className="w-[1%]" />
            <col className="w-[5.4%]" />
            <col className="w-[10.7%]" />
            <col className="w-[10.7%]" />
          </colgroup>

          <thead className="bg-[#E2F4D8] border-x border-gray-300">
            <tr className="h-14">
              <th className="px-3 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                MACHINE & CONSUMABLES
              </th>
              <th className="px-2 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                COST
              </th>
              <th className="px-2 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                YIELDS
              </th>
              <th className="px-2 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                COST <br /> CPP
              </th>
              <th className="px-2 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                SELLING <br /> PRICE
              </th>
              <th className="px-2 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                SELL CPP
              </th>
              <th className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></th>
              <th className="px-2 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                QTY
              </th>
              <th className="px-2 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                TOTAL <br /> COST
              </th>
              <th className="px-2 py-1 text-[13px] font-medium text-center border border-gray-300 print:text-[11px]">
                GROSS <br /> SALES
              </th>
            </tr>
          </thead>

          <tbody className="text-[12px]">

            {/* ==================== MACHINE SECTION ==================== */}
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={6} className="px-4 py-1 font-semibold border-r border-b border-gray-300">
                MACHINE
              </td>
              <td className="bg-[#f8f8f8] border-r print:bg-white border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
            </tr>

            {machineRows.length > 0 ? (
              machineRows.map((row, index) => {
                const m = row.left;
                const p = row.right;

                const effectivePrice = m ? (isOutright ? (Number(m.price) || 0) : 0) : 0;
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
                      {m ? (Number(m.yields || 0) !== 0 ? Number(m.yields).toLocaleString() : '') : ''}
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

                    <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                    <td className="px-1 py-3 text-center border-b border-gray-200">
                      {p ? (p.qty !== 0 ? p.qty : '') : ''}
                    </td>
                    <td className="border border-gray-200 text-center px-1 py-2">
                      {p ? (
                        <div className="flex flex-col gap-1">
                          <p>{format(p.cost)}</p>
                          {(Number(p.machineMarginTotal) || 0) !== 0 && (
                            <p className="text-[11px] text-blue-700 italic">
                              {format(p.machineMarginTotal)}
                            </p>
                          )}
                        </div>
                      ) : ''}
                    </td>
                    <td className="border border-gray-200 text-center px-1 py-3">
                      {p ? format(p.totalSell) : ''}
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
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center"></td>
                <td className="border-l text-center px-1 py-3"></td>
                <td className="border-l text-center px-1 py-3"></td>
              </tr>
            )}

            {/* ==================== CONSUMABLES SECTION ==================== */}
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={6} className="px-4 py-1 font-semibold border-y border-r border-r-gray-300 border-gray-200">
                CONSUMABLES
              </td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
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
                      {c ? (Number(c.yields || 0) !== 0 ? Number(c.yields).toLocaleString() : '') : ''}
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

                    <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                    <td className="px-1 py-3 text-center border border-gray-200">
                      {p ? formatConsumableQty(p.qty) : ''}
                    </td>
                    <td className="border-l text-center px-1 py-3 border border-gray-200">
                      {p ? format(p.totalCost) : ''}
                    </td>
                    <td className="border-l text-center px-1 py-3 border border-gray-200">
                      {p ? format(p.totalSell) : ''}
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
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center"></td>
                <td className="border-l text-center px-1 py-3"></td>
                <td className="border-l text-center px-1 py-3"></td>
              </tr>
            )}

            {/* ==================== OTHERS SECTION ==================== */}
            {othersRows.length > 0 && (
              <>
                <tr className="bg-[#E2F4D8]/30 border-x border-x-gray-300 border-gray-200">
                  <td colSpan={6} className="px-4 py-1 font-semibold border-y border-r border-r-gray-300 border-gray-200 print:text-xs">
                    OTHERS
                  </td>
                  <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                </tr>

                {othersRows.map((row, index) => {
                  const m = row.left;
                  const p = row.right;

                  const effectivePrice = m ? (isOutright ? (Number(m.price) || 0) : 0) : 0;
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
                        {m ? (Number(m.yields || 0) !== 0 ? Number(m.yields).toLocaleString() : '') : ''}
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

                      <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                      <td className="px-1 py-3 text-center border-b border-gray-200">
                        {p ? (p.qty !== 0 ? p.qty : '') : ''}
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

            {/* ==================== TOTALS ROW ==================== */}
            <tr className="bg-[#E2F4D8]/70 font-semibold border-x border-x-gray-300 text-[12px]">
              <td className="px-4 py-3 text-left border border-gray-300">TOTALS</td>
              <td className="text-center border border-gray-300">
                {formatNum(totals.unitCost)}
              </td>
              <td className="text-center border border-gray-300">
                {Number(totals.yields || 0) !== 0 ? Number(totals.yields).toLocaleString() : ''}
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

              <td className="bg-[#f8f8f8] print:bg-white"></td>

              <td className="px-1 py-3 text-center border border-gray-300"></td>
              <td className="border border-gray-300 text-center px-1 py-3">
                <div>
                  <p>{format(firstYearTotalCost)}</p>
                  {(Number(bundleDeduction) || 0) > 0 && (
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
              <td colSpan={10} className="py-2 bg-[#f8f8f8] print:bg-white"></td>
            </tr>

            {/* ==================== ADDITIONAL FEES SECTION ==================== */}
            <tr className="bg-[#E2F4D8] text-[11px] font-medium border-x border-gray-300">
              <td className="px-3 py-1 text-center uppercase border-y border-gray-300 print:text-[11px]">OTHERS</td>
              <td className="px-3 py-1 text-center border border-gray-300 uppercase print:text-[11px] print:px-2">AMOUNT</td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-l-0"></td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-r-0 border-x-0"></td>
            </tr>

        {allAdditionalFees.length > 0 ? (
          allAdditionalFees.map((fee, idx) => {

            const isA3ColorClick = fee.label?.toLowerCase().includes("a3 color click");
            const isCompany = companyFees.some((cf) => cf.id === fee.id);
            const feeCost = Number(fee.cost) || 0;
            const feeQty = Number(fee.qty) || 0;
            const displayTotal = isA3ColorClick ? 0 : (Number(fee.total) || 0);

            return (
              <tr
                key={fee.id || idx}
                className="border-x border-x-gray-300 border-gray-100 text-[11px] align-middle bg-white"
              >
                <td className="px-4 py-2 text-[12px] truncate border-r border-b border-gray-200">
                  {fee.label}
                </td>
                <td className="px-3 py-2 text-[11px] text-right border-r border-b border-gray-200">
                  {/* If it's A3, show empty or 0 as cost too */}
                   {isA3ColorClick ? '' : format(fee.cost)}
                </td>
                <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                <td className="px-3 py-2 text-center border-r border-r-gray-300 border-b border-gray-200"></td>

                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

                <td className="py-2 text-center border-r border-b border-gray-200">
                  {/* Change: Blank if cost is 0 OR qty is 0 */}
                  {feeCost !== 0 && feeQty !== 0 ? feeQty : ''}
                </td>
                <td className="py-2 text-center border-r border-b border-gray-200">
                  {isCompany ? format(fee.total) : ''}
                </td>
                <td className="py-2 text-center border-b border-gray-200">
                  {!isCompany ? format(fee.total) : ''}
                </td>
              </tr>
            );
          })
        ): (
              <tr className="border-b border-gray-100 text-[11px]">
                <td className="px-4 py-3 text-gray-600 truncate border-r border-gray-200">—</td>
                <td className="px-3 py-3 text-right font-medium border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="py-2 text-center border-r border-gray-200"></td>
                <td className="py-2 text-center border-r border-gray-200"></td>
                <td className="py-2 text-center"></td>
              </tr>
            )}

            {/* ==================== FEES TOTAL ROW ==================== */}
            <tr className="bg-[#E2F4D8]/70 font-bold border-x border-x-gray-300 text-gray-800 text-[11px]">
              <td className="px-3 py-2 uppercase border border-gray-300">TOTAL</td>
              <td className="px-3 py-2 text-right border-y border-gray-300"></td>
              <td className="px-3 py-2 text-center border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-r border-gray-300"></td>

              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>

              <td className="py-2 border-r border-t border-gray-300"></td>
              <td className="py-2 border-r border-t border-gray-300 text-center">
                {format(companyTotal)}
              </td>
              <td className="py-2 text-center border-t border-gray-300">
                {format(customerTotal)}
              </td>
            </tr>

            {/* ==================== SUMMARY ROWS ==================== */}
            <tr className="text-[11px]">
              <td colSpan={6} rowSpan={3} className="border-0 p-0"></td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-darkgreen/30"></td>
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
              <td className="bg-[#f8f8f8] print:bg-white"></td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-t-gray-300 border-darkgreen/30"></td>
              <td className="py-3 border-x border-y border-t-gray-300 border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase">
                ROI
              </td>
              <td className="py-3 border-x border-y border-gray-300 border-r-darkgreen/30 bg-[#E2F4D8] font-bold text-center">
                {format(finalTotalROI)}
              </td>
            </tr>

            <tr className="text-[11px]">
              <td className="bg-[#f8f8f8] print:bg-white"></td>
              <td className="bg-[#f8f8f8] print:bg-white"></td>
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