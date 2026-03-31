import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function NewPrinterSupplyModal({
  show,
  onClose,
  processing,
  errors,
  form,
  setForm,
  onSubmit,
  printerModels = [],
  supplies = [],
}) {
  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="New Printer Supply"
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Printer
          </label>
          <select
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={form.printer_model_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, printer_model_id: e.target.value }))
            }
            autoFocus
          >
            <option value="">Select printer</option>
            {printerModels.map((printer) => (
              <option key={printer.id} value={printer.id}>
                {printer.printer_name}
              </option>
            ))}
          </select>
          {errors.printer_model_id ? (
            <p className="mt-1 text-xs text-red-600">{errors.printer_model_id}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Supply
          </label>
          <select
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={form.supply_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, supply_id: e.target.value }))
            }
          >
            <option value="">Select supply</option>
            {supplies.map((supply) => (
              <option key={supply.id} value={supply.id}>
                {supply.supply_name}
              </option>
            ))}
          </select>
          {errors.supply_id ? (
            <p className="mt-1 text-xs text-red-600">{errors.supply_id}</p>
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
            disabled={
              processing ||
              !String(form.printer_model_id).trim() ||
              !String(form.supply_id).trim()
            }
          >
            {processing ? "Saving..." : "Create Link"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}