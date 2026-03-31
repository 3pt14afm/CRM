import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function NewSupplyModal({
  show,
  onClose,
  processing,
  errors,
  form,
  setForm,
  onSubmit,
}) {
  const isConsumable = form.category === "Consumable";

  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="New Supply"
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Category
            </label>
            <select
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none  focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  category: e.target.value,
                  print_type: e.target.value === "Part" ? "" : p.print_type,
                }))
              }
              autoFocus
            >
              <option value="">Select category</option>
              <option value="Consumable">Consumable</option>
              <option value="Part">Part</option>
            </select>
            {errors.category ? (
              <p className="mt-1 text-xs text-red-600">{errors.category}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Color / Mono
            </label>
            <select
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none  focus:ring-0 focus:border-[#289800] placeholder:text-gray-400 disabled:bg-slate-100"
              value={form.print_type}
              onChange={(e) =>
                setForm((p) => ({ ...p, print_type: e.target.value }))
              }
              disabled={!isConsumable}
            >
              <option value="">Select type</option>
              <option value="Color">Color</option>
              <option value="Mono">Mono</option>
            </select>
            {errors.print_type ? (
              <p className="mt-1 text-xs text-red-600">{errors.print_type}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Item Code
            </label>
            <input
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none  focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
              value={form.item_code}
              onChange={(e) =>
                setForm((p) => ({ ...p, item_code: e.target.value }))
              }
              placeholder="e.g. SUP-001"
            />
            {errors.item_code ? (
              <p className="mt-1 text-xs text-red-600">{errors.item_code}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Supply Name
            </label>
            <input
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none  focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
              value={form.supply_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, supply_name: e.target.value }))
              }
              placeholder="e.g. Toner NPG-59"
            />
            {errors.supply_name ? (
              <p className="mt-1 text-xs text-red-600">{errors.supply_name}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Yield
          </label>
          <input
            type="number"
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
            value={form.yield}
            onChange={(e) => setForm((p) => ({ ...p, yield: e.target.value }))}
            placeholder="e.g. 24000"
          />
          {errors.yield ? (
            <p className="mt-1 text-xs text-red-600">{errors.yield}</p>
          ) : null}
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
              value={form.unit_cost}
              onChange={(e) =>
                setForm((p) => ({ ...p, unit_cost: e.target.value }))
              }
              placeholder="e.g. 1500.00"
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
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none  focus:ring-0 focus:border-[#289800] placeholder:text-gray-400"
              value={form.selling_price}
              onChange={(e) =>
                setForm((p) => ({ ...p, selling_price: e.target.value }))
              }
              placeholder="e.g. 1800.00"
            />
            {errors.selling_price ? (
              <p className="mt-1 text-xs text-red-600">{errors.selling_price}</p>
            ) : null}
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
              !form.item_code.trim() ||
              !form.category.trim() ||
              !form.supply_name.trim() ||
              !String(form.unit_cost).trim() ||
              !String(form.selling_price).trim()
            }
          >
            {processing ? "Saving..." : "Create Supply"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}