import React from "react";

function FilterPill({ label }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-[#FBFFFA] px-3 py-[6px] text-xs font-semibold text-slate-700 hover:bg-white"
      onClick={() => {}}
      title={label}
    >
      {label}: <span className="text-slate-400 font-medium">All</span>
      <span className="text-slate-400">▾</span>
    </button>
  );
}

export default FilterPill;