import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { route } from "ziggy-js";
import ProjectListSection from "@/Components/roi/ProjectListSection";

// icons (match your style — swap if you prefer different ones)
import { FaFolderOpen } from "react-icons/fa";
import { IoTimeOutline, IoAddCircleOutline } from "react-icons/io5";

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

        if (!confirm(`Delete draft ${ref}? This cannot be undone.`)) return;

        router.delete(route("roi.entry.projects.destroy", row.id), {
            preserveScroll: true,
            onSuccess: () => {
            // optional toast later
            },
            onError: () => {
            alert("Delete failed.");
            },
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
            key: "actions",
            header: "ACTIONS",
            cell: (r) => (
                <div className="flex items-center gap-2">
                    <button
                        className="px-4 py-2 rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold"
                        onClick={() => router.visit(route("roi.entry.projects.show", r.id))}
                    >
                        Edit
                    </button>

                    <button
                        className="px-4 py-2 rounded-lg border border-[#F27373] text-red-600 font-semibold hover:bg-[#F27373]/10"
                        onClick={() => handleDelete(r)}
                    >
                        Delete
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
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
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
