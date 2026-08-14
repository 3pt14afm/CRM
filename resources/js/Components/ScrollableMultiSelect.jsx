import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdExpandMore, MdClose } from "react-icons/md";

export default function ScrollableMultiSelect({
  label,
  values = [],
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  isSearchable = true,
  className = "",
  pluralLabel = "options",
  showSelected = false, // Set to true for forms, false for filters
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !query) return options;
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query, isSearchable]);

  const selectedOptions = useMemo(
    () => options.filter((opt) => values.map(String).includes(String(opt.id))),
    [options, values]
  );

  const selectValue = (id) => {
    const strId = String(id);
    if (values.map(String).includes(strId)) {
      onChange(values.filter((v) => String(v) !== strId));
    } else {
      onChange([...values, strId]);
    }
    if (!showSelected) {
      setQuery("");
    }
  };

  const handleWrapperClick = () => {
    if (disabled) return;
    if (isSearchable && !showSelected) {
      inputRef.current?.focus();
    } else {
      setOpen((prev) => !prev);
    }
  };

  const hasValues = values && values.length > 0;

  return (
    <div className="relative w-full">
      {label && (
        <label className="mb-1 block text-[11px] md:text-xs font-semibold text-slate-600">
          {label}
        </label>
      )}

      <div
        ref={wrapperRef}
        onClick={handleWrapperClick}
        className={`flex w-full items-center justify-between gap-1.5 min-h-7 md:min-h-9 px-2 md:px-3 py-1 rounded-lg border bg-white text-[11px] md:text-xs transition-[border-color,box-shadow] duration-150 ${
          open
            ? "border-[#4FA34E]"
            : hasValues && !showSelected
            ? "border-[#289800] text-[#289800] font-medium"
            : "border-gray-200 text-slate-700"
        } ${
          disabled
            ? "cursor-not-allowed bg-slate-50"
            : isSearchable && !showSelected
            ? "cursor-text"
            : "cursor-pointer hover:bg-slate-50 select-none"
        } ${className}`}
      >
        {showSelected ? (
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {selectedOptions.length === 1 ? (
              <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] md:text-[11px] font-medium text-slate-800 border border-slate-200">
                {selectedOptions[0].name}
              </span>
            ) : selectedOptions.length > 1 ? (
              <span className="flex items-center rounded bg-slate-100 pl-1.5 py-0.5 text-[10px] md:text-[11px] font-medium text-slate-800 border border-slate-200">
                {selectedOptions.length} {pluralLabel} selected
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  disabled={disabled}
                  className="text-slate-500 hover:text-red-800 hover:bg-red-100 rounded-lg p-0.5 focus:outline-none ml-1 mr-0.5"
                >
                  <MdClose />
                </button>
              </span>
            ) : (
              <span className="text-slate-400 min-w-[50px] flex-1 text-left pointer-events-none">
                {placeholder}
              </span>
            )}
          </div>
        ) : isSearchable ? (
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
            placeholder={placeholder}
            className="min-w-[50px] flex-1 border-none bg-transparent p-0 text-[11px] md:text-[13px] outline-none focus:outline-none focus:ring-0 disabled:text-slate-400 placeholder:text-inherit"
          />
        ) : (
          <span className="min-w-[50px] flex-1 truncate text-left pointer-events-none">
            {placeholder}
          </span>
        )}

        <MdExpandMore
          size={16}
          className={`flex-shrink-0 transition-transform duration-200 ${
            hasValues && !showSelected ? "text-[#289800]" : "text-slate-400"
          } ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ 
              position: "fixed", 
              top: coords.top, 
              left: coords.left, 
              minWidth: Math.max(coords.width, 180),
              zIndex: 10000 
            }}
            className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {isSearchable && showSelected && (
              <div className="p-2 border-b border-slate-100">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full px-2 py-1 text-[11px] md:text-xs border border-slate-200 rounded-md outline-none focus:ring-0 focus:border-[#4FA34E]"
                />
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] md:text-xs text-slate-500">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = values.map(String).includes(String(opt.id));
                return (
                  <div
                    key={opt.id}
                    onClick={() => selectValue(opt.id)}
                    className={`flex cursor-pointer items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-xs hover:bg-[#E9F7E7] hover:text-[#2DA300] ${
                      checked ? "font-medium text-slate-900" : "text-slate-700"
                    }`}
                  >
                    <span
                      className={`flex h-3 w-3 flex-shrink-0 items-center justify-center rounded border ${
                        checked ? "border-[#289800] bg-[#289800]" : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && (
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="flex min-w-0 w-full items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{opt.name}</span>
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