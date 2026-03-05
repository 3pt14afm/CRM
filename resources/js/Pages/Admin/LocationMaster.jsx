// resources/js/Pages/Admin/LocationMaster.jsx
import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import CreateLocationModal from "@/Components/admin/modals/NewLocationModal";
import Modal from "@/Components/Modal";
import { IoCloseOutline } from "react-icons/io5";
import { MdEdit } from "react-icons/md";

function LocationMaster({ stats, locations }) {
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

  const locationColumns = useMemo(
    () => [
      { key: "name", header: "LOCATION NAME", cell: (r) => r.name ?? "—" },
      { 
        key: "code", 
        header: <div className="text-center w-full">CODE</div>, 
        cell: (r) => (
            <div className="w-full flex justify-center items-center">
                <span className="text-[11px] lg:text-sm capitalize">{r.code ?? "—"}</span>
            </div>
        ),
      },
      {
        key: "status",
        header: <div className="text-center w-full">STATUS</div>,
        cell: (r) => {
            const isActive = r.status === "Active" || r.is_active === true || r.active === true;

            return (
            <div className="w-full flex justify-center items-center">
                <span
                className={`
                    px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wider
                    ${
                    isActive
                        ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
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
        cell: () => (
            <div className="w-full flex justify-center items-center">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                        title="Edit"
                        onClick={() => {}}
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

  // ─────────────────────────────────────────
  // NEW: Create Location Modal
  // ─────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
  });

  const openCreateModal = () => {
    setCreateErrors({});
    setCreateProcessing(false);
    setCreateForm({ name: "", code: "" });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createProcessing) return;
    setShowCreateModal(false);
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
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCreateProcessing(false);
          setShowCreateModal(false);

          // refresh list + stats
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

  return (
    <>
      <Head title="Location Master" />

      {/* CREATE LOCATION MODAL */}
      <CreateLocationModal
        show={showCreateModal}
        onClose={closeCreateModal}
        processing={createProcessing}
        errors={createErrors}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={submitCreate}
      />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-10 pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">Location Master</h1>
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
                pagination={null}
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