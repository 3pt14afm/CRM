import React from "react";
import { MdEdit } from "react-icons/md";
import SortHeader from "@/Components/SortHeader";
import ViewButton from "@/Components/ViewButton";

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
        />
      ),
      cell: (r) => (
        <div className="w-full flex items-center">
          <span className="">{r.employee_id ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "position",
      header: (
        <SortHeader
          label="POSITION"
          sortKey="position"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      ),
      cell: (r) => (
        <div className="w-full flex items-center">{r.position ?? "—"}</div>
      ),
    },
    {
      key: "department",
      header: (
        <SortHeader
          label="DEPARTMENT"
          sortKey="department_name"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      ),
      cell: (r) => (
        <div className="w-full flex items-center">{r.department_name ?? "—"}</div>
      ),
    },
    {
      key: "delsan",
      header: (
        <SortHeader
          label="DELSAN"
          sortKey="delsan"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      ),
      cell: (r) => (
        <div className="w-full flex items-center">
          <span className="text-center uppercase">
            {r.delsan ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      header: <div className="flex text-center w-full">EMAIL</div>,
      cell: (r) => (
        <div className="w-full flex items-center">
          <span className="text-slate-600">
            {r.email ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "location_name",
      header: (
        <SortHeader
          label="LOCATION"
          sortKey="location_name"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      ),
      cell: (r) => (
        <div className="w-full flex items-center">{r.location_name ?? "—"}</div>
      ),
    },
    {
      key: "status",
      header: <div className="w-full flex text-center">STATUS</div>,
      cell: (row) => {
        const active = isUserActive(row);

        return (
          <div className="w-full flex items-center">
            <span
              className={`
                px-1 rounded-full text-[10px] lg:text-[11px] lg:font-medium font-semibold tracking-wider
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
            <ViewButton
              label="Edit user"
              icon={MdEdit}
              onClick={() => onEdit(r)}
              className="p-1 size-[26px] border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800]"
            />
          </div>
        </div>
      ),
    },
  ];
}