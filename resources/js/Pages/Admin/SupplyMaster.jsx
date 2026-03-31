import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewSupplyModal from "@/Components/admin/modals/NewSupplyModal";
import EditSupplyModal from "@/Components/admin/modals/EditSupplyModal";
import { MdEdit } from "react-icons/md";
import { BsBoxSeamFill } from "react-icons/bs";

function SupplyMaster({ stats, supplies }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  const [createForm, setCreateForm] = useState({
    item_code: "",
    category: "",
    print_type: "",
    supply_name: "",
    yield: "",
    unit_cost: "",
    selling_price: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingSupply, setEditingSupply] = useState(null);

  const [editForm, setEditForm] = useState({
    item_code: "",
    category: "",
    print_type: "",
    supply_name: "",
    yield: "",
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

  const supplyRows = useMemo(() => {
    const raw = supplies?.data ?? supplies ?? stats?.supplies ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [supplies, stats]);

  const isSupplyActive = (supply) => {
    if (typeof supply?.status === "string") return supply.status === "Active";
    return true;
  };

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "—";

    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const openCreateModal = () => {
    setCreateErrors({});
    setCreateProcessing(false);
    setCreateForm({
      item_code: "",
      category: "",
      print_type: "",
      supply_name: "",
      yield: "",
      unit_cost: "",
      selling_price: "",
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createProcessing) return;
    setShowCreateModal(false);
  };

  const openEditModal = (supply) => {
    setEditErrors({});
    setEditProcessing(false);
    setEditingSupply(supply);

    setEditForm({
      item_code: supply?.item_code ?? "",
      category: supply?.category ?? "",
      print_type: supply?.print_type ?? "",
      supply_name: supply?.supply_name ?? "",
      yield: supply?.yield ?? "",
      unit_cost: supply?.unit_cost ?? "",
      selling_price: supply?.selling_price ?? "",
      is_active: isSupplyActive(supply),
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingSupply(null);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setCreateProcessing(true);
    setCreateErrors({});

    router.post(
      route("admin.supplies.store"),
      {
        item_code: createForm.item_code,
        category: createForm.category,
        print_type: createForm.category === "Part" ? "" : createForm.print_type,
        supply_name: createForm.supply_name,
        yield: createForm.yield || null,
        unit_cost: createForm.unit_cost,
        selling_price: createForm.selling_price,
        status: "Active",
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCreateProcessing(false);
          setShowCreateModal(false);
          router.reload({ only: ["supplies", "stats"] });
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
    if (!editingSupply?.id) return;

    setEditProcessing(true);
    setEditErrors({});

    router.put(
      route("admin.supplies.update", editingSupply.id),
      {
        item_code: editForm.item_code,
        category: editForm.category,
        print_type: editForm.category === "Part" ? "" : editForm.print_type,
        supply_name: editForm.supply_name,
        yield: editForm.yield || null,
        unit_cost: editForm.unit_cost,
        selling_price: editForm.selling_price,
        status: editForm.is_active ? "Active" : "Inactive",
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          const shouldActivate = Boolean(editForm.is_active);
          const currentlyActive = isSupplyActive(editingSupply);

          if (shouldActivate !== currentlyActive) {
            const toggleRoute = shouldActivate
              ? route("admin.supplies.activate", editingSupply.id)
              : route("admin.supplies.deactivate", editingSupply.id);

            router.patch(
              toggleRoute,
              {},
              {
                preserveScroll: true,
                onSuccess: () => {
                  router.reload({ only: ["supplies", "stats"] });
                  setEditProcessing(false);
                  setShowEditModal(false);
                  setEditingSupply(null);
                },
                onError: (errs) => {
                  setEditErrors(errs || {});
                  setEditProcessing(false);
                },
              }
            );
          } else {
            router.reload({ only: ["supplies", "stats"] });
            setEditProcessing(false);
            setShowEditModal(false);
            setEditingSupply(null);
          }
        },
        onError: (errs) => {
          setEditErrors(errs || {});
          setEditProcessing(false);
        },
      }
    );
  };

  const supplyColumns = useMemo(
    () => [
      {
        key: "item_code",
        header: "ITEM CODE",
        cell: (r) => r.item_code ?? "—",
      },
      {
        key: "category",
        header: "CATEGORY",
        cell: (r) => r.category ?? "—",
      },
      {
        key: "print_type",
        header: <div className="text-center w-full">COLOR / MONO</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm xl:text-base">
              {r.print_type || "—"}
            </span>
          </div>
        ),
      },
      {
        key: "supply_name",
        header: <div className="text-center w-full">SUPPLY NAME</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm xl:text-base">
              {r.supply_name ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "yield",
        header: <div className="text-center w-full">YIELD</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm xl:text-base">
              {r.yield ?? "—"}
            </span>
          </div>
        ),
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
          const isActive = isSupplyActive(r);

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
      route("admin.supply-master.index"),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const supplyPagination =
    supplies && typeof supplies.current_page === "number"
      ? {
          page: supplies.current_page,
          perPage: supplies.per_page ?? 10,
          total: supplies.total ?? supplyRows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="Supply Master" />

      <NewSupplyModal
        show={showCreateModal}
        onClose={closeCreateModal}
        processing={createProcessing}
        errors={createErrors}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={submitCreate}
      />

      <EditSupplyModal
        show={showEditModal}
        onClose={closeEditModal}
        processing={editProcessing}
        errors={editErrors}
        editingSupply={editingSupply}
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
                  Supply Master
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage consumables and parts across the system.
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
                    + New Supply
                  </button>
                </div>
              </div>
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

export default SupplyMaster;
SupplyMaster.layout = (page) => <AuthenticatedLayout children={page} />;