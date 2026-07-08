import React from 'react';

// Each file re-implemented its own status -> color mapping inline:
//   ArchiveProposals: statusBadgeClasses(status)   awarded=green, closed=slate
//   GeneratedProposals: inline ternary             generated=green, draft=amber
//   ApprovedProjects: hardcoded                    always green ("APPROVED")
const VARIANT_CLASSES = {
  green: 'bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  slate: 'bg-slate-100 text-slate-500 border-slate-300',
};

// Default status -> variant lookup. Pass `variantMap` to override/extend
// per screen instead of writing a new color function each time.
const DEFAULT_VARIANT_MAP = {
  awarded: 'green',
  generated: 'green',
  approved: 'green',
  closed: 'slate',
  draft: 'amber',
};

export default function StatusBadge({ status, variantMap = DEFAULT_VARIANT_MAP, className = '' }) {
  const variant = variantMap[status] ?? 'slate';
  return (
    <span
      className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {status}
    </span>
  );
}