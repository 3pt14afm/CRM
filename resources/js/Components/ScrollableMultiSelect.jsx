import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ScrollableMultiSelect({
  label,
  values = [],
  onChange,
  options,
  placeholder = "Search employees...",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const selectedOptions = useMemo(
    () => options.filter((opt) => values.map(String).includes(String(opt.id))),
    [options, values]
  );

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  const selectValue = (id) => {
    const strId = String(id);
    if (!values.map(String).includes(strId)) {
      onChange([...values, strId]);
    }
    setQuery("");
    setOpen(false);
  };

  const removeValue = (id, e) => {
    e.stopPropagation();
    onChange(values.filter((v) => String(v) !== String(id)));
  };

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>

      <div
        ref={wrapperRef}
        onClick={() => !disabled && inputRef.current?.focus()}
        className={`flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white py-1.5 text-sm ${
          disabled ? "cursor-not-allowed bg-slate-50" : "cursor-text"
        }`}
      >
        {selectedOptions.map((opt) => (
          <span
            key={opt.id}
            className="flex items-center gap-1 rounded-full bg-[#B5EBA2]/40 px-2 py-0.5 text-xs font-medium text-slate-900"
          >
            {opt.name}
            <span className="font-normal text-slate-500">({opt.id})</span>
            <button
              type="button"
              onClick={(e) => removeValue(opt.id, e)}
              disabled={disabled}
              className="text-slate-500 hover:text-slate-800"
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value.trimStart());
            setOpen(true);
          }}
          placeholder={selectedOptions.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 border-none bg-transparent py-0.5 text-sm outline-none focus:outline-none focus:ring-0 disabled:text-slate-400"
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 10000 }}
            className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No matches found</div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = values.map(String).includes(String(opt.id));
                return (
                    <div
                        key={opt.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectValue(opt.id)}
                        className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-xs lg:text-sm hover:bg-[#E9F7E7] hover:text-[#2DA300] ${
                            checked ? "font-medium text-slate-900" : "text-slate-700"
                        }`}
                    >
                        <span
                            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                            checked ? "border-[#289800] bg-[#289800]" : "border-slate-300 bg-white"
                            }`}
                        >
                            {checked && (
                            <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            )}
                        </span>
                        <div className="flex min-w-0 w-full items-center justify-between gap-2">
                            <span className="min-w-0 truncate">{opt.name}</span>
                            <span className="shrink-0 text-[11px] text-slate-400">{opt.id}</span>
                        </div>
                    </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}