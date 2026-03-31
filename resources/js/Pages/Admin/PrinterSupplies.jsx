import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import PrinterSuppliesDrawer from "@/Components/admin/PrinterSuppliesDrawer";
import SupplyPrintersDrawer from "@/Components/admin/SupplyPrintersDrawer";
import { MdOutlineSettings } from "react-icons/md";
import { IoAddCircle } from "react-icons/io5";
import { BsPrinterFill, BsBoxSeamFill } from "react-icons/bs";

function PrinterSupplies({
  stats,
  managedPrinters = [],
  managedSupplies = [],
  printerModels = [],
  supplies = [],
}) {
  const [printerDrawerOpen, setPrinterDrawerOpen] = useState(false);
  const [supplyDrawerOpen, setSupplyDrawerOpen] = useState(false);

  const [printerDrawerMode, setPrinterDrawerMode] = useState("manage-links");
  const [supplyDrawerMode, setSupplyDrawerMode] = useState("manage-links");

  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [selectedSupply, setSelectedSupply] = useState(null);

  const [linkedSupplies, setLinkedSupplies] = useState([]);
  const [linkedPrinters, setLinkedPrinters] = useState([]);

  const [printerDrawerLoading, setPrinterDrawerLoading] = useState(false);
  const [supplyDrawerLoading, setSupplyDrawerLoading] = useState(false);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const printerRows = useMemo(() => {
    const raw =
      managedPrinters?.data ??
      managedPrinters ??
      stats?.managed_printers ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [managedPrinters, stats]);

  const supplyRows = useMemo(() => {
    const raw =
      managedSupplies?.data ??
      managedSupplies ??
      stats?.managed_supplies ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [managedSupplies, stats]);

  const masterPrinterRows = useMemo(() => {
    const raw =
      printerModels?.data ??
      printerModels ??
      stats?.printer_models ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [printerModels, stats]);

  const masterSupplyRows = useMemo(() => {
    const raw =
      supplies?.data ??
      supplies ??
      stats?.supplies ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [supplies, stats]);

  const isPrinterActive = (printer) => {
    if (typeof printer?.status === "string") return printer.status === "Active";
    if (typeof printer?.is_active === "boolean") return printer.is_active;
    return true;
  };

  const isSupplyActive = (supply) => {
    if (typeof supply?.status === "string") return supply.status === "Active";
    if (typeof supply?.is_active === "boolean") return supply.is_active;
    return true;
  };

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "—";

    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fetchPrinterSupplies = async (printerId) => {
    if (!printerId) {
      setLinkedSupplies([]);
      return;
    }

    setPrinterDrawerLoading(true);

    try {
      const response = await fetch(
        route("admin.printer-models.supplies.index", printerId),
        {
          headers: { Accept: "application/json" },
        }
      );

      const data = await response.json();
      setLinkedSupplies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load printer supplies:", error);
      setLinkedSupplies([]);
    } finally {
      setPrinterDrawerLoading(false);
    }
  };

  const fetchSupplyPrinters = async (supplyId) => {
    if (!supplyId) {
      setLinkedPrinters([]);
      return;
    }

    setSupplyDrawerLoading(true);

    try {
      const response = await fetch(
        route("admin.supplies.printer-models.index", supplyId),
        {
          headers: { Accept: "application/json" },
        }
      );

      const data = await response.json();
      setLinkedPrinters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load supply printers:", error);
      setLinkedPrinters([]);
    } finally {
      setSupplyDrawerLoading(false);
    }
  };

  const openPrinterDrawer = async (printer = null, mode = "manage-links") => {
    setPrinterDrawerMode(mode);
    setSelectedPrinter(printer);
    setPrinterDrawerOpen(true);

    if (mode === "manage-links" && printer?.id) {
      await fetchPrinterSupplies(printer.id);
    } else {
      setLinkedSupplies([]);
    }
  };

  const openSupplyDrawer = async (supply = null, mode = "manage-links") => {
    setSupplyDrawerMode(mode);
    setSelectedSupply(supply);
    setSupplyDrawerOpen(true);

    if (mode === "manage-links" && supply?.id) {
      await fetchSupplyPrinters(supply.id);
    } else {
      setLinkedPrinters([]);
    }
  };

  const closePrinterDrawer = () => {
    setPrinterDrawerOpen(false);
    setPrinterDrawerMode("manage-links");
    setSelectedPrinter(null);
    setLinkedSupplies([]);
  };

  const closeSupplyDrawer = () => {
    setSupplyDrawerOpen(false);
    setSupplyDrawerMode("manage-links");
    setSelectedSupply(null);
    setLinkedPrinters([]);
  };

  const handlePrinterChange = async (printer) => {
    setSelectedPrinter(printer);

    if (printerDrawerMode === "manage-links") {
      await fetchPrinterSupplies(printer?.id);
    }
  };

  const handleSupplyChange = async (supply) => {
    setSelectedSupply(supply);

    if (supplyDrawerMode === "manage-links") {
      await fetchSupplyPrinters(supply?.id);
    }
  };

  const refreshPrinterDrawerData = async () => {
    if (printerDrawerMode === "manage-links" && selectedPrinter?.id) {
      await fetchPrinterSupplies(selectedPrinter.id);
    }

    router.reload({
      only: [
        "managedPrinters",
        "managedSupplies",
        "printerModels",
        "supplies",
        "stats",
      ],
      preserveScroll: true,
      preserveState: true,
    });
  };

  const refreshSupplyDrawerData = async () => {
    if (supplyDrawerMode === "manage-links" && selectedSupply?.id) {
      await fetchSupplyPrinters(selectedSupply.id);
    }

    router.reload({
      only: [
        "managedPrinters",
        "managedSupplies",
        "printerModels",
        "supplies",
        "stats",
      ],
      preserveScroll: true,
      preserveState: true,
    });
  };

  const printerColumns = useMemo(
    () => [
      {
        key: "item_code",
        header: <div className="w-full text-[11px] font-bold">ITEM CODE</div>,
        cell: (r) => r.item_code ?? "—",
      },
      {
        key: "printer_name",
        header: <div className="w-full text-[11px] font-bold">PRINTER NAME</div>,
        cell: (r) => r.printer_name ?? "—",
      },
      {
        key: "unit_cost",
        header: <div className="text-center w-full text-[11px] font-bold">UNIT COST</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {formatMoney(r.unit_cost)}
            </span>
          </div>
        ),
      },
      {
        key: "selling_price",
        header: <div className="text-center w-full text-[11px] font-bold">SELLING PRICE</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {formatMoney(r.selling_price)}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        header: <div className="text-center w-full text-[11px] font-bold">STATUS</div>,
        cell: (r) => {
          const isActive = isPrinterActive(r);

          return (
            <div className="w-full flex justify-center items-center">
              <span
                className={`px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isActive
                    ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                    : "bg-red-100 text-red-600 border border-red-200"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          );
        },
      },
      {
        key: "linked_supplies_count",
        header: <div className="text-center w-full text-[11px] font-bold">LINKED SUPPLIES</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {r.linked_supplies_count ?? 0}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: <div className="text-center w-full text-[11px] font-bold">ACTIONS</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-[#007aff] font-semibold hover:brightness-95"
              onClick={() => openPrinterDrawer(r, "manage-links")}
              title="Manage Supplies"
              aria-label="Manage Supplies"
            >
              <MdOutlineSettings className="w-5 h-5" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const supplyColumns = useMemo(
    () => [
      {
        key: "item_code",
        header: <div className="w-full text-[11px] font-bold">ITEM CODE</div>,
        cell: (r) => r.item_code ?? "—",
      },
      {
        key: "supply_name",
        header: <div className="w-full text-[11px] font-bold">SUPPLY NAME</div>,
        cell: (r) => r.supply_name ?? "—",
      },
      {
        key: "category",
        header: <div className="text-center w-full text-[11px] font-bold">CATEGORY</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {r.category ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "print_type",
        header: <div className="text-center w-full text-[11px] font-bold">COLOR / MONO</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm ">
              {r.print_type ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "yield",
        header: <div className="text-center w-full text-[11px] font-bold">YIELD</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {r.yield ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        header: <div className="text-center w-full text-[11px] font-bold">STATUS</div>,
        cell: (r) => {
          const isActive = isSupplyActive(r);

          return (
            <div className="w-full flex justify-center items-center">
              <span
                className={`px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isActive
                    ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                    : "bg-red-100 text-red-600 border border-red-200"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          );
        },
      },
      {
        key: "linked_printers_count",
        header: <div className="text-center w-full text-[11px] font-bold">LINKED PRINTERS</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {r.linked_printers_count ?? 0}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: <div className="text-center w-full text-[11px] font-bold">ACTIONS</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-[#007aff] font-semibold hover:brightness-95"
              onClick={() => openSupplyDrawer(r, "manage-links")}
              title="Manage Printers"
              aria-label="Manage Printers"
            >
              <MdOutlineSettings className="w-5 h-5" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const goToPage = (p) => {
    router.get(
      route("admin.printer-supplies.index"),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const printerPagination =
    managedPrinters && typeof managedPrinters.current_page === "number"
      ? {
          page: managedPrinters.current_page,
          perPage: managedPrinters.per_page ?? 10,
          total: managedPrinters.total ?? printerRows.length,
          onPageChange: goToPage,
        }
      : null;

  const supplyPagination =
    managedSupplies && typeof managedSupplies.current_page === "number"
      ? {
          page: managedSupplies.current_page,
          perPage: managedSupplies.per_page ?? 10,
          total: managedSupplies.total ?? supplyRows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="Printer Supplies" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-10 pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">
                  Printer Supplies Master
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage which supplies belong to each printer.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-slate-500">{formattedDate}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="-mt-2 -mx-4 md:-mx-6 lg:-mx-10">
                <ProjectListSection
                  tiles={[]}
                  tableTitle={
                    <div className="flex items-center gap-2">
                      <BsPrinterFill className="h-4 w-4" />
                      <span>Printers</span>
                    </div>
                  }
                  columns={printerColumns}
                  rows={printerRows}
                  rowKey={(r, i) => String(r.id ?? i)}
                  pagination={printerPagination}
                  rightControls={
                    <button
                      title="Add Printer"
                      aria-label="Add Printer"
                      type="button"
                      className="rounded-lg px-1 text-sm font-semibold text-[#289800] hover:brightness-95"
                      onClick={() => openPrinterDrawer(null, "add-page-item")}
                    >
                      <IoAddCircle className="w-6 h-6" />
                    </button>
                  }
                />
              </div>

              <div className="-mt-2 -mx-4 md:-mx-6 lg:-mx-10">
                <ProjectListSection
                  tiles={[]}
                  tableTitle={
                    <div className="flex items-center gap-2">
                      <BsBoxSeamFill className=" h-4 w-4" />
                      <span>Supplies</span>
                    </div>
                  }
                  columns={supplyColumns}
                  rows={supplyRows}
                  rowKey={(r, i) => String(r.id ?? i)}
                  pagination={supplyPagination}
                  rightControls={
                    <button
                      type="button"
                      title="Add Supply"
                      aria-label="Add Supply"
                      className="rounded-lg px-1 text-sm font-semibold text-[#289800] hover:brightness-95"
                      onClick={() => openSupplyDrawer(null, "add-page-item")}
                    >
                      <IoAddCircle className="w-6 h-6" />
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrinterSuppliesDrawer
        open={printerDrawerOpen}
        onClose={closePrinterDrawer}
        printer={selectedPrinter}
        printers={masterPrinterRows}
        linkedSupplies={linkedSupplies}
        supplies={masterSupplyRows}
        drawerLoading={printerDrawerLoading}
        onRefresh={refreshPrinterDrawerData}
        onPrinterChange={handlePrinterChange}
        mode={printerDrawerMode}
      />

      <SupplyPrintersDrawer
        open={supplyDrawerOpen}
        onClose={closeSupplyDrawer}
        supply={selectedSupply}
        supplies={masterSupplyRows}
        printers={masterPrinterRows}
        linkedPrinters={linkedPrinters}
        drawerLoading={supplyDrawerLoading}
        onRefresh={refreshSupplyDrawerData}
        onSupplyChange={handleSupplyChange}
        mode={supplyDrawerMode}
      />
    </>
  );
}

export default PrinterSupplies;
PrinterSupplies.layout = (page) => <AuthenticatedLayout children={page} />;