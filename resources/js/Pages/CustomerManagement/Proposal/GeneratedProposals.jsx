import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFileInvoice, FaFolderOpen, FaCheckCircle } from 'react-icons/fa';
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
        <div className="flex items-center gap-2">
            <button
                className="px-4 py-2 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
                type="button"
                // Using r.id (which is the roi_archive_project_id) to open the editor
               onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id }))}            >
                <FaFileInvoice className="text-[16px]" />
                <span className="text-xs uppercase tracking-wide">
                    {r.status === 'generated' ? 'View Proposal' : 'Continue Draft'}
                </span>
            </button>
        </div>
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

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle="My Proposals"
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.proposal_id)}
      pagination={pagination}
    />
  );
}

export default GeneratedProposals;