import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import PrinterSuppliesDrawer from "@/Components/admin/PrinterSuppliesDrawer";

function PrinterSupplies({ stats, printerModels, supplies = [] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [linkedSupplies, setLinkedSupplies] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const printerRows = useMemo(() => {
    const raw = printerModels?.data ?? printerModels ?? stats?.printer_models ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [printerModels, stats]);

  const isPrinterActive = (printer) => {
    if (typeof printer?.status === "string") return printer.status === "Active";
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
    setDrawerLoading(true);

    try {
      const response = await fetch(
        route("admin.printer-models.supplies.index", printerId),
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();
      setLinkedSupplies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load printer supplies:", error);
      setLinkedSupplies([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  const openDrawer = async (printer) => {
    setSelectedPrinter(printer);
    setDrawerOpen(true);
    await fetchPrinterSupplies(printer.id);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedPrinter(null);
    setLinkedSupplies([]);
  };

  const refreshDrawerData = async () => {
    if (!selectedPrinter?.id) return;

    await fetchPrinterSupplies(selectedPrinter.id);

    router.reload({
      only: ["printerModels", "stats"],
      preserveScroll: true,
      preserveState: true,
    });
  };

  const printerColumns = useMemo(
    () => [
      {
        key: "printer_name",
        header: "PRINTER NAME",
        cell: (r) => r.printer_name ?? "—",
      },
      {
        key: "unit_cost",
        header: <div className="text-center w-full">UNIT COST</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm xl:text-base">
              {formatMoney(r.unit_cost)}
            </span>
          </div>
        ),
      },
      {
        key: "selling_price",
        header: <div className="text-center w-full">SELLING PRICE</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm xl:text-base">
              {formatMoney(r.selling_price)}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        header: <div className="text-center w-full">STATUS</div>,
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
        header: <div className="text-center w-full">LINKED SUPPLIES</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm xl:text-base">
              {r.linked_supplies_count ?? 0}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <button
              type="button"
              className="rounded-lg bg-[#289800] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-95"
              onClick={() => openDrawer(r)}
            >
              Manage Supplies
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
    printerModels && typeof printerModels.current_page === "number"
      ? {
          page: printerModels.current_page,
          perPage: printerModels.per_page ?? 10,
          total: printerModels.total ?? printerRows.length,
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
                  Printer Supplies
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage which supplies belong to each printer.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-slate-500">{formattedDate}</span>
              </div>
            </div>

            <div className="-mt-2 -mx-4 md:-mx-6 lg:-mx-10 xl:-mx-14">
              <ProjectListSection
                tiles={[]}
                tableTitle="Printers"
                columns={printerColumns}
                rows={printerRows}
                rowKey={(r, i) => String(r.id ?? i)}
                pagination={printerPagination}
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end" />
        </div>
      </div>

      <PrinterSuppliesDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        printer={selectedPrinter}
        linkedSupplies={linkedSupplies}
        supplies={supplies}
        drawerLoading={drawerLoading}
        onRefresh={refreshDrawerData}
      />
    </>
  );
}

export default PrinterSupplies;
PrinterSupplies.layout = (page) => <AuthenticatedLayout children={page} />;