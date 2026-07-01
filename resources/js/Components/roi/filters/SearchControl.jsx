import React from 'react';
import { MdSearch } from 'react-icons/md';

/**
 * SearchControl
 *
 * Props:
 *   search        {string}   - current search value
 *   onSearchChange{fn}       - called with new string on input change
 *   sortOrder     {string}   - "" | "asc" | "desc"
 *   onSortToggle  {fn}       - called when sort button is clicked
 *   loading       {boolean}
 *   isRefreshing  {boolean}  - (optional) separate spinner state, falls back to `loading`
 *   onRefresh     {fn}       - called when refresh button is clicked
 */
export default function SearchControl({
  search,
  onSearchChange,
  sortOrder = "",
  onSortToggle,
  loading = false,
  isRefreshing = false,
  onRefresh,
}) {
  const spinning = loading || isRefreshing;

  return (
    <div className="flex items-center gap-2">
      {/* Search input */}
      <div className="relative h-6 flex items-center">
        <MdSearch className="absolute left-2.5 text-slate-400 text-base pointer-events-none z-10" />
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`h-8 w-full sm:w-52 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg bg-white text-black
            placeholder:text-slate-400 outline-none focus:ring-0 focus:border-[#289800]
            transition-[border-color,box-shadow] duration-150
            ${loading ? "opacity-60 pointer-events-none" : ""}`}
        />
      </div>

      {/* Sort button */}
      <button
        type="button"
        onClick={onSortToggle}
        title={
          sortOrder === "desc" ? "Newest first"
          : sortOrder === "asc" ? "Oldest first"
          : "Sort by date"
        }
        className={`h-8 w-8 flex items-center justify-center rounded-lg border bg-white transition-colors duration-150
          ${sortOrder
            ? "border-[#4FA34E]/50 text-[#4FA34E] bg-[#4FA34E]/5"
            : "border-gray-200 text-slate-400 hover:text-[#4FA34E] hover:border-[#4FA34E]/40 hover:bg-[#4FA34E]/5"
          }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15" height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {sortOrder === "asc" ? (
            <>
              <path d="M3 8h10M3 12h7M3 16h4" />
              <path d="M17 20V4m0 0-3 3m3-3 3 3" />
            </>
          ) : (
            <>
              <path d="M3 8h10M3 12h7M3 16h4" />
              <path
                d="M17 4v16m0 0-3-3m3 3 3-3"
                opacity={sortOrder === "" ? "0.35" : "1"}
              />
            </>
          )}
        </svg>
      </button>

      {/* Refresh button */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={spinning}
        title="Refresh"
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-400
          hover:text-[#4FA34E] hover:border-[#4FA34E]/40 hover:bg-[#4FA34E]/5
          disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15" height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={spinning ? "animate-spin" : ""}
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </button>
    </div>
  );
}