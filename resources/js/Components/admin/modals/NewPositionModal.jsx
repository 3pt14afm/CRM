import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function NewPositionModal({
  show,
  onClose,
  processing,
  errors,
  form,
  setForm,
  onSubmit,
  departments = [],
}) {
  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="New Position"
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Position Code
          </label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="e.g. SM-001"
            autoFocus
          />
          {errors.code ? <p className="mt-1 text-xs text-red-600">{errors.code}</p> : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Position Name
          </label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Sales Manager"
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Department
          </label>
          <select
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={form.department_id}
            onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          {errors.department_id ? <p className="mt-1 text-xs text-red-600">{errors.department_id}</p> : null}
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
            disabled={
              processing ||
              !form.code.trim() ||
              !form.name.trim() ||
              !String(form.department_id).trim()
            }
          >
            {processing ? "Saving..." : "Create Position"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}