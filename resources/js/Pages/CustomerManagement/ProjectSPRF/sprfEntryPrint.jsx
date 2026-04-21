import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import PrintLayout from '@/Layouts/PrintLayout';

const APPROVAL_LEVEL = {
  ESD_ONLY: 'ESD_ONLY',
  VP_AND_CCTO: 'VP_AND_CCTO',
  PRESIDENT_AND_CEO: 'PRESIDENT_AND_CEO',
};

const toNumber = (value) => Number(value || 0);

const formatPeso = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatWholePeso = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

function computeSummary(items = [], otherExpenses = []) {
  const computedItems = items.map((row) => {
    const qty = toNumber(row.qty);
    const costPerUnit = toNumber(row.costPerUnit);
    const totalCost = qty * costPerUnit;
    const sellingPricePerUnitVatInc = costPerUnit * 1.15;
    const totalSellingPriceVatInc = qty * sellingPricePerUnitVatInc;

    return {
      ...row,
      totalCost,
      sellingPricePerUnitVatInc,
      totalSellingPriceVatInc,
    };
  });

  const computedExpenses = otherExpenses.map((row) => {
    const qty = toNumber(row.qty);
    const unitPrice = toNumber(row.unitPrice);

    return {
      ...row,
      total: qty * unitPrice,
    };
  });

  const revenue = computedItems.reduce((sum, row) => sum + row.totalSellingPriceVatInc, 0);
  const cogs = computedItems.reduce((sum, row) => sum + row.totalCost, 0);
  const otherExpense = computedExpenses.reduce((sum, row) => sum + row.total, 0);

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
  if (totalGpPercent < 8) return APPROVAL_LEVEL.PRESIDENT_AND_CEO;
  if (totalGpPercent < 10 || revenue > 1000000) return APPROVAL_LEVEL.VP_AND_CCTO;
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
      .reduce((sum, row) => sum + row.total, 0);

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
            <div className="rounded-2xl border border-[#2c2c2e]/20 bg-[#f8f8f8] shadow-md overflow-hidden">
              <div className="bg-[#B5EBA2]/50 px-6 py-2 border-b border-[#2c2c2e]/10 text-center text-[15px] font-bold uppercase tracking-wide">
                IT Solutions Special Price Request Form
              </div>

              <div className="p-6 space-y-6">
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">SPRF No.</div>
                    <div className="text-base font-extrabold text-[#111111]">
                      {resolved.sprfNo || '—'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 xl:col-span-8 space-y-3">
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
                  </div>

                  <div className="col-span-12 xl:col-span-4">
                    <PrintSummaryBlock summary={resolved.summary} />
                  </div>
                </div>

                <PrintItemsTable rows={resolved.computedItems} />
                <PrintOtherExpenseTable
                  rows={resolved.computedExpenses}
                  totalOtherExpense={resolved.summary.otherExpense}
                />

                <PrintNamesBlock
                  signatories={resolved.signatories}
                  showVpCcto={resolved.showVpCcto}
                  showPresidentCeo={resolved.showPresidentCeo}
                  showRebateJustification={resolved.hasRebate}
                  rebateJustification={resolved.rebateJustification}
                />
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
    <div className="border-[#D6DDD0] bg-[#FBFFFA] shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 rounded-xl overflow-hidden">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[190px_minmax(0,1fr)] border-b last:border-b-0 border-[#2c2c2e]/10">
          <div className="px-4 py-3 text-xs font-bold bg-[#90E274]/10">
            {label}
          </div>
          <div className="px-4 py-3 text-sm">
            {value?.trim?.() ? value : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrintTextBlock({ label, value }) {
  return (
    <div className="rounded-xl border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 bg-[#FBFFFA] px-7 py-4 shadow-md">
      <div className="grid grid-cols-[145px_minmax(0,1fr)] items-start gap-5">
        <label className="text-xs uppercase font-bold tracking-[0.01em]">
          {label}
        </label>

        <div className="min-h-[60px] rounded-xl border border-gray-200 px-3 py-3 text-xs whitespace-pre-wrap bg-white">
          {value?.trim?.() ? value : '—'}
        </div>
      </div>
    </div>
  );
}

function PrintSummaryBlock({ summary }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#FBFFFA] shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25">
      <table className="w-full table-fixed border-collapse">
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
  return (
    <tr>
      <td className={`border-b border-[#2c2c2e]/10 border-r bg-[#90E274]/10 px-4 py-2 text-xs font-bold ${isLast ? 'border-b-0' : ''}`}>
        {label}
      </td>
      <td className={`border-b border-[#2c2c2e]/10 bg-white px-4 py-2 text-xs font-medium ${isLast ? 'border-b-0' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold">{isPercent ? '' : '₱'}</span>
          <span className="text-right">
            {isPercent ? `${Number(value || 0).toFixed(0)}%` : formatWholePeso(value)}
          </span>
        </div>
      </td>
    </tr>
  );
}

function PrintItemsTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#CAD6C2] bg-[#FBFFFA]">
      <table className="w-full table-fixed border-separate border-spacing-0 text-[11px]">
        <thead>
          <tr className="bg-lightgreen/30 text-[10px] uppercase">
            <th className="border-b border-r border-darkgreen/15 p-2">#</th>
            <th className="border-b border-r border-darkgreen/15 p-2">Product Code</th>
            <th className="border-b border-r border-darkgreen/15 p-2">Item Description</th>
            <th className="border-b border-r border-darkgreen/15 p-2">Qty</th>
            <th className="border-b border-r border-darkgreen/15 p-2">Disty</th>
            <th className="border-b border-r border-darkgreen/15 p-2">Cost / Unit</th>
            <th className="border-b border-r border-darkgreen/15 p-2">Total Cost</th>
            <th className="border-b border-r border-darkgreen/15 p-2">SP / Unit VAT Inc</th>
            <th className="border-b border-darkgreen/15 p-2">Total SP VAT Inc</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-4 text-center text-slate-500">
                No items available.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`item-${index}`}>
                <td className="border-b border-r border-darkgreen/15 p-2">{index + 1}</td>
                <td className="border-b border-r border-darkgreen/15 p-2">{row.productCode || '—'}</td>
                <td className="border-b border-r border-darkgreen/15 p-2">{row.itemDescription || '—'}</td>
                <td className="border-b border-r border-darkgreen/15 p-2 text-right">{row.qty || '0'}</td>
                <td className="border-b border-r border-darkgreen/15 p-2">{row.disty || '—'}</td>
                <td className="border-b border-r border-darkgreen/15 p-2 text-right">₱{formatPeso(row.costPerUnit)}</td>
                <td className="border-b border-r border-darkgreen/15 p-2 text-right">₱{formatPeso(row.totalCost)}</td>
                <td className="border-b border-r border-darkgreen/15 p-2 text-right">₱{formatPeso(row.sellingPricePerUnitVatInc)}</td>
                <td className="border-b border-darkgreen/15 p-2 text-right">₱{formatPeso(row.totalSellingPriceVatInc)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PrintOtherExpenseTable({ rows, totalOtherExpense }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#CAD6C2] bg-[#FBFFFA]">
      <table className="w-full table-fixed border-separate border-spacing-0 text-[11px]">
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
            rows.map((row, index) => (
              <tr key={`expense-${index}`}>
                <td className="border-b border-r border-darkgreen/15 p-2">{index + 1}</td>
                <td className="border-b border-r border-darkgreen/15 p-2">{row.productCode || '—'}</td>
                <td className="border-b border-r border-darkgreen/15 p-2">{row.itemDescription || '—'}</td>
                <td className="border-b border-r border-darkgreen/15 p-2 text-right">{row.qty || '0'}</td>
                <td className="border-b border-r border-darkgreen/15 p-2 text-right">₱{formatPeso(row.unitPrice)}</td>
                <td className="border-b border-darkgreen/15 p-2 text-right">₱{formatPeso(row.total)}</td>
              </tr>
            ))
          )}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={4} className="bg-[#D9F2D0] p-2"></td>
            <td className="bg-[#D9F2D0] p-2 text-xs font-bold text-end">TOTAL</td>
            <td className="bg-[#D9F2D0] p-2 text-xs font-bold text-end">₱{formatPeso(totalOtherExpense)}</td>
          </tr>
        </tfoot>
      </table>
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
  const rightSignatories = [
    signatories?.esdDirector ?? { name: '', title: '' },
    ...(showVpCcto ? [signatories?.vpCcto ?? { name: '', title: '' }] : []),
    ...(showPresidentCeo ? [signatories?.presidentCeo ?? { name: '', title: '' }] : []),
  ];

  return (
    <div className="w-full mt-10 pb-4">
      <div className="mx-auto w-full max-w-[860px]">
        <div className="grid grid-cols-1 gap-y-12 gap-x-24 md:grid-cols-2">
          <div className="flex flex-col space-y-12">
            <SectionLabel label="PREPARED BY:" />
            <PrintSignatory {...(signatories?.preparer ?? {})} />
            <PrintSignatory {...(signatories?.directorCustomerEngagement ?? {})} />

            {showRebateJustification && (
              <div className="flex flex-col space-y-3">
                <label className="text-[10px] font-extrabold text-gray-800 tracking-tight">
                  JUSTIFICATION FOR REBATE
                </label>
                <div className="w-full rounded-xl border border-gray-200 px-3 py-3 text-xs min-h-[80px] bg-white whitespace-pre-wrap">
                  {rebateJustification?.trim?.() ? rebateJustification : '—'}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-12">
            <SectionLabel label="APPROVED BY:" />
            {rightSignatories.map((signatory, index) => (
              <PrintSignatory key={`${signatory?.title || 'signatory'}-${index}`} {...signatory} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <span className="text-[10px] font-extrabold text-gray-800 tracking-tight">
      {label}
    </span>
  );
}

function PrintSignatory({ name, title }) {
  return (
    <div className="flex flex-col space-y-4 justify-center">
      <div className="pt-2">
        <div className="border-b border-gray-400 min-h-[28px] flex items-end pb-0.5">
          <span className="text-sm font-semibold text-gray-900">
            {name?.trim?.() ? name : '—'}
          </span>
        </div>

        <div className="text-[11px] text-gray-500 mt-1 w-full">
          {title || ''}
        </div>
      </div>
    </div>
  );
}

SprfEntryPrint.layout = (page) => (
  <PrintLayout showDraftWatermark={page.props.showDraftWatermark}>
    {page}
  </PrintLayout>
);