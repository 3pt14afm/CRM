import { useProjectData } from '@/Context/ProjectContext'
import React, { useEffect, useMemo } from 'react'

function ContractDetails() {
  const { projectData, setContractDetails } = useProjectData();

  // Destructure machine and consumable directly from machineConfiguration
  const { machine, consumable } = projectData?.machineConfiguration || { machine: [], consumable: [] };

  const contractType = projectData?.companyInfo?.contractType || "";
  const normalizedContractType = String(contractType).trim().toLowerCase();

  const isRentalClick =
    normalizedContractType === "rental + click" ||
    normalizedContractType === "rental+click";

  const isFixClick =
    normalizedContractType === "fix click" ||
    normalizedContractType === "fixed click";

  // ✅ Rental + Click and Fix Click share the same contract-details behavior
  const isClickBasedContract = isRentalClick || isFixClick;

  // ✅ Show Contract Type column only for click-based contracts
  const showContractTypeColumn = isClickBasedContract;

  // ✅ Contract duration (for machine amount in click-based contracts)
  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const contractMonths = contractYears > 0 ? contractYears * 12 : 0;

  // ✅ MONTHLY yields (used for click-charge qty)
  const monoMonthlyYields = Number(projectData?.yield?.monoAmvpYields?.monthly) || 0;
  const colorMonthlyYields = Number(projectData?.yield?.colorAmvpYields?.monthly) || 0;

  // Fees (source of click-charge unit price + monthly rental price for click-based contracts)
  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], total: 0 };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];
  const allFees = [...companyFees, ...customerFees];

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(val) || 0);

  const normalize = (s) => String(s || '').trim().toLowerCase();

  // ✅ Monthly Rental fee cost (used as machine unit price for click-based contracts)
  const monthlyRentalFee = useMemo(() => {
    return allFees.find(f => normalize(f.label) === "monthly rental");
  }, [allFees]);

  const monthlyRentalUnitPrice = Number(monthlyRentalFee?.cost) || 0;

  const machineContractTypeLabel = isRentalClick
    ? 'RENTAL + CLICK'
    : isFixClick
      ? 'FIX CLICK'
      : '';

  // ✅ Build hardware rows for Contract Details
  // Click-based contracts (Rental + Click / Fix Click):
  // - qty is always 1
  // - unit price is monthly rental fee cost
  // - amount = monthly rental x total contract months
  // Other contract types:
  // - keep original qty display
  // - hardware unit price/amount stays 0 (same as your original behavior)
  const contractMachines = useMemo(() => {
    return (machine || []).map((m) => {
      // For both Rental + Click and Fix Click, display qty as 1
      const qty = isClickBasedContract ? 1 : (Number(m.qty) || 0);

      // ✅ Only Rental + Click uses Monthly Rental fee as machine unit price
      // ✅ Fix Click has no monthly rental, so machine unit price/amount must be 0
      const unitPrice = isRentalClick ? monthlyRentalUnitPrice : 0;
      const amount = isRentalClick ? (unitPrice * contractMonths) : 0;

      return {
        ...m,
        qty,
        unitPrice,
        amount,
        contractTypeLabel: isClickBasedContract ? machineContractTypeLabel : '',
      };
    });
  }, [
    machine,
    isClickBasedContract,
    isRentalClick,
    monthlyRentalUnitPrice,
    contractMonths,
    machineContractTypeLabel
  ]);

  // ✅ Build consumables for Contract Details
  // Click-based contracts:
  // - derive from FEES fixed click rows
  // Other contract types:
  // - use machineConfiguration consumables with selling price > 0 (original behavior)
  const contractToners = useMemo(() => {
    if (isClickBasedContract) {
      const CLICK_ROWS = [
        {
          feeLabel: "A4/A3 MONO CLICK",
          displayName: "Click Charge - MONO (A4/A3)",
          qty: monoMonthlyYields,
        },
        {
          feeLabel: "A4/LGL COLOR CLICK",
          displayName: "Click Charge - COLOR (A4/LGL)",
          qty: colorMonthlyYields,
        },
        {
          feeLabel: "A3 COLOR CLICK",
          displayName: "Click Charge - COLOR (A3)",
          qty: 0,
        },
      ];

      return CLICK_ROWS.map((row) => {
        const matchedFee = allFees.find(f => normalize(f.label) === normalize(row.feeLabel));
        const unitPriceFromFees = Number(matchedFee?.cost) || 0;

        return {
          ...matchedFee,
          sku: row.displayName,
          displayName: row.displayName,
          qty: Number(row.qty) || 0, // monthly yields
          price: unitPriceFromFees,   // fee cost
          remarks: matchedFee?.remarks || '',
          contractTypeLabel: 'CLICK CHARGE',
          __fromClickFee: true,
        };
      });
    }

    // ✅ Original behavior for non-click-based contracts
    return (consumable || [])
      .filter(item => Number(item.price) > 0)
      .map(item => ({
        ...item,
        contractTypeLabel: '',
      }));
  }, [isClickBasedContract, monoMonthlyYields, colorMonthlyYields, allFees, consumable]);

  // ✅ Total Initial includes:
  // - click-based machine amount (monthly rental x months) + click charges
  // - Other contract types: consumables only (hardware amount remains 0)
  const totalInitial = useMemo(() => {
    const machineTotal = contractMachines.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0);
    }, 0);

    const consumableTotal = contractToners.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return sum + (qty * price);
    }, 0);

    return machineTotal + consumableTotal;
  }, [contractMachines, contractToners]);

  useEffect(() => {
    setContractDetails({
      machine: contractMachines,
      consumable: contractToners,
      totalInitial
    });
  }, [contractMachines, contractToners, totalInitial, setContractDetails]);

  // ✅ Dynamic colspans depending on whether Contract Type column is shown
  const sectionColSpan = showContractTypeColumn ? 6 : 5;
  const totalLabelColSpan = showContractTypeColumn ? 4 : 3;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm font-sans max-w-full mx-20 my-6 print:mx-1">
      <div className="bg-[#E2F4D8] py-2 text-center border-b border-gray-300">
        <h2 className="text-xs font-bold tracking-widest text-gray-800 uppercase">Contract Details</h2>
      </div>

      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="text-[10px] font-bold border-b uppercase text-gray-700 bg-[#E2F4D8]/10">
            <th className="px-4 py-2 border-r border-gray-300 text-left">Particulars</th>

            {showContractTypeColumn && (
              <th className="px-3 py-2 border-r border-gray-300 text-center">Contract Type</th>
            )}

            <th className="px-3 py-2 border-r border-gray-300 text-center w-16">Qty</th>
            <th className="px-3 py-2 border-r border-gray-300 text-center">Unit Price</th>
            <th className="px-3 py-2 border-r border-gray-300 text-center">Amount</th>
            <th className="px-3 py-2 text-left w-[24%]">Remarks</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {/* HARDWARE SECTION */}
          <tr className="bg-gray-50/50">
            <td
              colSpan={sectionColSpan}
              className="px-4 py-1 text-left text-[9px] font-bold uppercase text-gray-500"
            >
              Hardware
            </td>
          </tr>

          {contractMachines.length > 0 ? (
            contractMachines.map((item, idx) => {
              const qty = Number(item.qty) || 0;
              const unitPrice = Number(item.unitPrice) || 0;
              const amount = Number(item.amount) || 0;

              return (
                <tr key={`m-${idx}`} className="bg-white">
                  <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-600 text-xs">
                    {item.sku?.toUpperCase()}
                  </td>

                  {showContractTypeColumn && (
                    <td className="px-3 py-2 border-r border-gray-300 text-center text-gray-600 text-[10px] font-medium uppercase">
                      {item.contractTypeLabel || '-'}
                    </td>
                  )}

                  <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-600 text-xs">
                    {qty}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono">
                    {unitPrice > 0 ? formatCurrency(unitPrice) : 'PHP 0.00'}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono">
                    {amount > 0 ? formatCurrency(amount) : '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-[10px] italic text-left uppercase">
                    {item.remarks}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr className="bg-white">
              <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-400 text-xs">-</td>

              {showContractTypeColumn && (
                <td className="px-3 py-2 border-r border-gray-300 text-center text-gray-400 text-[10px]">-</td>
              )}

              <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-400 text-xs">0</td>
              <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-400 text-xs font-mono">PHP 0.00</td>
              <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-400 text-xs font-mono">-</td>
              <td className="px-4 py-2 text-gray-400 text-[10px] text-left">-</td>
            </tr>
          )}

          {/* CONSUMABLES SECTION */}
          <tr className="bg-gray-50/50">
            <td
              colSpan={sectionColSpan}
              className="px-4 py-1 text-left text-[9px] font-bold uppercase text-gray-500"
            >
              Consumables
            </td>
          </tr>

          {contractToners.length > 0 ? (
            contractToners.map((item, idx) => {
              const qty = Number(item.qty) || 0;
              const price = Number(item.price) || 0;
              const amount = qty * price;

              return (
                <tr key={`c-${idx}`} className="bg-white">
                  <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-600 text-xs">
                    {item.displayName ? item.displayName : item.sku?.toUpperCase()}
                  </td>

                  {showContractTypeColumn && (
                    <td className="px-3 py-2 border-r border-gray-300 text-center text-gray-600 text-[10px] font-medium uppercase">
                      {item.contractTypeLabel || '-'}
                    </td>
                  )}

                  <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-600 text-xs">
                    {qty}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono">
                    {formatCurrency(price)}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono">
                    {formatCurrency(amount)}
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-[10px] text-left">
                    {item.remarks}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr className="bg-white">
              <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-400 text-xs">-</td>

              {showContractTypeColumn && (
                <td className="px-3 py-2 border-r border-gray-300 text-center text-gray-400 text-[10px]">-</td>
              )}

              <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-400 text-xs">0</td>
              <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-400 text-xs font-mono">0.00</td>
              <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-400 text-xs font-mono">0.00</td>
              <td className="px-4 py-2 text-gray-400 text-[10px] text-left">-</td>
            </tr>
          )}
        </tbody>

        <tfoot>
          <tr className="bg-[#E2F4D8]/20 border-t border-gray-300 font-semibold">
            <td
              colSpan={totalLabelColSpan}
              className="px-4 py-2 text-right text-[12px] uppercase border-r border-gray-300"
            >
              Total Initial
            </td>
            <td className="px-4 py-2 border-r border-gray-300 text-right text-xs font-mono">
              {formatCurrency(totalInitial)}
            </td>
            <td className="px-4 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default ContractDetails