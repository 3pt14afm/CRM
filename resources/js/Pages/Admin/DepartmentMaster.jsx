import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewDepartmentModal from "@/Components/admin/modals/NewDepartmentModal";
import EditDepartmentModal from "@/Components/admin/modals/EditDepartmentModal";
import { MdEdit } from "react-icons/md";
import { BsBuildingFillAdd, BsFillBuildingFill } from "react-icons/bs";

function DepartmentMaster({ stats, departments }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingDepartment, setEditingDepartment] = useState(null);

  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    is_active: true,
  });

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const departmentRows = useMemo(() => {
    const raw = departments?.data ?? departments ?? stats?.departments ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [departments, stats]);

  const isDepartmentActive = (department) => {
    if (typeof department?.is_active === "boolean") return department.is_active;
    if (typeof department?.status === "string") return department.status === "Active";
    return true;
  };

  const openCreateModal = () => {
    setCreateErrors({});
    setCreateProcessing(false);
    setCreateForm({
      code: "",
      name: "",
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createProcessing) return;
    setShowCreateModal(false);
  };

  const openEditModal = (department) => {
    setEditErrors({});
    setEditProcessing(false);
    setEditingDepartment(department);

    setEditForm({
      code: department?.code ?? "",
      name: department?.name ?? "",
      is_active: isDepartmentActive(department),
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingDepartment(null);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setCreateProcessing(true);
    setCreateErrors({});

    router.post(
      route("admin.departments.store"),
      {
        code: createForm.code,
        name: createForm.name,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCreateProcessing(false);
          setShowCreateModal(false);
          router.reload({ only: ["departments", "stats"] });
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
    if (!editingDepartment?.id) return;

    setEditProcessing(true);
    setEditErrors({});

    router.put(
      route("admin.departments.update", editingDepartment.id),
      {
        code: editForm.code,
        name: editForm.name,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          const shouldActivate = Boolean(editForm.is_active);
          const currentlyActive = isDepartmentActive(editingDepartment);

          if (shouldActivate !== currentlyActive) {
            const toggleRoute = shouldActivate
              ? route("admin.departments.activate", editingDepartment.id)
              : route("admin.departments.deactivate", editingDepartment.id);

            router.patch(
              toggleRoute,
              {},
              {
                preserveScroll: true,
                onSuccess: () => {
                  router.reload({ only: ["departments", "stats"] });
                  setEditProcessing(false);
                  setShowEditModal(false);
                  setEditingDepartment(null);
                },
                onError: (errs) => {
                  setEditErrors(errs || {});
                  setEditProcessing(false);
                },
              }
            );
          } else {
            router.reload({ only: ["departments", "stats"] });
            setEditProcessing(false);
            setShowEditModal(false);
            setEditingDepartment(null);
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

  const departmentColumns = useMemo(
    () => [
      {
        key: "code",
        header: "DEPARTMENT CODE",
        cell: (r) => r.code ?? "—",
      },
      {
        key: "name",
        header: "DEPARTMENT NAME",
        cell: (r) => r.name ?? "—",
      },
      {
        key: "status",
        header: <div className="text-center w-full">STATUS</div>,
        cell: (r) => {
          const isActive = isDepartmentActive(r);

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

  const getInitials = (name) => (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const renderDepartmentCard = (r) => {
    const isActive = isDepartmentActive(r);
    return (
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-[#B5EBA2]/30 flex items-center justify-center text-sm font-bold text-[#195C00] shrink-0">
          {getInitials(r.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug truncate">{r.name ?? "—"}</p>
          <p className="text-xs text-slate-500 truncate">{r.code ?? "—"}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border
              ${isActive
                ? "bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20"
                : "bg-red-100 text-red-600 border-red-200"
              }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    );
  };

  const goToPage = (p) => {
    router.get(
      route("admin.department-master.index"),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const departmentPagination =
    departments && typeof departments.current_page === "number"
      ? {
          page: departments.current_page,
          perPage: departments.per_page ?? 10,
          total: departments.total ?? departmentRows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="Department Master" />

      <NewDepartmentModal
        show={showCreateModal}
        onClose={closeCreateModal}
        processing={createProcessing}
        errors={createErrors}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={submitCreate}
      />

      <EditDepartmentModal
        show={showEditModal}
        onClose={closeEditModal}
        processing={editProcessing}
        errors={editErrors}
        editingDepartment={editingDepartment}
        editForm={editForm}
        setEditForm={setEditForm}
        onSubmit={submitEdit}
      />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-4 md:mx-6 lg:mx-10 pt-4 md:pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">
                  Department Master
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage company departments across the system.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[11px] md:text-xs text-slate-500">{formattedDate}</span>
              </div>
            </div>

            <div className="-mt-2 -mx-4 md:-mx-6 lg:-mx-10">
              <ProjectListSection
                tiles={[]}
                tableTitle={
                  <div className="flex items-center gap-2">
                    <BsFillBuildingFill className="h-4 w-4" />
                    <span>Departments</span>
                  </div>
                }
                columns={departmentColumns}
                rows={departmentRows}
                rowKey={(r, i) => String(r.id ?? i)}
                pagination={departmentPagination}
                renderCard={renderDepartmentCard}
                onRowClick={openEditModal}
                rightControls={
                    <button
                      type="button"
                      title="Add Department"
                      aria-label="Add Department"
                      className="rounded-lg px-1 text-sm font-semibold text-[#289800] hover:brightness-95"
                      onClick={openCreateModal}
                    >
                      <BsBuildingFillAdd className="w-5 h-5" />
                    </button>
                  }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DepartmentMaster;
DepartmentMaster.layout = (page) => <AuthenticatedLayout children={page} />;