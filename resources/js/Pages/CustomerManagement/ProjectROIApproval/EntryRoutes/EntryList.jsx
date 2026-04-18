import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { route } from "ziggy-js";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import { toast } from 'sonner';

// icons (match your style — swap if you prefer different ones)
import { FaFolderOpen } from "react-icons/fa";
import { IoTimeOutline, IoAddCircleOutline } from "react-icons/io5";

import { MdDelete, MdEdit } from 'react-icons/md';
import FlashMessages from '@/Components/FlashMessages';


export default function EntryList({
  drafts = null, // expected: { data, current_page, per_page, total }
  stats = null,  // expected: { totalDrafts, recentlyModifiedText }  (you can shape this later)
}) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);


  // --- Tiles (3rd tile = Create New Draft) ---
  const tiles = useMemo(() => {
    const totalDrafts = stats?.totalDrafts ?? drafts?.total ?? 0;
    const recentlyModified = stats?.recentlyModifiedText ?? "—";

    return [
      {
        label: "Total Drafts",
        value: totalDrafts,
        icon: <FaFolderOpen />,
        variant: "normal",
      },
      {
        label: "Recently Modified",
        value: recentlyModified,
        icon: <IoTimeOutline />,
        variant: "normal",
      },
      {
        label: "Create New Draft",
        value: null,
        icon: <IoAddCircleOutline />,
        variant: "action",
        onClick: () => router.visit(route("roi.entry.create")),
      },
    ];
  }, [stats, drafts]);

const handleDelete = (row) => {
      const ref = row.reference ?? row.id;
      const processId = `delete-${row.id}`; // Unique ID for this specific deletion

      toast.custom((t) => {
        const handleClose = () => {
          toast.dismiss(t);
          document.removeEventListener('mousedown', handleOutsideClick);
        };

        const handleOutsideClick = (e) => {
          if (!e.target.closest('[data-toast]')) {
            handleClose();
          }
        };

        document.addEventListener('mousedown', handleOutsideClick);

        return (
          <div 
            data-toast 
            className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-2xl border border-gray-100 min-w-[400px]"
          >
            <div className="flex flex-col">
              <span className="text-gray-900 font-medium">Delete draft?</span>
              <span className="text-sm text-gray-500">
                Reference: <span className="font-bold text-gray-700">{ref}</span>
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleClose(); // Close the confirmation dialog
                  
                  router.delete(route("roi.entry.projects.destroy", row.id), {
                    preserveScroll: true,
                    onStart: () => {
                      toast.loading("Deleting draft...", { id: processId });
                    },
                    onSuccess: () => {
                      toast.success("Draft deleted successfully!", { id: processId });
                    },
                    onError: () => {
                      toast.error("Delete failed. Please try again.", { id: processId });
                    },
                  });
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        );
      }, { 
        duration: Infinity,
        position: 'top-center',
      });
    };

  // --- Table columns ---
    const columns = useMemo(
        () => [
     
            {
            key: "reference",
            header: "REFERENCE",
            cell: (r) => (
                <span className="text-[#195c00] font-semibold">
                { r.reference }
                </span>
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
            key: "last_saved_at",
            header: <div className="text-center w-full">LAST SAVED</div>,
            cell: (r) => (
              <span className="text-xs text-slate-600 flex justify-center items-center">
                {r.last_saved_display ?? "—"}
              </span> 
            )
            },
           {
              header: <div className="text-center w-full">STATUS</div>,
              key: "status",
              cell: (row) => {
                // Define colors based on status value
                const isDraft = row.status?.toLowerCase() === 'draft';
                const isReturned = row.status?.toLowerCase() === 'returned';
                
                return (
                  <div className="flex justify-center items-center">
                    <span className={`
                      px-2 rounded-full text-[9px] font-bold uppercase tracking-wider      
                      md:text-[8px] md:px-1
                      lg:text-[9px] lg:px-[6px]
                      xl:text-[10px] xl:px-2
                      ${isReturned 
                        ? "bg-red-100 text-red-700 border border-red-200" : isDraft
                        ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]" : ""
                      }
                    `}>
                      {row.status}
                    </span>
                  </div>
                  
                );
              }
            },
            {
            key: "actions",
            header: <div className="text-center w-full">ACTIONS</div>,
            cell: (r) => (
                <div className="flex items-center justify-center gap-2 md:gap-1">
                    <button
                        className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                        onClick={() => router.visit(route("roi.entry.projects.show", r.id))}
                    >
                        <MdEdit className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
                    </button>

                    <button
                        className="px-2 py-2  md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10"
                        onClick={() => handleDelete(r)}
                    >
                        <MdDelete className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
                    </button>
                </div>
            ),
            },
        ],
    []
    );


  // --- Pagination handler ---
  const goToPage = (p) => {
    // Update route name later to match your final list route.
    // For now, this assumes you will use something like roi.entry.list
    router.get(route("roi.entry.list"), { page: p }, { preserveScroll: true, preserveState: true });
  };

  const rows = drafts?.data ?? [];
  const pagination =
    drafts && typeof drafts.current_page === "number"
      ? {
          page: drafts.current_page,
          perPage: drafts.per_page ?? 10,
          total: drafts.total ?? rows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="ROI Entry" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          {/* HEADER (same as your Entry.jsx layout) */}
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10 md:mx-4 lg:mx-5 xl:mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project ROI Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Entry</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          {/* Tiles + Table */}
          <ProjectListSection
            tiles={tiles}
            tableTitle="In-Progress Drafts"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={pagination}
          />
        </div>
          <FlashMessages />
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

EntryList.layout = (page) => <AuthenticatedLayout children={page} />;
