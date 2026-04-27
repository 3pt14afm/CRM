import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import PrintLayout from '@/Layouts/PrintLayout';
import Conditions from '@/Components/sprf/Conditions';

const APPROVAL_LEVEL = {
  ESD_ONLY: 'ESD_ONLY',
  VP_AND_CCTO: 'VP_AND_CCTO',
  PRESIDENT_AND_CEO: 'PRESIDENT_AND_CEO',
};

const isBlank = (value) =>
  value === '' || value === null || value === undefined;

const toNumber = (value) => Number(value || 0);

const displayText = (value) => {
  if (isBlank(value)) return '';

  const text = String(value);
  return text.trim() ? text : '';
};

const displayPeso = (value) => {
  if (isBlank(value)) return '';

  return `₱${Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const displayWholePeso = (value) => {
  if (isBlank(value)) return '';

  return Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const displayPercent = (value) => {
  if (isBlank(value)) return '';

  return `${Number(value).toFixed(2)}%`;
};

const normalizePrintRows = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : [''];
  }

  if (isBlank(value)) return [''];

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) return [''];

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed : [''];
      }
    } catch (error) {
      // Keep checking the original string if it is not JSON.
    }

    return trimmed
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);
  }

  return [value];
};

const hasItemValue = (row) => {
  return (
    displayText(row.productCode) ||
    displayText(row.itemDescription) ||
    !isBlank(row.qty) ||
    displayText(row.disty) ||
    !isBlank(row.costPerUnit) ||
    !isBlank(row.markupPercent)
  );
};

const hasExpenseValue = (row) => {
  return (
    displayText(row.productCode) ||
    displayText(row.itemDescription) ||
    !isBlank(row.qty) ||
    !isBlank(row.unitPrice)
  );
};

function computeSummary(items = [], otherExpenses = []) {
  const computedItems = items.map((row) => {
    const qtyBlank = isBlank(row.qty);
    const costBlank = isBlank(row.costPerUnit);
    const markupBlank = isBlank(row.markupPercent);

    const qty = toNumber(row.qty);
    const costPerUnit = toNumber(row.costPerUnit);
    const markupPercent = toNumber(row.markupPercent);

    const totalCost =
      qtyBlank || costBlank
        ? ''
        : qty * costPerUnit;

    const sellingPricePerUnitVatInc =
      costBlank || markupBlank
        ? ''
        : costPerUnit * (1 + markupPercent / 100);

    const totalSellingPriceVatInc =
      qtyBlank || sellingPricePerUnitVatInc === ''
        ? ''
        : qty * sellingPricePerUnitVatInc;

    const markupValue =
      totalSellingPriceVatInc === '' || totalCost === ''
        ? ''
        : totalSellingPriceVatInc - totalCost;

    return {
      ...row,
      totalCost,
      sellingPricePerUnitVatInc,
      totalSellingPriceVatInc,
      markupValue,
      markupPercent: row.markupPercent,
    };
  });

  const computedExpenses = otherExpenses.map((row) => {
    const qtyBlank = isBlank(row.qty);
    const unitPriceBlank = isBlank(row.unitPrice);

    const qty = toNumber(row.qty);
    const unitPrice = toNumber(row.unitPrice);

    return {
      ...row,
      total: qtyBlank || unitPriceBlank ? '' : qty * unitPrice,
    };
  });

  const revenue = computedItems.reduce(
    (sum, row) => sum + toNumber(row.totalSellingPriceVatInc),
    0
  );

  const cogs = computedItems.reduce(
    (sum, row) => sum + toNumber(row.totalCost),
    0
  );

  const otherExpense = computedExpenses.reduce(
    (sum, row) => sum + toNumber(row.total),
    0
  );

  const totalExpense = cogs + otherExpense;
  const gpValue = revenue - totalExpense;
  const totalGpPercent = revenue > 0 ? (gpValue / revenue) * 100 : 0;

  return {
    computedItems,
    computedExpenses,
    summary: {
      revenue,
      cogs,
      otherExpense,
      totalExpense,
      gpValue,
      totalGpPercent,
    },
  };
}

function resolveApprovalLevel({ revenue, totalGpPercent, hasRebate }) {
  if (hasRebate) return APPROVAL_LEVEL.PRESIDENT_AND_CEO;
  if (revenue <= 0) return APPROVAL_LEVEL.ESD_ONLY;
  if (totalGpPercent <= 15) return APPROVAL_LEVEL.PRESIDENT_AND_CEO;
  if (totalGpPercent > 15 || revenue > 1000000) return APPROVAL_LEVEL.VP_AND_CCTO;
  return APPROVAL_LEVEL.ESD_ONLY;
}

function mapProjectToPrintData(project) {
  if (!project) return null;

  const companyInfo = project?.company_info ?? {};
  const items = Array.isArray(project?.items) ? project.items : [];
  const otherExpenses = Array.isArray(project?.other_expenses) ? project.other_expenses : [];
  const approverUsers = project?.approver_users ?? {};

  return {
    sprfNo: project?.sprf_no ?? 'SPRFIT-0000',
    status: project?.status ?? 'draft',
    companyInfo,
    remarks: project?.remarks ?? '',
    lastRejectNote: project?.last_reject_note ?? project?.lastRejectNote ?? '',
    rebateJustification: project?.rebate_justification ?? '',
    items,
    otherExpenses,
    signatories: {
      preparer: {
        name: project?.preparer?.name ?? '',
        title: 'PM INCHARGE',
      },
      directorCustomerEngagement: {
        name: approverUsers?.directorCustomerEngagement?.name ?? '',
        title: 'DIRECTOR - CUSTOMER ENGAGEMENT',
      },
      esdDirector: {
        name: approverUsers?.esdDirector?.name ?? '',
        title: 'DIRECTOR - ENTERPRISE SOLUTIONS',
      },
      vpCcto: {
        name: approverUsers?.vpCcto?.name ?? '',
        title: 'VP & CCTO',
      },
      presidentCeo: {
        name: approverUsers?.presidentCeo?.name ?? '',
        title: 'President & CEO',
      },
    },
  };
}

export default function SprfEntryPrint({
  storageKey = null,
  autoprint = false,
  entryProject = null,
}) {
  const [loaded, setLoaded] = useState(false);
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    try {
      if (entryProject) {
        setPrintData(mapProjectToPrintData(entryProject));
        setLoaded(true);
        return;
      }

      if (!storageKey) {
        setLoaded(true);
        return;
      }

      const raw = sessionStorage.getItem(storageKey);

      if (!raw) {
        setLoaded(true);
        return;
      }

      setPrintData(JSON.parse(raw));
      setLoaded(true);
    } catch (error) {
      console.error('SPRF print page failed to load data:', error);
      setLoaded(true);
    }
  }, [entryProject, storageKey]);

  useEffect(() => {
    if (!autoprint || !loaded) return;

    const t = setTimeout(() => window.print(), 300);

    return () => clearTimeout(t);
  }, [autoprint, loaded]);

  const resolved = useMemo(() => {
    if (!printData) return null;

    const { computedItems, computedExpenses, summary } = computeSummary(
      printData.items,
      printData.otherExpenses
    );

    const rebateTotal = computedExpenses
      .filter(
        (row) =>
          row?.expenseKey === 'rebate' ||
          String(row?.productCode || '').trim().toLowerCase() === 'rebate'
      )
      .reduce((sum, row) => sum + toNumber(row.total), 0);

    const hasRebate = rebateTotal > 0;

    const approvalLevel = resolveApprovalLevel({
      revenue: summary.revenue,
      totalGpPercent: summary.totalGpPercent,
      hasRebate,
    });

    return {
      ...printData,
      computedItems,
      computedExpenses,
      summary,
      hasRebate,
      showRejectNote: String(printData.status ?? '').toLowerCase() === 'rejected' && displayText(printData.lastRejectNote),
      showVpCcto: approvalLevel !== APPROVAL_LEVEL.ESD_ONLY,
      showPresidentCeo: approvalLevel === APPROVAL_LEVEL.PRESIDENT_AND_CEO,
    };
  }, [printData]);

  const handlePrint = () => window.print();

  const handleClose = () => {
    window.close();

    setTimeout(() => {
      if (!window.closed) window.history.back();
    }, 50);
  };

  return (
    <>
      <Head title="SPRF Print Preview" />

      <div className="preview-mode">
        <div className="no-print flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">SPRF Print Preview</h1>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-md bg-darkgreen text-white text-sm font-medium"
            >
              Print
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        {loaded && resolved && resolved.status === 'draft' && (
          <div className="print-watermark" aria-hidden="true">
            DRAFT
          </div>
        )}

        <div className="print-root">
          {!resolved ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No SPRF print data available.
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden flex flex-col justify-center">
              <div className="px-6 py-1 mb-2 text-center text-xs font-bold uppercase tracking-wide">
                IT Solutions Special Price Request Form
              </div>

              <div className="px-1 space-y-5 mx-auto">
                <div className="grid grid-cols-[70%_30%] items-start">
                  <div className="min-w-0 space-y-2 mr-3">
                    <PrintInfoBlock
                      rows={[
                        ['SUB CATEGORY', resolved.companyInfo?.subCategory],
                        ['ACCOUNT', resolved.companyInfo?.account],
                        ['ACCOUNT MANAGER', resolved.companyInfo?.accountManager],
                      ]}
                    />

                    <PrintTextBlock
                      label="Justification / Remarks"
                      value={resolved.remarks}
                    />

                    {resolved.showRejectNote && (
                      <PrintRejectNoteBlock value={resolved.lastRejectNote} />
                    )}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-500">SPRF No.</div>
                        <div className="text-xs font-extrabold">
                          {displayText(resolved.sprfNo)}
                        </div>
                      </div>
                    </div>

                    <PrintSummaryBlock summary={resolved.summary} />
                  </div>
                </div>

                <PrintItemsTable
                  rows={resolved.computedItems}
                  totals={{
                    ttlCost: resolved.summary.cogs,
                    ttlRev: resolved.summary.revenue,
                  }}
                />

                <PrintOtherExpenseTable
                  rows={resolved.computedExpenses}
                  totalOtherExpense={resolved.summary.otherExpense}
                />

                <div className="grid grid-cols-12 items-start space-y-5">
                  <div className="col-span-5">
                    <Conditions />
                  </div>

                  <div className="col-span-7">
                    <PrintNamesBlock
                      signatories={resolved.signatories}
                      showVpCcto={resolved.showVpCcto}
                      showPresidentCeo={resolved.showPresidentCeo}
                      showRebateJustification={true}
                      rebateJustification={resolved.rebateJustification}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PrintInfoBlock({ rows }) {
  return (
    <div className="border-[#D6DDD0] bg-[#FBFFFA] border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 rounded-xl overflow-hidden">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[140px_minmax(0,1fr)] border-b last:border-b-0 border-[#2c2c2e]/10"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold flex items-center bg-[#90E274]/10">
            {label}
          </div>

          <div className="px-3 py-1.5 text-[11px] flex items-center">
            {displayText(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrintTextBlock({ label, value }) {
  const rows = normalizePrintRows(value);

  return (
    <div className="rounded-xl border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 bg-[#FBFFFA] px-3 py-2">
      <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-5">
        <label className="text-[11px] uppercase font-semibold tracking-[0.01em]">
          {label}
        </label>

        <div className="min-w-0 space-y-1">
          {rows.map((row, index) => (
            <div
              key={`${label}-${index}`}
              className="min-w-0 min-h-[32px] max-w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
            >
              {displayText(row) || '—'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrintRejectNoteBlock({ value }) {
  return (
    <div className="rounded-xl border border-[#F27373]/30 bg-[#FFF6F6] px-3">
      <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-5">
        <label className="text-[11px] uppercase font-semibold tracking-[0.01em] text-red-600">
          Reject Note
        </label>

        <div className="px-3 py-1 text-[11px] text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {displayText(value)}
        </div>
      </div>
    </div>
  );
}

function PrintSummaryBlock({ summary }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#FBFFFA] border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[55%]" />
          <col className="w-[45%]" />
        </colgroup>

        <tbody>
          <PrintSummaryRow label="REVENUE" value={summary.revenue} />
          <PrintSummaryRow label="COGS" value={summary.cogs} />
          <PrintSummaryRow label="OTHER EXPENSE" value={summary.otherExpense} />
          <PrintSummaryRow label="TOTAL EXPENSE" value={summary.totalExpense} />
          <PrintSummaryRow label="GP VALUE" value={summary.gpValue} />
          <PrintSummaryRow label="Total GP%" value={summary.totalGpPercent} isPercent isLast />
        </tbody>
      </table>
    </div>
  );
}

function PrintSummaryRow({ label, value, isPercent = false, isLast = false }) {
  const displayValue = isPercent
    ? isBlank(value)
      ? ''
      : `${Number(value).toFixed(0)}%`
    : displayWholePeso(value);

  return (
    <tr>
      <td
        className={`border-b border-[#2c2c2e]/10 border-r bg-[#90E274]/10 px-4 py-1 text-[10px] font-semibold ${
          isLast ? 'border-b-0' : ''
        }`}
      >
        {label}
      </td>

      <td
        className={`border-b border-[#2c2c2e]/10 bg-white px-4 py-1 text-[10px] font-medium ${
          isLast ? 'border-b-0' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold">
            {isPercent || isBlank(value) ? '' : '₱'}
          </span>

          <span className="text-right">
            {displayValue}
          </span>
        </div>
      </td>
    </tr>
  );
}

function PrintItemsTable({ rows, totals }) {
  const footerCellClass =
    'bg-[#D9F2D0] p-2 py-1 text-[10px] font-semibold';

  return (
    <div className="overflow-x-auto rounded-xl border border-[#CAD6C2] bg-[#FBFFFA]">
      <table className="w-full table-fixed border-separate border-spacing-0 text-[10px]">
        <colgroup>
          <col className="w-[2.5%]" />
          <col className="w-[10%]" />
          <col className="w-[23.5%]" />
          <col className="w-[4.5%]" />
          <col className="w-[6%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[8.8%]" />
          <col className="w-[6.7%]" />
        </colgroup>

        <thead>
          <tr className="bg-lightgreen/30 text-[10px] uppercase">
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">#</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Product Code</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Item Description</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Qty</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Disty</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Cost / Unit</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Total Cost</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">
              Selling Price/unit (VAT INC)
            </th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">
              Total Selling Price (VAT INC)
            </th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Mark Up Value</th>
            <th className="border-b border-darkgreen/15 p-1.5 py-2 font-semibold">Mark-up %</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-4 text-center text-slate-500">
                No items available.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowHasValue = hasItemValue(row);

              return (
                <tr key={`item-${index}`}>
                  <td className="border-b border-r border-darkgreen/15 p-2 text-center">
                    {rowHasValue ? index + 1 : ''}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2">
                    {displayText(row.productCode)}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2">
                    {displayText(row.itemDescription)}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2 text-center">
                    {isBlank(row.qty) ? '' : row.qty}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2">
                    {displayText(row.disty)}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2 text-right">
                    {displayPeso(row.costPerUnit)}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2 text-right">
                    {displayPeso(row.totalCost)}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2 text-right">
                    {displayPeso(row.sellingPricePerUnitVatInc)}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2 text-right">
                    {displayPeso(row.totalSellingPriceVatInc)}
                  </td>

                  <td className="border-b border-r border-darkgreen/15 p-2 text-right">
                    {displayPeso(row.markupValue)}
                  </td>

                  <td className="border-b border-darkgreen/15 p-2 text-right">
                    {displayPercent(row.markupPercent)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>

        <tfoot>
          <tr>
            <td className={`${footerCellClass} rounded-bl-xl`}></td>
            <td className={footerCellClass}></td>
            <td className={`${footerCellClass} text-center`}>TOTAL</td>
            <td className={footerCellClass}></td>
            <td className={footerCellClass}></td>
            <td className={`${footerCellClass} border-r border-darkgreen/15`}></td>
            <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>
              {displayPeso(totals?.ttlCost)}
            </td>
            <td className={`${footerCellClass} border-r border-darkgreen/15`}></td>
            <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>
              {displayPeso(totals?.ttlRev)}
            </td>
            <td className={footerCellClass}></td>
            <td className={`${footerCellClass} rounded-br-xl`}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PrintOtherExpenseTable({ rows, totalOtherExpense }) {
  return (
    <div className="w-[80%]">
      <div className="mb-1 text-[11px] xl:text-xs ml-3 font-bold uppercase text-[#111]">
        Other Expense
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#CAD6C2] bg-[#FBFFFA]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-[11px]">
          <colgroup>
            <col className="w-[2.5%]" />
            <col className="w-[16%]" />
            <col className="w-[35%]" />
            <col className="w-[5%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
          </colgroup>

          <thead>
            <tr className="bg-lightgreen/30 text-[10px] uppercase">
              <th className="border-b border-r border-darkgreen/15 p-2">#</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Product Code</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Item Description</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Qty</th>
              <th className="border-b border-r border-darkgreen/15 p-2">Unit Price</th>
              <th className="border-b border-darkgreen/15 p-2">Total</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  No other expense rows available.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const rowHasValue = hasExpenseValue(row);

                return (
                  <tr key={`expense-${index}`}>
                    <td className="border-b border-r border-darkgreen/15 p-2 py-1 text-center">
                      {rowHasValue ? index + 1 : ''}
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-2 py-1 ">
                      {displayText(row.productCode)}
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-2 py-1">
                      {displayText(row.itemDescription)}
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-2 py-1 text-center">
                      {isBlank(row.qty) ? '' : row.qty}
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-2 py-1 text-right">
                      {displayPeso(row.unitPrice)}
                    </td>

                    <td className="border-b border-darkgreen/15 p-2 py-1 text-right">
                      {displayPeso(row.total)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={4} className="bg-[#D9F2D0] p-2"></td>
              <td className="bg-[#D9F2D0] p-2 py-1 text-[11px] font-semibold text-end">
                TOTAL
              </td>
              <td className="bg-[#D9F2D0] p-2 py-1 text-[11px] font-semibold text-end">
                {displayPeso(totalOtherExpense)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function PrintNamesBlock({
  signatories,
  showVpCcto,
  showPresidentCeo,
  showRebateJustification,
  rebateJustification,
}) {
  const approvedSignatories = [
    signatories?.esdDirector ?? { name: '', title: '' },
    ...(showVpCcto ? [signatories?.vpCcto ?? { name: '', title: '' }] : []),
    ...(showPresidentCeo ? [signatories?.presidentCeo ?? { name: '', title: '' }] : []),
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 mx-3 ml-8 gap-x-8 items-start">
        <div className="flex flex-col">
          <SectionLabel label="PREPARED BY:" />

          <div className="mt-10 space-y-12">
            <PrintSignatory {...(signatories?.preparer ?? {})} />

            <PrintSignatory {...(signatories?.directorCustomerEngagement ?? {})} />
          </div>

          {showRebateJustification && displayText(rebateJustification) && (
            <div className="mt-10">
              <label className="text-[10px] font-extrabold text-gray-800 tracking-tight uppercase">
                JUSTIFICATION FOR REBATE
              </label>

              <div className="mt-2 w-full max-w-[195px] text-[11px] min-h-[54px] whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-slate-700">
                {displayText(rebateJustification)}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <SectionLabel label="APPROVED BY:" />

          <div className="mt-10 space-y-12">
            {approvedSignatories.map((signatory, index) => (
              <PrintSignatory
                key={`${signatory?.title || 'signatory'}-${index}`}
                {...signatory}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <span className="text-[10px] font-extrabold text-gray-800 tracking-tight uppercase">
      {label}
    </span>
  );
}

function PrintSignatory({ name, title }) {
  return (
    <div className="w-full">
      <div className="border-b border-gray-400 min-h-[24px] flex items-end justify-center pb-0.5">
        <span className="text-[12px] font-semibold text-gray-900 text-center">
          {displayText(name)}
        </span>
      </div>

      <div className="text-[10px] text-slate-500 mt-1 w-full text-center">
        {displayText(title)}
      </div>
    </div>
  );
}

SprfEntryPrint.layout = (page) => (
  <PrintLayout showDraftWatermark={page.props.showDraftWatermark}>
    {page}
  </PrintLayout>
);
