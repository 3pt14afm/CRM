import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
    condition: 'GP >= 16%',
    requiredApprovals: 'ESD Director + VP & CCTO',
  },
  {
    condition: 'GP < 16%',
    requiredApprovals: 'ESD Director + VP & CCTO + President & CEO',
  },
  {
    condition: 'Rebate Requests',
    requiredApprovals:
      'Customer Engagement Director (with Justification) + ESD Director & All Executives',
  },
];

export default function Conditions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-[#2c2c2e]/20 bg-white shadow-sm print:mt-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between bg-[#B5EBA2]/15 px-4 py-2.5 md:py-1.5 border-b border-[#2c2c2e]/10 cursor-pointer md:cursor-default md:pointer-events-none"
      >
        <h3 className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wide print:font-semibold">
          Conditions
        </h3>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#2c2c2e]/60 transition-transform duration-200 md:hidden ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div className={`px-2.5 py-1 ${isOpen ? 'block' : 'hidden'} md:block`}>
        <table className="w-full border-collapse text-[11px] print:text-[10px]">
        <colgroup>
            <col className="w-[40%] sm:w-1/4" />
            <col className="w-[60%] sm:w-3/4" />
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