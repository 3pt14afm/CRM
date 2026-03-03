// resources/js/Pages/Admin/Panel.jsx
import React, { useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import { FaUsersCog } from "react-icons/fa";
import { IoTimeOutline } from "react-icons/io5";
import { IoEyeOutline } from "react-icons/io5";

function AdminPanel({ users, stats }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  // Tiles (top cards)
  const tiles = useMemo(() => {
    const totalUsers = stats?.totalUsers ?? users?.total ?? 0;
    const recentlyAddedToday = stats?.recentlyAddedToday ?? "—";

    return [
      {
        label: "Total Users",
        value: totalUsers,
        icon: <FaUsersCog />,
        variant: "normal",
      },
      {
        label: "Recently Added",
        value: recentlyAddedToday,
        icon: <IoTimeOutline />,
        variant: "normal",
      },
    ];
  }, [stats, users]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "NAME",
        cell: (r) => (
          <span className="text-[#289800] font-semibold">{r.name ?? "—"}</span>
        ),
      },
      {
        key: "email",
        header: "EMAIL",
        cell: (r) => <span className="font-semibold">{r.email ?? "—"}</span>,
      },
      {
        key: "role",
        header: "ROLE",
        cell: (r) => r.role ?? r.roles?.[0]?.name ?? "—",
      },
      {
        key: "status",
        header: "STATUS",
        cell: (row) => {
          const isActive =
            row.status === "Active" ||
            row.is_active === true ||
            row.active === true;

          return (
            <span
              className={`
                px-2 py-1
                rounded-full
                text-[9px]
                font-bold
                uppercase
                tracking-wider
                ${
                  isActive
                    ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                    : "bg-red-100 text-red-700 border border-red-200"
                }
              `}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          );
        },
      },
      {
        key: "created_at",
        header: "CREATED",
        cell: (r) => (
          <span className="text-xs">{r.created_display ?? "—"}</span>
        ),
      },
      {
        key: "actions",
        header: "ACTIONS",
        cell: (r) => (
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold"
              onClick={() => router.visit(route("admin.users.show", r.id))}
              title="View"
              type="button"
            >
              <IoEyeOutline className="text-[18px]" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Pagination (matches your pattern)
  const goToPage = (p) => {
    router.get(route("admin.index"), { page: p }, { preserveScroll: true, preserveState: true });
  };

  const rows = users?.data ?? [];
  const pagination =
    users && typeof users.current_page === "number"
      ? {
          page: users.current_page,
          perPage: users.per_page ?? 10,
          total: users.total ?? rows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="Admin Panel" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          {/* HEADER */}
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Administration</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Admin Panel</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          {/* Tiles + Table */}
          <ProjectListSection
            tiles={tiles}
            tableTitle="User Management"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={pagination}
          />
        </div>

        {/* Footer spacer */}
        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end">
            {/* intentionally empty */}
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminPanel;
AdminPanel.layout = (page) => <AuthenticatedLayout children={page} />;