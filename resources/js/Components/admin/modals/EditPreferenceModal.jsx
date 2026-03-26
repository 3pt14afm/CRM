import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function EditPreferenceModal({
  show,
  onClose,
  processing,
  errors,
  editingPreference,
  editForm,
  setEditForm,
  onSubmit,
}) {
  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="Edit Preference"
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Settings ID
          </label>
          <input
            className="w-full rounded-lg border border-black/10 bg-slate-100 px-3 py-2 text-sm text-slate-500 outline-none cursor-not-allowed"
            value={editForm.settings_id}
            readOnly
            disabled
            placeholder="e.g. PWX"
            autoFocus
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Settings ID cannot be changed after creation.
          </p>
          {errors.settings_id ? (
            <p className="mt-1 text-xs text-red-600">{errors.settings_id}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Settings Key
          </label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={editForm.settings_key}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, settings_key: e.target.value }))
            }
            placeholder="e.g. Retention Days"
          />
          {errors.settings_key ? (
            <p className="mt-1 text-xs text-red-600">{errors.settings_key}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Setting Value
          </label>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={editForm.setting_value}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, setting_value: e.target.value }))
            }
            placeholder="e.g. 30"
          />
          {errors.setting_value ? (
            <p className="mt-1 text-xs text-red-600">{errors.setting_value}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Entity Attribute
          </label>
          <select
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={editForm.entity_attribute}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, entity_attribute: e.target.value }))
            }
          >
            <option value="">Select entity attribute</option>
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
          {errors.entity_attribute ? (
            <p className="mt-1 text-xs text-red-600">
              {errors.entity_attribute}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-black/10 bg-[#FBFFFA] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800">Active Status</span>
              <span className="text-xs text-slate-500">
                Toggle whether this preference is active or inactive.
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setEditForm((p) => ({ ...p, is_active: !Boolean(p.is_active) }))
              }
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                editForm.is_active ? "bg-[#289800]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  editForm.is_active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="mt-2">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                editForm.is_active
                  ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                  : "bg-red-100 text-red-600 border border-red-200"
              }`}
            >
              {editForm.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#289800] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
            disabled={processing || !editForm.settings_id.trim() || !editForm.settings_key.trim()}
          >
            {processing ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}