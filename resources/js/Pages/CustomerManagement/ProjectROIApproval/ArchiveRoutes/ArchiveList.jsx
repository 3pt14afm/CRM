import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import { route as ziggyRoute } from "ziggy-js";

function ArchiveList({ archiveProjects, stats }) {
  const tiles = useMemo(() => {
    const totalArchiveProjects = stats?.totalArchiveProjects ?? archiveProjects?.total ?? 0;
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
  }, [stats, archiveProjects]);

  const columns = useMemo(() => [
    {
      key: "PreparedBy",
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
      cell: (r) => (r.contract_years != null ? `${r.contract_years}` : "—"),
    },
    {
      key: "contract_type",
      header: "CONTRACT TYPE",
      cell: (r) => r.contract_type ?? "—",
    },
    {
      header: "STATUS",
      key: "status",
      cell: (row) => {
        const s = String(row.status ?? "").toLowerCase();
        const isRejected = s === "rejected";
        const isApproved = s === "approved";

        return (
          <span className={`
            px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider
            ${isRejected
              ? "bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20"
              : isApproved
              ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
              : "bg-blue-100 text-blue-700 border border-blue-200"
            }
          `}>
            {row.status ?? "—"}
          </span>
        );
      }
    },
    {
      key: "decided_by",
      header: "DECIDED BY",
      cell: (r) => {
        const s = String(r.status ?? "").toLowerCase();
        const isRejected = s === "rejected";

        const name = r.decided_by_name ?? "—";
        const lvl = isRejected ? (r.rejected_by_level_display ?? null) : null;

        return (
          <span className="text-slate-800">
            {name}
          </span>
        );
      }
    },
    {
      key: "decided_at",
      header: "DECIDED AT",
      cell: (r) => r.decided_at_display ?? "—",
    },
    {
      key: "actions",
      header: "ACTIONS",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold"
            type="button"
            onClick={() => router.visit(ziggyRoute("roi.archive.show", r.id))}
          >
            <IoEyeOutline className="text-[18px]" />
          </button>
        </div>
      ),
    },
  ], []);

  const goToPage = (p) => {
    router.get(ziggyRoute("roi.archive"), { page: p }, { preserveScroll: true, preserveState: true });
  };

  const rows = archiveProjects?.data ?? [];
  const pagination = archiveProjects && typeof archiveProjects.current_page === "number"
    ? {
        page: archiveProjects.current_page,
        perPage: archiveProjects.per_page ?? 10,
        total: archiveProjects.total ?? rows.length,
        onPageChange: goToPage,
      }
    : null;

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle="Archived Projects"
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.id)}
      pagination={pagination}
    />
  );
}

export default ArchiveList;