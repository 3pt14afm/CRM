import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFileInvoice, FaFolderOpen, FaCheckCircle, FaPen } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import { route as ziggyRoute } from "ziggy-js";

function GeneratedProposals({ proposals, stats }) {
  const rows = proposals?.data ?? [];

  const tiles = useMemo(() => [
    {
      label: "Total Proposals",
      value: stats?.totalProposals ?? 0,
      icon: <FaFolderOpen />,
      variant: "normal",
    },
    {
      label: "Generated/Finalized",
      value: stats?.generatedCount ?? 0,
      icon: <FaCheckCircle />,
      variant: "normal",
    },
  ], [stats]);

  const columns = useMemo(() => [
    {
      key: "proposal_ref",
      header: "PROPOSAL REF",
      cell: (r) => (
        <span className="font-bold text-slate-700">{r.proposal_ref}</span>
      ),
    },
    {
      key: "company_name",
      header: "CLIENT / COMPANY",
      cell: (r) => <span className="font-medium text-slate-600">{r.company_name ?? "—"}</span>,
    },
    {
      key: "project_ref",
      header: "ARCHIVE REF",
      cell: (r) => <span className="text-xs text-slate-400">{r.project_ref}</span>,
    },
    {
      header: "STATUS",
      key: "status",
      cell: (r) => {
        const isGenerated = r.status === 'generated';
        return (
          <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
            isGenerated 
              ? "bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20" 
              : "bg-amber-50 text-amber-600 border-amber-200"
          }`}>
            {r.status}
          </span>
        );
      }
    },
    {
      key: "updated_at",
      header: "LAST MODIFIED",
      cell: (r) => (
        <div className="flex items-center gap-1 text-slate-500">
            <IoTimeOutline />
            <span className="text-xs">{r.updated_at}</span>
        </div>
      ),
    },
{
  key: "actions",
  header: "ACTIONS",
  cell: (r) => (
    // Added 'justify-center' and 'w-full' to ensure it centers within the table cell

      <button
        className="px-2 py-1 flex flex-row ml-4 gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
        type="button"
        onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id }))}
      >
        {r.status === 'generated' ? (
          <FaFileInvoice className="text-[12px]" />
        ) : (
          <FaPen className="text-[12px]" />
        )}
        
      </button>

  ),
},
  ], []);

  const goToPage = (p) => {
    router.get(ziggyRoute("proposals.index"), { page: p }, { 
        preserveScroll: true, 
        preserveState: true 
    });
  };

  const pagination = proposals?.current_page ? {
    page: proposals.current_page,
    perPage: proposals.per_page,
    total: proposals.total,
    onPageChange: goToPage,
  } : null;

  // --- Mobile card layout (below md) ---
  const renderProposalCard = (r) => {
    const isGenerated = r.status === 'generated';
    return (
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{r.proposal_ref}</p>
            <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
              isGenerated
                ? "bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20"
                : "bg-amber-50 text-amber-600 border-amber-200"
            }`}>
              {r.status}
            </span>
          </div>
          <p className="text-xs text-slate-600 truncate mt-0.5">{r.company_name ?? '—'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{r.project_ref}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <IoTimeOutline />
            <span>{r.updated_at}</span>
          </p>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="px-2 py-1 flex flex-row justify-center gap-2 items-center rounded-lg bg-[#B5EBA2]/10 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
            onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id }))}
          >
            {isGenerated ? (
              <FaFileInvoice className="text-[12px]" />
            ) : (
              <FaPen className="text-[11px]" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle="My Proposals"
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.proposal_id)}
      pagination={pagination}
      renderCard={renderProposalCard}
    />
  );
}

export default GeneratedProposals;