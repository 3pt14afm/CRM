import React, { useCallback, useEffect, useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewLocationModal from "@/Components/admin/modals/NewLocationModal";
import EditLocationModal from "@/Components/admin/modals/EditLocationModal";
import FilterPill from "@/Components/FilterPill";
import SortHeader from "@/Components/SortHeader";
import { MdAddLocationAlt, MdEdit, MdLocationPin } from "react-icons/md";
import { FiSearch, FiX } from "react-icons/fi";

function LocationMaster({ stats, locations, filters = {} }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    phone_number: "",
    address: "",
    delsan: "",
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
    delsan: "",
    is_active: true,
  });

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState(filters.search ?? "");

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

  // --- Filtering, Sorting, and Searching Logic ---
  const buildFilterParams = useCallback(
    (nextFilters = {}) => ({
      search: nextFilters.search ?? searchQuery.trim(),
      status: nextFilters.status ?? filters.status ?? "",
      delsan: nextFilters.delsan ?? filters.delsan ?? "",
      sortBy: nextFilters.sortBy ?? filters.sortBy ?? "",
      sortDirection: nextFilters.sortDirection ?? filters.sortDirection ?? "asc",
      page: nextFilters.page ?? 1,
    }),
    [searchQuery, filters]
  );

  const applyFilters = useCallback(
    (nextFilters = {}) => {
      router.get(
        route("admin.location-master.index"), // Update this route name if different in your web.php
        buildFilterParams(nextFilters),
        {
          preserveScroll: true,
          preserveState: true,
          replace: true,
        }
      );
    },
    [buildFilterParams]
  );

  const handleSort = useCallback(
    (columnKey) => {
      const currentSortBy = filters.sortBy ?? "";
      const currentSortDirection = filters.sortDirection ?? "asc";

      const nextDirection =
        currentSortBy === columnKey && currentSortDirection === "asc"
          ? "desc"
          : "asc";

      applyFilters({
        sortBy: columnKey,
        sortDirection: nextDirection,
        page: 1,
      });
    },
    [applyFilters, filters.sortBy, filters.sortDirection]
  );

  const handleClearAll = useCallback(() => {
    setSearchQuery("");
    applyFilters({
      search: "",
      status: "",
      delsan: "",
      sortBy: "",
      sortDirection: "asc",
      page: 1,
    });
  }, [applyFilters]);

  const hasActiveFiltersOrSort = Boolean(
    filters.status || filters.delsan || filters.search || filters.sortBy
  );

  // Debounced Search Effect
  useEffect(() => {
    const normalized = searchQuery.trim();
    if (normalized === (filters.search ?? "").trim()) {
      return;
    }

    const timeout = setTimeout(() => {
      applyFilters({ search: normalized, page: 1 });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, filters.search, applyFilters]);


  // --- Modal Handlers ---
  const openCreateModal = () => {
    setCreateErrors({});
    setCreateProcessing(false);
    setCreateForm({
      name: "",
      code: "",
      phone_number: "",
      address: "",
      delsan: "",
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
      delsan: location?.delsan ?? "",
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
        delsan: createForm.delsan,
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
        delsan: editForm.delsan,
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
        header: (
          <SortHeader
            label="LOCATION NAME"
            sortKey="name"
            sortBy={filters.sortBy}
            sortDirection={filters.sortDirection}
            onSort={handleSort}
          />
        ),
        cell: (r) => r.name ?? "—",
      },
      {
        key: "code",
        header: (
          <SortHeader
            label="CODE"
            sortKey="code"
            sortBy={filters.sortBy}
            sortDirection={filters.sortDirection}
            onSort={handleSort}
          />
        ),
        cell: (r) => (
          <div className="w-full flex items-center">
            <span className="text-[11px] lg:text-sm capitalize">
              {r.code ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "phone_number",
        header: (
          <SortHeader
            label="PHONE NUMBER"
            sortKey="phone_number"
            sortBy={filters.sortBy}
            sortDirection={filters.sortDirection}
            onSort={handleSort}
          />
        ),
        cell: (r) => (
          <div className="w-full flex items-center">
            <span className="text-[11px] lg:text-sm">
              {r.phone_number ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "delsan",
        header: (
          <SortHeader
            label="DELSAN"
            sortKey="delsan"
            sortBy={filters.sortBy}
            sortDirection={filters.sortDirection}
            onSort={handleSort}
          />
        ),
        cell: (r) => (
          <div className="w-full flex items-center">
            <span className="text-[11px] lg:text-sm uppercase">
              {r.delsan ?? "—"}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        header: (
          <SortHeader
            label="STATUS"
            sortKey="is_active"
            sortBy={filters.sortBy}
            sortDirection={filters.sortDirection}
            onSort={handleSort}
          />
        ),
        cell: (r) => {
          const isActive = isLocationActive(r);

          return (
            <div className="w-full flex items-center">
              <span
                className={`
                  px-1 rounded-full text-[9px] font-bold uppercase tracking-wider
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
        header: <div className="text-center w-full font-bold tracking-wide">ACTIONS</div>,
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
    [filters.sortBy, filters.sortDirection, handleSort]
  );

  const goToPage = (p) => {
    applyFilters({ page: p });
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

            <div className="mt-4">
              <div className="-mx-4 md:-mx-6 lg:-mx-10">
                {/* Filters Row */}
                <div className="-mb-2 mx-6 lg:mx-10 sticky top-5 z-30 rounded-lg border border-black/10 border-b-black/20 border-r-black/20 bg-white px-4 py-2 shadow-[-2px_-2px_10px_rgba(245,245,245,1),0px_0px_0_rgba(255,255,255,1),2px_2px_4px_rgba(0,0,0,0.2)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <FilterPill
                      label="Status"
                      value={filters.status ?? ""}
                      options={[
                        { label: "All", value: "" },
                        { label: "Active", value: "active" },
                        { label: "Inactive", value: "inactive" },
                      ]}
                      onChange={(value) => applyFilters({ status: value, page: 1 })}
                    />

                    <FilterPill
                      label="Delsan"
                      value={filters.delsan ?? ""}
                      options={[
                        { label: "All", value: "" },
                        { label: "DOSC", value: "dosc" },
                        { label: "DBIC", value: "dbic" },
                        { label: "DDTC", value: "ddtc" },
                      ]}
                      onChange={(value) => applyFilters({ delsan: value, page: 1 })}
                    />

                    {hasActiveFiltersOrSort && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        title="Clear all filters and sorting"
                        className="ml-auto inline-flex items-center gap-1 rounded-md bg-white px-2 py-[6px] text-xs font-medium text-blue-400 hover:bg-gray-100 hover:text-red-600 hover:shadow-inner"
                      >
                        <FiX className="text-xs" />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Section */}
                <ProjectListSection
                  tiles={[]}
                  tableTitle={
                    <div className="flex items-center gap-2">
                      <MdLocationPin className="h-4 w-4" />
                      <span>Locations</span>
                    </div>
                  }
                  columns={locationColumns}
                  rows={locationRows}
                  rowKey={(r, i) => String(r.id ?? i)}
                  pagination={locationPagination}
                  rightControls={
                    <div className="flex items-center gap-3">
                      {/* Search Input */}
                      <div className="relative">
                        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          className="w-64 rounded-lg border border-black/10 bg-white px-3 py-1 pl-9 text-[13px] text-slate-800 shadow-inner placeholder:text-slate-300 outline-none focus:ring-0 focus:border-[#289800]"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search locations..."
                        />
                      </div>
                      
                      <button
                        type="button"
                        title="Add Location"
                        aria-label="Add Location"
                        className="rounded-lg px-1 text-sm font-semibold text-[#289800] hover:brightness-95"
                        onClick={openCreateModal}
                      >
                        <MdAddLocationAlt className="w-6 h-6" />
                      </button>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LocationMaster;
LocationMaster.layout = (page) => <AuthenticatedLayout children={page} />;