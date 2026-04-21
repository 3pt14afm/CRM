import React, { useMemo } from 'react';
import { router, Head } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import { route as ziggyRoute } from 'ziggy-js';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

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

function CurrentList({ currentProjects = null, stats = null }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(today);

  const rows = currentProjects?.data ?? [];

  const tiles = useMemo(() => {
    const totalCurrentProjects = stats?.totalCurrentProjects ?? currentProjects?.total ?? 0;
    const recentlyAddedToday =
      stats?.recentlyAddedToday ??
      (rows.length > 0 ? formatDateTime(rows[0]?.submitted_at) : '—');

    return [
      {
        label: 'Total Currents',
        value: totalCurrentProjects,
        icon: <FaFolderOpen />,
        variant: 'normal',
      },
      {
        label: 'Recently Added',
        value: recentlyAddedToday,
        icon: <IoTimeOutline />,
        variant: 'normal',
      },
    ];
  }, [stats, currentProjects, rows]);

  const columns = useMemo(
    () => [
      {
        key: 'prepared_by',
        header: 'PREPARED BY',
        cell: (r) => (
          <span className="text-[#195c00] font-semibold">
            {r.prepared_by ?? '—'}
          </span>
        ),
      },
      {
        key: 'sprf_no',
        header: <div className="text-center w-full">SPRF #</div>,
        cell: (r) => (
          <div className="w-full flex justify-center font-medium items-center">
            <span className="text-[11px] lg:text-sm">
              {r.sprf_no ?? '—'}
            </span>
          </div>
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
          <div className="w-full flex justify-center font-medium items-center">
            <span className="text-[11px] lg:text-sm">
              {r.company_name ?? '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'account_manager',
        header: <div className="text-center w-full">ACCOUNT MANAGER</div>,
        cell: (r) => (
          <div className="w-full flex justify-center font-medium items-center">
            <span className="text-[11px] lg:text-sm">
              {r.account_manager ?? '—'}
            </span>
          </div>
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
        key: 'status',
        header: <div className="text-center w-full">STATUS</div>,
        cell: (row) => (
          <div className="w-full flex justify-center items-center">
            <div className="flex flex-col items-center leading-tight">
              <span
                className="
                  inline-block px-2 py-1 text-center rounded-full text-[9px] font-bold tracking-wider
                  bg-blue-100 text-blue-700 border border-blue-200
                "
              >
                <span className="uppercase">
                  {row.status ?? '—'}
                </span>
              </span>

              <span className="mt-1 text-[10px] text-center italic text-blue-700">
                by: {row.current_approver ?? '—'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'submitted_at',
        header: <div className="text-center w-full">SUBMITTED AT</div>,
        cell: (r) => (
          <div className="w-full text-slate-600 flex justify-center items-center">
            <span className="text-xs">{formatDateTime(r.submitted_at)}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) => (
          <div className="flex justify-center items-center gap-2">
            <button
              className="px-3 py-2 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold"
              onClick={() => router.visit(ziggyRoute('sprf.current.show', r.id))}
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
      ziggyRoute('sprf.current'),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const pagination =
    currentProjects && typeof currentProjects.current_page === 'number'
      ? {
          page: currentProjects.current_page,
          perPage: currentProjects.per_page ?? 10,
          total: currentProjects.total ?? rows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="SPRF Current" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project SPRF Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Current</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          <ProjectListSection
            tiles={tiles}
            tableTitle="Current Projects"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={pagination}
          />
        </div>
      </div>
    </>
  );
}

export default CurrentList;
CurrentList.layout = page => <AuthenticatedLayout children={page} />