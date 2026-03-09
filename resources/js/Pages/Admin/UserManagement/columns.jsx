import React from "react";
import { MdEdit } from "react-icons/md";

export function getUserColumns({ onEdit, isUserActive }) {
  return [
    {
      key: "first_name",
      header: "FIRST NAME",
      cell: (r) => (
        <div className="w-full flex justify-left items-center">
          <span className="text-[11px] lg:text-sm">{r.first_name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "last_name",
      header: "LAST NAME",
      cell: (r) => (
        <div className="w-full flex justify-left items-center">
          <span className="text-[11px] lg:text-sm">{r.last_name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "employee_id",
      header: <div className="text-center w-full">EMPLOYEE ID</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-[11px] lg:text-sm">{r.employee_id ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "position",
      header: <div className="text-center w-full">POSITION</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-[11px] text-center lg:text-sm">{r.position ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "department",
      header: <div className="text-center w-full">DEPARTMENT</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-[11px] text-center lg:text-sm">{r.department_name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: <div className="text-center w-full">EMAIL</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-[11px] lg:text-sm text-slate-600">{r.email ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "location_name",
      header: <div className="text-center w-full">LOCATION</div>,
      cell: (r) => (
        <div className="w-full flex justify-center items-center">
          <span className="text-[11px] text-center lg:text-sm">{r.location_name ?? "—"}</span>
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
                px-2 py-px rounded-full text-[10px] lg:text-xs lg:font-medium font-semibold tracking-wider
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