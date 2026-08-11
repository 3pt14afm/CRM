import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ScrollableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
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

  const selected = options.find((opt) => String(opt.id) === String(value));

  return (
    <div className="relative">
      {label && (
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-left text-sm disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected ? selected.name : placeholder}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 10000 }}
            className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(String(opt.id));
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#E9F7E7] hover:text-[#2DA300] ${
                  String(opt.id) === String(value)
                    ? "bg-[#B5EBA2]/40 font-medium text-slate-900"
                    : "text-slate-700"
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}