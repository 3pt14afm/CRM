import React from "react";

const APPROVER_FIELDS = [
  {
    key: "director_customer_engagement_user_id",
    label: "Director - Customer Engagement",
  },
  { key: "esd_director_user_id", label: "ESD Director" },
  { key: "vp_ccto_user_id", label: "VP & CCTO" },
  { key: "president_ceo_user_id", label: "President & CEO" },
];

export default function NewSprfApproverMatrixModal({
  show,
  onClose,
  processing,
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
          <div className="px-8 pt-7 pb-4 border-b border-slate-200">
            <h2 className="text-xl font-extrabold tracking-wide text-slate-900">
              New SPRF Approver Matrix
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Set up SPRF approval routing for a location and department.
            </p>
          </div>

          <div className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {(errors?.department_id || errors?.location_id) && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.department_id ?? errors.location_id}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-700">
                  Location
                </span>
                <select
                  value={form?.location_id ?? ""}
                  onChange={(e) => updateField("location_id", e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
                  disabled={processing}
                  required
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-700">
                  Department
                </span>
                <select
                  value={form?.department_id ?? ""}
                  onChange={(e) =>
                    updateField("department_id", e.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
                  disabled={processing}
                  required
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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

                    <label className="lg:col-span-8 flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-700">
                        Approver
                      </span>
                      <select
                        value={form?.[field.key] ?? ""}
                        onChange={(e) =>
                          updateField(field.key, e.target.value)
                        }
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
                        disabled={processing}
                        required
                      >
                        <option value="">Select user</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(form?.is_active)}
                onChange={(e) => updateField("is_active", e.target.checked)}
                disabled={processing}
                className="h-4 w-4 rounded border-slate-300 text-[#289800] focus:ring-[#B5EBA2]"
              />
              <span className="text-sm font-semibold text-slate-700">
                Set as active matrix
              </span>
            </label>
            <p className="text-[11px] text-slate-500 -mt-3">
              Only one active matrix is allowed per location and department.
              If one already exists, it must be deactivated first.
            </p>
          </div>

          <div className="px-8 py-4 border-t border-slate-200 flex justify-end gap-3">
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
              {processing ? "Saving..." : "Save Matrix"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}