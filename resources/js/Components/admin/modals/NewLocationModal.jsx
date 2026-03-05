import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function NewLocationModal({
  show,
  onClose,
  processing,
  errors,
  form,
  setForm,
  onSubmit,
}) {
  return (
    <AdminFormModal show={show} onClose={onClose} processing={processing} title="New Location" maxWidth="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Location Name</label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Manila HQ"
            autoFocus
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Code (optional)</label>
          <input
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="e.g. MNL"
          />
          {errors.code ? <p className="mt-1 text-xs text-red-600">{errors.code}</p> : null}
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
            disabled={processing || !form.name.trim()}
          >
            {processing ? "Saving..." : "Create Location"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}