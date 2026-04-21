import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import { route as ziggyRoute } from 'ziggy-js';

const formatDateTime = (value) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
};

const approvalLevelLabel = (value) => {
  if (value === 'PRESIDENT_AND_CEO') return 'President & CEO';
  if (value === 'VP_AND_CCTO') return 'VP & CCTO';
  return 'Director - Enterprise Solutions';
};

function ArchiveList({ archiveProjects = null, stats = null }) {
  const rows = archiveProjects?.data ?? [];

  const tiles = useMemo(() => {
    const totalArchiveProjects = stats?.totalArchiveProjects ?? archiveProjects?.total ?? 0;

    const latestDecision =
      stats?.recentlyArchivedToday ??
      formatDateTime(
        rows[0]?.approved_at || rows[0]?.rejected_at || null
      );

    return [
      {
        label: 'Total Archives',
        value: totalArchiveProjects,
        icon: <FaFolderOpen />,
        variant: 'normal',
      },
      {
        label: 'Recently Archived',
        value: latestDecision,
        icon: <IoTimeOutline />,
        variant: 'normal',
      },
    ];
  }, [stats, archiveProjects, rows]);

  const columns = useMemo(
    () => [
      {
        key: 'prepared_by',
        header: 'PREPARED BY',
        cell: (r) => (
          <span className="text-[#195c00] font-medium">
            {r.prepared_by ?? '—'}
          </span>
        ),
      },
      {
        key: 'sprf_no',
        header: <div className="text-center w-full">SPRF #</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {r.sprf_no ?? '—'}
          </span>
        ),
      },
      {
        key: 'sub_category',
        header: <div className="text-center w-full">SUB CATEGORY</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {r.sub_category ?? '—'}
          </span>
        ),
      },
      {
        key: 'company_name',
        header: <div className="text-center w-full">ACCOUNT</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {r.company_name ?? '—'}
          </span>
        ),
      },
      {
        key: 'account_manager',
        header: <div className="text-center w-full">ACCOUNT MANAGER</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {r.account_manager ?? '—'}
          </span>
        ),
      },
      {
        key: 'approval_level',
        header: <div className="text-center w-full">APPROVAL LEVEL</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {approvalLevelLabel(r.approval_level)}
          </span>
        ),
      },
      {
        header: <div className="text-center w-full">STATUS</div>,
        key: 'status',
        cell: (row) => {
          const s = String(row.status ?? '').toLowerCase();
          const isRejected = s === 'rejected';
          const isApproved = s === 'approved';

          return (
            <div className="flex justify-center items-center">
              <span
                className={`
                  rounded-full px-2 text-[9px] font-bold uppercase
                  ${
                    isRejected
                      ? 'bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20'
                      : isApproved
                      ? 'bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }
                `}
              >
                {row.status ?? '—'}
              </span>
            </div>
          );
        },
      },
      {
        key: 'decided_by',
        header: <div className="text-center w-full">DECIDED BY</div>,
        cell: (r) => {
          const name =
            r.decided_by_name ||
            r.approved_by_name ||
            r.rejected_by_name ||
            '—';

          return (
            <span className="text-blue-500 font-medium text-xs flex items-center justify-center">
              {name}
            </span>
          );
        },
      },
      {
        key: 'decided_at',
        header: <div className="text-center w-full">DECIDED AT</div>,
        cell: (r) => (
          <span className="text-slate-600 text-xs flex justify-center items-center">
            {formatDateTime(r.approved_at || r.rejected_at)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) => (
          <div className="flex items-center justify-center gap-2">
            <button
              className="px-1.5 py-1 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] border border-[#B5EBA2]/40 font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/30"
              type="button"
              onClick={() => router.visit(ziggyRoute('sprf.archive.show', r.id))}
            >
              <IoEyeOutline className="text-[18px]" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const goToPage = (p) => {
    router.get(
      ziggyRoute('sprf.archive'),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const pagination =
    archiveProjects && typeof archiveProjects.current_page === 'number'
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