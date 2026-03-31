import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewPreferenceModal from "@/Components/admin/modals/NewPreferenceModal";
import EditPreferenceModal from "@/Components/admin/modals/EditPreferenceModal";
import { MdEdit } from "react-icons/md";

function Preferences({ stats, preferences }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  const [createForm, setCreateForm] = useState({
    settings_id: "",
    settings_key: "",
    setting_value: "",
    entity_attribute: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingPreference, setEditingPreference] = useState(null);

  const [editForm, setEditForm] = useState({
    settings_id: "",
    settings_key: "",
    setting_value: "",
    entity_attribute: "",
    is_active: true,
  });

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const preferenceRows = useMemo(() => {
    const raw = preferences?.data ?? preferences ?? stats?.preferences ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [preferences, stats]);

  const isPreferenceActive = (preference) => {
    if (typeof preference?.is_active === "boolean") return preference.is_active;
    if (typeof preference?.status === "string") return preference.status === "Active";
    return true;
  };

  const openCreateModal = () => {
    setCreateErrors({});
    setCreateProcessing(false);
    setCreateForm({
      settings_id: "",
      settings_key: "",
      setting_value: "",
      entity_attribute: "",
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createProcessing) return;
    setShowCreateModal(false);
  };

  const openEditModal = (preference) => {
    setEditErrors({});
    setEditProcessing(false);
    setEditingPreference(preference);

    setEditForm({
      settings_id: preference?.settings_id ?? "",
      settings_key: preference?.settings_key ?? "",
      setting_value: preference?.setting_value ?? "",
      entity_attribute: preference?.entity_attribute ?? "",
      is_active: isPreferenceActive(preference),
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingPreference(null);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setCreateProcessing(true);
    setCreateErrors({});

    router.post(
      route("admin.preferences.store"),
      {
        settings_id: createForm.settings_id,
        settings_key: createForm.settings_key,
        setting_value: createForm.setting_value,
        entity_attribute: createForm.entity_attribute,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCreateProcessing(false);
          setShowCreateModal(false);
          router.reload({ only: ["preferences", "stats"] });
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
    if (!editingPreference?.id) return;

    setEditProcessing(true);
    setEditErrors({});

    router.put(
      route("admin.preferences.update", editingPreference.id),
      {
        settings_key: editForm.settings_key,
        setting_value: editForm.setting_value,
        entity_attribute: editForm.entity_attribute,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          const shouldActivate = Boolean(editForm.is_active);
          const currentlyActive = isPreferenceActive(editingPreference);

          if (shouldActivate !== currentlyActive) {
            const toggleRoute = shouldActivate
              ? route("admin.preferences.activate", editingPreference.id)
              : route("admin.preferences.deactivate", editingPreference.id);

            router.patch(
              toggleRoute,
              {},
              {
                preserveScroll: true,
                onSuccess: () => {
                  router.reload({ only: ["preferences", "stats"] });
                  setEditProcessing(false);
                  setShowEditModal(false);
                  setEditingPreference(null);
                },
                onError: (errs) => {
                  setEditErrors(errs || {});
                  setEditProcessing(false);
                },
              }
            );
          } else {
            router.reload({ only: ["preferences", "stats"] });
            setEditProcessing(false);
            setShowEditModal(false);
            setEditingPreference(null);
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

  const preferenceColumns = useMemo(
    () => [
      {
        key: "settings_id",
        header: "SETTINGS ID",
        cell: (r) => r.settings_id ?? "—",
      },
      {
        key: "settings_key",
        header: <div className="text-center w-full">SETTINGS KEY</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {r.settings_key ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "setting_value",
        header: <div className="text-center w-full">SETTING VALUE</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm">
              {r.setting_value ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "entity_attribute",
        header: <div className="text-center w-full">ENTITY ATTRIBUTE</div>,
        cell: (r) => (
          <div className="w-full flex justify-center items-center">
            <span className="text-[11px] lg:text-sm capitalize">
              {r.entity_attribute ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        header: <div className="text-center w-full">STATUS</div>,
        cell: (r) => {
          const isActive = isPreferenceActive(r);

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
      route("admin.preferences.index"),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const preferencePagination =
    preferences && typeof preferences.current_page === "number"
      ? {
          page: preferences.current_page,
          perPage: preferences.per_page ?? 10,
          total: preferences.total ?? preferenceRows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="Preferences" />

      <NewPreferenceModal
        show={showCreateModal}
        onClose={closeCreateModal}
        processing={createProcessing}
        errors={createErrors}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={submitCreate}
      />

      <EditPreferenceModal
        show={showEditModal}
        onClose={closeEditModal}
        processing={editProcessing}
        errors={editErrors}
        editingPreference={editingPreference}
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
                  Preferences
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage system preferences and configurable values.
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
                    + New Preference
                  </button>
                </div>
              </div>
            </div>

            <div className="-mt-2 -mx-4 md:-mx-6 lg:-mx-10">
              <ProjectListSection
                tiles={[]}
                tableTitle="Preferences"
                columns={preferenceColumns}
                rows={preferenceRows}
                rowKey={(r, i) => String(r.id ?? i)}
                pagination={preferencePagination}
              />
            </div>
          </div>
        </div>

        {/* <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end" />
        </div> */}
      </div>
    </>
  );
}

export default Preferences;
Preferences.layout = (page) => <AuthenticatedLayout children={page} />;