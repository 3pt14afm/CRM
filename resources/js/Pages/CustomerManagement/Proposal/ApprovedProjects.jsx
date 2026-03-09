import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFileInvoice, FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import { route as ziggyRoute } from "ziggy-js";

function ApproveProjects({ proposals, stats }) {
  // 1. Extract the data array from the paginated object
  const rows = proposals?.data ?? [];

  // 2. Stats Tiles
  const tiles = useMemo(() => {
    const totalArchiveProjects = stats?.totalArchiveProjects ?? proposals?.total ?? 0;
    const recentlyArchivedToday = stats?.recentlyArchivedToday ?? "—";

    return [
      {
        label: "Total Archives",
        value: totalArchiveProjects,
        icon: <FaFolderOpen />,
        variant: "normal",
      },
      {
        label: "Recently Archived",
        value: recentlyArchivedToday,
        icon: <IoTimeOutline />,
        variant: "normal",
      },
    ];
  }, [stats, proposals]);

  // 3. Table Column Definitions
  const columns = useMemo(() => [
    {
      key: "user_name",
      header: "PREPARED BY",
      cell: (r) => (
        <span className="text-[#289800] font-semibold">{r.user?.name ?? "—"}</span>
      ),
    },
    {
      key: "reference",
      header: "REFERENCE",
      cell: (r) => (
        <span className="font-semibold">{r.reference ?? "—"}</span>
      ),
    },
    {
      key: "company_name",
      header: "COMPANY NAME",
      cell: (r) => r.company_name ?? "—",
    },
    {
      key: "contract_years",
      header: "CONTRACT TERM",
      cell: (r) => (r.contract_years != null ? `${r.contract_years} Years` : "—"),
    },
    {
      header: "STATUS",
      key: "status",
      cell: (row) => (
        <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20">
          {row.status ?? "APPROVED"}
        </span>
      )
    },
    {
      key: "approved_by_name",
      header: "APPROVED BY",
      cell: (r) => (
        <span className="text-slate-800">{r.approved_by_name ?? "—"}</span>
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
            // Change "proposals.show" to just "show" to match your web.php name('show')
            onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id }))}
        >
            <FaFileInvoice className="text-[16px]" />
            <span className="text-xs uppercase tracking-wide">Generate Proposal</span>
        </button>
    </div>
      ),
    },
  ], []);

  // 4. Corrected Pagination Logic
  const goToPage = (p) => {
    // We use the route name "proposal" defined in your web.php for the proposals prefix
    router.get(ziggyRoute("proposal"), { page: p }, { 
        preserveScroll: true, 
        preserveState: true 
    });
  };

  const pagination = proposals && typeof proposals.current_page === "number"
    ? {
        page: proposals.current_page,
        perPage: proposals.per_page ?? 10,
        total: proposals.total ?? 0,
        onPageChange: goToPage,
      }
    : null;

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle="Approved Projects"
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.id)}
      pagination={pagination}
    />
  );
}

export default ApproveProjects;