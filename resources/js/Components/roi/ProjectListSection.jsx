import React from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";

function Tile({ icon, label, value, variant = "normal", onClick, buttonText }) {
  const clickable = typeof onClick === "function";

  const base =
    "rounded-xl border border-gray-200 border-b-gray-300 shadow-sm flex items-center md:px-3 md:py-3 lg:px-4 lg:py-3 gap-2 xl:gap-4 xl:px-8";
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
        className={`h-11 w-11 mr-2 text-xl rounded-full flex items-center justify-center md:m-0 md:h-10 md:w-10 lg:mr-2 lg:h-11 lg:w-11 ${
          variant === "highlight" || variant === "action"
            ? "bg-white/20"
            : "bg-[#B5EBA2]/50"
        }`}
      >
        {icon}
      </div>

      <div className="flex-1">
        <div className={`${variant === "highlight" || variant === "action" ? "text-white/90 font-semibold text-[11px] md:text-xs lg:text-sm xl:text-base" : "text-slate-500 text-[10px] md:text-[11px] lg:text-xs xl:text-sm"}`}>
          {label}
        </div>

        {value != null && (
          <div className="text-sm font-semibold leading-tight md:text-base lg:text-lg xl:text-xl">
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

function SkeletonRow({ columnCount }) {
  const widths = ["w-24", "w-32", "w-20", "w-28", "w-16", "w-24", "w-20", "w-28", "w-16", "w-24"];
  return (
    <tr className="border-t border-black/5">
      {Array.from({ length: columnCount }).map((_, i) => (
        <td key={i} className="px-8 py-3 md:px-2 lg:px-3 xl:px-6">
          <div className={`h-3 rounded-full bg-gray-200 animate-pulse ${widths[i % widths.length]}`} />
        </td>
      ))}
    </tr>
  );
}

export default function ProjectListSection({
  tiles = [],
  tableTitle = "",
  columns = [],
  rows = [],
  rowKey = (r) => r.id,
  emptyText = "No records found.",
  loading = false,
  rightControls = null,
  searchControl = null,
  filterControl = null, 
  pagination = null,
  onRowClick = null, // ADDED: accept the onRowClick prop
}) {
  const hasRows = rows?.length > 0;

  const rangeText = (() => {
    if (!pagination) return null;
    const { page, perPage, total } = pagination;
    const start = total === 0 ? 0 : (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    return `Showing ${start}-${end} of ${total}`;
  })();

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <SkeletonRow key={i} columnCount={columns.length} />
      ));
    }

    if (!hasRows) {
      return (
        <tr>
          <td className="px-6 py-10 text-slate-500 text-center text-sm" colSpan={columns.length}>
            {emptyText}
          </td>
        </tr>
      );
    }

    return rows.map((r) => (
      <tr
        key={rowKey(r)}
        onClick={() => onRowClick && onRowClick(r)} // ADDED: Trigger the click event
        className={`border-t hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-10px_-12px_10px_rgba(255,255,255,0.1),-1px_1px_1px_rgba(0,0,0,0.1)] border-black/5 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`} // ADDED: Pointer cursor
      >
        {columns.map((c, index) => (
          <td 
            key={c.key} 
            className={`py-1 md:px-2 md:text-[11px] lg:text-xs lg:px-1 ${index === 0 ? "!pl-4 xl:!pl-6" : ""}`}
          >
            {typeof c.cell === "function" ? c.cell(r) : r[c.key]}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="mx-4 md:mx-6 lg:mx-10">
      {/* Tiles */}
      <div className="grid grid-cols-12 gap-6 md:gap-4 xl:gap-6 ">
        {tiles.map((t) => (
          <div key={t.label} className="col-span-12 md:col-span-4 ">
            <Tile {...t} />
          </div>
        ))}
      </div>

      {/* Filter Toolbar Section */}
      {filterControl && (
        <div className="mt-4">
          {filterControl}
        </div>
      )}

      {/* Table Container */}
      <div className="mt-4 bg-white rounded-xl border border-[#00000012] border-b-black/20 border-r-black/20 shadow-[-2px_-2px_10px_rgba(245,245,245,1),0px_0px_0_rgba(255,255,255,1),2px_2px_4px_rgba(0,0,0,0.2)]">

        {/* Table Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3 border-b border-black/10 md:px-3 lg:px-4 xl:px-6 min-w-0">
          <h2 className="font-semibold text-[11px] md:text-xs lg:text-sm xl:text-lg text-slate-800 flex-shrink-0">
            {tableTitle}
          </h2>

          {(searchControl || rightControls) && (
            <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
              {searchControl && (
                <div className="min-w-0 flex-1 sm:flex-none">{searchControl}</div>
              )}
              {rightControls && (
                <div className="flex items-center gap-2 flex-shrink-0">{rightControls}</div>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto table-scrollbar-reset">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left text-slate-500">
                {columns.map((c, index) => (
                  <th key={c.key} className={`px-1 py-1 font-bold tracking-wide leading-tight md:px-2 md:py-[6px] md:text-[8px] lg:px-3 lg:text-[10px] xl:text-[11px] ${index === 0 ? "!pl-4 xl:!pl-6" : ""}`}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>{renderBody()}</tbody>
          </table>
        </div>

        {pagination && !loading && (
          <div className="flex items-center justify-between px-6 py-2 border-t border-black/10 md:px-3 md:py-1 md:text-[10px] lg:text-xs lg:px-4 xl:px-6">
            <div className="text-slate-500">{rangeText}</div>

            <div className="flex items-center gap-2 md:gap-0">
              <button
                className="px-1 py-1 rounded-md border border-black/20 disabled:opacity-50"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                <MdKeyboardArrowLeft className="text-[18px] md:text-xs lg:text-sm xl:text-base" />
              </button>

              <div className="px-2 py-1">{pagination.page}</div>

              <button
                className="px-1 py-1 rounded-md border border-black/20 disabled:opacity-50"
                disabled={pagination.page * pagination.perPage >= pagination.total}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                <MdKeyboardArrowRight className="text-[18px] md:text-xs lg:text-sm xl:text-base" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}