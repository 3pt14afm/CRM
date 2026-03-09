import React from "react";

export default function EditDepartmentModal({
  show,
  onClose,
  processing,
  errors = {},
  editingDepartment,
  editForm,
  setEditForm,
  onSubmit,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-black/10">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Edit Department</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Department Code
            </label>
            <input
              type="text"
              value={editForm.code}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, code: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#289800] focus:outline-none"
              placeholder="Enter department code"
            />
            {errors.code && (
              <p className="mt-1 text-xs text-red-600">{errors.code}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Department Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#289800] focus:outline-none"
              placeholder="Enter department name"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              id="department-is-active"
              type="checkbox"
              checked={!!editForm.is_active}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-[#289800] focus:ring-[#289800]"
            />
            <label
              htmlFor="department-is-active"
              className="text-sm font-medium text-slate-700"
            >
              Active
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
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
              className="rounded-lg bg-[#289800] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              {processing ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}