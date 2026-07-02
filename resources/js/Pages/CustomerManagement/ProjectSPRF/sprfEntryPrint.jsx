import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import PrintLayout from '@/Layouts/PrintLayout';
import Conditions from '@/Components/sprf/Conditions';

// Single source of truth for SPRF calculations — same module sprfEntry.jsx
// uses. Do not redefine computeGroup/computeExpense/computeSummary/etc.
// here; fix formulas in calculations.js so entry and print always match.
import {
  isBlank,
  toNumber,
  APPROVAL_LEVEL,
  computeGroup,
  computeExpense,
  computeSummary as computeSummaryShared,
  computeItemTotals,
  computeRebateTotal,
  resolveApprovalLevelMatrix,
} from '@/utils/sprf/calculations';

const displayText = (value) => {
  if (isBlank(value)) return '';

  const text = String(value);
  return text.trim() ? text : '';
};

const displayPeso = (value) => {
  if (isBlank(value)) return '';

  return `${Number(value).toLocaleString('en-PH', {
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

const flattenPrintItems = (items = []) => {
  const flat = [];

  for (const item of items) {
    const { subitems = [], ...parent } = item;

    flat.push({ ...parent, rowType: 'item' });

    for (const sub of subitems) {
      flat.push({ ...sub, rowType: 'bundle', parentRowKey: parent.rowKey });
    }
  }

  return flat;
};

function mapProjectToPrintData(project) {
  if (!project) return null;

  const companyInfo = project?.company_info ?? {};
  const items = Array.isArray(project?.items) ? project.items : [];
  const otherExpenses = Array.isArray(project?.other_expenses) ? project.other_expenses : [];
  const approverUsers = project?.approver_users ?? {};

  // Extract timestamps and rejection details
  const status = String(project?.status ?? '').toLowerCase();
  const isRejected = status === 'rejected';
  const currentLevel = Number(project?.current_level ?? project?.currentLevel ?? 0);
  const rejectedAt = project?.rejected_at ?? null;

  const isRejectorAtLevel = (level) => isRejected && currentLevel === level;

  const timestampForLevel = (level) => {
    if (isRejectorAtLevel(level)) return rejectedAt;
    return (
      {
        // Added fallbacks for level 1 just like in Names.jsx
        1: project?.preparer_acted_at ?? project?.submitted_at ?? project?.created_at,
        2: project?.dce_acted_at,
        3: project?.esd_acted_at,
        4: project?.vp_ccto_acted_at,
        5: project?.president_ceo_acted_at,
      }[level] ?? null
    );
  };

  return {
    sprfNo: project?.sprf_no ?? 'SPRFIT-0000',
    status: project?.status ?? 'draft',
    companyInfo,
    remarks: project?.remarks ?? '',
    lastRejectNote: project?.last_reject_note ?? project?.lastRejectNote ?? '',
    rebateJustification: project?.rebate_justification ?? '',
    items,
    otherExpenses,
    notes: Array.isArray(project?.notes) ? project.notes : [],
    comments: Array.isArray(project?.comments) ? project.comments : [],
    approvalLevel: project?.approval_level ?? null,
    approvalConditionCode: project?.approval_condition_code ?? null,
    requiresVpCcto: project?.requires_vp_ccto ?? null,
    requiresPresidentCeo: project?.requires_president_ceo ?? null,
    requiresRebateJustification: project?.requires_rebate_justification ?? null,
    signatories: {
      preparer: {
        name: project?.preparer?.name ?? '',
        title: 'PM INCHARGE',
        timestamp: timestampForLevel(1),
        isRejector: isRejectorAtLevel(1),
      },
      directorCustomerEngagement: {
        name: approverUsers?.directorCustomerEngagement?.name ?? '',
        title: 'DIRECTOR - CUSTOMER ENGAGEMENT',
        timestamp: timestampForLevel(2),
        isRejector: isRejectorAtLevel(2),
      },
      esdDirector: {
        name: approverUsers?.esdDirector?.name ?? '',
        title: 'DIRECTOR - ENTERPRISE SOLUTIONS',
        timestamp: timestampForLevel(3),
        isRejector: isRejectorAtLevel(3),
      },
      vpCcto: {
        name: approverUsers?.vpCcto?.name ?? '',
        title: 'VP & CCTO',
        timestamp: timestampForLevel(4),
        isRejector: isRejectorAtLevel(4),
      },
      presidentCeo: {
        name: approverUsers?.presidentCeo?.name ?? '',
        title: 'President & CEO',
        timestamp: timestampForLevel(5),
        isRejector: isRejectorAtLevel(5),
      },
    },
  };
}

export default function SprfEntryPrint({
  storageKey = null,
  autoprint = false,
  entryProject = null,
  notes = null,
  comments = null,
}) {
  const [loaded, setLoaded] = useState(false);
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    try {
      if (entryProject) {
        const mappedData = mapProjectToPrintData(entryProject);

        if (Array.isArray(notes) && notes.length > 0) {
          mappedData.notes = notes;
        }
        if (Array.isArray(comments) && comments.length > 0) {
          mappedData.comments = comments;
        }

        setPrintData(mappedData);
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
  }, [entryProject, storageKey, notes, comments]);

  useEffect(() => {
    if (!autoprint || !loaded) return;

    const t = setTimeout(() => window.print(), 300);

    return () => clearTimeout(t);
  }, [autoprint, loaded]);

  const resolved = useMemo(() => {
    if (!printData) return null;

    // Same pipeline as sprfEntry.jsx: computeGroup -> computeExpense ->
    // computeSummaryShared -> computeItemTotals, all from calculations.js.
    const computedGroups = (printData.items ?? []).map(computeGroup);
    const computedExpenses = (printData.otherExpenses ?? []).map(computeExpense);
    const summary = computeSummaryShared(computedGroups, computedExpenses);
    const itemTotals = computeItemTotals(computedGroups);
    const rebateTotal = computeRebateTotal(computedExpenses);
    const hasRebate = rebateTotal > 0;

    // Fallback derivation when the backend hasn't supplied approval_level
    // yet (mirrors sprfEntry.jsx's computedApprovalLevel).
    const computedApprovalLevel = resolveApprovalLevelMatrix({
      hasRebate,
      revenue: summary.revenue,
      totalGpPercent: summary.totalGpPercent,
    });

    const approvalLevel = printData.approvalLevel ?? computedApprovalLevel;

    // Trust backend flags when present (saved projects); fall back to the
    // local matrix derivation otherwise — identical logic to sprfEntry.jsx
    // so print never shows a different set of signatories than entry.
    const showPresidentCeo =
      printData.requiresPresidentCeo != null
        ? Boolean(printData.requiresPresidentCeo)
        : (
            approvalLevel === APPROVAL_LEVEL.REBATE_REQUEST ||
            approvalLevel === APPROVAL_LEVEL.GP_LTE_15 ||
            approvalLevel === APPROVAL_LEVEL.PRESIDENT_AND_CEO
          );

    const showVpCcto =
      printData.requiresVpCcto != null
        ? Boolean(printData.requiresVpCcto)
        : (
            showPresidentCeo ||
            approvalLevel === APPROVAL_LEVEL.VALUE_GT_1M ||
            approvalLevel === APPROVAL_LEVEL.GP_GT_15 ||
            approvalLevel === APPROVAL_LEVEL.VP_AND_CCTO
          );

    const showDirectorCustomerEngagement =
      printData.requiresRebateJustification != null
        ? Boolean(printData.requiresRebateJustification)
        : printData.approvalConditionCode
          ? printData.approvalConditionCode === 'REBATE_REQUEST'
          : approvalLevel === APPROVAL_LEVEL.REBATE_REQUEST;

    return {
      ...printData,
      computedGroups,
      computedExpenses,
      summary,
      itemTotals,
      hasRebate,
      showRejectNote: String(printData.status ?? '').toLowerCase() === 'rejected' && displayText(printData.lastRejectNote),
      showDirectorCustomerEngagement,
      showVpCcto,
      showPresidentCeo,
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

        <div className="print-root">
          {!resolved ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No SPRF print data available.
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden flex flex-col justify-center">
              <div className="px-6 py-1 mb-2 text-center text-xs font-medium uppercase tracking-wide">
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
                        <div className="text-xs font-medium">
                          {displayText(resolved.sprfNo)}
                        </div>
                      </div>
                    </div>

                    <PrintSummaryBlock summary={resolved.summary} />
                  </div>
                </div>

                <PrintItemsTable
                  groups={resolved.computedGroups}
                  totals={resolved.itemTotals}
                />

                <PrintOtherExpenseTable
                  rows={resolved.computedExpenses}
                  totalOtherExpense={resolved.summary.otherExpense}
                />

                

                <div className="w-full flex flex-col items-start space-y-5">
                  <div className="flex w-full gap-3 items-start">
                    <div className="w-[35%] print:text-[9px] print:leading-tight">
                      <Conditions />
                    </div>
                    
                    <div className="w-[65%]">
                      <PrintNotesComments
                        notes={resolved.notes}
                        comments={resolved.comments}
                      />
                    </div>
                  </div>

                  <div className="w-[95%]">
                    <PrintNamesBlock
                      signatories={resolved.signatories}
                      showDirectorCustomerEngagement={resolved.showDirectorCustomerEngagement}
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
    <div className="rounded-xl border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 bg-[#FBFFFA] px-3 py-1">
      <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-5">
        <label className="text-[11px] uppercase font-semibold tracking-[0.01em] leading-snug">
          {label}
        </label>

        <div className="min-w-0 space-y-1">
          {rows.map((row, index) => (
            <div
              key={`${label}-${index}`}
              className="min-w-0 min-h-[20px] max-w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] whitespace-pre-wrap [overflow-wrap:anywhere]"
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

        <div className="px-2 py-1 text-[11px] text-slate-700 whitespace-pre-wrap [overflow-wrap:anywhere]">
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
      : `${Number(value).toFixed(2)}%`
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

function PrintItemsTable({ groups, totals }) {
  const footerCellClass = 'bg-[#D9F2D0] p-2 py-1 text-[10px] font-semibold';

  const allSubitemsBlank = (group) =>
    !(group.computedSubitems || []).some(hasItemValue);

  return (
    <div className="overflow-x-auto rounded-xl border border-[#CAD6C2] bg-[#FBFFFA]">
      <table className="w-full table-fixed border-separate border-spacing-0 text-[10px]">
        <colgroup>
          <col className="w-[2.5%]" />
          <col className="w-[9.5%]" />
          <col className="w-[20%]" />
          <col className="w-[4.5%]" />
          <col className="w-[5.6%]" />
          <col className="w-[9.4%]" />
          <col className="w-[11.8%]" />
          <col className="w-[9.3%]" />
          <col className="w-[11.4%]" />
          <col className="w-[10.3%]" />
          <col className="w-[5.7%]" />
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
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Selling Price/unit (VAT INC)</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Total Selling Price (VAT INC)</th>
            <th className="border-b border-r border-darkgreen/15 p-1.5 py-2 font-semibold">Mark Up Value</th>
            <th className="border-b border-darkgreen/15 p-1.5 py-2 font-semibold">Mark-up %</th>
          </tr>
        </thead>

        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-4 text-center text-slate-500">No items available.</td>
            </tr>
          ) : (
            groups.map((group, gIndex) => {
              const subitems = group.computedSubitems || [];
              const rowSpanCount = subitems.length || 1;
              const groupHasValue = !allSubitemsBlank(group);

              return subitems.length > 0 ? subitems.map((sub, sIndex) => (
                <tr key={sub.rowKey ?? `${group.rowKey}-${sIndex}`}>
                  {sIndex === 0 && (
                    <td className="border-b border-r border-darkgreen/15 p-1 text-center" rowSpan={rowSpanCount}>
                      {groupHasValue ? gIndex + 1 : ''}
                    </td>
                  )}

                  <td className="border-b border-r border-darkgreen/15 p-1 text-center">{displayText(sub.productCode)}</td>
                  <td className="border-b border-r border-darkgreen/15 p-1">{displayText(sub.itemDescription)}</td>
                  <td className="border-b border-r border-darkgreen/15 p-1 text-center">{isBlank(sub.qty) ? '' : sub.qty}</td>
                  <td className="border-b border-r border-darkgreen/15 p-1 text-center">{displayText(sub.disty)}</td>
                  <td className="border-b border-r border-darkgreen/15 p-1 text-right">{displayPeso(sub.costPerUnit)}</td>
                  <td className="border-b border-r border-darkgreen/15 p-1 text-right">{displayPeso(sub.totalCost)}</td>

                  {sIndex === 0 && (
                    <>
                      <td className="border-b border-r border-darkgreen/15 p-1 text-right" rowSpan={rowSpanCount}>
                        {displayPeso(group.sellingPricePerUnitVatInc)}
                      </td>
                      <td className="border-b border-r border-darkgreen/15 p-1 text-right" rowSpan={rowSpanCount}>
                        {displayPeso(group.totalSellingPriceVatInc)}
                      </td>
                      <td className="border-b border-r border-darkgreen/15 p-1 text-right" rowSpan={rowSpanCount}>
                        {displayPeso(group.markupValue)}
                      </td>
                    </>
                  )}

                  <td className="border-b border-darkgreen/15 p-1 text-center">
                    {isBlank(sub.markupPercent) ? '' : parseFloat(Number(sub.markupPercent).toFixed(2))}
                  </td>
                </tr>
              )) : null;
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
            <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>{displayPeso(totals?.ttlCost)}</td>
            <td className={`${footerCellClass} border-r border-darkgreen/15`}></td>
            <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>{displayPeso(totals?.ttlRev)}</td>
            <td className={`${footerCellClass} border-r border-darkgreen/15 text-end`}>{displayPeso(totals?.ttlMarkupValue)}</td>
            <td className={`${footerCellClass} rounded-br-xl`}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PrintOtherExpenseTable({ rows, totalOtherExpense }) {
  return (
    <div className="w-[80%] print:break-before-page">
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
  showDirectorCustomerEngagement,
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

            {showDirectorCustomerEngagement && (
              <PrintSignatory {...(signatories?.directorCustomerEngagement ?? {})} />
            )}
          </div>

          {showRebateJustification && displayText(rebateJustification) && (
            <div className="mt-10">
              <label className="text-[10px] font-extrabold text-gray-800 tracking-tight uppercase">
                JUSTIFICATION FOR REBATE
              </label>

              <div className="mt-2 w-full max-w-[195px] text-[11px] min-h-[54px] whitespace-pre-wrap [overflow-wrap:anywhere] text-slate-700">
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

function PrintNotesComments({ notes = [], comments = [] }) {
  const hasNotes = notes.length > 0;
  const hasComments = comments.length > 0;

  if (!hasNotes && !hasComments) return null;

  const fmt = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: '2-digit', day: '2-digit', year: '2-digit',
    }).format(d);
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d);
    return `${datePart}\n${timePart}`;
  };

  const renderItems = (items) =>
    items.map((entry, idx) => (
      <div
        key={entry.id ?? `entry-${idx}`}
        className="bg-white border border-gray-200 rounded-xl px-3 py-3 my-[3px]"
      >
        <div className="flex h-4 justify-between">
          <span className="text-[11px] font-medium text-gray-900">
            {entry.author?.name ?? 'Unknown'}
          </span>
          <span className="text-[10px] text-gray-500 italic whitespace-pre-line text-right">
            {fmt(entry.created_at)}
          </span>
        </div>
        <p className="mt-1 pr-6 text-gray-900 text-xs leading-normal">{entry.body}</p>
      </div>
    ));

  return (
    <div className="w-full flex gap-2">
      {hasNotes && (
        <div className="w-[50%]">
          <span className="text-[11px] font-medium text-gray-400 pl-2 uppercase tracking-wide">
            Notes
          </span>
          <div className="mt-1">{renderItems(notes)}</div>
        </div>
      )}
      {hasComments && (
        <div className="w-[50%]">
          <span className="text-[11px] font-medium text-gray-400 pl-2 uppercase tracking-wide">
            Comments
          </span>
          <div className="mt-1">{renderItems(comments)}</div>
        </div>
      )}
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

function PrintSignatory({ name, title, timestamp = null, isRejector = false }) {
  const formatTimestamp = (ts) => {
    if (!ts) return null;
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ts));
    } catch {
      return null;
    }
  };

  const formatted = formatTimestamp(timestamp);

  return (
    <div className="w-full">
      <div className="text-[10px] mb-1 flex items-center justify-end gap-1 font-medium min-h-[15px]">
        <p className="text-gray-50/0 select-none">.</p>
        {formatted && (
          <p className={isRejector ? "text-red-500 print:text-red-500" : "text-[#175500] print:text-[#175500]"}>
            {formatted}
          </p>
        )}
      </div>

      <div className="border-b border-gray-400 min-h-[24px] flex items-end justify-center pb-0.5">
        <span className="text-[12px] font-semibold text-gray-900 text-center">
          {displayText(name) || '—'}
        </span>
      </div>

      <div className="text-[10px] text-slate-500 mt-1 w-full text-center">
        {displayText(title) || ''}
      </div>
    </div>
  );
}

SprfEntryPrint.layout = (page) => (
  <PrintLayout showDraftWatermark={page.props.showDraftWatermark}>
    {page}
  </PrintLayout>
);