import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { MdClose, MdEdit, MdDelete } from "react-icons/md";
import { IoAddCircle } from "react-icons/io5";

export default function SupplyPrintersDrawer({
  open,
  onClose,
  supply,
  supplies = [],
  printers = [],
  linkedPrinters = [],
  drawerLoading = false,
  onRefresh,
  onSupplyChange,
  mode = "manage-links",
}) {
  const [selectedSupplyId, setSelectedSupplyId] = useState(
    supply?.id ? String(supply.id) : ""
  );
  const [supplyQuery, setSupplyQuery] = useState("");
  const [showSupplySuggestions, setShowSupplySuggestions] = useState(false);

  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});
  const [createForm, setCreateForm] = useState({
    printer_model_id: "",
    status: "Active",
  });
  const [printerQuery, setPrinterQuery] = useState("");
  const [showPrinterSuggestions, setShowPrinterSuggestions] = useState(false);

  const [editProcessingId, setEditProcessingId] = useState(null);

  const supplyBoxRef = useRef(null);
  const printerBoxRef = useRef(null);

  useEffect(() => {
    const selected =
      supplies.find((item) => String(item.id) === String(supply?.id)) ?? supply ?? null;

    setSelectedSupplyId(selected?.id ? String(selected.id) : "");
    setSupplyQuery(
      selected
        ? `${selected.item_code ?? "—"} - ${selected.supply_name ?? "—"}`
        : ""
    );
    setPrinterQuery("");
    setShowSupplySuggestions(false);
    setShowPrinterSuggestions(false);
    setCreateErrors({});
    setCreateForm({
      printer_model_id: "",
      status: "Active",
    });
  }, [supply?.id, open, supplies]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplyBoxRef.current && !supplyBoxRef.current.contains(event.target)) {
        setShowSupplySuggestions(false);
      }
      if (printerBoxRef.current && !printerBoxRef.current.contains(event.target)) {
        setShowPrinterSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSupply = useMemo(() => {
    return (
      supplies.find((item) => String(item.id) === String(selectedSupplyId)) ??
      supply ??
      null
    );
  }, [supplies, selectedSupplyId, supply]);

  const isPageAddMode = mode === "add-page-item";

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "—";

    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const availablePrinters = useMemo(() => {
    const linkedIds = new Set(
      linkedPrinters.map((item) => Number(item.printer_model_id))
    );

    return printers.filter((printer) => !linkedIds.has(Number(printer.id)));
  }, [printers, linkedPrinters]);

  const filteredSupplies = useMemo(() => {
    const q = supplyQuery.trim().toLowerCase();
    const source = supplies;

    if (!q) return source.slice(0, 8);

    return source
      .filter((item) => {
        const hay = `${item.item_code ?? ""} ${item.supply_name ?? ""} ${item.category ?? ""} ${item.print_type ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [supplies, supplyQuery]);

  const filteredPrinters = useMemo(() => {
    const q = printerQuery.trim().toLowerCase();

    if (!q) return availablePrinters.slice(0, 8);

    return availablePrinters
      .filter((item) => {
        const hay = `${item.item_code ?? ""} ${item.printer_name ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [availablePrinters, printerQuery]);

  const handleClose = () => {
    if (createProcessing || editProcessingId) return;

    setCreateErrors({});
    setCreateForm({
      printer_model_id: "",
      status: "Active",
    });

    onClose?.();
  };

  const selectSupply = async (nextSupply) => {
    setSelectedSupplyId(String(nextSupply.id));
    setSupplyQuery(`${nextSupply.item_code ?? "—"} - ${nextSupply.supply_name ?? "—"}`);
    setShowSupplySuggestions(false);
    setCreateForm((p) => ({ ...p, printer_model_id: "" }));
    setPrinterQuery("");
    await onSupplyChange?.(nextSupply);
  };

  const selectPrinter = (nextPrinter) => {
    setCreateForm((p) => ({ ...p, printer_model_id: String(nextPrinter.id) }));
    setPrinterQuery(`${nextPrinter.item_code ?? "—"} - ${nextPrinter.printer_name ?? "—"}`);
    setShowPrinterSuggestions(false);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    if (!selectedSupplyId) return;

    setCreateProcessing(true);
    setCreateErrors({});

    if (isPageAddMode) {
      router.post(
        route("admin.printer-supplies.managed-supplies.store"),
        {
          supply_id: selectedSupplyId,
          status: createForm.status,
        },
        {
          preserveScroll: true,
          preserveState: true,
          onSuccess: async () => {
            setCreateErrors({});
            setCreateForm({
              printer_model_id: "",
              status: "Active",
            });
            setCreateProcessing(false);
            await onRefresh?.();
            onClose?.();
          },
          onError: (errs) => {
            setCreateErrors(errs || {});
            setCreateProcessing(false);
          },
          onFinish: () => setCreateProcessing(false),
        }
      );
      return;
    }

    if (!selectedSupply?.id || !createForm.printer_model_id) {
      setCreateProcessing(false);
      return;
    }

    router.post(
      route("admin.printer-model-supplies.store"),
      {
        printer_model_id: createForm.printer_model_id,
        supply_id: selectedSupply.id,
        status: createForm.status,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: async () => {
          setCreateErrors({});
          setCreateForm({
            printer_model_id: "",
            status: "Active",
          });
          setPrinterQuery("");
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
      { status: nextStatus },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: async () => {
          setEditProcessingId(null);
          await onRefresh?.();
        },
        onError: () => setEditProcessingId(null),
        onFinish: () => setEditProcessingId(null),
      }
    );
  };

  const removeLink = (link) => {
    const confirmed = window.confirm(
      `Remove ${link.printer_name} from ${selectedSupply?.supply_name ?? "this supply"}?`
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
      onError: () => setEditProcessingId(null),
      onFinish: () => setEditProcessingId(null),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />

      <div className="absolute right-4 top-1/2 -translate-y-1/2 h-[96%] rounded-2xl w-full max-w-2xl bg-slate-50 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-darkgreen/30 shadow-md bg-[#FBFFFA] mx-5 mt-5 rounded-2xl px-6 py-5">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900">
              {isPageAddMode ? "Add Supply" : "Manage Printers"}
            </h2>
            <p className="text-sm text-slate-500">
              {selectedSupply?.supply_name ?? "Select Supply"}
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
          <div className="rounded-xl border-b border-darkgreen/30 shadow-md bg-[#FBFFFA] p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              {isPageAddMode ? "Add Supply to Printer Supplies" : "Add Printer to Supply"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-[40%_30%_30%] gap-4 mb-4">
              <div ref={supplyBoxRef} className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  Supply
                </label>
                <input
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
                  value={supplyQuery}
                  onChange={(e) => {
                    setSupplyQuery(e.target.value);
                    setSelectedSupplyId("");
                    setShowSupplySuggestions(true);
                  }}
                  onFocus={() => setShowSupplySuggestions(true)}
                  placeholder="Type item code or supply name"
                />
                {createErrors.supply_id ? (
                  <p className="mt-1 text-xs text-red-600">{createErrors.supply_id}</p>
                ) : null}

                {showSupplySuggestions && filteredSupplies.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg">
                    {filteredSupplies.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-[#FBFFFA]"
                        onClick={() => selectSupply(item)}
                      >
                        <div className="font-medium text-slate-800">
                          {item.item_code ?? "—"} - {item.supply_name ?? "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.category ?? "—"}
                          {item.print_type ? ` • ${item.print_type}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="ml-5">
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  Category
                </label>
                <div className="text-sm text-slate-900">
                  {selectedSupply?.category ?? "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  Color / Mono
                </label>
                <div className="text-sm text-slate-900">
                  {selectedSupply?.print_type ?? "—"}
                </div>
              </div>
            </div>

            <form onSubmit={submitCreate} className="space-y-4 flex justify-end">
              {!isPageAddMode ? (
                <div ref={printerBoxRef} className="relative w-full">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Printer
                  </label>
                  <input
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
                    value={printerQuery}
                    onChange={(e) => {
                      setPrinterQuery(e.target.value);
                      setCreateForm((p) => ({ ...p, printer_model_id: "" }));
                      setShowPrinterSuggestions(true);
                    }}
                    onFocus={() => setShowPrinterSuggestions(true)}
                    disabled={!selectedSupplyId}
                    placeholder="Type item code or printer name"
                  />
                  {createErrors.printer_model_id ? (
                    <p className="mt-1 text-xs text-red-600">{createErrors.printer_model_id}</p>
                  ) : null}

                  {showPrinterSuggestions && filteredPrinters.length > 0 ? (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg">
                      {filteredPrinters.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-[#FBFFFA]"
                          onClick={() => selectPrinter(item)}
                        >
                          <div className="font-medium text-slate-800">
                            {item.item_code ?? "—"} - {item.printer_name ?? "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatMoney(item.unit_cost)} / {formatMoney(item.selling_price)}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg px-5 text-sm font-semibold text-[#2DA300] hover:brightness-95 disabled:text-gray-400"
                  disabled={
                    !selectedSupplyId ||
                    createProcessing ||
                    (!isPageAddMode && !createForm.printer_model_id)
                  }
                >
                  {createProcessing ? "Saving..." : <IoAddCircle size={26} />}
                </button>
              </div>
            </form>
          </div>

          {!isPageAddMode ? (
            <div className="rounded-xl border-b border-darkgreen/30 shadow-md bg-[#FBFFFA] overflow-hidden">
              <div className="border-b border-black/10 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Linked Printers</h3>
              </div>

              {drawerLoading ? (
                <div className="px-4 py-8 text-sm text-slate-500">Loading printers...</div>
              ) : linkedPrinters.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#4cd964]/10 border-b border-darkgreen/20">
                      <tr className="text-center text-slate-500">
                        <th className="px-4 py-1 text-[11px] text-left font-semibold">ITEM CODE</th>
                        <th className="px-4 py-1 text-[11px] w-[30%] text-left font-semibold">PRINTER NAME</th>
                        <th className="px-3 py-1 text-[11px] font-semibold">UNIT COST</th>
                        <th className="px-3 py-1 text-[11px] font-semibold">SELLING PRICE</th>
                        <th className="px-3 py-1 text-[11px] font-semibold">STATUS</th>
                        <th className="px-3 py-1 text-[11px] font-semibold text-center">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedPrinters.map((link) => {
                        const processing = editProcessingId === link.id;
                        const isActive = link.status === "Active";

                        return (
                          <tr key={link.id} className="border-b border-darkgreen/20 text-center">
                            <td className="px-4 py-3 text-left">{link.item_code ?? "—"}</td>
                            <td className="px-4 py-3 text-left">{link.printer_name ?? "—"}</td>
                            <td className="px-3 py-3">{formatMoney(link.unit_cost)}</td>
                            <td className="px-3 py-3">{formatMoney(link.selling_price)}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`px-1.5 py-px rounded-full text-[8px] font-bold uppercase tracking-wider ${
                                  isActive
                                    ? "bg-[#4cd964] text-[#4cd964]"
                                    : "bg-[#ff3b30] text-[#ff3b30]"
                                }`}
                              >
                                {isActive ? "" : ""}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  className="py-1 px-1 rounded-md border border-red-200 bg-red-50 text-red-600 font-semibold disabled:opacity-60"
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
                  {selectedSupplyId ? "No linked printers yet." : "Select a supply first."}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}