import React, { useState, useEffect } from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";

function Tile({ icon, label, value, variant = "normal", onClick, buttonText }) {
  const clickable = typeof onClick === "function";

  const base =
    "rounded-xl border min-h-[51px] border-gray-200 border-b-gray-300 shadow-sm flex items-center px-2 py-2 md:px-3 md:py-3 lg:px-4 lg:py-3 gap-2 xl:gap-4 xl:px-8";
  const styles =
    variant === "highlight" || variant === "action"
      ? "bg-[#4FA34E] border-[#4FA34E] text-white"
      : "bg-white border-black/10 text-black";

  return (
    <div
      className={`${base} ${styles} ${clickable ? "cursor-pointer hover:opacity-95 transition-all" : ""}`}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div
        className={`h-7 w-7 text-sm md:text-xl rounded-full flex items-center justify-center flex-shrink-0 md:m-0 md:h-10 md:w-10 lg:mr-2 lg:h-11 lg:w-11 ${
          variant === "highlight" || variant === "action"
            ? "bg-white/20"
            : "bg-[#B5EBA2]/50"
        }`}
      >
        {icon}
      </div>

      {/* Remove the {variant === 'action' ? 'hidden md:block' : ''} from this div */}
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
        <td key={i} className="px-4 py-3 md:px-2 lg:px-3 xl:px-6">
          <div className={`h-3 rounded-full bg-gray-200 animate-pulse ${widths[i % widths.length]}`} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white shadow-sm px-4 py-3 animate-pulse">
      <div className="h-10 w-10 rounded-lg bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3 w-3/4 rounded-full bg-gray-200" />
        <div className="h-2.5 w-1/2 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

// ADDED: helper to compute up to `maxVisible` page numbers centered
// around the current page, clamped to the valid [1, totalPages] range.
function getPageNumbers(currentPage, totalPages, maxVisible = 5) {
  if (totalPages <= 0) return [];
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = currentPage - half;
  let end = currentPage + (maxVisible - half - 1);

  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > totalPages) {
    start -= end - totalPages;
    end = totalPages;
  }
  start = Math.max(start, 1);

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
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
  renderCard = null, // OPTIONAL: mobile card layout, e.g. (row) => (<YourCardMarkup row={row} />)
}) {
  const hasRows = rows?.length > 0;

  const rangeText = (() => {
    if (!pagination) return null;
    const { page, perPage, total } = pagination;
    const start = total === 0 ? 0 : (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    return `Showing ${start}-${end} of ${total}`;
  })();

  // ADDED: total page count + windowed list of page numbers (max 5) for pagination
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.perPage))
    : 0;
  // ADDED: fewer visible page numbers on small screens so the bar doesn't overflow
  const [maxVisiblePages, setMaxVisiblePages] = useState(5);
  useEffect(() => {
    const updateMaxVisible = () => {
      setMaxVisiblePages(window.innerWidth < 640 ? 3 : 5);
    };
    updateMaxVisible();
    window.addEventListener("resize", updateMaxVisible);
    return () => window.removeEventListener("resize", updateMaxVisible);
  }, []);

  const pageNumbers = pagination
    ? getPageNumbers(pagination.page, totalPages, maxVisiblePages)
    : [];

  // ADDED: local state for the "go to page" input on the right side of pagination
  const [pageInput, setPageInput] = useState("");

  const submitPageInput = () => {
    if (!pagination) return;
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n)) {
      const clamped = Math.min(Math.max(n, 1), totalPages);
      pagination.onPageChange(clamped);
    }
    setPageInput("");
  };

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
        onClick={() => onRowClick && onRowClick(r)}
        className={`border-t hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-10px_-12px_10px_rgba(255,255,255,0.1),-1px_1px_1px_rgba(0,0,0,0.1)] hover:bg-slate-50/95 border-black/5 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`} // ADDED: Pointer cursor
      >
        {columns.map((c, index) => (
          <td 
            key={c.key} 
            className={`px-2 py-1 md:px-2 md:text-[11px] lg:text-xs lg:px-1 ${index === 0 ? "!pl-4 xl:!pl-6" : ""}`}
          >
            {typeof c.cell === "function" ? c.cell(r) : r[c.key]}
          </td>
        ))}
      </tr>
    ));
  };

  const renderCards = () => {
    if (loading) {
      return Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />);
    }

    if (!hasRows) {
      return (
        <div className="px-6 py-10 text-slate-500 text-center text-sm">
          {emptyText}
        </div>
      );
    }

    return rows.map((r) => (
      <div
        key={rowKey(r)}
        onClick={() => onRowClick && onRowClick(r)}
        className={`rounded-xl border border-black/10 bg-white shadow-sm px-4 py-3 ${
          onRowClick ? "cursor-pointer active:bg-slate-50" : ""
        }`}
      >
        {renderCard(r)}
      </div>
    ));
  };

  return (
    <div className="mx-4 md:mx-6 lg:mx-10">
    {/* Tiles */}
    <div className="flex justify-start sm:justify-start md:grid md:grid-cols-12 gap-1 sm:gap-2 md:gap-4 xl:gap-6 ">
      {tiles.map((t) => (
        <div key={t.label} className="flex-1 md:flex-none col-span-12 md:col-span-4 ">
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
      <div className="mt-4 bg-white rounded-xl border border-black/15 md:border-black/10 md:border-b-black/20 md:border-r-black/20 md:shadow-[-2px_-2px_10px_rgba(245,245,245,1),0px_0px_0_rgba(255,255,255,1),2px_2px_4px_rgba(0,0,0,0.2)] overflow-hidden">

        {/* Table Header */}
        <div className="flex gap-2 items-center justify-between py-2.5 md:py-3 border-b border-black/10 px-3 lg:px-4 xl:px-6 min-w-0">
          <h2 className="font-semibold text-[13px] lg:text-sm xl:text-lg text-slate-800 flex-shrink-0">
            {tableTitle}
          </h2>

          {(searchControl || rightControls) && (
            <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
              {searchControl && (
                <div className="min-w-0">{searchControl}</div>
              )}
              {rightControls && (
                <div className="flex items-center gap-2 flex-shrink-0">{rightControls}</div>
              )}
            </div>
          )}
        </div>

        {renderCard && (
          <div className="md:hidden flex flex-col gap-2 p-2 bg-gray-100">{renderCards()}</div>
        )}

        <div className={`overflow-x-auto touch-pan-x table-scrollbar-reset ${renderCard ? "hidden md:block" : ""}`}>
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
          <div className="flex flex-col md:flex-row items-center md:justify-between gap-2 px-3 border-t border-black/15 md:px-3 py-2 md:py-1.5 text-[11px] lg:text-xs lg:px-4 xl:px-6">
            <div className="text-slate-500 order-2 md:order-1">{rangeText}</div>

            {/* MODIFIED: pagination now renders up to 5 clickable page numbers
                instead of just the current page, while keeping the same
                button styling/sizing as before. Wraps and shrinks on mobile. */}
            <div className="flex items-center flex-wrap justify-center gap-1 order-1 md:order-2">
              <button
                className="px-1 py-1 rounded-md border border-black/20 disabled:opacity-50"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                <MdKeyboardArrowLeft className="text-[15px] md:text-xs lg:text-sm xl:text-base" />
              </button>

              {pageNumbers[0] > 1 && (
                <>
                  <button
                    className="px-2 py-1 rounded-md text-slate-600 hover:bg-gray-100"
                    onClick={() => pagination.onPageChange(1)}
                  >
                    1
                  </button>
                  {pageNumbers[0] > 2 && (
                    <span className="px-1 text-slate-400 select-none">…</span>
                  )}
                </>
              )}

              {pageNumbers.map((p) => (
                <button
                  key={p}
                  className={`px-2 py-1 rounded-md ${
                    p === pagination.page
                      ? "border border-[#4FA34E] bg-[#4FA34E]/10 font-semibold"
                      : "text-slate-400 hover:bg-gray-100"
                  }`}
                  onClick={() => pagination.onPageChange(p)}
                  disabled={p === pagination.page}
                >
                  {p}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                    <span className="px-1 text-slate-400 select-none">…</span>
                  )}
                  <button
                    className="px-2 py-1 rounded-md text-slate-600 hover:bg-gray-100"
                    onClick={() => pagination.onPageChange(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                className="px-1 py-1 rounded-md border border-black/20 disabled:opacity-50"
                disabled={pagination.page * pagination.perPage >= pagination.total}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                <MdKeyboardArrowRight className="text-[15px] md:text-xs lg:text-sm xl:text-base" />
              </button>

              {/* ADDED: input for jumping directly to a page number */}
              <div className="flex items-center gap-1 ml-1 md:ml-2 pl-1 md:pl-2 border-l border-black/10">
                <span className="text-slate-500 hidden md:inline">Go to</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  placeholder={String(pagination.page)}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitPageInput();
                  }}
                  onBlur={submitPageInput}
                  className="w-9 md:w-12 h-6 px-1 text-xs py-0 leading-none rounded-md border border-black/20 text-center focus:outline-none focus:ring-1 focus:ring-[#4FA34E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-slate-500 hidden md:inline">page</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}