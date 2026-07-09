import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const APPROVER_FIELDS = [
  {
    key: "director_customer_engagement_user_id",
    label: "Director - Customer Engagement",
  },
  { key: "esd_director_user_id", label: "ESD Director" },
  { key: "vp_ccto_user_id", label: "VP & CCTO" },
  { key: "president_ceo_user_id", label: "President & CEO" },
];

function ScrollableSelect({
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
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2] disabled:bg-slate-50 disabled:text-slate-400"
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
            className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50"
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
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
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

export default function EditSprfApproverMatrixModal({
  show,
  onClose,
  processing,
  editingMatrix,
  form,
  setForm,
  onSubmit,
  locations = [],
  departments = [],
  users = [],
  errors = {},
}) {
  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/35"
        onClick={processing ? undefined : onClose}
      />

      <div className="relative w-[94%] max-w-4xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden">
        <form onSubmit={onSubmit}>
          <div className="px-8 pt-6 pb-4 border-b border-slate-200">
            <h2 className="sm:text-md md:text-lg lg:text-xl font-extrabold tracking-wide text-slate-900">
              Edit SPRF Approver Matrix
            </h2>
            <p className="text-sm text-slate-500">
              Update approval routing for this location and department.
            </p>
          </div>

          <div className="px-8 py-6 pb-8 space-y-5 max-h-[50vh] overflow-y-auto">
            {errors?.is_active && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.is_active}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-700">
                  Location
                </span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {editingMatrix?.location_name ?? "—"}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-700">
                  Department
                </span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {editingMatrix?.department_name ?? "—"}
                </div>
              </div>

              <label className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  checked={Boolean(form?.is_active)}
                  onChange={(e) =>
                    updateField("is_active", e.target.checked)
                  }
                  disabled={processing}
                  className="h-4 w-4 rounded border-slate-300 text-[#289800] focus:ring-[#B5EBA2]"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Active
                </span>
              </label>
            </div>

            <p className="text-[11px] text-slate-500">
              Location and department can't be changed after a matrix is
              created. Create a new matrix if a different combination is
              needed.
            </p>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-700">
                Remarks
              </span>
              <input
                type="text"
                value={form?.remarks ?? ""}
                onChange={(e) => updateField("remarks", e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
                placeholder="Optional"
                disabled={processing}
              />
            </label>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-[#efeff4] px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Approvers
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {APPROVER_FIELDS.map((field, index) => (
                  <div
                    key={field.key}
                    className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
                  >
                    <div className="lg:col-span-4">
                      <p className="text-xs text-slate-500">
                        Step {index + 1}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {field.label}
                      </p>
                    </div>

                    <div className="lg:col-span-8 flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-700">
                        Approver
                      </span>
                      <ScrollableSelect
                        value={form?.[field.key]}
                        onChange={(value) => updateField(field.key, value)}
                        options={users}
                        disabled={processing}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-8 py-3 border-t text-xs md:text-sm border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2 rounded-xl bg-darkgreen hover:bg-[#289800] text-white font-semibold shadow disabled:opacity-50"
            >
              {processing ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}