import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewPositionModal from "@/Components/admin/modals/NewPositionModal";
import EditPositionModal from "@/Components/admin/modals/EditPositionModal";
import { MdEdit } from "react-icons/md";

function PositionMaster({ stats, positions }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    department: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingPosition, setEditingPosition] = useState(null);

  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    department: "",
    is_active: true,
  });

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const positionRows = useMemo(() => {
    const raw = positions?.data ?? positions ?? stats?.positions ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [positions, stats]);

  const isPositionActive = (position) => {
    if (typeof position?.is_active === "boolean") return position.is_active;
    if (typeof position?.status === "string") return position.status === "Active";
    return true;
  };

  const openCreateModal = () => {
    setCreateErrors({});
    setCreateProcessing(false);
    setCreateForm({
      code: "",
      name: "",
      department: "",
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createProcessing) return;
    setShowCreateModal(false);
  };

  const openEditModal = (position) => {
    setEditErrors({});
    setEditProcessing(false);
    setEditingPosition(position);

    setEditForm({
      code: position?.code ?? "",
      name: position?.name ?? "",
      department: position?.department ?? "",
      is_active: isPositionActive(position),
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingPosition(null);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setCreateProcessing(true);
    setCreateErrors({});

    router.post(
      route("admin.positions.store"),
      {
        code: createForm.code,
        name: createForm.name,
        department: createForm.department,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCreateProcessing(false);
          setShowCreateModal(false);
          router.reload({ only: ["positions", "stats"] });
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
    if (!editingPosition?.id) return;

    setEditProcessing(true);
    setEditErrors({});

    router.put(
      route("admin.positions.update", editingPosition.id),
      {
        code: editForm.code,
        name: editForm.name,
        department: editForm.department,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          const shouldActivate = Boolean(editForm.is_active);
          const currentlyActive = isPositionActive(editingPosition);

          if (shouldActivate !== currentlyActive) {
            const toggleRoute = shouldActivate
              ? route("admin.positions.activate", editingPosition.id)
              : route("admin.positions.deactivate", editingPosition.id);

            router.patch(
              toggleRoute,
              {},
              {
                preserveScroll: true,
                onSuccess: () => {
                  router.reload({ only: ["positions", "stats"] });
                  setEditProcessing(false);
                  setShowEditModal(false);
                  setEditingPosition(null);
                },
                onError: (errs) => {
                  setEditErrors(errs || {});
                  setEditProcessing(false);
                },
              }
            );
          } else {
            router.reload({ only: ["positions", "stats"] });
            setEditProcessing(false);
            setShowEditModal(false);
            setEditingPosition(null);
          }
        },
        onError: (errs) => {
          setEditErrors(errs || {});
          setEditProcessing(false);
        },
        onFinish: () => {},
      }
    );
  };

  const positionColumns = useMemo(
    () => [
      {
        key: "code",
        header: "POSITION CODE",
        cell: (r) => r.code ?? "—",
      },
      {
        key: "name",
        header: "POSITION NAME",
        cell: (r) => r.name ?? "—",
      },
      {
        key: "department",
        header: <div className="text-center w-full">DEPARTMENT</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm xl:text-base">{r.department ?? "—"}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: <div className="text-center w-full">STATUS</div>,
        cell: (r) => {
          const isActive = isPositionActive(r);

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
      route("admin.position-master.index"),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const positionPagination =
    positions && typeof positions.current_page === "number"
      ? {
          page: positions.current_page,
          perPage: positions.per_page ?? 10,
          total: positions.total ?? positionRows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="Position Master" />

      <NewPositionModal
        show={showCreateModal}
        onClose={closeCreateModal}
        processing={createProcessing}
        errors={createErrors}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={submitCreate}
      />

      <EditPositionModal
        show={showEditModal}
        onClose={closeEditModal}
        processing={editProcessing}
        errors={editErrors}
        editingPosition={editingPosition}
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
                  Position Master
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage company positions across the system.
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
                    + New Position
                  </button>
                </div>
              </div>
            </div>

            <div className="-mt-2 -mx-4 md:-mx-6 lg:-mx-10 xl:-mx-14">
              <ProjectListSection
                tiles={[]}
                tableTitle="Positions"
                columns={positionColumns}
                rows={positionRows}
                rowKey={(r, i) => String(r.id ?? i)}
                pagination={positionPagination}
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

export default PositionMaster;
PositionMaster.layout = (page) => <AuthenticatedLayout children={page} />;