import React from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";

function Tile({ icon, label, value, variant = "normal", onClick, buttonText }) {
  const clickable = typeof onClick === "function";

  // normal = white tile, highlight = green tile, action = green clickable tile
  const base =
    "rounded-xl border shadow-sm flex items-center gap-4 px-8 py-5";
  const styles =
    variant === "highlight" || variant === "action"
      ? "bg-[#4FA34E] border-[#4FA34E] text-white"
      : "bg-white border-black/10 text-black";

  return (
    <div
      className={`${base} ${styles} ${clickable ? "cursor-pointer hover:opacity-95" : ""}`}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div
        className={`h-11 w-11 mr-2 text-xl rounded-full flex items-center justify-center ${
          variant === "highlight" || variant === "action"
            ? "bg-white/20"
            : "bg-[#B5EBA2]/50"
        }`}
      >
        {icon}
      </div>

      <div className="flex-1">
        <div className={`${variant === "highlight" || variant === "action" ? "text-white/90 font-semibold text-lg" : "text-slate-500 text-sm"}`}>
          {label}
        </div>

        {value != null && (
          <div className="text-xl font-semibold leading-tight">
            {value}
          </div>
        )}

        {buttonText && (
          <div className="mt-2 inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-lg text-sm font-semibold">
            {buttonText}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectListSection({
  tiles = [],
  tableTitle = "",
  columns = [],
  rows = [],
  rowKey = (r) => r.id,
  emptyText = "No records found.",
  rightControls = null,
  pagination = null, // { page, perPage, total, onPageChange }
}) {
  const hasRows = rows?.length > 0;

  const rangeText = (() => {
    if (!pagination) return null;
    const { page, perPage, total } = pagination;
    const start = total === 0 ? 0 : (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    return `Showing ${start}-${end} of ${total}`;
  })();

  return (
    <div className="mx-16">
      {/* Tiles */}
      <div className="grid grid-cols-12 gap-6">
        {tiles.map((t) => (
          <div key={t.label} className="col-span-12 md:col-span-4">
            <Tile {...t} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 bg-white rounded-xl border border-black/10 shadow-sm">
        <div className="flex items-center justify-between px-8 py-4 border-b border-black/10">
          <h2 className="font-semibold text-lg">{tableTitle}</h2>
          <div className="flex items-center gap-2">{rightControls}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-slate-500">
                {columns.map((c) => (
                  <th key={c.key} className="px-8 py-2.5 text-xs font-semibold tracking-wide">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {hasRows ? (
                rows.map((r) => (
                  <tr key={rowKey(r)} className="border-t border-black/5">
                    {columns.map((c) => (
                      <td key={c.key} className="px-8 py-2">
                        {typeof c.cell === "function" ? c.cell(r) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-10 text-slate-500" colSpan={columns.length}>
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="flex items-center text-sm justify-between px-6 py-2 border-t border-black/10">
            <div className="text-slate-500">{rangeText}</div>

            <div className="flex items-center gap-2">
              <button
                className="px-1 py-1 rounded-md border border-black/20 disabled:opacity-50"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                <MdKeyboardArrowLeft className="text-[18px]" />
              </button>

              <div className="px-2 py-1">
                {pagination.page}
              </div>

              <button
                className="px-1 py-1 rounded-md border border-black/20 disabled:opacity-50"
                disabled={pagination.page * pagination.perPage >= pagination.total}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                <MdKeyboardArrowRight className="text-[18px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
