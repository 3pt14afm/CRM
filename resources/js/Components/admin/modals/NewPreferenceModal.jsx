import AdminFormModal from "@/Components/admin/AdminFormModal";
import ScrollableMultiSelect from "@/Components/ScrollableMultiSelect";
import ScrollableSelect from "@/Components/ScrollableSelect";
import { LuSettings2 } from "react-icons/lu";

export default function NewPreferenceModal({
  show,
  onClose,
  processing,
  errors,
  form,
  setForm,
  onSubmit,
  users = [],
}) {
  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="New Preference"
      icon={<LuSettings2 className="text-base" />}
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Settings ID
          </label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
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
            Description
          </label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="e.g. Number of days before a record is purged"
          />
          {errors.description ? (
            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Settings Key
          </label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
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
          <ScrollableSelect
          showSelected={true}
            label="Value Type"
            value={form.value_type}
            onChange={(value) => setForm((p) => ({ ...p, value_type: value }))}
            options={[
              { id: "numeric", name: "Numeric" },
              { id: "employee_list", name: "Employee List" },
            ]}
          />
        </div>

        {form.value_type === "employee_list" ? (
          <div>
            <ScrollableMultiSelect
              label="Authorized Employees"
              values={form.employee_ids}
              onChange={(ids) =>
                setForm((p) => ({ ...p, employee_ids: ids }))
              }
              options={users}
            />
            {errors.employee_ids ? (
              <p className="mt-1 text-xs text-red-600">{errors.employee_ids}</p>
            ) : null}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Setting Value
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
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
              <ScrollableSelect
                label="Entity Attribute"
                value={form.entity_attribute}
                onChange={(value) => setForm((p) => ({ ...p, entity_attribute: value }))}
                options={[
                  { id: "day", name: "Day" },
                  { id: "week", name: "Week" },
                  { id: "month", name: "Month" },
                  { id: "year", name: "Year" },
                ]}
                placeholder="Select entity attribute"
              />
              {errors.entity_attribute ? (
                <p className="mt-1 text-xs text-red-600">
                  {errors.entity_attribute}
                </p>
              ) : null}
            </div>
          </>
        )}

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