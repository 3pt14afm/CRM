import React from "react";

function UserSelect({ label, value, onChange, users }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Select user</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
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
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Approver Matrix
              </h2>
              <p className="text-xs text-slate-500">
                {editingMatrix?.location_name && editingMatrix?.dept_name
                  ? `${editingMatrix.location_name} - ${editingMatrix.dept_name}`
                  : "Update approver routing details."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="rounded-md px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <div className="max-h-[78vh] overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location_name ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Department
                </label>
                <input
                  type="text"
                  value={form.dept_name ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
              </div>

              <UserSelect
                label="Reviewed by"
                value={form.reviewed_by}
                onChange={(value) => updateField("reviewed_by", value)}
                users={users}
              />

              <UserSelect
                label="Checked by"
                value={form.checked_by}
                onChange={(value) => updateField("checked_by", value)}
                users={users}
              />

              <UserSelect
                label="Endorsed by"
                value={form.endorsed_by}
                onChange={(value) => updateField("endorsed_by", value)}
                users={users}
              />

              <UserSelect
                label="Confirmed by"
                value={form.confirmed_by}
                onChange={(value) => updateField("confirmed_by", value)}
                users={users}
              />

              <UserSelect
                label="Approved by"
                value={form.approved_by}
                onChange={(value) => updateField("approved_by", value)}
                users={users}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="rounded-lg bg-[#289800] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}