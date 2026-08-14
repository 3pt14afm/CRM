import React from 'react';
import { MdSearch } from 'react-icons/md';
import { BiSortUp, BiSortDown } from "react-icons/bi";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,} from "@/components/ui/tooltip";

/**
 * SearchControl
 *
 * Props:
 *   search        {string}   - current search value
 *   onSearchChange{fn}       - called with new string on input change
 *   sortOrder     {string}   - "" | "asc" | "desc"
 *   onSortToggle  {fn}       - called when sort button is clicked
 *   loading       {boolean}
 */
export default function SearchControl({
  search,
  onSearchChange,
  sortOrder = "",
  onSortToggle,
  loading = false,
}) {

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* Search input */}
      <div className="relative h-7 md:h-8 flex items-center min-w-0 flex-shrink-0">        
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`peer h-7 md:h-8 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
            outline-none focus:ring-0 focus:border-[#289800] transition-all duration-300
            
            /* Preserving your loading state logic */
            ${loading ? "opacity-60 pointer-events-none" : ""}
            
            /* Desktop styling: Always expanded (using your w-52) */
            md:w-52 md:pl-8 md:pr-3 md:text-black md:placeholder:text-slate-400 md:cursor-text
            
            /* Mobile styling: Conditional based on whether text has been entered */
            ${search 
              ? "w-40 pl-8 pr-3 text-black placeholder:text-slate-400" 
              : "w-7 px-0 text-transparent placeholder:text-transparent cursor-pointer focus:w-40 focus:pl-8 focus:pr-3 focus:text-black focus:placeholder:text-slate-400 focus:cursor-text"
            }
          `}
        />

        <MdSearch 
          className={`absolute text-slate-400 text-base pointer-events-none z-10 transition-all duration-300 
            /* Centers the icon when collapsed, moves it to the left when focused, typed in, or on desktop */
            ${search 
              ? "left-2.5 translate-x-0" 
              : "left-1/2 -translate-x-1/2 peer-focus:left-2.5 peer-focus:translate-x-0 md:left-2.5 md:translate-x-0"
            }`} 
        />
        
      </div>

      {/* Sort button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSortToggle}
              className={`h-7 w-7 md:h-8 md:w-8 flex items-center justify-center rounded-lg border bg-white transition-colors duration-150
                ${sortOrder
                  ? "border-[#4FA34E]/50 text-[#4FA34E] bg-[#4FA34E]/5"
                  : "border-gray-200 text-slate-800 hover:text-[#4FA34E] hover:border-[#4FA34E]/40 hover:bg-[#4FA34E]/5"
                }`}
            >
              {sortOrder === "asc" ? (
                <BiSortUp className="text-[17px]" />
              ) : (
                <BiSortDown className={`text-[17px] ${sortOrder === "" ? "opacity-60" : ""}`} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {sortOrder === "desc" ? "Newest first"
                : sortOrder === "asc" ? "Oldest first"
                : "Sort by date"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}