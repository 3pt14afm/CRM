import React from "react";
import { MdEdit } from "react-icons/md";

function SortHeader({
  label,
  sortKey,
  sortBy,
  sortDirection,
  onSort,
  align = "left",
}) {
  const active = sortBy === sortKey;
  const indicator = active ? (sortDirection === "desc" ? "▼" : "▲") : "⇅";
  const justifyClass =
    align === "center" ? "justify-center text-center" : "justify-start text-left";

  return (
    <button
      type="button"
      title={`Sort by ${label.toUpperCase()}`}
      onClick={() => onSort(sortKey)}
      className={`group inline-flex w-full items-center gap-1 font-bold tracking-wide ${justifyClass}`}
    >
      <span>{label}</span>
      <span
        className={`text-[11px] leading-none ${
          active
            ? "text-[#289800]"
            : "text-slate-400 transition-colors group-hover:text-slate-500"
        }`}
      >
        {indicator}
      </span>
    </button>
  );
}

export function getUserColumns({
  onEdit,
  isUserActive,
  sortBy,
  sortDirection,
  onSort,
}) {
  return [
    {
      key: "first_name",
      header: (
        <SortHeader
          label="FIRST NAME"
          sortKey="first_name"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      ),
      cell: (r) => (
        <div className="w-full flex justify-left items-center">
          <span className="">{r.first_name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "last_name",
      header: (
        <SortHeader
          label="LAST NAME"
          sortKey="last_name"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      ),
      cell: (r) => (
        <div className="w-full flex justify-left items-center">
          <span className="">{r.last_name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "employee_id",
      header: (
        <SortHeader
          label="EMPLOYEE ID"
          sortKey="employee_id"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          align="center"
        />
      ),
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="">{r.employee_id ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "position",
      header: <div className="text-center w-full">POSITION</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-center">
            {r.position ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "department",
      header: <div className="text-center w-full">DEPARTMENT</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-center">
            {r.department_name ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      header: <div className="text-center w-full">EMAIL</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-slate-600">
            {r.email ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "location_name",
      header: <div className="text-center w-full">LOCATION</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-center">
            {r.location_name ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: <div className="w-full text-center">STATUS</div>,
      cell: (row) => {
        const active = isUserActive(row);

        return (
          <div className="w-full flex justify-center items-center">
            <span
              className={`
                px-1.5 xl:px-2 py-px rounded-full text-[10px] xl:text-xs lg:font-medium font-semibold tracking-wider
                ${
                  active
                    ? "bg-[#E9F7E7] text-[#289800] border border-[#2DA300]/20"
                    : "bg-red-100 text-red-700 border border-red-200"
                }
              `}
            >
              {active ? "Active" : "Inactive"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: <div className="w-full text-center">ACTIONS</div>,
      cell: (r) => (
        <div className="w-full flex justify-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 px-2 py-2 font-semibold text-[#289800] md:px-1 md:py-1"
              title="Edit user"
              onClick={() => onEdit(r)}
            >
              <MdEdit className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
            </button>
          </div>
        </div>
      ),
    },
  ];
}