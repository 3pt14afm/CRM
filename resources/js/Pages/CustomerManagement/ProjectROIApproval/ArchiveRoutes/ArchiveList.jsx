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
        <span className="text-[#195c00] font-medium">{r.user?.name ?? "—"}</span>
      ),
    },
    {
      key: "reference",
      header: <div className="text-center w-full">REFERENCE</div>,
      cell: (r) => (
        <span className="font-medium flex justify-center items-center">{r.reference ?? "—"}</span>
      ),
    },
    {
          key: "company_sap_code",
          header: <div className="text-center w-full">SAP CODE</div>,
          cell: (r) => (
        <span className="font-mono text-sm text-[#33721c] flex justify-center items-center">
              {r.company_sap_code ?? "—"}
            </span>
          ),
        },
    {
      key: "company_name",
      header: <div className="text-center w-full">COMPANY NAME</div>,
      cell: (r) => (
        <span className="font-medium flex justify-center items-center">
          {r.company_name ?? "—"}
        </span>
      ),
    },
    {
      key: "contract_years",
      header: <div className="text-center w-full">CONTRACT TERM</div>,
      cell: (r) => (
        <span className="font-medium flex justify-center items-center">
          {r.contract_years != null ? `${r.contract_years}` : "—"}
        </span>
      ),
    },
    {
      key: "contract_type",
      header: <div className="text-center w-full">CONTRACT TYPE</div>,
      cell: (r) => (
        <span className="font-medium flex justify-center items-center">
          {r.contract_type ?? "—"}
        </span>
      ),
    },
    {
      header: <div className="text-center w-full">STATUS</div>,
      key: "status",
      cell: (row) => {
        const s = String(row.status ?? "").toLowerCase();
        const isRejected = s === "rejected";
        const isApproved = s === "approved";

         return (
            <div className="flex justify-center items-center">
              <span
                className={`
                  rounded-full px-2 text-[9px] font-bold uppercase
                  ${isRejected
                    ? "bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20"
                    : isApproved
                    ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                  }
                `}
              >
                {row.status ?? "—"}
              </span>
            </div>
          );
      }
    },
    {
      key: "decided_by",
      header: <div className="text-center w-full">DECIDED BY</div>,
      cell: (r) => {
        const s = String(r.status ?? "").toLowerCase();
        const isRejected = s === "rejected";

        const name = r.decided_by_name ?? "—";
        const lvl = isRejected ? (r.rejected_by_level_display ?? null) : null;

        return (
          <span className="text-blue-500 font-medium text-xs flex items-center justify-center">
            {name}
          </span>
        );
      }
    },
    {
      key: "decided_at",
      header: <div className="text-center w-full">DECIDED AT</div>,
      cell: (r) => (
        <span className="text-slate-600 text-xs flex justify-center items-center">
          {r.decided_at_display ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
        <div className="flex items-center justify-center gap-2">
          <button
            className="px-1.5 py-1 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] border border-[#B5EBA2]/40 font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/30"
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