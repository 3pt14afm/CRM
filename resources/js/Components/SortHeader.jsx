import React from "react";
import { RiArrowDownSLine, RiArrowUpSLine, RiExpandUpDownLine } from "react-icons/ri";

/**
 * Reusable sortable column header.
 *
 * Usage:
 *   <SortHeader
 *     label="FIRST NAME"
 *     sortKey="first_name"
 *     sortBy={sortBy}
 *     sortDirection={sortDirection}
 *     onSort={onSort}
 *   />
 *
 * - `sortKey` should match whatever key your backend's sort case expects.
 * - `align="center"` groups the label + indicator together and centers them;
 *   the default pushes the indicator to the far right of the header cell.
 */
export default function SortHeader({
  label,
  sortKey,
  sortBy,
  sortDirection,
  onSort,
  align = "left",
}) {
  const active = sortBy === sortKey;
  const Indicator = active ? sortDirection === "desc" ? RiArrowDownSLine : RiArrowUpSLine : RiExpandUpDownLine;

  const justifyClass =
    align === "center" ? "justify-center text-center" : "justify-between text-left";

  return (
    <button
      type="button"
      title={`Sort by ${typeof label === 'string' ? label.toUpperCase() : 'this column'}`}
      onClick={() => onSort(sortKey)}
      className={`group flex w-full items-center font-bold tracking-wide ${justifyClass}`}
    >
      {align === "center" ? (
        <span className="flex items-center gap-1">
          <span>{label}</span>
          <span
            className={`text-[11px] leading-none ${
              active
                ? "text-[#289800]"
                : "text-slate-400 transition-colors group-hover:text-slate-500"
            }`}
          >
            <Indicator />
          </span>
        </span>
      ) : (
        <>
          <span>{label}</span>
          <span
            className={`text-[11px] leading-none ${
              active
                ? "text-[#289800]"
                : "text-slate-400 transition-colors group-hover:text-slate-500"
            }`}
          >
            <Indicator />
          </span>
        </>
      )}
    </button>
  );
}