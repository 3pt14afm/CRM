import { useProjectData } from '@/Context/ProjectContext'
import React, { useEffect, useMemo } from 'react'

function ContractDetails() {
  const { projectData, setContractDetails } = useProjectData();

  const { machine, consumable } = projectData?.machineConfiguration || { machine: [], consumable: [] };

  const contractType = projectData?.companyInfo?.contractType || "";
  const normalizedContractType = String(contractType).trim().toLowerCase();

  const isRentalClick =
    normalizedContractType === "rental + click" ||
    normalizedContractType === "rental+click";

  const isFixClick =
    normalizedContractType === "fix click" ||
    normalizedContractType === "fixed click";

  const isClickBasedContract = isRentalClick || isFixClick;
  const showContractTypeColumn = isClickBasedContract;

  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const contractMonths = contractYears > 0 ? contractYears * 12 : 0;

  const monoMonthlyYields = Number(projectData?.yield?.monoAmvpYields?.monthly) || 0;
  const colorMonthlyYields = Number(projectData?.yield?.colorAmvpYields?.monthly) || 0;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], total: 0 };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];
  const allFees = [...companyFees, ...customerFees];

  // Updated Formatter: Returns blank string if value is 0
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return "";
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Specifically for Quantities (integers)
  const formatQty = (val) => {
    const num = Number(val) || 0;
    return num === 0 ? "" : num;
  };

  const normalize = (s) => String(s || '').trim().toLowerCase();

  const monthlyRentalFee = useMemo(() => {
    return allFees.find(f => normalize(f.label) === "rental + supplies");
  }, [allFees]);

  const monthlyRentalUnitPrice = Number(monthlyRentalFee?.cost) || 0;

  const machineContractTypeLabel = isRentalClick
    ? 'RENTAL + CLICK'
    : isFixClick
      ? 'FIX CLICK'
      : '';

  const contractMachines = useMemo(() => {
    return (machine || []).map((m) => {
      const qty = isClickBasedContract ? 1 : (Number(m.qty) || 0);
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
          qty: Number(row.qty) || 0,
          price: unitPriceFromFees,
          remarks: matchedFee?.remarks || '',
          contractTypeLabel: 'CLICK CHARGE',
          __fromClickFee: true,
        };
      });
    }

    return (consumable || [])
      .filter(item => Number(item.price) > 0)
      .map(item => ({
        ...item,
        contractTypeLabel: '',
      }));
  }, [isClickBasedContract, monoMonthlyYields, colorMonthlyYields, allFees, consumable]);

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

  const sectionColSpan = showContractTypeColumn ? 6 : 5;
  const totalLabelColSpan = showContractTypeColumn ? 4 : 3;

  const colWidths = showContractTypeColumn
    ? ["26%", "18%", "8%", "16%", "16%", "16%"]
    : ["35%", "7%", "18%", "18%", "22%"];

  // ---- Mobile card helpers (desktop table below is untouched) ----

  const MobileMachineCard = ({ item, idx }) => {
    const qty = Number(item.qty) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const amount = Number(item.amount) || 0;

    return (
      <div
        key={`m-mobile-${idx}`}
        className="bg-white border border-gray-200 rounded-lg p-3 space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-gray-700 uppercase leading-snug">
            {item.sku?.toUpperCase()}
          </span>
          {showContractTypeColumn && item.contractTypeLabel && (
            <span className="shrink-0 text-[9px] font-medium uppercase text-gray-600 bg-[#E2F4D8] px-2 py-0.5 rounded-full">
              {item.contractTypeLabel}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[9px] uppercase text-gray-400">Qty</div>
            <div className="text-xs text-gray-600">{formatQty(qty)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-gray-400">Unit Price</div>
            <div className="text-xs text-gray-600 font-mono">{unitPrice > 0 ? formatCurrency(unitPrice) : ''}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-gray-400">Amount</div>
            <div className="text-xs text-gray-600 font-mono">{amount > 0 ? formatCurrency(amount) : ''}</div>
          </div>
        </div>

        {item.remarks && (
          <div className="text-[10px] italic text-gray-500 uppercase pt-1 border-t border-gray-100">
            {item.remarks}
          </div>
        )}
      </div>
    );
  };

  const MobileConsumableCard = ({ item, idx }) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const amount = qty * price;

    return (
      <div
        key={`c-mobile-${idx}`}
        className="bg-white border border-gray-200 rounded-lg p-3 space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-gray-700 leading-snug">
            {item.displayName ? item.displayName : item.sku?.toUpperCase()}
          </span>
          {showContractTypeColumn && item.contractTypeLabel && (
            <span className="shrink-0 text-[9px] font-medium uppercase text-gray-600 bg-[#E2F4D8] px-2 py-0.5 rounded-full">
              {item.contractTypeLabel}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[9px] uppercase text-gray-400">Qty</div>
            <div className="text-xs text-gray-600">{formatQty(qty)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-gray-400">Unit Price</div>
            <div className="text-xs text-gray-600 font-mono">{formatCurrency(price)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-gray-400">Amount</div>
            <div className="text-xs text-gray-600 font-mono">{formatCurrency(amount)}</div>
          </div>
        </div>

        {item.remarks && (
          <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
            {item.remarks}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 shadow-sm font-sans max-w-full my-6 print:mx-1">
      <div className="bg-[#E2F4D8] py-2 text-center border-b border-gray-300">
        <h2 className="text-xs font-bold tracking-widest text-gray-800 uppercase">Contract Details</h2>
      </div>

      {/* ---------------- MOBILE VIEW (below md) ---------------- */}
      <div className="md:hidden p-3 space-y-4 print:hidden">
        <div className="space-y-2">
          <div className="text-[9px] font-bold uppercase text-gray-500 px-1">Hardware</div>
          {contractMachines.length > 0 ? (
            <div className="space-y-2">
              {contractMachines.map((item, idx) => (
                <MobileMachineCard key={`m-mobile-${idx}`} item={item} idx={idx} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center text-gray-400 text-xs">-</div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-[9px] font-bold uppercase text-gray-500 px-1">Consumables</div>
          {contractToners.length > 0 ? (
            <div className="space-y-2">
              {contractToners.map((item, idx) => (
                <MobileConsumableCard key={`c-mobile-${idx}`} item={item} idx={idx} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center text-gray-400 text-xs">-</div>
          )}
        </div>

        <div className="bg-[#E2F4D8]/40 border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase text-gray-700">Total Initial</span>
          <span className="text-sm font-mono font-semibold text-gray-800">
            {formatCurrency(totalInitial) || "PHP 0.00"}
          </span>
        </div>
      </div>

      {/* ---------------- DESKTOP VIEW (md and up) — unchanged ---------------- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <colgroup>
            {colWidths.map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>

          <thead>
            <tr className="text-[10px] font-bold border-b uppercase text-gray-700 bg-[#E2F4D8]/10">
              <th className="px-4 py-2 border-r border-gray-300 text-left">Particulars</th>

              {showContractTypeColumn && (
                <th className="px-3 py-2 border-r border-gray-300 text-center">Contract Type</th>
              )}

              <th className="px-3 py-2 border-r border-gray-300 text-center print:px-1">Qty</th>
              <th className="px-3 py-2 border-r border-gray-300 text-center print:px-1">Unit Price</th>
              <th className="px-3 py-2 border-r border-gray-300 text-center print:px-1">Amount</th>
              <th className="px-3 py-2 text-left">Remarks</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
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
                    <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-600 text-xs print:text-[10px] print:py-1">
                      {item.sku?.toUpperCase()}
                    </td>

                    {showContractTypeColumn && (
                      <td className="px-3 py-2 border-r border-gray-300 text-center text-gray-600 text-[10px] font-medium uppercase print:py-1">
                        {item.contractTypeLabel || ''}
                      </td>
                    )}

                    <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-600 text-xs print:py-1 print:text-[10px]">
                      {formatQty(qty)}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono print:py-1 print:text-[10px]">
                      {unitPrice > 0 ? formatCurrency(unitPrice) : ''}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono print:py-1 print:text-[10px]">
                      {amount > 0 ? formatCurrency(amount) : ''}
                    </td>
                    <td className="px-4 py-2 text-gray-600 text-[10px] italic text-left uppercase print:py-1 print:text-[10px]">
                      {item.remarks}
                    </td>
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
                    <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-600 text-xs print:text-[10px] print:py-1">
                      {item.displayName ? item.displayName : item.sku?.toUpperCase()}
                    </td>

                    {showContractTypeColumn && (
                      <td className="px-3 py-2 border-r border-gray-300 text-center text-gray-600 text-[10px] font-medium uppercase print:py-1">
                        {item.contractTypeLabel || ''}
                      </td>
                    )}

                    <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-600 text-xs print:py-1 print:text-[10px]">
                      {formatQty(qty)}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono print:py-1 print:text-[10px]">
                      {formatCurrency(price)}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono print:py-1 print:text-[10px]">
                      {formatCurrency(amount)}
                    </td>
                    <td className="px-4 py-2 text-gray-600 text-[10px] text-left print:py-1 print:text-[10px]">
                      {item.remarks}
                    </td>
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
              <td
                colSpan={totalLabelColSpan}
                className="px-4 py-2 text-right text-[12px] uppercase border-r border-gray-300"
              >
                Total Initial
              </td>
              <td className="px-4 py-2 border-r border-gray-300 text-right text-xs font-mono">
                {formatCurrency(totalInitial) || "PHP 0.00"}
              </td>
              <td className="px-4 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default ContractDetails