import React from 'react';
import { MdOutlineFilterAlt } from 'react-icons/md';

/**
 * Was pasted in ArchiveProposals.jsx and GeneratedProposals.jsx with only
 * the <option> list differing (Awarded/Closed vs Draft/Generated).
 */
export default function StatusFilterSelect({ value, onChange, options }) {
  return (
    <div className="relative h-7 md:h-8 flex items-center flex-shrink-0">
      <MdOutlineFilterAlt className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10 transition-all duration-150" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 md:h-8 w-7 md:w-32 px-0 md:pl-8 md:pr-6 py-0 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
          text-transparent md:text-black appearance-none cursor-pointer !bg-none [&::-ms-expand]:hidden
          flex items-center outline-none focus:ring-0 focus:border-[#289800]
          transition-all duration-150"
      >
        {options.map((opt) => (
          <option key={opt.value} className="text-black" value={opt.value}>
            &nbsp;&nbsp;{opt.label}&nbsp;&nbsp;
          </option>
        ))}
      </select>
    </div>
  );
}

// Usage:
// <StatusFilterSelect
//   value={statusFilter}
//   onChange={handleStatusChange}
//   options={[
//     { value: 'all', label: 'All Status' },
//     { value: 'awarded', label: 'Awarded' },
//     { value: 'closed', label: 'Closed' },
//   ]}
// />