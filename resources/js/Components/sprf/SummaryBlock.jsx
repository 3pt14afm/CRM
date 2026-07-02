const formatPeso = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function SummaryRow({ label, value, isPercent = false, isLast = false }) {
  return (
    <tr>
      <td
        className={`border-r bg-[#90E274]/10 px-3 py-1 md:py-1.5 xl:py-2 text-[10px] md:text-[11px] font-semibold ${
          isLast ? 'rounded-bl-xl' : 'border-b border-[#2c2c2e]/10'
        }`}
      >
        {label}
      </td>

      <td
        className={`bg-white px-3 py-1 md:py-1.5 xl:py-2 text-[11px] md:text-xs font-medium text-[#111111] ${
          isLast ? 'rounded-br-xl' : 'border-b border-[#2c2c2e]/10'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold">
            {isPercent ? '' : '₱'}
          </span>

          <span className="text-right">
            {isPercent ? `${Number(value || 0).toFixed(2)}%` : formatPeso(value)}
          </span>
        </div>
      </td>
    </tr>
  );
}

export default function SummaryBlock({ summary = {} }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#FBFFFA] shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[55%]" />
          <col className="w-[45%]" />
        </colgroup>

        <tbody>
          <SummaryRow label="REVENUE" value={summary.revenue} />
          <SummaryRow label="COGS" value={summary.cogs} />
          <SummaryRow label="OTHER EXPENSE" value={summary.otherExpense} />
          <SummaryRow label="TOTAL EXPENSE" value={summary.totalExpense} />
          <SummaryRow label="GP VALUE" value={summary.gpValue} />
          <SummaryRow
            label="Total GP%"
            value={summary.totalGpPercent}
            isPercent
            isLast
          />
        </tbody>
      </table>
    </div>
  );
}