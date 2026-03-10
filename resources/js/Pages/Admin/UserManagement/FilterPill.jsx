// resources/js/Pages/Admin/FilterPill.jsx

import React, { useEffect, useRef, useState } from "react";

function FilterPill({ label, value = "", options = [], onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selected = options.find((option) => String(option.value) === String(value));
  const selectedLabel = selected?.label ?? "All";

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-[#FBFFFA] px-3 py-[6px] text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        title={label}
      >
        <span>{label}:</span>
        <span className="font-medium text-slate-400">{selectedLabel}</span>
        <span className="ml-1 text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 min-w-full overflow-hidden rounded-md border border-black/10 bg-white shadow-lg">
          {options.map((option) => {
            const isActive = String(option.value) === String(value);

            return (
              <button
                key={`${label}-${option.value}`}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                  isActive ? "bg-slate-50 font-semibold text-slate-900" : "text-slate-700"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FilterPill;