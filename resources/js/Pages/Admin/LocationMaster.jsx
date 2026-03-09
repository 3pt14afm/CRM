import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewLocationModal from "@/Components/admin/modals/NewLocationModal";
import EditLocationModal from "@/Components/admin/modals/EditLocationModal";
import { MdEdit } from "react-icons/md";

function LocationMaster({ stats, locations }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    phone_number: "",
    address: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingLocation, setEditingLocation] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    phone_number: "",
    address: "",
    is_active: true,
  });

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const locationRows = useMemo(() => {
    const raw = locations?.data ?? locations ?? stats?.locations ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [locations, stats]);

  const isLocationActive = (location) => {
    if (typeof location?.is_active === "boolean") return location.is_active;
    if (typeof location?.status === "string") return location.status === "Active";
    return true;
  };

  const openCreateModal = () => {
    setCreateErrors({});
    setCreateProcessing(false);
    setCreateForm({
      name: "",
      code: "",
      phone_number: "",
      address: "",
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createProcessing) return;
    setShowCreateModal(false);
  };

  const openEditModal = (location) => {
    setEditErrors({});
    setEditProcessing(false);
    setEditingLocation(location);

    setEditForm({
      name: location?.name ?? "",
      code: location?.code ?? "",
      phone_number: location?.phone_number ?? "",
      address: location?.address ?? "",
      is_active: isLocationActive(location),
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingLocation(null);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setCreateProcessing(true);
    setCreateErrors({});

    router.post(
      route("admin.locations.store"),
      {
        name: createForm.name,
        code: createForm.code,
        phone_number: createForm.phone_number,
        address: createForm.address,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCreateProcessing(false);
          setShowCreateModal(false);
          router.reload({ only: ["locations", "stats"] });
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
    if (!editingLocation?.id) return;

    setEditProcessing(true);
    setEditErrors({});

    router.put(
      route("admin.locations.update", editingLocation.id),
      {
        name: editForm.name,
        code: editForm.code,
        phone_number: editForm.phone_number,
        address: editForm.address,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          const shouldActivate = Boolean(editForm.is_active);
          const currentlyActive = isLocationActive(editingLocation);

          if (shouldActivate !== currentlyActive) {
            const toggleRoute = shouldActivate
              ? route("admin.locations.activate", editingLocation.id)
              : route("admin.locations.deactivate", editingLocation.id);

            router.patch(
              toggleRoute,
              {},
              {
                preserveScroll: true,
                onSuccess: () => {
                  router.reload({ only: ["locations", "stats"] });
                  setEditProcessing(false);
                  setShowEditModal(false);
                  setEditingLocation(null);
                },
                onError: (errs) => {
                  setEditErrors(errs || {});
                  setEditProcessing(false);
                },
              }
            );
          } else {
            router.reload({ only: ["locations", "stats"] });
            setEditProcessing(false);
            setShowEditModal(false);
            setEditingLocation(null);
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

  const locationColumns = useMemo(
    () => [
      {
        key: "name",
        header: "LOCATION NAME",
        cell: (r) => r.name ?? "—",
      },
      {
        key: "code",
        header: <div className="text-center w-full">CODE</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm capitalize">
              {r.code ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "phone_number",
        header: <div className="text-center w-full">PHONE NUMBER</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {r.phone_number ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        header: <div className="text-center w-full">STATUS</div>,
        cell: (r) => {
          const isActive = isLocationActive(r);

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
      route("admin.location-master.index"),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const locationPagination =
    locations && typeof locations.current_page === "number"
      ? {
          page: locations.current_page,
          perPage: locations.per_page ?? 10,
          total: locations.total ?? locationRows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="Location Master" />

      <NewLocationModal
        show={showCreateModal}
        onClose={closeCreateModal}
        processing={createProcessing}
        errors={createErrors}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={submitCreate}
      />

      <EditLocationModal
        show={showEditModal}
        onClose={closeEditModal}
        processing={editProcessing}
        errors={editErrors}
        editingLocation={editingLocation}
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
                  Location Master
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage locations and related access across the system.
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
                    + New Location
                  </button>
                </div>
              </div>
            </div>

            <div className="-mt-2 -mx-4 md:-mx-6 lg:-mx-10 xl:-mx-14">
              <ProjectListSection
                tiles={[]}
                tableTitle="Locations"
                columns={locationColumns}
                rows={locationRows}
                rowKey={(r, i) => String(r.id ?? i)}
                pagination={locationPagination}
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

export default LocationMaster;
LocationMaster.layout = (page) => <AuthenticatedLayout children={page} />;