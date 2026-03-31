import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function EditPrinterModal({
  show,
  onClose,
  processing,
  errors,
  editingPrinter,
  editForm,
  setEditForm,
  onSubmit,
}) {
  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="Edit Printer"
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Item Code
            </label>
            <input
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none  focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
              value={editForm.item_code}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, item_code: e.target.value }))
              }
              placeholder="e.g. PRN-001"
              autoFocus
            />
            {errors.item_code ? (
              <p className="mt-1 text-xs text-red-600">{errors.item_code}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Printer Name
            </label>
            <input
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
              value={editForm.printer_name}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, printer_name: e.target.value }))
              }
              placeholder="e.g. Canon IR 2425"
            />
            {errors.printer_name ? (
              <p className="mt-1 text-xs text-red-600">{errors.printer_name}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Unit Cost
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
              value={editForm.unit_cost}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, unit_cost: e.target.value }))
              }
              placeholder="e.g. 15000.00"
            />
            {errors.unit_cost ? (
              <p className="mt-1 text-xs text-red-600">{errors.unit_cost}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Selling Price
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
              value={editForm.selling_price}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, selling_price: e.target.value }))
              }
              placeholder="e.g. 18500.00"
            />
            {errors.selling_price ? (
              <p className="mt-1 text-xs text-red-600">{errors.selling_price}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-[#FBFFFA] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800">Active Status</span>
              <span className="text-xs text-slate-500">
                Toggle whether this printer is active or inactive.
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
            disabled={
              processing ||
              !editForm.item_code.trim() ||
              !editForm.printer_name.trim() ||
              !String(editForm.unit_cost).trim() ||
              !String(editForm.selling_price).trim()
            }
          >
            {processing ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}