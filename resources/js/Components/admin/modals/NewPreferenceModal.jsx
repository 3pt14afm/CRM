import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function NewPreferenceModal({
  show,
  onClose,
  processing,
  errors,
  form,
  setForm,
  onSubmit,
}) {
  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="New Preference"
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Settings ID
          </label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={form.settings_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, settings_id: e.target.value }))
            }
            placeholder="e.g. RETENTION_DAYS"
            autoFocus
          />
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
            value={form.settings_key}
            onChange={(e) =>
              setForm((p) => ({ ...p, settings_key: e.target.value }))
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
            value={form.setting_value}
            onChange={(e) =>
              setForm((p) => ({ ...p, setting_value: e.target.value }))
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
            value={form.entity_attribute}
            onChange={(e) =>
              setForm((p) => ({ ...p, entity_attribute: e.target.value }))
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
            disabled={processing || !form.settings_id.trim() || !form.settings_key.trim()}
          >
            {processing ? "Saving..." : "Create Preference"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}