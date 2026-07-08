import React from 'react';
import { router } from '@inertiajs/react';
import { FaFileInvoice, FaPen } from 'react-icons/fa';
import { route as ziggyRoute } from 'ziggy-js';

/**
 * The "open this record" icon button was re-implemented with the same
 * classes in every table `actions` column and every mobile card renderer,
 * across ArchiveProposals, GeneratedProposals and ApprovedProjects — only
 * the route params and icon (FaFileInvoice vs FaPen) varied.
 */
export default function ViewRecordButton({ id, type, icon: Icon = FaFileInvoice, size = '12px', dense = false }) {
  return (
    <button
      type="button"
      className={`px-2 py-1 flex flex-row justify-center gap-2 items-center rounded-lg text-[#289800] font-semibold transition-colors shadow-sm border border-[#289800]/10 ${
        dense ? 'bg-[#B5EBA2]/10 hover:bg-[#B5EBA2]/50' : 'bg-[#B5EBA2]/25 hover:bg-[#B5EBA2]/50'
      }`}
      onClick={() => router.visit(ziggyRoute('proposals.show', { id, type }))}
    >
      <Icon style={{ fontSize: size }} />
    </button>
  );
}

// Usage (table cell):   <ViewRecordButton id={r.id} type={activeTab} />
// Usage (mobile card):  <ViewRecordButton id={r.id} type={activeTab} dense />
// Draft rows in GeneratedProposals used FaPen instead:
//                        <ViewRecordButton id={r.id} type={activeTab} icon={FaPen} />