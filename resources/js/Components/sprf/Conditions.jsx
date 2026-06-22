const CONDITION_ROWS = [
  {
    condition: 'Standard Pricing',
    requiredApprovals: 'ESD Director',
  },
  {
    condition: 'Value > 1M',
    requiredApprovals: 'ESD Director + VP & CCTO',
  },
  {
    condition: 'GP > 15%',
    requiredApprovals: 'ESD Director + VP & CCTO',
  },
  {
    condition: 'GP <= 15%',
    requiredApprovals: 'ESD Director + VP & CCTO + President & CEO',
  },
  {
    condition: 'Rebate Requests',
    requiredApprovals:
      'Customer Engagement Director (with Justification) + ESD Director & All Executives',
  },
];

export default function Conditions() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2c2c2e]/20 bg-white shadow-sm print:mt-0">
      <div className="bg-[#B5EBA2]/15 px-4 py-1.5 border-b border-[#2c2c2e]/10">
        <h3 className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wide print:font-semibold">
          Conditions
        </h3>
      </div>

      <div className="px-3 py-1">
        <table className="w-full border-collapse text-[11px] print:text-[10px]">
        <colgroup>
            <col className="w-1/4" />
            <col className="w-3/4" />
          </colgroup>
          <thead>
          </thead>
          <tbody>
            {CONDITION_ROWS.map((row) => (
              <tr key={row.condition}>
                <td className="border-b border-[#2c2c2e]/20 px-2 py-1 align-top">
                  {row.condition}
                </td>
                <td className="border-b border-[#2c2c2e]/20 px-2 py-1 align-top">
                  {row.requiredApprovals}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="my-1 pl-2 text-[10px] text-slate-500 italic print:text-[9px]">
          Note: For Rebate requests, Value must be 100K above
        </p>
      </div>
    </div>
  );
}