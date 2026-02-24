import React, { useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head} from '@inertiajs/react';
import { IoEyeOutline } from "react-icons/io5";


function CurrentList({ currentProjects, stats }) {
  const today = new Date();
      const formattedDate = new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(today);
console.log({ currentProjects, stats });

  const tiles = useMemo(() => {
    const totalCurrentProjects = stats?.totalCurrentProjects ?? currentProjects?.total ?? 0;
    const recentlyAddedToday = stats?.recentlyAddedToday ?? "—";

    return [
      {
        label: "Total Currents",
        value: totalCurrentProjects,
        icon: <FaFolderOpen />,
        variant: "normal",
      },
      {
        label: "Recently Added",
        value: recentlyAddedToday,
        icon: <IoTimeOutline />,
        variant: "normal",
      },
    ];
  }, [stats, currentProjects]);


  const columns = useMemo(() => [
    {
      key: "Created by",
      header: "PREPARED BY",
      cell: (r) => (
        <span className="text-[#289800] font-semibold">{r.user?.name ?? " "}</span>
      ),
    },
     {
      key: "reference",
      header: "REFERENCE",
      cell: (r) => (
        <span className=" font-semibold">{r.reference}</span>
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
      cell: (r) => r.contract_years != null ? `${r.contract_years}` : "—",
    },
    {
      key: "contract_type",
      header: "CONTRACT TYPE",
      cell: (r) => r.contract_type ?? "—",
    },
    {
      key: "last_saved_at",
      header: "LAST SAVED",
      cell: (r) => r.last_saved_display ?? "—",
    },  {
                key: "actions",
                header: "ACTIONS",
                cell: (r) => (
                    <div className="flex  items-center gap-2">
                        <button
                            className="px-3 py-2 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold"
                            onClick={() => router.visit(route("roi.current.show", r.id))}
                        >
                           <IoEyeOutline className='text-[18px]'/>
                        </button>
                    </div>
                ),
                },

  ], []);

  const goToPage = (p) => {
    router.get(route("roi.current"), { page: p }, { preserveScroll: true, preserveState: true });
  };

  const rows = currentProjects?.data ?? [];
  const pagination = currentProjects && typeof currentProjects.current_page === "number"
    ? {
        page: currentProjects.current_page,
        perPage: currentProjects.per_page ?? 10,
        total: currentProjects.total ?? rows.length,
        onPageChange: goToPage,
      }
    : null;

  return (
    <>
       <Head title="ROI Current" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          {/* HEADER (same as your Entry.jsx layout) */}
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project ROI Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Current</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          {/* Tiles + Table */}
          <ProjectListSection
            tiles={tiles}
            tableTitle="Current Projects"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={pagination}
          />
        </div>

        {/* Keep footer spacing consistent with your pages if needed */}
        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end">
            {/* No actions for list footer right now (intentionally empty) */}
          </div>
        </div>
      </div>
      </>
  );
}

export default CurrentList;

CurrentList.layout = page => <AuthenticatedLayout children={page} />