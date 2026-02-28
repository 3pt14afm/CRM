import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { route } from "ziggy-js";
import ProjectListSection from "@/Components/roi/ProjectListSection";

// icons (match your style — swap if you prefer different ones)
import { FaFolderOpen } from "react-icons/fa";
import { IoTimeOutline, IoAddCircleOutline } from "react-icons/io5";
import toast, { Toaster } from 'react-hot-toast';
import { MdDelete, MdEdit } from 'react-icons/md';

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

  toast((t) => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('[data-toast]')) {
        toast.dismiss(t.id);
        document.removeEventListener('mousedown', handleOutsideClick);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return (
      <span data-toast className="flex items-center gap-3">
        <span>Delete draft <b>{ref}</b>? This cannot be undone.</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            document.removeEventListener('mousedown', handleOutsideClick);
            router.delete(route("roi.entry.projects.destroy", row.id), {
              preserveScroll: true,
              onStart: () => {
                toast.loading("Deleting draft...", { id: "deleteDraft" });
              },
              onSuccess: () => {
                toast.success("Draft deleted successfully!", { id: "deleteDraft" });
              },
              onError: () => {
                toast.error("Delete failed. Please try again.", { id: "deleteDraft" });
              },
            });
          }}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Delete
        </button>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            document.removeEventListener('mousedown', handleOutsideClick);
          }}
          className="bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
        >
          Cancel
        </button>
      </span>
    );
  }, { 
    duration: Infinity,
    style: {
      maxWidth: '500px',
      padding: '16px 20px',
      fontSize: '15px',
    }
  });
};

  // --- Table columns ---
    const columns = useMemo(
        () => [
            {
            key: "reference",
            header: "REFERENCE",
            cell: (r) => (
                <span className="text-[#289800] font-semibold">
                { r.reference }
                </span>
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
            key: "last_saved_at",
            header: "LAST SAVED",
            cell: (r) => r.last_saved_display ?? "—",
            },
           {
              header: "STATUS",
              key: "status",
              cell: (row) => {
                // Define colors based on status value
                const isDraft = row.status?.toLowerCase() === 'draft';
                const isReturned = row.status?.toLowerCase() === 'returned';
                
                return (
                  <span className={`
                    px-2 py-1           /* Padding for the background */
                    rounded-md        /* High radius (capsule shape) */
                    text-[9px]         /* Smaller font size */
                    font-bold           /* Bold text */
                    uppercase           /* Clean look */
                    tracking-wider      /* Spacing */
                    md:text-[8px] md:px-1 md:py-1
                    lg:text-[9px] lg:px-[6px] lg:py-1
                    xl:text-[10px] xl:px-2 xl:py-1
                    ${isReturned 
                      ? "bg-red-100 text-red-700 border border-red-200" : isDraft
                      ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]" : ""
                    }
                  `}>
                    {row.status}
                  </span>
                );
              }
            },
            {
            key: "actions",
            header: "ACTIONS",
            cell: (r) => (
                <div className="flex items-center gap-2 md:gap-1">
                    <button
                        className="px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
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
          <Toaster />
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
