import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewPrinterModal from "@/Components/admin/modals/NewPrinterModal";
import EditPrinterModal from "@/Components/admin/modals/EditPrinterModal";
import { MdEdit } from "react-icons/md";
import { BsPrinterFill } from "react-icons/bs";

function PrinterMaster({ stats, printerModels }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  const [createForm, setCreateForm] = useState({
    item_code: "",
    printer_name: "",
    unit_cost: "",
    selling_price: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingPrinter, setEditingPrinter] = useState(null);

  const [editForm, setEditForm] = useState({
    item_code: "",
    printer_name: "",
    unit_cost: "",
    selling_price: "",
    is_active: true,
  });

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

  const openCreateModal = () => {
    setCreateErrors({});
    setCreateProcessing(false);
    setCreateForm({
      item_code: "",
      printer_name: "",
      unit_cost: "",
      selling_price: "",
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createProcessing) return;
    setShowCreateModal(false);
  };

  const openEditModal = (printer) => {
    setEditErrors({});
    setEditProcessing(false);
    setEditingPrinter(printer);

    setEditForm({
      item_code: printer?.item_code ?? "",
      printer_name: printer?.printer_name ?? "",
      unit_cost: printer?.unit_cost ?? "",
      selling_price: printer?.selling_price ?? "",
      is_active: isPrinterActive(printer),
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingPrinter(null);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setCreateProcessing(true);
    setCreateErrors({});

    router.post(
      route("admin.printer-models.store"),
      {
        item_code: createForm.item_code,
        printer_name: createForm.printer_name,
        unit_cost: createForm.unit_cost,
        selling_price: createForm.selling_price,
        status: "Active",
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCreateProcessing(false);
          setShowCreateModal(false);
          router.reload({ only: ["printerModels", "stats"] });
        },
        onError: (errs) => {
          setCreateErrors(errs || {});
          setCreateProcessing(false);
        },
        onFinish: () => setCreateProcessing(false),
      }
    );
  };

  const submitEdit = (e) => {
    e.preventDefault();
    if (!editingPrinter?.id) return;

    setEditProcessing(true);
    setEditErrors({});

    router.put(
      route("admin.printer-models.update", editingPrinter.id),
      {
        item_code: editForm.item_code,
        printer_name: editForm.printer_name,
        unit_cost: editForm.unit_cost,
        selling_price: editForm.selling_price,
        status: editForm.is_active ? "Active" : "Inactive",
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          const shouldActivate = Boolean(editForm.is_active);
          const currentlyActive = isPrinterActive(editingPrinter);

          if (shouldActivate !== currentlyActive) {
            const toggleRoute = shouldActivate
              ? route("admin.printer-models.activate", editingPrinter.id)
              : route("admin.printer-models.deactivate", editingPrinter.id);

            router.patch(
              toggleRoute,
              {},
              {
                preserveScroll: true,
                onSuccess: () => {
                  router.reload({ only: ["printerModels", "stats"] });
                  setEditProcessing(false);
                  setShowEditModal(false);
                  setEditingPrinter(null);
                },
                onError: (errs) => {
                  setEditErrors(errs || {});
                  setEditProcessing(false);
                },
              }
            );
          } else {
            router.reload({ only: ["printerModels", "stats"] });
            setEditProcessing(false);
            setShowEditModal(false);
            setEditingPrinter(null);
          }
        },
        onError: (errs) => {
          setEditErrors(errs || {});
          setEditProcessing(false);
        },
      }
    );
  };

  const printerColumns = useMemo(
    () => [
      {
        key: "item_code",
        header: "ITEM CODE",
        cell: (r) => r.item_code ?? "—",
      },
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
              {r.unit_cost != null
                ? Number(r.unit_cost).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
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
              {r.selling_price != null
                ? Number(r.selling_price).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
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
                className={`
                  px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wider
                  ${
                    isActive
                      ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                      : "bg-red-100 text-red-600 border border-red-200"
                  }
                `}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                title="Edit"
                onClick={() => openEditModal(r)}
              >
                <MdEdit className="text-[14px]" />
              </button>
            </div>
          </div>
        ),
      },
    ],
    []
  );

  const goToPage = (p) => {
    router.get(
      route("admin.printer-master.index"),
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
      <Head title="Printer Master" />

      <NewPrinterModal
        show={showCreateModal}
        onClose={closeCreateModal}
        processing={createProcessing}
        errors={createErrors}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={submitCreate}
      />

      <EditPrinterModal
        show={showEditModal}
        onClose={closeEditModal}
        processing={editProcessing}
        errors={editErrors}
        editingPrinter={editingPrinter}
        editForm={editForm}
        setEditForm={setEditForm}
        onSubmit={submitEdit}
      />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-10 pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">
                  Printer Master
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage printer records across the system.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-slate-500">{formattedDate}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-5">
                <div className="ml-auto">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#289800] px-3 py-2 text-white font-semibold shadow-sm hover:brightness-95 md:text-xs lg:text-sm"
                    onClick={openCreateModal}
                  >
                    + New Printer
                  </button>
                </div>
              </div>
            </div>

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
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end" />
        </div>
      </div>
    </>
  );
}

export default PrinterMaster;
PrinterMaster.layout = (page) => <AuthenticatedLayout children={page} />;