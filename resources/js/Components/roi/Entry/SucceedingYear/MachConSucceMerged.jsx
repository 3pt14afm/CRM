import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachConSucceMerged() {
  const { projectData } = useProjectData();

  // =========================
  // DATA EXTRACTION
  // =========================
  const { machine = [], consumable = [] } = projectData.machineConfiguration || {};
  const filteredMachine = machine.filter((m) => m.sku && m.sku.trim() !== '');
  const filteredConsumable = consumable.filter((c) => c.sku && c.sku.trim() !== '');

  const normalMachines = filteredMachine.filter((m) => m.mode !== 'others' && m.type !== 'others');
  const othersMachines = filteredMachine.filter((m) => m.mode === 'others' || m.type === 'others');

  const yearData = projectData?.yearlyBreakdown?.[2] || {};
  const { machines = [], consumables = [] } = yearData;

  const contractType = projectData?.companyInfo?.contractType || '';
  const normalizedContractType = String(contractType).trim().toLowerCase();
  const isRentalClick = normalizedContractType === 'rental + click' || normalizedContractType === 'rental+click';
  const isFixClick = normalizedContractType === 'fix click' || normalizedContractType === 'fixed click';
  const usesExactClickQtyDisplay = isRentalClick || isFixClick;

  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  // =========================
  // UPDATED FORMATTERS (BLANK IF ZERO)
  // =========================
  const n = (val) => Number(val) || 0;

  const formatNum = (val, decimals = 2) => {
    const num = n(val);
    if (num === 0) return ''; // Return blank instead of 0
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const format = (val) => {
    const num = n(val);
    if (num === 0) return ''; // Return blank instead of 0
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatQty = (val) => {
    const num = n(val);
    if (num === 0) return ''; // Return blank instead of 0
    return num.toLocaleString();
  };

  const formatConsumableQty = (val) => {
    const num = n(val);
    if (num === 0) return ''; // Return blank instead of 0

    if (usesExactClickQtyDisplay) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return num.toLocaleString();
  };

  // =========================
  // LOGIC & HELPERS
  // =========================
  const getOrdinal = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (k >= 11 && k <= 13) return `${num}th`;
    if (j === 1) return `${num}st`;
    if (j === 2) return `${num}nd`;
    if (j === 3) return `${num}rd`;
    return `${num}th`;
  };

  const rangeTitle = contractYears > 2
      ? `2nd-${getOrdinal(contractYears)} Year Potential`
      : '2nd Year Potential';

  // Compact version of rangeTitle for mobile card sub-headers
  const shortRangeLabel = contractYears > 2
    ? `2nd-${getOrdinal(contractYears)} Yr`
    : '2nd Yr';

  const normalPotentialMachines = machines.filter((m) => m.mode !== 'others' && m.type !== 'others');
  const othersPotentialMachines = machines.filter((m) => m.mode === 'others' || m.type === 'others');

  const consumablesOnlyTotalCost = consumables.reduce((sum, c) => sum + n(c.totalCost), 0);
  const consumablesOnlyTotalSales = consumables.reduce((sum, c) => sum + n(c.totalSell), 0);

  const buildRows = (leftRows, middleRows, rightRows) => {
    const max = Math.max(leftRows.length, middleRows.length, rightRows.length);
    return Array.from({ length: max }, (_, i) => ({
      left: leftRows[i] || null,
      middle: middleRows[i] || null,
      right: rightRows[i] || null,
    }));
  };

  const machineRows = buildRows(normalMachines, normalPotentialMachines, normalPotentialMachines);
  const consumableRows = buildRows(filteredConsumable, consumables, consumables);
  const othersRows = buildRows(othersMachines, othersPotentialMachines, othersPotentialMachines);

  // =========================
  // MOBILE CARD HELPERS
  // =========================
  const MobileStat = ({ label, value, className = '' }) => (
    <div className="flex flex-col min-w-0">
      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-semibold pt-1 leading-tight break-words ${className}`}>{value}</p>
    </div>
  );

  // Generic item card: SKU + cost, then two sub-sections (Nth Year / Total Succeeding Years)
  const ItemCard = ({ sku, cost, yearQty, yearTotalCost, yearTotalSell, succQty, succTotalCost, succTotalSell }) => {
    if (!sku) return null;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase truncate">{sku}</p>
          <MobileStat label="Cost" value={cost} className="text-right" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 mt-1 border-t border-gray-100">
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{shortRangeLabel}</p>
            <MobileStat label="Qty" value={yearQty} />
            <MobileStat label="Total Cost" value={yearTotalCost} />
            <MobileStat label="Gross Sales" value={yearTotalSell} />
          </div>
          <div className="flex flex-col gap-1.5 pl-3 border-l border-gray-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Succeeding Yrs</p>
            <MobileStat label="Qty" value={succQty} />
            <MobileStat label="Total Cost" value={succTotalCost} />
            <MobileStat label="Gross Sales" value={succTotalSell} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans tracking-tight mb-4">
      <div className="hidden md:grid print:grid grid-cols-[30.7%_9.1%_1.4%_7.3%_10.7%_10.7%_1.4%_7.3%_10.7%_10.7%] mb-2">
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

      {/* Mobile title */}
      <div className="md:hidden print:hidden text-center mb-3">
        <span className="text-sm font-bold uppercase tracking-tight text-gray-700 block">
          {rangeTitle}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-tight text-gray-400 block mt-0.5">
          vs. Total Succeeding Years
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
              <ItemCard
                key={`m-mobile-${index}`}
                sku={row.left?.sku || ''}
                cost={row.left ? formatNum(row.left.cost) : ''}
                yearQty={formatQty(0)}
                yearTotalCost={format(0)}
                yearTotalSell={format(0)}
                succQty={formatQty(0)}
                succTotalCost={format(0)}
                succTotalSell={format(0)}
              />
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
              <ItemCard
                key={`c-mobile-${index}`}
                sku={row.left?.sku || ''}
                cost={row.left ? formatNum(row.left.cost) : ''}
                yearQty={row.middle ? formatConsumableQty(row.middle.qty) : ''}
                yearTotalCost={row.middle ? format(row.middle.totalCost) : ''}
                yearTotalSell={row.middle ? format(row.middle.totalSell) : ''}
                succQty={row.right ? formatConsumableQty(n(row.right.qty) * succeedingYearCount) : ''}
                succTotalCost={row.right ? format(n(row.right.totalCost) * succeedingYearCount) : ''}
                succTotalSell={row.right ? format(n(row.right.totalSell) * succeedingYearCount) : ''}
              />
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
              <ItemCard
                key={`o-mobile-${index}`}
                sku={row.left?.sku || ''}
                cost={row.left ? formatNum(row.left.cost) : ''}
                yearQty={formatQty(0)}
                yearTotalCost={format(0)}
                yearTotalSell={format(0)}
                succQty={formatQty(0)}
                succTotalCost={format(0)}
                succTotalSell={format(0)}
              />
            ))}
          </div>
        )}

        {/* TOTAL FOOTER CARD */}
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-[#E2F4D8]">
          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{shortRangeLabel}</p>
              <MobileStat label="Total Cost" value={format(consumablesOnlyTotalCost)} />
              <MobileStat label="Gross Sales" value={format(consumablesOnlyTotalSales)} />
            </div>
            <div className="flex flex-col gap-1.5 pl-3 border-l border-white/50">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Succeeding Yrs</p>
              <MobileStat label="Total Cost" value={format(consumablesOnlyTotalCost * succeedingYearCount)} />
              <MobileStat label="Gross Sales" value={format(consumablesOnlyTotalSales * succeedingYearCount)} />
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
            <col className="w-[30.7%]" /><col className="w-[9.7%]" /><col className="w-[1.2%]" />
            <col className="w-[7.2%]" /><col className="w-[10.7%]" /><col className="w-[10.7%]" />
            <col className="w-[1.2%]" /><col className="w-[7.2%]" /><col className="w-[10.7%]" />
            <col className="w-[10.7%]" />
          </colgroup>

          <thead className="bg-[#E2F4D8] border-x border-gray-300">
            <tr className="h-14">
              <th className="px-3 py-2 text-[13px] font-medium text-center border-r border-t border-gray-300">MACHINE & CONSUMABLES</th>
              <th className="px-3 py-2 text-[13px] font-medium text-center border-r border-t border-gray-300">COST</th>
              <th className="bg-[#f8f8f8] print:bg-white"></th>
              <th className="px-1 py-2 text-[13px] text-center font-medium border-x border-t border-gray-300 uppercase">Qty</th>
              <th className="px-1 py-2 text-[13px] text-center font-medium border-r border-t border-gray-300 uppercase">Total Cost</th>
              <th className="px-1 py-2 text-[13px] text-center font-medium border-r border-t border-gray-300 uppercase">Gross Sales</th>
              <th className="bg-[#f8f8f8] print:bg-white"></th>
              <th className="px-1 py-2 text-[13px] text-center font-medium border-x border-t border-gray-300 uppercase">Qty</th>
              <th className="px-1 py-2 text-[13px] text-center font-medium border-r border-t border-gray-300 uppercase">Total Cost</th>
              <th className="px-1 py-2 text-[13px] text-center font-medium border-t border-gray-300 uppercase">Gross Sales</th>
            </tr>
          </thead>

          <tbody className="text-[12px]">
            {/* MACHINE HEADER */}
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300">
              <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x-0 border-l border-l-gray-300">MACHINE</td>
              <td className="bg-[#f8f8f8] print:bg-white border-x border-gray-300"></td>
              <td colSpan={3} className="border border-gray-200 border-x-0 border-r border-r-gray-300"></td>
              <td className="bg-[#f8f8f8] print:bg-white"></td>
              <td colSpan={3} className="border border-gray-200 border-x-0 border-r border-r-gray-300"></td>
            </tr>

            {machineRows.map((row, index) => (
              <tr key={`machine-row-${index}`} className="border-x border-x-gray-300 bg-white align-middle">
                <td className="px-7 py-3 break-words uppercase border-r border-gray-200">{row.left?.sku || ''}</td>
                <td className="px-3 py-3 text-center border-r border-gray-300">{row.left ? formatNum(row.left.cost) : ''}</td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center border-x border-gray-200">{formatQty(0)}</td>
                <td className="text-center px-1 py-3 border-x border-gray-200">{format(0)}</td>
                <td className="text-center px-1 py-3 border-r border-gray-300">{format(0)}</td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center border-x border-gray-200">{formatQty(0)}</td>
                <td className="text-center px-1 py-3 border-x border-gray-200">{format(0)}</td>
                <td className="text-center px-1 py-3 border-r border-gray-300">{format(0)}</td>
              </tr>
            ))}

            {/* CONSUMABLES HEADER */}
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x border-x-gray-300">CONSUMABLES</td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
              <td colSpan={3} className="border-y border-gray-200 border-r border-r-gray-300"></td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
              <td colSpan={3} className="border-y border-gray-200 border-r border-r-gray-300"></td>
            </tr>

            {consumableRows.map((row, index) => (
              <tr key={`consumable-row-${index}`} className="border-x border-x-gray-300 bg-white align-middle">
                <td className="px-7 py-3 break-words border-r border-b border-gray-200">{row.left?.sku || ''}</td>
                <td className="px-3 py-3 text-center border-r border-r-gray-300 border-b border-gray-200">{row.left ? formatNum(row.left.cost) : ''}</td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center border-r border-r-gray-200 border-b border-gray-200">{row.middle ? formatConsumableQty(row.middle.qty) : ''}</td>
                <td className="text-center px-1 py-3 border-b border-gray-200">{row.middle ? format(row.middle.totalCost) : ''}</td>
                <td className="text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">{row.middle ? format(row.middle.totalSell) : ''}</td>
                <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center border-r border-r-gray-200 border-b border-gray-200">{row.right ? formatConsumableQty(n(row.right.qty) * succeedingYearCount) : ''}</td>
                <td className="text-center px-1 py-3 border-b border-gray-200">{row.right ? format(n(row.right.totalCost) * succeedingYearCount) : ''}</td>
                <td className="text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">{row.right ? format(n(row.right.totalSell) * succeedingYearCount) : ''}</td>
              </tr>
            ))}

            {/* OTHERS SECTION */}
            {othersRows.length > 0 && (
              <>
                <tr className="bg-[#E2F4D8]/30 border-x border-x-gray-300 border-gray-200">
                  <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x border-x-gray-300">OTHERS</td>
                  <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                  <td colSpan={3} className="border-y border-gray-200 border-r border-r-gray-300"></td>
                  <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                  <td colSpan={3} className="border-y border-gray-200 border-r border-r-gray-300"></td>
                </tr>
                {othersRows.map((row, index) => (
                  <tr key={`others-row-${index}`} className="border-x border-x-gray-300 bg-white align-middle">
                    <td className="px-7 py-3 break-words uppercase border-r border-b border-gray-200">{row.left?.sku || ''}</td>
                    <td className="px-3 py-3 text-center border-r border-r-gray-300 border-b border-gray-200">{row.left ? formatNum(row.left.cost) : ''}</td>
                    <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                    <td className="px-1 py-3 text-center border-r border-r-gray-200 border-b border-gray-200">{formatQty(0)}</td>
                    <td className="text-center px-1 py-3 border-b border-gray-200">{format(0)}</td>
                    <td className="text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">{format(0)}</td>
                    <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300"></td>
                    <td className="px-1 py-3 text-center border-r border-r-gray-200 border-b border-gray-200">{formatQty(0)}</td>
                    <td className="text-center px-1 py-3 border-b border-gray-200">{format(0)}</td>
                    <td className="text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">{format(0)}</td>
                  </tr>
                ))}
              </>
            )}

            {/* TOTAL FOOTER */}
            <tr className="bg-[#E2F4D8] border-x border-x-gray-300 font-semibold border-gray-100">
              <td className="px-4 py-3 border border-gray-300"></td>
              <td className="px-3 py-3 border border-gray-300"></td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300 border-b-0"></td>
              <td className="px-1 py-3 border border-gray-300"></td>
              <td className="text-center px-1 py-3 font-bold border border-gray-300">{format(consumablesOnlyTotalCost)}</td>
              <td className="text-center px-1 py-3 font-bold border border-gray-300">{format(consumablesOnlyTotalSales)}</td>
              <td className="bg-[#f8f8f8] print:bg-white border-r border-gray-300 border-b-0"></td>
              <td className="px-1 py-3 border border-gray-300"></td>
              <td className="text-center px-1 py-3 font-bold border border-gray-300">{format(consumablesOnlyTotalCost * succeedingYearCount)}</td>
              <td className="text-center px-1 py-3 font-bold border border-gray-300">{format(consumablesOnlyTotalSales * succeedingYearCount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MachConSucceMerged;