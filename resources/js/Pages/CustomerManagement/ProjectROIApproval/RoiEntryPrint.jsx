import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import PrintLayout from '@/Layouts/PrintLayout';
import { useProjectData } from '@/Context/ProjectContext';
import { interest as calculateInterest } from '@/Utils/interest';
import { get1YrPotential } from '@/utils/roi/calculations/get1YrPotential';
import { succeedingYears } from '@/utils/roi/calculations/succeedingYears';
import { calculateProjectPotentials } from '@/utils/roi/calculations/calculatProjectPotentials';
import { FaFileContract } from 'react-icons/fa6';
import { FaRegUserCircle } from 'react-icons/fa';
import { IoPrintSharp } from 'react-icons/io5';
import ViewButton from '@/Components/ViewButton';


const isBlank = (v) => v === null || v === undefined || v === '';
const displayText = (value) => (isBlank(value) ? '---' : String(value));

function mapProjectToPrintData(p) {
  if (!p) return null;

  const items = p?.items ?? [];
  const fees = p?.fees ?? [];

  const mapItem = (r) => ({
    id: r.client_row_id || String(r.id),
    type: r.kind === 'machine' ? 'machine' : 'consumable',
    sku: r.sku ?? '',
    qty: Number(r.qty ?? 0),
    yields: Number(r.yields ?? 0),
    mode: r.mode ?? '',
    remarks: r.remarks ?? '',
    inputtedCost: Number(r.inputted_cost ?? 0),
    cost: Number(r.cost ?? 0),
    price: Number(r.price ?? 0),
    totalCost: Number(r.total_cost ?? 0),
    costCpp: Number(r.cost_cpp ?? 0),
    totalSell: Number(r.total_sell ?? 0),
    sellCpp: Number(r.sell_cpp ?? 0),
    isMandatory: (r.client_row_id || String(r.id)) === '__mandatory_printer__' || Boolean(r.is_mandatory),
  });

  const machine = items.filter((r) => r.kind === 'machine').map(mapItem);
  const consumable = items.filter((r) => r.kind === 'consumable').map(mapItem);

  const mapFee = (f) => ({
    id: f.client_row_id || String(f.id),
    label: f.label ?? '',
    remarks: f.remarks ?? '',
    cost: Number(f.cost ?? 0),
    qty: Number(f.qty ?? 0),
    total: Number(f.total ?? 0),
  });

  const companyFees = fees.filter((f) => f.payer === 'company').map(mapFee);
  const customerFees = fees.filter((f) => f.payer === 'customer').map(mapFee);

  return {
    companyInfo: {
      companyName: p?.company_name ?? '',
      contractYears: Number(p?.contract_years ?? 0),
      companySapCode: p?.company_sap_code ?? '',
      contractType: p?.contract_type ?? '',
      reference: p?.reference ?? '',
      purpose: p?.purpose ?? '',
      type: Number(p?.type ?? 0),
      bundledStdInk: Boolean(p?.bundled_std_ink ?? false),
    },
    yield: {
      monoAmvpYields: {
        monthly: Number(p?.mono_yield_monthly ?? 0),
      },
      colorAmvpYields: {
        monthly: Number(p?.color_yield_monthly ?? 0),
      },
    },
    interest: {
      annualInterest: Number(p?.annual_interest ?? 0),
    },
    totalProjectCost: {
      grandTotalCost: Number(p?.grand_total_cost ?? 0),
      grandTotalRevenue: Number(p?.grand_total_revenue ?? 0),
      grandROI: Number(p?.grand_roi ?? 0),
      grandROIPercentage: Number(p?.grand_roi_percentage ?? 0),
    },
    machineConfiguration: {
      machine,
      consumable,
      totals: {
        unitCost: Number(p?.mc_unit_cost ?? 0),
        yields: Number(p?.mc_yields ?? 0),
        costCpp: Number(p?.mc_cost_cpp ?? 0),
      },
    },
    additionalFees: {
      company: companyFees,
      customer: customerFees,
    },
    entryRemarks: {
      remarks: p?.entry_remarks ?? '',
      attachments: Array.isArray(p?.entry_remarks_attachments) ? p.entry_remarks_attachments : [],
    },
  };
}

// ---------------------------------------------------------------------------
// Contract details (pure calc — port of ContractDetails.jsx, no context/effects)
// ---------------------------------------------------------------------------
function computeContractDetails(printData) {
  const { machine = [], consumable = [] } = printData?.machineConfiguration || {};
  const contractType = printData?.companyInfo?.contractType || '';
  const normalizedContractType = String(contractType).trim().toLowerCase();
 
  const isRentalClick =
    normalizedContractType === 'rental + click' || normalizedContractType === 'rental+click';
  const isFixClick =
    normalizedContractType === 'fix click' || normalizedContractType === 'fixed click';
  const isClickBasedContract = isRentalClick || isFixClick;
  const showContractTypeColumn = isClickBasedContract;
 
  const contractYears = parseInt(printData?.companyInfo?.contractYears, 10) || 0;
  const contractMonths = contractYears > 0 ? contractYears * 12 : 0;
 
  const monoMonthlyYields = Number(printData?.yield?.monoAmvpYields?.monthly) || 0;
  const colorMonthlyYields = Number(printData?.yield?.colorAmvpYields?.monthly) || 0;
 
  const addFeesObj = printData?.additionalFees || { company: [], customer: [] };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];
  const allFees = [...companyFees, ...customerFees];
 
  const normalize = (s) => String(s || '').trim().toLowerCase();
 
  const monthlyRentalFee = allFees.find((f) => normalize(f.label) === 'rental + supplies');
  const monthlyRentalUnitPrice = Number(monthlyRentalFee?.cost) || 0;
 
  const machineContractTypeLabel = isRentalClick ? 'RENTAL + CLICK' : isFixClick ? 'FIX CLICK' : '';
 
  const contractMachines = (machine || []).map((m) => {
    const qty = isClickBasedContract ? 1 : Number(m.qty) || 0;
    const unitPrice = isRentalClick ? monthlyRentalUnitPrice : 0;
    const amount = isRentalClick ? unitPrice * contractMonths : 0;
 
    return {
      ...m,
      qty,
      unitPrice,
      amount,
      contractTypeLabel: isClickBasedContract ? machineContractTypeLabel : '',
    };
  });
 
  let contractToners;
  if (isClickBasedContract) {
    const CLICK_ROWS = [
      { feeLabel: 'A4/A3 MONO CLICK', displayName: 'Click Charge - MONO (A4/A3)', qty: monoMonthlyYields },
      { feeLabel: 'A4/LGL COLOR CLICK', displayName: 'Click Charge - COLOR (A4/LGL)', qty: colorMonthlyYields },
      { feeLabel: 'A3 COLOR CLICK', displayName: 'Click Charge - COLOR (A3)', qty: 0 },
    ];
 
    contractToners = CLICK_ROWS.map((row) => {
      const matchedFee = allFees.find((f) => normalize(f.label) === normalize(row.feeLabel));
      const unitPriceFromFees = Number(matchedFee?.cost) || 0;
 
      return {
        ...matchedFee,
        sku: row.displayName,
        displayName: row.displayName,
        qty: Number(row.qty) || 0,
        price: unitPriceFromFees,
        remarks: matchedFee?.remarks || '',
        contractTypeLabel: 'CLICK CHARGE',
      };
    });
  } else {
    contractToners = (consumable || [])
      .filter((item) => Number(item.price) > 0)
      .map((item) => ({ ...item, contractTypeLabel: '' }));
  }
 
  const machineTotal = contractMachines.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const consumableTotal = contractToners.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    return sum + qty * price;
  }, 0);
  const totalInitial = machineTotal + consumableTotal;
 
  return { machine: contractMachines, consumable: contractToners, totalInitial, showContractTypeColumn };
}

// ---------------------------------------------------------------------------
// PRINT SECTIONS
// ---------------------------------------------------------------------------

function PrintContractInfo({ companyInfo = {} }) {
  const companyNameDisplay = companyInfo.companyName
    ? companyInfo.companySapCode
      ? `${companyInfo.companyName} (${companyInfo.companySapCode})`
      : companyInfo.companyName
    : '---';

  const typeDisplay = companyInfo.type === 1 ? 'Existing' : 'Potential';

  const details = [
    { label: 'COMPANY NAME', value: companyNameDisplay, wide: true },
    {
      label: 'CONTRACT TERM',
      value: companyInfo.contractYears
        ? `${companyInfo.contractYears} ${companyInfo.contractYears === 1 ? 'Year' : 'Years'}`
        : '---',
    },
    { label: 'CONTRACT TYPE', value: displayText(companyInfo.contractType) },
    { label: 'REFERENCE #', value: displayText(companyInfo.reference) },
    {
      label: 'PURPOSE',
      value: (companyInfo.purpose || 'No purpose provided for this contract.').toUpperCase(),
    },
    { label: 'TYPE', value: typeDisplay },
  ];

  return (
    <div className="rounded-xl overflow-hidden border border-darkgreen/10 bg-[#FBFFFA] print-avoid-break">
        <div className="flex flex-col px-5 py-4 gap-2">
            <div className="flex gap-2 items-center">
            <FaFileContract color="green" size={12} />
            <p className="font-bold text-[10px] text-gray-500 tracking-tight uppercase">
                Contract Info
            </p>
            </div>

            {/* Strictly 6 columns, using gap-4 for spacing */}
            <div 
            className="grid gap-4 mt-2 w-full items-start"
            style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 1fr" }}
            >
            {details.map((item, index) => (
                <div
                key={index}
                className="flex flex-col min-w-0"
                >
                <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider whitespace-nowrap">
                    {item.label}
                </p>
                <p className="text-[11px] font-medium pt-2 leading-tight break-words">
                    {item.value}
                </p>
                </div>
            ))}
            </div>
        </div>
    </div>
  );
}

function PrintTotalMVP({ yieldData = {} }) {
  const formatNum = (val) => {
    const num = parseFloat(val) || 0;
    if (num === 0) return '';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getAnnual = (monthly) => (parseFloat(monthly) || 0) * 12;

  const monoMonthly = yieldData.monoAmvpYields?.monthly || 0;
  const colorMonthly = yieldData.colorAmvpYields?.monthly || 0;

  const monoAnnual = getAnnual(monoMonthly);
  const colorAnnual = getAnnual(colorMonthly);
  const periodicTotal = monoAnnual + colorAnnual;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 print-avoid-break">
      <table className="w-full text-left border-collapse bg-white">
        <thead>
          <tr className="bg-[#E2F4D8]/60 border-b border-gray-200">
            <th className="px-4 py-1 border-r border-gray-300"></th>
            <th className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-center border-r border-gray-300">
              Monthly
            </th>
            <th className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-center">
              Annual
            </th>
          </tr>
        </thead>

        <tbody className="text-gray-700">
          <tr className="border-b border-gray-200">
            <td className="px-4 py-1 font-medium border-r border-gray-300 text-[11px]">Mono AMVP</td>
            <td className="px-4 py-1 text-right text-[11px] border-r border-gray-300">{formatNum(monoMonthly)}</td>
            <td className="px-4 py-1 text-right text-[11px]">{formatNum(monoAnnual)}</td>
          </tr>

          <tr className="border-b border-gray-200">
            <td className="px-4 py-1 font-medium border-r border-gray-300 text-[11px]">Color AMVP</td>
            <td className="px-4 py-1 text-right text-[11px] border-r border-gray-300">{formatNum(colorMonthly)}</td>
            <td className="px-4 py-1 text-right text-[11px]">{formatNum(colorAnnual)}</td>
          </tr>

          <tr>
            <td className="px-4 pr-3 py-1 font-medium border-r border-gray-300 text-[11px]">
              Periodic Maintenance Supplies Count
            </td>
            <td className="px-4 py-1"></td>
            <td className="px-4 py-1 text-right text-[11px]">{formatNum(periodicTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PrintInterestCalcuSum({ printData }) {
  const companyInfo = printData?.companyInfo ?? {};
  const isOutright = (companyInfo.contractType || '').toLowerCase().includes('outright');

  const { percentMargin } = isOutright ? { percentMargin: 0 } : calculateInterest(printData);

  // Live recomputation — mirrors RoiCalculator::calculateAll() on the backend.
  // (Do NOT read printData.totalProjectCost here: those grand_total_cost /
  // grand_roi / grand_roi_percentage fields are a saved DB snapshot and can
  // go stale relative to the current machine config, unlike the 1st Year
  // and Succeeding Years sections below, which already recompute live.)
  const contractYears = Math.max(parseInt(companyInfo.contractYears, 10) || 1, 1);
  const firstYear = get1YrPotential(printData);
  const succYear = succeedingYears(printData);

  const yearlyBreakdown = { year_1: firstYear };
  for (let y = 2; y <= contractYears; y++) {
    yearlyBreakdown[`year_${y}`] = succYear;
  }

  const potentials = calculateProjectPotentials(yearlyBreakdown);

  const totalCost = potentials.totalCost;
  const totalROI = potentials.totalGrossProfit;
  const roiPct = potentials.totalRoiPercentage;
  const totalSales = potentials.totalRevenue;

  const f = (num) => {
    const val = Number(num) || 0;
    if (val === 0) return '';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatPct = (num) => {
    const val = Number(num) || 0;
    if (val === 0) return '';
    return `${val.toFixed(2)}%`;
  };

  const annualInterestDisplay = isOutright
    ? '0%'
    : printData?.interest?.annualInterest
    ? `${printData.interest.annualInterest}%`
    : '';

  const percentMarginDisplay = isOutright ? '0%' : percentMargin ? `${percentMargin}%` : '';

  return (
    <div className="grid grid-cols-3 items-start gap-4 font-sans print-avoid-break mr-4">
      <div className="overflow-hidden rounded-xl border border-gray-300">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="w-[65%] bg-[#90E274]/10 py-2 px-2 pl-3 text-[11px] font-medium">
                Annual Interest
              </td>
              <td className="w-[35%] py-2 px-2 text-center font-medium border-l bg-white border-slate-300 text-xs">
                {annualInterestDisplay}
              </td>
            </tr>
            <tr>
              <td className="w-[65%] bg-[#90E274]/10 py-2 px-2 pl-3 text-[11px] font-medium">
                Percent Margin
              </td>
              <td className="w-[35%] py-2 px-2 text-center border-l font-medium bg-white border-slate-300 text-xs">
                {percentMarginDisplay}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end w-full col-span-2">
        <div className="border border-gray-300 rounded-xl overflow-hidden w-full bg-white">
          <table className="w-full text-[11px] table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[60%]" />
            </colgroup>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-3 py-2 font-medium bg-[#E2F4D8]/20 text-[11px]">Total Gross Sales</td>
                <td className="px-3 py-2 bg-white text-right border-l border-gray-300">{f(totalSales)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-3 py-2 font-medium bg-[#E2F4D8]/20 text-[11px]">Total Cost</td>
                <td className="px-3 py-2 bg-white text-right border-l border-gray-300">{f(totalCost)}</td>
              </tr>
              <tr className="bg-[#E2F4D8] font-medium">
                <td className="px-3 py-2 border-b border-gray-200">Total ROI</td>
                <td className="px-3 py-2 text-right border-l border-y border-y-gray-200 border-gray-300">{f(totalROI)}</td>
              </tr>
              <tr>
                <td className="py-2 text-[10px] text-gray-400 italic px-3"></td>
                <td
                  className={`px-3 py-2 bg-white text-right border-l border-gray-300 ${
                    roiPct > 0 ? 'text-green-700' : roiPct < 0 ? 'text-red-600' : ''
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
  );
}

function PrintMachCon1stYear({ printData, title = '1st Year Potential' }) {
  const { machine = [], consumable = [], totals = {} } = printData?.machineConfiguration || {};
  const contractType = printData?.companyInfo?.contractType || '';
  const isOutright = contractType.toLowerCase().includes('outright');
 
  const filteredMachine = machine.filter((m) => m.sku && m.sku.trim() !== '');
  const filteredConsumable = consumable.filter((c) => c.sku && c.sku.trim() !== '');
 
  const normalMachines = filteredMachine.filter((m) => m.mode !== 'others' && m.type !== 'others');
  const othersMachines = filteredMachine.filter((m) => m.mode === 'others' || m.type === 'others');
 
  const manualTotalSellingPrice = [
    ...normalMachines.map((m) => (isOutright ? Number(m.price) || 0 : 0)),
    ...othersMachines.map((m) => (isOutright ? Number(m.price) || 0 : 0)),
    ...filteredConsumable.map((c) => Number(c.price) || 0),
  ].reduce((sum, val) => sum + val, 0);
 
  const machineSellCppTotal = [...normalMachines, ...othersMachines].reduce((sum, m) => {
    const effectivePrice = isOutright ? Number(m.price) || 0 : 0;
    const yields = Number(m.yields) || 0;
    const itemCpp = yields > 0 ? effectivePrice / yields : 0;
    return sum + itemCpp;
  }, 0);
 
  const consumableSellCppTotal = filteredConsumable.reduce((sum, c) => {
    const price = Number(c.price) || 0;
    const yields = Number(c.yields) || 0;
    const itemCpp = yields > 0 ? price / yields : 0;
    return sum + itemCpp;
  }, 0);
 
  const manualTotalSellCpp = machineSellCppTotal + consumableSellCppTotal;
 
  const formatNum = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return '';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const format = formatNum;
 
  const firstYear = get1YrPotential(printData);
 
  const {
    machines = [],
    consumables = [],
    bundleDeduction = 0,
    firstYearTotalCost = 0,
    firstYearTotalSell = 0,
    grandtotalCost: finalTotalCost,
    grandtotalSell: finalTotalRevenue,
    grossProfit: finalTotalROI,
    roiPercentage,
    companyFees = [],
    customerFees = [],
  } = firstYear;
 
  const displayTotalSell = firstYearTotalSell;
 
  const normalizedContractType = String(contractType).trim().toLowerCase();
  const isRentalClick = normalizedContractType === 'rental + click' || normalizedContractType === 'rental+click';
  const isFixClick = normalizedContractType === 'fix click' || normalizedContractType === 'fixed click';
  const usesExactClickQtyDisplay = isRentalClick || isFixClick;
 
  const formatConsumableQty = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num) || num === 0) return '';
    if (usesExactClickQtyDisplay) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val;
  };
 
  const normalPotentialMachines = machines.filter((m) => m.mode !== 'others' && m.type !== 'others');
  const othersPotentialMachines = machines.filter((m) => m.mode === 'others' || m.type === 'others');
 
  const allAdditionalFees = [
    ...companyFees.map((f) => ({ ...f, __source: 'company' })),
    ...customerFees.map((f) => ({ ...f, __source: 'customer' })),
  ];
 
  const companyTotal = companyFees.reduce((sum, fee) => sum + Number(fee.total || 0), 0);
  const customerTotal = customerFees.reduce((sum, fee) => sum + Number(fee.total || 0), 0);
 
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
    <div className="font-sans tracking-tight print-avoid-break">
      <div className="grid grid-cols-[69.3%_1.4%_29.3%] mb-2">
        <div></div>
        <div></div>
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-tight text-gray-700">{title}</span>
        </div>
      </div>
 
      <div className="rounded-xl overflow-hidden">
        <table className="w-full bg-white border-collapse table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[9.8%]" />
            <col className="w-[8.4%]" />
            <col className="w-[7.3%]" />
            <col className="w-[9.1%]" />
            <col className="w-[7.3%]" />
            <col className="w-[1%]" />
            <col className="w-[6.1%]" />
            <col className="w-[10.7%]" />
            <col className="w-[10%]" />
          </colgroup>
 
          <thead className="bg-[#E2F4D8] border-x border-gray-300">
            <tr className="h-14">
              <th className="px-3 py-1 text-[11px] font-medium text-center border border-gray-300">MACHINE & CONSUMABLES</th>
              <th className="px-2 py-1 text-[11px] font-medium text-center border border-gray-300">COST</th>
              <th className="px-2 py-1 text-[11px] font-medium text-center border border-gray-300">YIELDS</th>
              <th className="px-2 py-1 text-[11px] font-medium text-center border border-gray-300">COST <br /> CPP</th>
              <th className="px-2 py-1 text-[11px] font-medium text-center border border-gray-300">SELLING <br /> PRICE</th>
              <th className="px-2 py-1 text-[11px] font-medium text-center border border-gray-300">SELL CPP</th>
              <th className="bg-white border-r border-gray-300"></th>
              <th className="px-2 py-1 text-[11px] font-medium text-center border border-gray-300">QTY</th>
              <th className="px-2 py-1 text-[11px] font-medium text-center border border-gray-300">TOTAL <br /> COST</th>
              <th className="px-2 py-1 text-[11px] font-medium text-center border border-gray-300">GROSS <br /> SALES</th>
            </tr>
          </thead>
 
          <tbody className="text-[11px]">
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={6} className="px-4 py-1 font-semibold border-r border-b border-gray-300">MACHINE</td>
              <td className="bg-white border-r border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
              <td className="py-1 border-b border-gray-300"></td>
            </tr>
 
            {machineRows.length > 0 ? (
              machineRows.map((row, index) => {
                const m = row.left;
                const p = row.right;
                const effectivePrice = m ? (isOutright ? Number(m.price) || 0 : 0) : 0;
                const effectiveSellCpp = m && m.yields > 0 ? effectivePrice / m.yields : 0;
 
                return (
                  <tr key={`machine-row-${index}`} className="border-x border-x-gray-300 border-gray-100 bg-white align-middle">
                    <td className="px-7 py-3 border-r border-gray-200 uppercase">{m ? m.sku : ''}</td>
                    <td className="text-center py-3 border-r border-b border-gray-200">{m ? formatNum(m.inputtedCost || m.cost) : ''}</td>
                    <td className="text-center border-r border-b border-gray-200">{m ? (Number(m.yields || 0) !== 0 ? Number(m.yields).toLocaleString() : '') : ''}</td>
                    <td className="text-center border-r border-b border-gray-200">{m ? formatNum(m.costCpp) : ''}</td>
                    <td className="text-center border-r border-b border-gray-200 font-medium">{m ? formatNum(effectivePrice) : ''}</td>
                    <td className="text-center border-r border-b border-gray-200">{m ? formatNum(effectiveSellCpp) : ''}</td>
                    <td className="bg-white border-r border-gray-300"></td>
                    <td className="px-1 py-3 text-center border-b border-gray-200">{p ? format(p.qty !== 0 ? p.qty : '') : ''}</td>
                    <td className="border border-gray-200 text-center px-1 py-2">
                      {p ? (
                        <div className="flex flex-col gap-1">
                          <p>{format(p.totalCost)}</p>
                          {(Number(p.totalMachineMargin) || 0) !== 0 && (
                            <p className="text-[11px] text-blue-700 italic">{format(p.totalMachineMargin)}</p>
                          )}
                        </div>
                      ) : ''}
                    </td>
                    <td className="border border-gray-200 text-center px-1 py-3">{p ? format(p.totalSell) : ''}</td>
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
                <td className="bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center"></td>
                <td className="border-l text-center px-1 py-3"></td>
                <td className="border-l text-center px-1 py-3"></td>
              </tr>
            )}
 
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={6} className="px-4 py-1 font-semibold border-y border-r border-r-gray-300 border-gray-200">CONSUMABLES</td>
              <td className="bg-white border-r border-gray-300"></td>
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
                    <td className="px-7 py-3 border border-gray-200">{c ? c.sku : ''}</td>
                    <td className="border border-gray-200 text-center py-3">{c ? formatNum(c.cost) : ''}</td>
                    <td className="border border-gray-200 text-center">{c ? (Number(c.yields || 0) !== 0 ? Number(c.yields).toLocaleString() : '') : ''}</td>
                    <td className="border border-gray-200 text-center">{c ? formatNum(c.yields > 0 ? c.cost / c.yields : 0) : ''}</td>
                    <td className="border border-gray-200 text-center font-medium">{c ? formatNum(c.price) : ''}</td>
                    <td className="border border-gray-200 text-center">{c ? formatNum(c.yields > 0 ? c.price / c.yields : 0) : ''}</td>
                    <td className="bg-white border-r border-gray-300"></td>
                    <td className="px-1 py-3 text-center border border-gray-200">{p ? format(formatConsumableQty(p.qty)) : ''}</td>
                    <td className="border-l text-center px-1 py-3 border border-gray-200">{p ? format(p.totalCost) : ''}</td>
                    <td className="border-l text-center px-1 py-3 border border-gray-200">{p ? format(p.totalSell) : ''}</td>
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
                <td className="bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center"></td>
                <td className="border-l text-center px-1 py-3"></td>
                <td className="border-l text-center px-1 py-3"></td>
              </tr>
            )}
 
            {othersRows.length > 0 && (
              <>
                <tr className="bg-[#E2F4D8]/30 border-x border-x-gray-300 border-gray-200">
                  <td colSpan={6} className="px-4 py-1 font-semibold border-y border-r border-r-gray-300 border-gray-200 text-xs">OTHERS</td>
                  <td className="bg-white border-r border-gray-300"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                  <td className="py-1 border-y border-gray-200"></td>
                </tr>
 
                {othersRows.map((row, index) => {
                  const m = row.left;
                  const p = row.right;
                  const effectivePrice = m ? (isOutright ? Number(m.price) || 0 : 0) : 0;
                  const effectiveSellCpp = m && m.yields > 0 ? effectivePrice / m.yields : 0;
 
                  return (
                    <tr key={`others-row-${index}`} className="border-x border-x-gray-300 border-gray-100 bg-white align-middle">
                      <td className="px-7 py-3 border border-gray-200 uppercase">{m ? m.sku : ''}</td>
                      <td className="text-center py-3 border border-gray-200">{m ? formatNum(m.inputtedCost || m.cost) : ''}</td>
                      <td className="text-center border border-gray-200">{m ? (Number(m.yields || 0) !== 0 ? Number(m.yields).toLocaleString() : '') : ''}</td>
                      <td className="text-center border border-gray-200">{m ? formatNum(m.costCpp) : ''}</td>
                      <td className="text-center border border-gray-200 font-medium">{m ? formatNum(effectivePrice) : ''}</td>
                      <td className="text-center border border-gray-200">{m ? formatNum(effectiveSellCpp) : ''}</td>
                      <td className="bg-white border-r border-gray-300"></td>
                      <td className="px-1 py-3 text-center border-b border-gray-200">{p ? (p.qty !== 0 ? p.qty : '') : ''}</td>
                      <td className="border-l text-center px-1 py-3 border-b border-gray-200">{p ? format(p.totalCost) : ''}</td>
                      <td className="border-l text-center px-1 py-3 border-b border-gray-200">{p ? format(p.totalSell) : ''}</td>
                    </tr>
                  );
                })}
              </>
            )}
 
            <tr className="bg-[#E2F4D8]/70 font-semibold border-x border-x-gray-300 text-[11px]">
              <td className="px-4 py-2 text-left border border-gray-300">TOTALS</td>
              <td className="text-center border border-gray-300">{formatNum(totals.unitCost)}</td>
              <td className="text-center border border-gray-300">{Number(totals.yields || 0) !== 0 ? Number(totals.yields).toLocaleString() : ''}</td>
              <td className="text-center border border-gray-300 text-green-700">{formatNum(totals.costCpp)}</td>
              <td className="text-center border border-gray-300">{formatNum(manualTotalSellingPrice)}</td>
              <td className="text-center border border-gray-300">{formatNum(manualTotalSellCpp)}</td>
              <td className="bg-white"></td>
              <td className="px-1 py-2 text-center border border-gray-300"></td>
              <td className="border border-gray-300 text-center px-1 py-2">
                <div>
                  <p>{format(firstYearTotalCost)}</p>
                  {(Number(bundleDeduction) || 0) > 0 && (
                    <p className="text-[10px] text-red-700">-{format(bundleDeduction)}</p>
                  )}
                </div>
              </td>
              <td className="border border-gray-300 text-center px-1 py-2 font-semibold">{format(displayTotalSell)}</td>
            </tr>
 
            <tr>
              <td colSpan={10} className="py-2 bg-white"></td>
            </tr>
 
            <tr className="bg-[#E2F4D8] text-[11px] font-medium border-x border-gray-300">
              <td className="px-3 py-1 text-center uppercase border-y border-gray-300">OTHERS</td>
              <td className="px-3 py-1 text-center border border-gray-300 uppercase">AMOUNT</td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-l-0"></td>
              <td className="bg-white border-r border-gray-300"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-x-0"></td>
              <td className="px-3 py-1 text-center border border-gray-300 border-r-0 border-x-0"></td>
            </tr>
 
            {allAdditionalFees.length > 0 ? (
              allAdditionalFees.map((fee, idx) => {
                const isA3ColorClick = fee.label?.toLowerCase().includes('a3 color click');
                const isCompany = companyFees.some((cf) => cf.id === fee.id);
                const feeCost = Number(fee.cost) || 0;
                const feeQty = Number(fee.qty) || 0;
 
                return (
                  <tr key={fee.id || idx} className="border-x border-x-gray-300 border-gray-100 text-[11px] align-middle bg-white">
                    <td className="px-4 py-2 text-[11px] truncate border-r border-b border-gray-200">{fee.label}</td>
                    <td className="px-3 py-2 text-[11px] text-right border-r border-b border-gray-200">{isA3ColorClick ? '' : format(fee.cost)}</td>
                    <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                    <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                    <td className="px-3 py-2 text-center border-b border-gray-200"></td>
                    <td className="px-3 py-2 text-center border-r border-r-gray-300 border-b border-gray-200"></td>
                    <td className="bg-white border-r border-gray-300"></td>
                    <td className="py-2 text-center border-r border-b border-gray-200">{feeCost !== 0 && format(feeQty) !== 0 ? format(feeQty) : ''}</td>
                    <td className="py-2 text-center border-r border-b border-gray-200">{isCompany ? format(fee.total) : ''}</td>
                    <td className="py-2 text-center border-b border-gray-200">{!isCompany ? format(fee.total) : ''}</td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-gray-100 text-[11px]">
                <td className="px-4 py-3 text-gray-600 truncate border-r border-gray-200">—</td>
                <td className="px-3 py-3 text-right font-medium border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="px-3 py-3 text-center border-r border-gray-200"></td>
                <td className="bg-white border-r border-gray-300"></td>
                <td className="py-2 text-center border-r border-gray-200"></td>
                <td className="py-2 text-center border-r border-gray-200"></td>
                <td className="py-2 text-center"></td>
              </tr>
            )}
 
            <tr className="bg-[#E2F4D8]/70 font-bold border-x border-x-gray-300 text-gray-800 text-[11px]">
              <td className="px-3 py-2 uppercase border border-gray-300">TOTAL</td>
              <td className="px-3 py-2 text-right border-y border-gray-300"></td>
              <td className="px-3 py-2 text-center border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-gray-300"></td>
              <td className="px-3 py-2 border-y border-r border-gray-300"></td>
              <td className="bg-white border-r border-gray-300"></td>
              <td className="py-2 border-r border-t border-gray-300"></td>
              <td className="py-2 border-r border-t border-gray-300 text-center">{format(companyTotal)}</td>
              <td className="py-2 text-center border-t border-gray-300">{format(customerTotal)}</td>
            </tr>
 
            <tr className="text-[11px]">
              <td colSpan={6} rowSpan={3} className="border-0 p-0"></td>
              <td className="bg-white border-r border-darkgreen/30"></td>
              <td className="py-3 border border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase">Total</td>
              <td className="py-3 border-t border-r border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center">{format(finalTotalCost)}</td>
              <td className="py-3 border-t border-r border-darkgreen/30 bg-[#E2F4D8] font-bold text-center">{format(finalTotalRevenue)}</td>
            </tr>
 
            <tr className="text-[11px]">
              <td className="bg-white"></td>
              <td className="bg-white border-r border-t-gray-300 border-darkgreen/30"></td>
              <td className="py-3 border-x border-y border-t-gray-300 border-darkgreen/30 border-r-gray-300 bg-[#E2F4D8] font-bold text-center uppercase">ROI</td>
              <td className="py-3 border-x border-y border-gray-300 border-r-darkgreen/30 bg-[#E2F4D8] font-bold text-center">{format(finalTotalROI)}</td>
            </tr>
 
            <tr className="text-[11px]">
              <td className="bg-white"></td>
              <td className="bg-white"></td>
              <td className="py-3"></td>
              <td
                className={`py-3 border-b border-x border-darkgreen/30 bg-[#E2F4D8] font-bold text-center text-[10px] ${
                  roiPercentage >= 0 ? 'text-green-700' : 'text-red-600'
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
 
function PrintContractDetails({ printData }) {
  const { machine: contractMachines, consumable: contractToners, totalInitial, showContractTypeColumn } =
    computeContractDetails(printData);
 
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return '';
    return new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };
 
  const formatQty = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return '';
    return num.toLocaleString();
  };
 
  const sectionColSpan = showContractTypeColumn ? 6 : 5;
  const totalLabelColSpan = showContractTypeColumn ? 4 : 3;
  const colWidths = showContractTypeColumn
    ? ['26%', '18%', '8%', '16%', '16%', '16%']
    : ['33%', '10%', '19%', '18%', '22%'];
 
  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 font-sans max-w-full print-avoid-break">
      <div className="bg-[#E2F4D8] py-2 text-center border-b border-gray-300">
        <h2 className="text-[11px] font-bold tracking-widest text-gray-800 uppercase">Contract Details</h2>
      </div>
 
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse table-fixed">
          <colgroup>
            {colWidths.map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
 
          <thead>
            <tr className="text-[9px] font-bold border-b uppercase text-gray-700 bg-[#E2F4D8]/10">
              <th className="px-4 py-2 border-r border-gray-300 text-left">Particulars</th>
              {showContractTypeColumn && <th className="px-2 py-2 border-r border-gray-300 text-center">Contract Type</th>}
              <th className="px-2 py-2 border-r border-gray-300 text-center">Qty</th>
              <th className="px-2 py-2 border-r border-gray-300 text-center">Selling Price</th>
              <th className="px-2 py-2 border-r border-gray-300 text-center">Total Selling Price</th>
              <th className="px-2 py-2 text-center">Remarks</th>
            </tr>
          </thead>
 
          <tbody className="divide-y divide-gray-200">
            <tr className="bg-gray-50/50">
              <td colSpan={sectionColSpan} className="px-4 py-1 text-left text-[9px] font-bold uppercase text-gray-500">Hardware</td>
            </tr>
 
            {contractMachines.length > 0 ? (
              contractMachines.map((item, idx) => {
                const qty = Number(item.qty) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                const amount = Number(item.amount) || 0;
 
                return (
                  <tr key={`m-${idx}`} className="bg-white">
                    <td className="px-4 py-1 border-r border-gray-300 text-left text-gray-600 text-[10px]">{item.sku?.toUpperCase()}</td>
                    {showContractTypeColumn && (
                      <td className="px-3 py-1 border-r border-gray-300 text-center text-gray-600 text-[10px] font-medium uppercase">{item.contractTypeLabel || ''}</td>
                    )}
                    <td className="px-4 py-1 border-r border-gray-300 text-center text-gray-600 text-[10px]">{formatQty(qty)}</td>
                    <td className="px-4 py-1 border-r border-gray-300 text-right text-gray-600 text-[10px] font-mono">{unitPrice > 0 ? formatCurrency(unitPrice) : ''}</td>
                    <td className="px-4 py-1 border-r border-gray-300 text-right text-gray-600 text-[10px] font-mono">{amount > 0 ? formatCurrency(amount) : ''}</td>
                    <td className="px-4 py-1 text-gray-600 text-[10px] italic text-left uppercase">{item.remarks}</td>
                  </tr>
                );
              })
            ) : (
              <tr className="bg-white">
                <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-400 text-xs">-</td>
                {showContractTypeColumn && <td className="px-3 py-2 border-r border-gray-300 text-center text-gray-400 text-[10px]">-</td>}
                <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-400 text-xs"></td>
                <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-400 text-xs font-mono">-</td>
                <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-400 text-xs font-mono">-</td>
                <td className="px-4 py-2 text-gray-400 text-[10px] text-left">-</td>
              </tr>
            )}
 
            <tr className="bg-gray-50/50">
              <td colSpan={sectionColSpan} className="px-4 py-1 text-left text-[9px] font-bold uppercase text-gray-500">Consumables</td>
            </tr>
 
            {contractToners.length > 0 ? (
              contractToners.map((item, idx) => {
                const qty = Number(item.qty) || 0;
                const price = Number(item.price) || 0;
                const amount = qty * price;
 
                return (
                  <tr key={`c-${idx}`} className="bg-white">
                    <td className="px-4 py-1 border-r border-gray-300 text-left text-gray-600 text-[10px]">{item.displayName ? item.displayName : item.sku?.toUpperCase()}</td>
                    {showContractTypeColumn && (
                      <td className="px-3 py-1 border-r border-gray-300 text-center text-gray-600 text-[10px] font-medium uppercase">{item.contractTypeLabel || ''}</td>
                    )}
                    <td className="px-4 py-1 border-r border-gray-300 text-center text-gray-600 text-[10px]">{formatQty(qty)}</td>
                    <td className="px-4 py-1 border-r border-gray-300 text-right text-gray-600 text-[10px] font-mono">{formatCurrency(price)}</td>
                    <td className="px-4 py-1 border-r border-gray-300 text-right text-gray-600 text-[10px] font-mono">{formatCurrency(amount)}</td>
                    <td className="px-4 py-1 text-gray-600 text-[10px] text-left">{item.remarks}</td>
                  </tr>
                );
              })
            ) : (
              <tr className="bg-white">
                <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-400 text-xs">-</td>
                {showContractTypeColumn && <td className="px-3 py-2 border-r border-gray-300 text-center text-gray-400 text-[10px]">-</td>}
                <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-400 text-xs"></td>
                <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-400 text-xs font-mono">-</td>
                <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-400 text-xs font-mono">-</td>
                <td className="px-4 py-2 text-gray-400 text-[10px] text-left">-</td>
              </tr>
            )}
          </tbody>
 
          <tfoot>
            <tr className="bg-[#E2F4D8]/20 border-t border-gray-300 font-semibold">
              <td colSpan={totalLabelColSpan} className="px-4 py-2 text-right text-[10px] uppercase border-r border-gray-300">Total Initial</td>
              <td className="px-4 py-2 border-r border-gray-300 text-right text-[11px] font-mono">{formatCurrency(totalInitial) || 'PHP 0.00'}</td>
              <td className="px-4 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function PrintEntryRemarksSummary({ printData }) {
  const remarks = String(printData?.entryRemarks?.remarks ?? '').trim();
  const attachments = Array.isArray(printData?.entryRemarks?.attachments)
    ? printData.entryRemarks.attachments
    : [];

  const getAttachmentName = (item, index) =>
    (typeof item === 'string' ? item : item?.name ?? item?.file_name) || `Attachment ${index + 1}`;

  const getPrintAttachmentName = (item, index, maxBaseLength = 7) => {
    const fullName = getAttachmentName(item, index);
    const lastDot = fullName.lastIndexOf('.');

    if (lastDot <= 0) {
      return fullName.length > maxBaseLength ? `${fullName.slice(0, maxBaseLength)}...` : fullName;
    }

    const base = fullName.slice(0, lastDot);
    const ext = fullName.slice(lastDot);

    return base.length > maxBaseLength ? `${base.slice(0, maxBaseLength)}...${ext}` : fullName;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 font-sans max-w-full print-avoid-break">
      <div className="bg-[#E2F4D8] py-2 text-center border-b border-gray-300">
        <h2 className="text-[10px] font-bold tracking-widest text-gray-800 uppercase">Remarks</h2>
      </div>

      <div className="p-3 space-y-4 bg-white min-h-[100px]">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Remarks</div>
          <div className="text-[11px] text-slate-700 whitespace-pre-wrap break-words min-h-[63px]">
            {remarks}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Attachments</div>

          {attachments.length ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((item, index) => (
                <div
                  key={index}
                  className="inline-flex w-[120px] items-center justify-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700"
                >
                  <span>📎</span>
                  <span className="truncate text-center">{getPrintAttachmentName(item, index)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">No attachments</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PrintMachConSucceMerged({ printData }) {
  const { machine = [], consumable = [] } = printData?.machineConfiguration || {};
  const filteredMachine = machine.filter((m) => m.sku && m.sku.trim() !== '');
  const filteredConsumable = consumable.filter((c) => c.sku && c.sku.trim() !== '');

  const normalMachines = filteredMachine.filter((m) => m.mode !== 'others' && m.type !== 'others');
  const othersMachines = filteredMachine.filter((m) => m.mode === 'others' || m.type === 'others');

  const dataSucceeding = succeedingYears(printData) || {};
  const { machines = [], consumables = [] } = dataSucceeding;

  const contractType = printData?.companyInfo?.contractType || '';
  const normalizedContractType = String(contractType).trim().toLowerCase();
  const isRentalClick = normalizedContractType === 'rental + click' || normalizedContractType === 'rental+click';
  const isFixClick = normalizedContractType === 'fix click' || normalizedContractType === 'fixed click';
  const usesExactClickQtyDisplay = isRentalClick || isFixClick;

  const contractYears = parseInt(printData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  const n = (val) => Number(val) || 0;

  const formatNum = (val, decimals = 2) => {
    const num = n(val);
    if (num === 0) return '';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const format = (val) => {
    const num = n(val);
    if (num === 0) return '';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatQty = (val) => {
    const num = n(val);
    if (num === 0) return '';
    return num.toLocaleString();
  };

  const formatConsumableQty = (val) => {
    const num = n(val);
    if (num === 0) return '';
    if (usesExactClickQtyDisplay) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return num.toLocaleString();
  };

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

  return (
    <div className="font-sans tracking-tight mb-4">
      <div className="grid grid-cols-[30.7%_9.1%_1.4%_7.3%_10.7%_10.7%_1.4%_7.3%_10.7%_10.7%] mb-2">
        <div className="col-span-3"></div>
        <div className="col-span-3 text-center pr-1">
          <span className="text-xs font-medium uppercase tracking-tight text-gray-700">
            {rangeTitle}
          </span>
        </div>
        <div></div>
        <div className="col-span-3 text-center pr-1">
          <span className="text-xs font-medium uppercase tracking-tight text-gray-700">
            Total Succeeding Years
          </span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden">
        <table className="w-full bg-white border-collapse table-fixed">
          <colgroup>
            <col className="w-[30.7%]" /><col className="w-[9.7%]" /><col className="w-[1.2%]" />
            <col className="w-[7.2%]" /><col className="w-[10.7%]" /><col className="w-[10.7%]" />
            <col className="w-[1.2%]" /><col className="w-[7.2%]" /><col className="w-[10.7%]" />
            <col className="w-[10.7%]" />
          </colgroup>

          <thead className="bg-[#E2F4D8] border-x border-gray-300">
            <tr className="h-14">
              <th className="px-3 py-2 text-[11px] font-medium text-center border-r border-t border-gray-300">MACHINE & CONSUMABLES</th>
              <th className="px-3 py-2 text-[11px] font-medium text-center border-r border-t border-gray-300">COST</th>
              <th className="bg-white"></th>
              <th className="px-1 py-2 text-[11px] text-center font-medium border-x border-t border-gray-300 uppercase">Qty</th>
              <th className="px-1 py-2 text-[11px] text-center font-medium border-r border-t border-gray-300 uppercase">Total Cost</th>
              <th className="px-1 py-2 text-[11px] text-center font-medium border-r border-t border-gray-300 uppercase">Gross Sales</th>
              <th className="bg-white"></th>
              <th className="px-1 py-2 text-[11px] text-center font-medium border-x border-t border-gray-300 uppercase">Qty</th>
              <th className="px-1 py-2 text-[11px] text-center font-medium border-r border-t border-gray-300 uppercase">Total Cost</th>
              <th className="px-1 py-2 text-[11px] text-center font-medium border-t border-gray-300 uppercase">Gross Sales</th>
            </tr>
          </thead>

          <tbody className="text-[11px]">
            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300">
              <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x-0 border-l border-l-gray-300">MACHINE</td>
              <td className="bg-white border-x border-gray-300"></td>
              <td colSpan={3} className="border border-gray-200 border-x-0 border-r border-r-gray-300"></td>
              <td className="bg-white"></td>
              <td colSpan={3} className="border border-gray-200 border-x-0 border-r border-r-gray-300"></td>
            </tr>

            {machineRows.map((row, index) => (
              <tr key={`machine-row-${index}`} className="border-x border-x-gray-300 bg-white align-middle">
                <td className="px-7 py-3 break-words uppercase border-r border-gray-200">{row.left?.sku || ''}</td>
                <td className="px-3 py-3 text-center border-r border-gray-300">{row.left ? formatNum(row.left.inputtedCost || row.left.cost) : ''}</td>
                <td className="bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center border-x border-gray-200">{formatQty(0)}</td>
                <td className="text-center px-1 py-3 border-x border-gray-200">{format(0)}</td>
                <td className="text-center px-1 py-3 border-r border-gray-300">{format(0)}</td>
                <td className="bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center border-x border-gray-200">{formatQty(0)}</td>
                <td className="text-center px-1 py-3 border-x border-gray-200">{format(0)}</td>
                <td className="text-center px-1 py-3 border-r border-gray-300">{format(0)}</td>
              </tr>
            ))}

            <tr className="bg-[#E2F4D8]/40 border-x border-x-gray-300 border-gray-200">
              <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x border-x-gray-300">CONSUMABLES</td>
              <td className="bg-white border-r border-gray-300"></td>
              <td colSpan={3} className="border-y border-gray-200 border-r border-r-gray-300"></td>
              <td className="bg-white border-r border-gray-300"></td>
              <td colSpan={3} className="border-y border-gray-200 border-r border-r-gray-300"></td>
            </tr>

            {consumableRows.map((row, index) => (
              <tr key={`consumable-row-${index}`} className="border-x border-x-gray-300 bg-white align-middle">
                <td className="px-7 py-3 break-words border-r border-b border-gray-200">{row.left?.sku || ''}</td>
                <td className="px-3 py-3 text-center border-r border-r-gray-300 border-b border-gray-200">{row.left ? formatNum(row.left.cost) : ''}</td>
                <td className="bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center border-r border-r-gray-200 border-b border-gray-200">{row.middle ? formatConsumableQty(row.middle.qty) : ''}</td>
                <td className="text-center px-1 py-3 border-b border-gray-200">{row.middle ? format(row.middle.totalCost) : ''}</td>
                <td className="text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">{row.middle ? format(row.middle.totalSell) : ''}</td>
                <td className="bg-white border-r border-gray-300"></td>
                <td className="px-1 py-3 text-center border-r border-r-gray-200 border-b border-gray-200">{row.right ? formatConsumableQty(n(row.right.qty) * succeedingYearCount) : ''}</td>
                <td className="text-center px-1 py-3 border-b border-gray-200">{row.right ? format(n(row.right.totalCost) * succeedingYearCount) : ''}</td>
                <td className="text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">{row.right ? format(n(row.right.totalSell) * succeedingYearCount) : ''}</td>
              </tr>
            ))}

            {othersRows.length > 0 && (
              <>
                <tr className="bg-[#E2F4D8]/30 border-x border-x-gray-300 border-gray-200">
                  <td colSpan={2} className="px-4 py-1 font-semibold border border-gray-200 border-x border-x-gray-300">OTHERS</td>
                  <td className="bg-white border-r border-gray-300"></td>
                  <td colSpan={3} className="border-y border-gray-200 border-r border-r-gray-300"></td>
                  <td className="bg-white border-r border-gray-300"></td>
                  <td colSpan={3} className="border-y border-gray-200 border-r border-r-gray-300"></td>
                </tr>
                {othersRows.map((row, index) => (
                  <tr key={`others-row-${index}`} className="border-x border-x-gray-300 bg-white align-middle">
                    <td className="px-7 py-3 break-words uppercase border-r border-b border-gray-200">{row.left?.sku || ''}</td>
                    <td className="px-3 py-3 text-center border-r border-r-gray-300 border-b border-gray-200">{row.left ? formatNum(row.left.inputtedCost || row.left.cost) : ''}</td>
                    <td className="bg-white border-r border-gray-300"></td>
                    <td className="px-1 py-3 text-center border-r border-r-gray-200 border-b border-gray-200">{formatQty(0)}</td>
                    <td className="text-center px-1 py-3 border-b border-gray-200">{format(0)}</td>
                    <td className="text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">{format(0)}</td>
                    <td className="bg-white border-r border-gray-300"></td>
                    <td className="px-1 py-3 text-center border-r border-r-gray-200 border-b border-gray-200">{formatQty(0)}</td>
                    <td className="text-center px-1 py-3 border-b border-gray-200">{format(0)}</td>
                    <td className="text-center px-1 py-3 border-r border-r-gray-300 border-b border-x border-gray-200">{format(0)}</td>
                  </tr>
                ))}
              </>
            )}

            <tr className="bg-[#E2F4D8] border-x border-x-gray-300 font-semibold border-gray-100">
              <td className="px-4 py-2 border border-gray-300"></td>
              <td className="px-3 py-2 border border-gray-300"></td>
              <td className="bg-white border-r border-gray-300 border-b-0"></td>
              <td className="px-1 py-2 border border-gray-300"></td>
              <td className="text-center px-1 py-2 font-bold border border-gray-300">{format(consumablesOnlyTotalCost)}</td>
              <td className="text-center px-1 py-2 font-bold border border-gray-300">{format(consumablesOnlyTotalSales)}</td>
              <td className="bg-white border-r border-gray-300 border-b-0"></td>
              <td className="px-1 py-2 border border-gray-300"></td>
              <td className="text-center px-1 py-2 font-bold border border-gray-300">{format(consumablesOnlyTotalCost * succeedingYearCount)}</td>
              <td className="text-center px-1 py-2 font-bold border border-gray-300">{format(consumablesOnlyTotalSales * succeedingYearCount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrintNames() {
  const { project: rawProject, entryProject, usersById = {}, route: routeName, signatures = {} } = usePage().props;
  const project = rawProject ?? entryProject;
  const { projectData } = useProjectData();

  const isArchive   = routeName === 'archive';
  const status      = String(project?.status ?? '').toLowerCase();
  const isRejected  = isArchive && status === 'rejected';

  const nameOf = (id, fallback = '—') => {
    if (!id) return fallback;
    return usersById?.[String(id)]?.name ?? fallback;
  };

  const positionOf = (id, fallback = '—') => {
    if (!id) return fallback;
    return usersById?.[String(id)]?.position ?? fallback;
  };

  const snapSigns = projectData?.metadata?.signatories ?? {};
  const fromSnap = (key) => snapSigns?.[key] ?? '—';

  const hasPageProject = !!project;

  const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });
    const timePart = date
      .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      .replace(' ', '');
    return `${datePart} ${timePart}`;
  };

  const timestampOf = (value) => (hasPageProject ? formatTimestamp(value) : '');

  const preparedBy = hasPageProject ? (project?.user?.name ?? nameOf(project?.user_id, '—')) : fromSnap('preparedBy');

  const reviewedBy = hasPageProject ? nameOf(project?.reviewed_by) : fromSnap('reviewedBy');
  const checkedBy = hasPageProject ? nameOf(project?.checked_by) : fromSnap('checkedBy');
  const endorsedBy = hasPageProject ? nameOf(project?.endorsed_by) : fromSnap('endorsedBy');
  const confirmedBy = hasPageProject ? nameOf(project?.confirmed_by) : fromSnap('confirmedBy');
  const approvedBy = hasPageProject ? nameOf(project?.approved_by) : fromSnap('approvedBy');

  const rejectedBy = hasPageProject ? (isRejected ? nameOf(project?.rejected_by) : '—') : fromSnap('rejectedBy');

  const rejectedLevel = Number(project?.rejected_by_level ?? 0);

  const preparedByPosition = hasPageProject ? positionOf(project?.user_id) : fromSnap('preparedByPosition');
  const reviewedByPosition = hasPageProject ? positionOf(project?.reviewed_by) : fromSnap('reviewedByPosition');
  const checkedByPosition = hasPageProject ? positionOf(project?.checked_by) : fromSnap('checkedByPosition');
  const endorsedByPosition = hasPageProject ? positionOf(project?.endorsed_by) : fromSnap('endorsedByPosition');
  const confirmedByPosition = hasPageProject ? positionOf(project?.confirmed_by) : fromSnap('confirmedByPosition');
  const approvedByPosition = hasPageProject ? positionOf(project?.approved_by) : fromSnap('approvedByPosition');
  const rejectedByPosition = hasPageProject ? positionOf(project?.rejected_by) : fromSnap('rejectedByPosition');

  const isSentBack = status === 'sent back';
  const currentLevel = Number(project?.current_level ?? 0);

  const isCancelled = isArchive && status === 'cancelled';

  const preparedAt = isCancelled
    ? timestampOf(project?.cancelled_at ?? project?.last_saved_at)
    : timestampOf(project?.submitted_at);

  const reviewedAt  = isSentBack && currentLevel <= 2 ? '' : timestampOf(project?.reviewed_at);
  const checkedAt   = isSentBack && currentLevel <= 3 ? '' : timestampOf(project?.checked_at);
  const endorsedAt  = isSentBack && currentLevel <= 4 ? '' : timestampOf(project?.endorsed_at);
  const confirmedAt = isSentBack && currentLevel <= 5 ? '' : timestampOf(project?.confirmed_at);
  const approvedAt  = isSentBack && currentLevel <= 6 ? '' : timestampOf(project?.approved_at);

  const rejectedAt  = isRejected ? timestampOf(project?.rejected_at) : '';

  const getSignature = (signatureUrl, timestamp) => {
    return timestamp ? signatureUrl : null;
  };

  return (
    <div className="w-full mx-0 space-y-12 font-sans pb-10 mt-10 print-avoid-break">
      <div className="grid grid-cols-4 gap-6 px-1">
        <PrintSignatory
          label="PREPARED BY:"
          name={preparedBy}
          title={preparedByPosition}
          timestamp={preparedAt}
          isRejectedAction={false}
          isCancelledAction={isCancelled}
          signatureUrl={getSignature(signatures?.preparer ?? null, preparedAt)}
        />

        <PrintSignatory
          label="REVIEWED BY:"
          name={isRejected && rejectedLevel === 2 ? rejectedBy : reviewedBy}
          title={isRejected && rejectedLevel === 2 ? rejectedByPosition : reviewedByPosition}
          timestamp={isRejected && rejectedLevel === 2 ? rejectedAt : reviewedAt}
          isRejectedAction={isRejected && rejectedLevel === 2}
          signatureUrl={getSignature(signatures?.reviewed_by ?? null, isRejected && rejectedLevel === 2 ? rejectedAt : reviewedAt)}
        />

        <PrintSignatory
          label="CHECKED BY:"
          name={isRejected && rejectedLevel === 3 ? rejectedBy : checkedBy}
          title={isRejected && rejectedLevel === 3 ? rejectedByPosition : checkedByPosition}
          timestamp={isRejected && rejectedLevel === 3 ? rejectedAt : checkedAt}
          isRejectedAction={isRejected && rejectedLevel === 3}
          signatureUrl={getSignature(signatures?.checked_by ?? null, isRejected && rejectedLevel === 3 ? rejectedAt : checkedAt)}
        />

        <PrintSignatory
          label="ENDORSED BY:"
          name={isRejected && rejectedLevel === 4 ? rejectedBy : endorsedBy}
          title={isRejected && rejectedLevel === 4 ? rejectedByPosition : endorsedByPosition}
          timestamp={isRejected && rejectedLevel === 4 ? rejectedAt : endorsedAt}
          isRejectedAction={isRejected && rejectedLevel === 4}
          signatureUrl={getSignature(signatures?.endorsed_by ?? null, isRejected && rejectedLevel === 4 ? rejectedAt : endorsedAt)}
        />

        <div></div>
        <div></div>
        <div className="col-start-3">
          <PrintSignatory
            label="CONFIRMED BY:"
            name={isRejected && rejectedLevel === 5 ? rejectedBy : confirmedBy}
            title={isRejected && rejectedLevel === 5 ? rejectedByPosition : confirmedByPosition}
            timestamp={isRejected && rejectedLevel === 5 ? rejectedAt : confirmedAt}
            isRejectedAction={isRejected && rejectedLevel === 5}
            signatureUrl={getSignature(signatures?.confirmed_by ?? null, isRejected && rejectedLevel === 5 ? rejectedAt : confirmedAt)}
          />
        </div>

        <div className="col-start-4">
          <PrintSignatory
            label="APPROVED BY:"
            name={isRejected && rejectedLevel === 6 ? rejectedBy : approvedBy}
            title={isRejected && rejectedLevel === 6 ? rejectedByPosition : approvedByPosition}
            timestamp={isRejected && rejectedLevel === 6 ? rejectedAt : approvedAt}
            isRejectedAction={isRejected && rejectedLevel === 6}
            signatureUrl={getSignature(signatures?.approved_by ?? null, isRejected && rejectedLevel === 6 ? rejectedAt : approvedAt)}
          />
        </div>
      </div>
    </div>
  );
}

const PrintSignatory = ({ label, name, title, timestamp, isRejectedAction, signatureUrl, isCancelledAction = false }) => (
  <div className="flex flex-col space-y-4 justify-center">
    <span className="text-[9px] font-extrabold text-gray-800 tracking-tight">{label}</span>
    <div className="pt-2">
      <div className="relative w-full h-16">
        {signatureUrl && (
          <img
            src={signatureUrl}
            alt="Signature"
            className="absolute inset-0 -ml-6 w-full h-full object-contain pointer-events-none"
            style={{ mixBlendMode: 'multiply' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        <p className="absolute bottom-0 left-0 right-0 text-[11px] text-center font-medium text-gray-900 border-b border-gray-400 pb-0.5 min-w-[120px] uppercase">
          {name || '—'}
        </p>

        <span
            className={`absolute right-2 bottom-8 text-[10px] font-normal tracking-tight whitespace-nowrap leading-none select-none ${isRejectedAction || isCancelledAction ? "text-red-500" : "text-[#175500]"}`}
          >
          {timestamp}
        </span>
      </div>

      <p className="text-[11px] text-center text-gray-500 mt-1">{title}</p>
    </div>
  </div>
);

function PrintSucceTotals({ printData }) {
  const succYear = succeedingYears(printData) || {};

  const {
    grandtotalCost = 0,
    grandtotalSell = 0,
    grossProfit = 0,
    roiPercentage = 0,
    companyFees = [],
    customerFees = [],
  } = succYear;

  const allAdditionalFees = [
    ...companyFees.map((f) => ({ ...f, __source: 'company' })),
    ...customerFees.map((f) => ({ ...f, __source: 'customer' })),
  ];

  const companyTotal = companyFees.reduce((sum, fee) => sum + Number(fee.total || 0), 0);
  const customerTotal = customerFees.reduce((sum, fee) => sum + Number(fee.total || 0), 0);

  const contractYears = parseInt(printData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  const year2Cost = grandtotalCost;
  const year2Revenue = grandtotalSell;
  const year2ROI = grossProfit;

  const overallSucceCost = grandtotalCost * succeedingYearCount;
  const overallSucceRevenue = grandtotalSell * succeedingYearCount;
  const overallSucceROI = grossProfit * succeedingYearCount;
  const overallSucceRoiPercentage =
    overallSucceCost !== 0 ? (overallSucceROI / overallSucceCost) * 100 : 0;

  const format = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return '';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const nFormat = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return '';
    return num.toLocaleString();
  };

  const n = (val) => Number(val) || 0;

  return (
    <div className="my-2 font-sans tracking-tight text-[10px]">
      <div className="items-start text-[12px]">
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
                    <th className="px-3 py-1 text-center border border-gray-300 uppercase text-[10px] font-medium">Amount</th>
                    <th className="px-3 py-1 text-center bg-white"></th>
                    <th colSpan={3} className="px-3 py-1 text-center border border-gray-300"></th>
                    <th className="px-3 py-1 text-center bg-white"></th>
                    <th colSpan={3} className="px-3 py-1 text-center border border-gray-300"></th>
                  </tr>
                </thead>

                <tbody className="text-[10px]">
                 {allAdditionalFees.length > 0 ? (
                    allAdditionalFees.map((fee, idx) => {
                      const isA3ColorClick = fee.label?.toLowerCase().includes('a3 color click');
                      const isCompany = companyFees.some((cf) => cf.id === fee.id);
                      const feeQty = n(fee.qty);
                      const feeCost = n(fee.cost);
                      return (
                        <tr key={fee.id || idx} className="border-x-gray-300">
                          <td className="border border-x-gray-300 border-gray-100 px-4 py-2 text-[12px] truncate border-r">
                            {fee.label}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 px-3 py-2 text-[11px] text-right border-r">
                          {isA3ColorClick ? '' : format(fee.cost)}
                          </td>
                          <td className="py-2 border-r border-gray-300 bg-white"></td>

                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {feeCost !== 0 ? nFormat(feeQty) : ''}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {isCompany ? format(fee.total) : ''}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {!isCompany ? format(fee.total) : ''}
                          </td>

                          <td className="py-2 border-r border-gray-300 bg-white"></td>

                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {feeCost !== 0 ? nFormat(feeQty * succeedingYearCount) : ''}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 py-2 border-r text-center">
                            {isCompany ? format(n(fee.total) * succeedingYearCount) : ''}
                          </td>
                          <td className="border border-x-gray-300 border-gray-100 py-2 text-center">
                            {!isCompany ? format(n(fee.total) * succeedingYearCount) : ''}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 text-[11px] text-gray-600 truncate">—</td>
                      <td className="border border-gray-300 px-3 py-3 text-right"></td>
                      <td className="py-2 border-r border-gray-300 bg-white"></td>
                      <td colSpan={3} className="border border-gray-300"></td>
                      <td className="py-2 border-r border-gray-300 bg-white"></td>
                      <td colSpan={3} className="border border-gray-300"></td>
                    </tr>
                  )}

                  <tr className="bg-[#E2F4D8]/70 font-bold text-gray-800 shadow-sm">
                    <td className="px-3 py-2 text-[11px] uppercase border border-gray-300">Total</td>
                    <td className="px-3 py-2 text-right text-[11px] border-r border-y border-gray-300"></td>
                    <td className="py-2 border-r border-gray-300 bg-white"></td>
                    <td className="py-2 border-r border-t border-gray-300"></td>
                    <td className="py-2 border-r border-t border-gray-300 text-center">{format(companyTotal)}</td>
                    <td className="py-2 border-r border-t border-gray-300 text-center">{format(customerTotal)}</td>
                    <td className="py-2 border-r border-gray-300 bg-white"></td>
                    <td className="py-2 border-r border-t border-gray-300"></td>
                    <td className="py-2 border-r border-t border-gray-300 text-center">{format(companyTotal * succeedingYearCount)}</td>
                    <td className="py-2 text-center border-r border-t border-gray-300">{format(customerTotal * succeedingYearCount)}</td>
                  </tr>

                  <tr className="bg-white">
                    <td colSpan={3} rowSpan={3} className="border-0 p-0"></td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">Total</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2Cost)}</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2Revenue)}</td>
                    <td rowSpan={3} className="border-0 p-0 bg-white"></td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">Total</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceCost)}</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceRevenue)}</td>
                  </tr>

                  <tr className="bg-white">
                    <td className="py-3"></td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">ROI</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(year2ROI)}</td>
                    <td className="py-3"></td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center uppercase text-[11px]">ROI</td>
                    <td className="py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[11px]">{format(overallSucceROI)}</td>
                  </tr>

                  <tr className="bg-white">
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className={`py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[10px] ${roiPercentage >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {roiPercentage !== 0 ? `${roiPercentage.toFixed(2)}%` : ''}
                    </td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className={`py-3 border border-gray-300 bg-[#E2F4D8] font-bold text-center text-[10px] ${overallSucceRoiPercentage >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {overallSucceRoiPercentage !== 0 ? `${overallSucceRoiPercentage.toFixed(2)}%` : ''}
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

function PrintNotesAndComments() {
  const { project: rawProject, entryProject, projectNotes, projectComments } = usePage().props;
  const project = rawProject ?? entryProject ?? null;

  const formatDateTime = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const datePart = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(d);
    const timePart = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return `${datePart} - ${timePart}`;
  };

  const serverNotes = (() => {
    const fromProject = project?.notes;
    const rows = Array.isArray(fromProject) && fromProject.length > 0 ? fromProject : projectNotes ?? [];
    if (!Array.isArray(rows)) return [];
    return [...rows].sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  })();

  const serverComments = (() => {
    const fromProject = project?.comments;
    const rows = Array.isArray(fromProject) && fromProject.length > 0 ? fromProject : projectComments ?? [];
    return Array.isArray(rows) ? rows : [];
  })();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        {serverNotes.length > 0 && (
          <span className="text-[11px] text-gray-400 pl-2">NOTES</span>
        )}
        {serverNotes.map((n, idx) => (
          <div
            key={n.id ?? `${n.created_at ?? 'note'}-${idx}`}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 my-[3px] shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div className="items-start flex gap-2 min-w-0">
                <div className="flex items-center">
                  <FaRegUserCircle className="text-gray-400 text-sm shrink-0" />
                </div>
                <span className="block text-[11px] font-medium text-gray-900 truncate">
                  {n.author?.name ?? 'Unknown'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 italic whitespace-nowrap">
                {formatDateTime(n.created_at)}
              </div>
            </div>
            <p className="mt-1 text-gray-900 text-xs leading-relaxed">{n.body}</p>
          </div>
        ))}
      </div>

      <div>
        {serverComments.length > 0 && (
          <span className="font-medium text-[11px] text-gray-400 pl-2">COMMENTS</span>
        )}
        {serverComments.map((c, idx) => (
          <div
            key={c.id ?? `${c.created_at ?? 'comment'}-${idx}`}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 my-[3px] shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center">
                  <FaRegUserCircle className="text-gray-400 text-sm shrink-0" />
                </div>
                <span className="block text-[11px] font-medium text-gray-900 truncate">
                  {c.author?.name ?? 'Unknown'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 italic whitespace-nowrap">
                {formatDateTime(c.created_at)}
              </div>
            </div>
            <p className="mt-2 text-gray-900 text-xs leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

export default function RoiEntryPrint({
  storageKey = null,
  autoprint = false,
  entryProject = null,
  project = null,
}) {
  const [loaded, setLoaded] = useState(false);
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    try {
      if (storageKey) {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          setPrintData(JSON.parse(raw));
          setLoaded(true);
          return;
        }
      }

      const p = entryProject || project;
      if (p) {
        setPrintData(mapProjectToPrintData(p));
        setLoaded(true);
        return;
      }

      setLoaded(true);
    } catch (e) {
      console.error('RoiEntryPrint: failed to load print data:', e);
      setLoaded(true);
    }
  }, [storageKey, entryProject, project]);

  useEffect(() => {
    if (!autoprint || !loaded) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoprint, loaded]);

  if (!loaded) return null;

  const companyInfo = printData?.companyInfo ?? {};
  const yieldData = printData?.yield ?? {};


  return (
    <div className="print-root">
      <PrintContractInfo companyInfo={companyInfo} />

      <div className="grid grid-cols-[40%_60%] gap-4 mt-4 items-start">
        <div className="w-full">
          <PrintTotalMVP yieldData={yieldData} />
        </div>

        <div className="w-full">
          <PrintInterestCalcuSum printData={printData} />
        </div>
      </div>

      <div className="mt-3">
        <PrintMachCon1stYear printData={printData} />
      </div>

      {Number(printData?.companyInfo?.contractYears) > 1 && (
        <>
            <div className="mt-4">
                <PrintMachConSucceMerged printData={printData} />
            </div>

            <div className="mt-4">
                <PrintSucceTotals printData={printData} />
            </div>
        </>
      )}
 
      <div className="print-page-break"></div>

      <div className="mt-8 grid grid-cols-[70%_30%] gap-4 items-start mr-4">
        <PrintContractDetails printData={printData} />
        <PrintEntryRemarksSummary printData={printData} />
      </div>

      <div className="pt-5">
        <PrintNotesAndComments />
        <PrintNames />
      </div>

      <ViewButton
        onClick={() => window.print()}
        label="Print"
        icon={IoPrintSharp}
        iconSize="text-xl"
        side="left"
        className="print:hidden !text-white fixed right-6 top-1/2 -translate-y-1/2 z-50 !p-3 !rounded-full !bg-darkgreen hover:!bg-[#289800] shadow-lg hover:shadow-xl"
      />
    </div>
  );
}

RoiEntryPrint.layout = (page) => (
  <PrintLayout showDraftWatermark={page.props.showDraftWatermark}>
    {page}
  </PrintLayout>
);