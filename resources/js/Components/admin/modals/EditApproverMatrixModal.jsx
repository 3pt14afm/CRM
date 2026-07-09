import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function ScrollableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select user",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
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
      <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
        {label}
      </label>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 10000,
            }}
            className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-xs sm:text-sm text-slate-400 hover:bg-slate-50"
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(String(opt.id));
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-slate-50 ${
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

export default function EditApproverMatrixModal({
  show,
  onClose,
  processing,
  form,
  setForm,
  onSubmit,
  editingMatrix,
  users = [],
}) {
  if (!show) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <form onSubmit={onSubmit}>
          <div className="flex items-center justify-between border-b px-4 sm:px-6 py-4">
            <div>
              <h2 className="text-md sm:text-lg font-semibold text-slate-900">
                Edit Approver Matrix
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {editingMatrix?.location_name && editingMatrix?.dept_name
                  ? `${editingMatrix.location_name} - ${editingMatrix.dept_name}`
                  : "Update approver routing details."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="rounded-md px-3 py-1 text-xs sm:text-sm text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <div className="max-h-[78vh] overflow-y-auto px-4 sm:px-6 py-5">
            <div className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location_name ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 sm:py-2 text-xs sm:text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Department
                </label>
                <input
                  type="text"
                  value={form.dept_name ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 sm:py-2 text-xs sm:text-sm text-slate-700"
                />
              </div>

              <ScrollableSelect
                label="Reviewed by"
                value={form.reviewed_by}
                onChange={(value) => updateField("reviewed_by", value)}
                options={users}
              />

              <ScrollableSelect
                label="Checked by"
                value={form.checked_by}
                onChange={(value) => updateField("checked_by", value)}
                options={users}
              />

              <ScrollableSelect
                label="Endorsed by"
                value={form.endorsed_by}
                onChange={(value) => updateField("endorsed_by", value)}
                options={users}
              />

              <ScrollableSelect
                label="Confirmed by"
                value={form.confirmed_by}
                onChange={(value) => updateField("confirmed_by", value)}
                options={users}
              />

              <ScrollableSelect
                label="Approved by"
                value={form.approved_by}
                onChange={(value) => updateField("approved_by", value)}
                options={users}
              />

              <ScrollableSelect
                label="Status"
                value={form.status}
                onChange={(value) => updateField("status", value)}
                options={[
                  { id: "Active", name: "Active" },
                  { id: "Inactive", name: "Inactive" },
                ]}
                placeholder="Select status"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="rounded-lg border border-slate-300 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="rounded-lg bg-[#289800] px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:brightness-95"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}