import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdExpandMore } from "react-icons/md";

export default function ScrollableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  showSelected = false, // Set to true for forms, false for filters
  isSearchable = false, // Set to true to show a search box in the dropdown
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
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
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const hasValue = value !== "" && value !== null && value !== undefined;
  const selectedOption = options.find((opt) => String(opt.id) === String(value));
  const displayText = showSelected && selectedOption ? selectedOption.name : placeholder;

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !query) return options;
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query, isSearchable]);

  return (
    <div className="relative">
      {label && (
        <label className="mb-1 block text-[11px] md:text-xs font-semibold text-slate-600">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={`flex w-full items-center justify-between h-7 md:h-9 px-2 md:px-3 py-0 border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-0 transition-[border-color,box-shadow] duration-150 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
          open
            ? "border-[#4FA34E]"
            : hasValue && !showSelected
            ? "border-[#289800] text-[#289800] font-medium"
            : "border-gray-200 text-slate-700"
        } ${className}`}
      >
        <span className={`truncate pr-2 text-[11px] md:text-xs ${showSelected && selectedOption ? "text-slate-900 font-normal" : ""}`}>
          {displayText}
        </span>
        <MdExpandMore
          size={16}
          className={`flex-shrink-0 transition-transform duration-200 ${
            hasValue && !showSelected ? "text-[#289800]" : "text-slate-400"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              minWidth: Math.max(coords.width, 100),
              zIndex: 10000,
            }}
            className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            {isSearchable && (
              <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-2 py-1 text-[11px] md:text-xs border border-slate-200 rounded-md outline-none focus:ring-0 focus:border-[#4FA34E]"
                />
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-2 md:px-3 py-2 text-[11px] md:text-xs text-slate-500">No options found</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(String(opt.id));
                    setOpen(false);
                  }}
                  className={`block w-full px-2 md:px-3 py-1.5 md:py-2 text-left text-[11px] md:text-xs transition-colors hover:bg-[#E9F7E7] hover:text-[#2DA300] ${
                    String(opt.id) === String(value)
                      ? "bg-[#B5EBA2]/40 font-medium text-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  {opt.name}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}