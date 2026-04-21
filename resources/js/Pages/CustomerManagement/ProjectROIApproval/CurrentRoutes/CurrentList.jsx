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
        <span className="text-[#195c00] font-semibold">{r.user?.name ?? " "}</span>
      ),
    },
     {
      key: "reference",
      header: <div className="text-center w-full">REFERENCE</div>,
      cell: (r) => (
        <div className="w-full flex justify-center font-medium items-center text-center">
          <span className="text-[11px] lg:text-sm">
            {r.reference}
          </span>
        </div>
      ),
    },
    {
          key: "company_sap_code",
          header: <div className="text-center w-full">SAP CODE</div>,
          cell: (r) => (
        <span className="font-mono text-sm text-[#33721c] flex justify-center items-center text-center">
              {r.company_sap_code ?? "—"}
            </span>
          ),
        },
    {
      key: "company_name",
      header: <div className="text-center w-full">COMPANY NAME</div>,
      cell: (r) => (
        <div className="w-full flex justify-center font-medium items-center text-center">
          <span className="text-[11px] lg:text-sm">
            {r.company_name ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "contract_years",
      header: <div className="text-center w-full">CONTRACT TERM</div>,
      cell: (r) => (
        <div className="w-full flex justify-center font-medium items-center">
          <span className="text-[11px] lg:text-sm">
            {r.contract_years != null ? `${r.contract_years}` : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "contract_type",
      header: <div className="text-center w-full">CONTRACT TYPE</div>,
      cell: (r) => (
        <div className="w-full flex justify-center font-medium items-center text-center">
          <span className="text-[11px] lg:text-sm">
            {r.contract_type ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: <div className="text-center w-full">STATUS</div>,
      cell: (row) => {
        return (
          <div className="w-full flex justify-center items-center">
            <div className="flex flex-col items-center leading-tight">
              <span
                className="
                  inline-block px-2 py-1 text-center rounded-full text-[9px] font-bold tracking-wider
                  bg-blue-100 text-blue-700 border border-blue-200
                "
              >
                <span className="uppercase">
                  {row.status_display_main ?? row.status}
                </span>
                {row.status_display_suffix ? (
                  <span className="font-normal text-[10px] text-gray-500">
                    {row.status_display_suffix}
                  </span>
                ) : null}
              </span>

              <span className="mt-1 text-[10px] text-center italic text-blue-700">
                by: {row.status_assignee_name ?? "—"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "last_saved_at",
      header: <div className="text-center w-full">LAST SAVED</div>,
      cell: (r) => (
        <div className="w-full text-slate-600 flex justify-center items-center text-center">
          <span className="text-xs">{r.last_saved_display ?? "—"}</span>
        </div>
      ),
    },  
    {
      key: "actions",
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
      <div className="flex justify-center items-center gap-2">
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
        
      </div>
      </>
  );
}

export default CurrentList;

CurrentList.layout = page => <AuthenticatedLayout children={page} />