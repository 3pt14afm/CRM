import React, { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import { MdClose, MdEdit, MdDelete } from "react-icons/md";

export default function PrinterSuppliesDrawer({
  open,
  onClose,
  printer,
  linkedSupplies = [],
  supplies = [],
  drawerLoading = false,
  onRefresh,
}) {
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});
  const [createForm, setCreateForm] = useState({
    supply_id: "",
    status: "Active",
  });

  const [editProcessingId, setEditProcessingId] = useState(null);

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "—";

    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const availableSupplies = useMemo(() => {
    const linkedIds = new Set(linkedSupplies.map((item) => Number(item.supply_id)));

    return supplies.filter((supply) => !linkedIds.has(Number(supply.id)));
  }, [supplies, linkedSupplies]);

  const handleClose = () => {
    if (createProcessing || editProcessingId) return;

    setCreateErrors({});
    setCreateForm({
      supply_id: "",
      status: "Active",
    });

    onClose?.();
  };

  const submitCreate = (e) => {
    e.preventDefault();
    if (!printer?.id) return;

    setCreateProcessing(true);
    setCreateErrors({});

    router.post(
      route("admin.printer-model-supplies.store"),
      {
        printer_model_id: printer.id,
        supply_id: createForm.supply_id,
        status: createForm.status,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: async () => {
          setCreateErrors({});
          setCreateForm({
            supply_id: "",
            status: "Active",
          });
          setCreateProcessing(false);
          await onRefresh?.();
        },
        onError: (errs) => {
          setCreateErrors(errs || {});
          setCreateProcessing(false);
        },
        onFinish: () => setCreateProcessing(false),
      }
    );
  };

  const toggleLinkStatus = (link) => {
    setEditProcessingId(link.id);

    const nextStatus = link.status === "Active" ? "Inactive" : "Active";

    router.put(
      route("admin.printer-model-supplies.update", link.id),
      {
        status: nextStatus,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: async () => {
          setEditProcessingId(null);
          await onRefresh?.();
        },
        onError: () => {
          setEditProcessingId(null);
        },
        onFinish: () => setEditProcessingId(null),
      }
    );
  };

  const removeLink = (link) => {
    const confirmed = window.confirm(
      `Remove ${link.supply_name} from ${printer?.printer_name}?`
    );

    if (!confirmed) return;

    setEditProcessingId(link.id);

    router.delete(route("admin.printer-model-supplies.destroy", link.id), {
      preserveScroll: true,
      preserveState: true,
      onSuccess: async () => {
        setEditProcessingId(null);
        await onRefresh?.();
      },
      onError: () => {
        setEditProcessingId(null);
      },
      onFinish: () => setEditProcessingId(null),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={handleClose}
      />

      <div className="absolute right-0 top-0 h-[80%] rounded-2xl w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900">
              Manage Supplies
            </h2>
            <p className="text-sm text-slate-500">
              {printer?.printer_name ?? "—"}
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={handleClose}
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="rounded-xl border border-black/10 bg-[#FBFFFA] p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              Add Supply to Printer
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Printer Name
                </label>
                <div className="text-sm text-slate-900">
                  {printer?.printer_name ?? "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Unit Cost
                </label>
                <div className="text-sm text-slate-900">
                  {formatMoney(printer?.unit_cost)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Selling Price
                </label>
                <div className="text-sm text-slate-900">
                  {formatMoney(printer?.selling_price)}
                </div>
              </div>
            </div>

            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Supply
                </label>
                <select
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
                  value={createForm.supply_id}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, supply_id: e.target.value }))
                  }
                >
                  <option value="">Select supply</option>
                  {availableSupplies.map((supply) => (
                    <option key={supply.id} value={supply.id}>
                      {supply.supply_name}
                      {supply.category ? ` - ${supply.category}` : ""}
                      {supply.print_type ? ` - ${supply.print_type}` : ""}
                    </option>
                  ))}
                </select>
                {createErrors.supply_id ? (
                  <p className="mt-1 text-xs text-red-600">{createErrors.supply_id}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Link Status
                </label>
                <select
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {createErrors.status ? (
                  <p className="mt-1 text-xs text-red-600">{createErrors.status}</p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-[#289800] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
                  disabled={!createForm.supply_id || createProcessing}
                >
                  {createProcessing ? "Saving..." : "Add Supply"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
            <div className="border-b border-black/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Linked Supplies
              </h3>
            </div>

            {drawerLoading ? (
              <div className="px-4 py-8 text-sm text-slate-500">
                Loading supplies...
              </div>
            ) : linkedSupplies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-2 text-xs font-semibold">SUPPLY NAME</th>
                      <th className="px-4 py-2 text-xs font-semibold">CATEGORY</th>
                      <th className="px-4 py-2 text-xs font-semibold">COLOR / MONO</th>
                      <th className="px-4 py-2 text-xs font-semibold">YIELD</th>
                      <th className="px-4 py-2 text-xs font-semibold">STATUS</th>
                      <th className="px-4 py-2 text-xs font-semibold text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedSupplies.map((link) => {
                      const processing = editProcessingId === link.id;
                      const isActive = link.status === "Active";

                      return (
                        <tr key={link.id} className="border-t border-black/5">
                          <td className="px-4 py-3">{link.supply_name ?? "—"}</td>
                          <td className="px-4 py-3">{link.category ?? "—"}</td>
                          <td className="px-4 py-3">{link.print_type || "—"}</td>
                          <td className="px-4 py-3">{link.yield ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isActive
                                  ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                                  : "bg-red-100 text-red-600 border border-red-200"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                className="py-2 px-2 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold disabled:opacity-60"
                                title={isActive ? "Set Inactive" : "Set Active"}
                                onClick={() => toggleLinkStatus(link)}
                                disabled={processing}
                              >
                                <MdEdit className="text-[14px]" />
                              </button>

                              <button
                                type="button"
                                className="py-2 px-2 rounded-md border border-red-200 bg-red-50 text-red-600 font-semibold disabled:opacity-60"
                                title="Remove"
                                onClick={() => removeLink(link)}
                                disabled={processing}
                              >
                                <MdDelete className="text-[14px]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-500">
                No linked supplies yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}