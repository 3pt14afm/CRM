import React, { useEffect, useRef, useState } from "react";

function PerPageFilterPill({
  label = "Show",
  value = "10",
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    String(value).toLowerCase() === "all" ? "" : String(value ?? "10")
  );
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(
      String(value).toLowerCase() === "all" ? "" : String(value ?? "10")
    );
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel =
    String(value).toLowerCase() === "all" ? "All" : String(value ?? "10");

  const handleApply = () => {
    const trimmed = String(inputValue).trim();

    if (!trimmed) {
      setInputValue(
        String(value).toLowerCase() === "all" ? "" : String(value ?? "10")
      );
      return;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setInputValue(
        String(value).toLowerCase() === "all" ? "" : String(value ?? "10")
      );
      return;
    }

    onChange?.(String(Math.floor(parsed)));
    setOpen(false);
  };

  const handleAll = () => {
    onChange?.("all");
    setOpen(false);
  };

  const displayText = inputValue || "Enter number";
  const inputWidth = `${Math.max(displayText.length, 8)}ch`;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-[6px] text-xs font-semibold text-slate-700 hover:bg-gray-100 hover:shadow-inner disabled:cursor-not-allowed disabled:opacity-60"
        title={label}
      >
        <span>{label}:</span>
        <span className="font-medium text-black">{selectedLabel}</span>
        <span className="ml-1 text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 min-w-[100px] overflow-hidden rounded-md border border-black/10 bg-white shadow-lg">
          <div className="p-3">
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              Users to show
            </label>

            

            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                style={{ width: inputWidth }}
                className="rounded-md border border-black/10 px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#289800] focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleApply();
                  }
                }}
                placeholder="Enter number"
              />
              
              {/* <button
                type="button"
                onClick={handleApply}
                className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Apply
              </button> */}

              <button
                type="button"
                onClick={handleAll}
                className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                  String(value).toLowerCase() === "all"
                    ? "border-[#289800] bg-[#289800] text-white"
                    : "border-black/10 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerPageFilterPill;