import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import NewApproverMatrixModal from "@/Components/admin/modals/NewApproverMatrixModal";
import EditApproverMatrixModal from "@/Components/admin/modals/EditApproverMatrixModal";
import NewSprfApproverMatrixModal from "@/Components/admin/modals/NewSprfApproverMatrixModal";
import EditSprfApproverMatrixModal from "@/Components/admin/modals/EditSprfApproverMatrixModal";
import FilterPill from "@/Components/FilterPill";
import SortHeader from "@/Components/SortHeader";
import { MdEdit, MdOutlinePowerSettingsNew } from "react-icons/md";
import { IoAddCircle } from "react-icons/io5";
import { FiSearch, FiX } from "react-icons/fi";

function StatusPill({ children, tone = "neutral" }) {
  const classes = {
    green: "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20",
    red: "bg-red-100 text-red-600 border border-red-200",
    amber: "bg-amber-100 text-amber-700 border border-amber-200",
    gray: "bg-slate-100 text-slate-500 border border-slate-200",
  };

  return (
    <span
      className={`px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wider ${
        classes[tone] ?? classes.gray
      }`}
    >
      {children}
    </span>
  );
}

function ApproverLine({ label, value, note, align = "center" }) {
  return (
    <div
      className={`text-[11px] lg:text-xs text-slate-700 flex items-center gap-1.5 ${
        align === "start" ? "justify-start" : "justify-center"
      }`}
    >
      <span className="font-semibold text-slate-900">{label}</span>
      <span className="text-slate-500"> — </span>
      <span>{value && String(value).trim() !== "" ? value : "Not setup"}</span>
      {note && (
        <span className="relative group inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-amber-500 cursor-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label={note}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-[180px] rounded-lg bg-slate-800 text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
            {note}
          </span>
        </span>
      )}
    </div>
  );
}
// Maps each condition label → which approver keys are required
const SPRF_CONDITIONS = [
  {
    label: "Standard Pricing",
    keys: ["director_customer_engagement_user_name", "esd_director_user_name"],
  },
  {
    label: "Value > 1M",
    keys: [
      "director_customer_engagement_user_name",
      "esd_director_user_name",
      "vp_ccto_user_name",
    ],
  },
  {
    label: "GP > 15%",
    keys: ["director_customer_engagement_user_name", "esd_director_user_name", "vp_ccto_user_name",],
  },
  {
    label: "GP ≤ 15%",
    keys: [
      "director_customer_engagement_user_name",
      "esd_director_user_name",
      "vp_ccto_user_name",
      "president_ceo_user_name",
    ],
  },
  {
    label: "Rebate Request",
    keys: [
      "director_customer_engagement_user_name",
      "esd_director_user_name",
      "vp_ccto_user_name",
      "president_ceo_user_name",
    ],
  },
];

// Friendly labels for each approver name field
const SPRF_APPROVER_LABELS = {
  director_customer_engagement_user_name: "Director - Customer Engagement",
  esd_director_user_name: "ESD Director",
  vp_ccto_user_name: "VP & CCTO",
  president_ceo_user_name: "President & CEO",
};

const EMPTY_SPRF_FORM = {
  location_id: "",
  department_id: "",
  director_customer_engagement_user_id: "",
  esd_director_user_id: "",
  vp_ccto_user_id: "",
  president_ceo_user_id: "",
  is_active: true,
  remarks: "",
};

function ApproverMatrix({ stats, matrices, sprfMatrices = [], errors = {}, filters = {} }) {
  const roiFilters = filters.roi ?? {};
  const sprfFilters = filters.sprf ?? {};
  const [activeMatrixTab, setActiveMatrixTab] = useState("ROI");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState(null);

  const [showCreateSprfModal, setShowCreateSprfModal] = useState(false);
  const [createSprfProcessing, setCreateSprfProcessing] = useState(false);
  const [sprfCreateForm, setSprfCreateForm] = useState({ ...EMPTY_SPRF_FORM });
  const [sprfCreateErrors, setSprfCreateErrors] = useState({});

  const [showEditSprfModal, setShowEditSprfModal] = useState(false);
  const [editSprfProcessing, setEditSprfProcessing] = useState(false);
  const [editingSprfMatrix, setEditingSprfMatrix] = useState(null);
  const [sprfEditForm, setSprfEditForm] = useState({ ...EMPTY_SPRF_FORM });
  const [sprfEditErrors, setSprfEditErrors] = useState({});

  // Per-row condition filter: rowKey → condition label (local UI only, not saved)
  const [sprfConditionFilter, setSprfConditionFilter] = useState({});

  const users = stats?.users ?? [];
  const locations = stats?.locations ?? [];
  const departments = stats?.departments ?? [];

  const locationFilterOptions = useMemo(
    () => [
      { label: "All", value: "" },
      ...locations.map((l) => ({ label: l.name, value: String(l.id) })),
    ],
    [locations]
  );

  const departmentFilterOptions = useMemo(
    () => [
      { label: "All", value: "" },
      ...departments.map((d) => ({ label: d.name, value: String(d.id) })),
    ],
    [departments]
  );

  const roiStatusFilterOptions = useMemo(
    () => [
      { label: "All", value: "" },
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" },
    ],
    []
  );

  const sprfStatusFilterOptions = useMemo(
    () => [
      { label: "All", value: "" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
    []
  );

  const [roiSearchQuery, setRoiSearchQuery] = useState(roiFilters.search ?? "");
  const [sprfSearchQuery, setSprfSearchQuery] = useState(sprfFilters.search ?? "");

  useEffect(() => {
    setRoiSearchQuery(roiFilters.search ?? "");
  }, [roiFilters.search]);

  useEffect(() => {
    setSprfSearchQuery(sprfFilters.search ?? "");
  }, [sprfFilters.search]);

  const applyRoiFilters = useCallback(
    (next = {}) => {
      router.get(
        route("admin.approver-matrix.index"),
        {
          roi_search: next.search ?? roiFilters.search ?? "",
          roi_location: next.location ?? roiFilters.location ?? "",
          roi_department: next.department ?? roiFilters.department ?? "",
          roi_status: next.status ?? roiFilters.status ?? "",
          roi_sortBy: next.sortBy ?? roiFilters.sortBy ?? "",
          roi_sortDirection: next.sortDirection ?? roiFilters.sortDirection ?? "asc",
          roi_page: next.page ?? 1,
          sprf_search: sprfFilters.search ?? "",
          sprf_location: sprfFilters.location ?? "",
          sprf_department: sprfFilters.department ?? "",
          sprf_status: sprfFilters.status ?? "",
          sprf_sortBy: sprfFilters.sortBy ?? "",
          sprf_sortDirection: sprfFilters.sortDirection ?? "asc",
        },
        { preserveScroll: true, preserveState: true, replace: true }
      );
    },
    [roiFilters, sprfFilters]
  );

  const applySprfFilters = useCallback(
    (next = {}) => {
      router.get(
        route("admin.approver-matrix.index"),
        {
          roi_search: roiFilters.search ?? "",
          roi_location: roiFilters.location ?? "",
          roi_department: roiFilters.department ?? "",
          roi_status: roiFilters.status ?? "",
          roi_sortBy: roiFilters.sortBy ?? "",
          roi_sortDirection: roiFilters.sortDirection ?? "asc",
          sprf_search: next.search ?? sprfFilters.search ?? "",
          sprf_location: next.location ?? sprfFilters.location ?? "",
          sprf_department: next.department ?? sprfFilters.department ?? "",
          sprf_status: next.status ?? sprfFilters.status ?? "",
          sprf_sortBy: next.sortBy ?? sprfFilters.sortBy ?? "",
          sprf_sortDirection: next.sortDirection ?? sprfFilters.sortDirection ?? "asc",
        },
        { preserveScroll: true, preserveState: true, replace: true }
      );
    },
    [roiFilters, sprfFilters]
  );

  useEffect(() => {
    const normalized = roiSearchQuery.trim();
    if (normalized === (roiFilters.search ?? "").trim()) return;

    const timeout = setTimeout(() => {
      applyRoiFilters({ search: normalized, page: 1 });
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roiSearchQuery]);

  useEffect(() => {
    const normalized = sprfSearchQuery.trim();
    if (normalized === (sprfFilters.search ?? "").trim()) return;

    const timeout = setTimeout(() => {
      applySprfFilters({ search: normalized });
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprfSearchQuery]);

  const handleRoiSort = useCallback(
    (columnKey) => {
      const nextDirection =
        (roiFilters.sortBy ?? "") === columnKey && (roiFilters.sortDirection ?? "asc") === "asc"
          ? "desc"
          : "asc";

      applyRoiFilters({ sortBy: columnKey, sortDirection: nextDirection, page: 1 });
    },
    [applyRoiFilters, roiFilters.sortBy, roiFilters.sortDirection]
  );

  const handleSprfSort = useCallback(
    (columnKey) => {
      const nextDirection =
        (sprfFilters.sortBy ?? "") === columnKey && (sprfFilters.sortDirection ?? "asc") === "asc"
          ? "desc"
          : "asc";

      applySprfFilters({ sortBy: columnKey, sortDirection: nextDirection });
    },
    [applySprfFilters, sprfFilters.sortBy, sprfFilters.sortDirection]
  );

  const [createForm, setCreateForm] = useState({
    location_id: "",
    department_id: "",
    location_name: "",
    dept_name: "",
    reviewed_by: "",
    checked_by: "",
    endorsed_by: "",
    confirmed_by: "",
    approved_by: "",
    status: "Active",
  });

  const [editForm, setEditForm] = useState({
    location_id: "",
    department_id: "",
    location_name: "",
    dept_name: "",
    reviewed_by: "",
    checked_by: "",
    endorsed_by: "",
    confirmed_by: "",
    approved_by: "",
    status: "Active",
  });

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const matrixRows = useMemo(() => {
    const raw = matrices?.data ?? matrices ?? stats?.matrices ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [matrices, stats]);

  const sprfMatrixRows = useMemo(() => {
    const raw = sprfMatrices?.data ?? sprfMatrices ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [sprfMatrices]);

  const pagination =
    matrices && typeof matrices.current_page === "number"
      ? {
          page: matrices.current_page,
          perPage: matrices.per_page ?? 10,
          total: matrices.total ?? matrixRows.length,
          lastPage: matrices.last_page ?? 1,
        }
      : null;

  const openCreateModal = () => {
    setCreateProcessing(false);
    setCreateForm({
      location_id: "",
      department_id: "",
      location_name: "",
      dept_name: "",
      reviewed_by: "",
      checked_by: "",
      endorsed_by: "",
      confirmed_by: "",
      approved_by: "",
      status: "Active",
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createProcessing) return;
    setShowCreateModal(false);
  };

  const openEditModal = (row) => {
    setEditProcessing(false);
    setEditingMatrix(row);

    setEditForm({
      location_id: row?.location_id ?? "",
      department_id: row?.department_id ?? "",
      location_name: row?.location_name ?? "",
      dept_name: row?.dept_name ?? "",
      reviewed_by: row?.reviewed_by ?? "",
      checked_by: row?.checked_by ?? "",
      endorsed_by: row?.endorsed_by ?? "",
      confirmed_by: row?.confirmed_by ?? "",
      approved_by: row?.approved_by ?? "",
      status: row?.status ?? "Active",
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingMatrix(null);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setCreateProcessing(true);

    router.post(route("admin.approver-matrix.store"), createForm, {
      preserveScroll: true,
      onSuccess: () => {
        setCreateProcessing(false);
        setShowCreateModal(false);
      },
      onError: () => {
        setCreateProcessing(false);
      },
      onFinish: () => {
        setCreateProcessing(false);
      },
    });
  };

  const submitEdit = (e) => {
    e.preventDefault();

    if (!editingMatrix?.id) return;

    setEditProcessing(true);

    router.put(route("admin.approver-matrix.update", editingMatrix.id), editForm, {
      preserveScroll: true,
      onSuccess: () => {
        setEditProcessing(false);
        setShowEditModal(false);
        setEditingMatrix(null);
      },
      onError: () => {
        setEditProcessing(false);
      },
      onFinish: () => {
        setEditProcessing(false);
      },
    });
  };

  // ─── SPRF: Create ─────────────────────────────────────────────────────────

  const openCreateSprfModal = () => {
    setCreateSprfProcessing(false);
    setSprfCreateForm({ ...EMPTY_SPRF_FORM });
    setSprfCreateErrors({});
    setShowCreateSprfModal(true);
  };

  const closeCreateSprfModal = () => {
    if (createSprfProcessing) return;
    setShowCreateSprfModal(false);
    setSprfCreateErrors({});
  };

  const submitCreateSprf = (e) => {
    e.preventDefault();
    setCreateSprfProcessing(true);
    setSprfCreateErrors({});

    router.post(route("admin.approver-matrix.sprf.store"), sprfCreateForm, {
      preserveScroll: true,
      onSuccess: () => {
        setCreateSprfProcessing(false);
        setSprfCreateErrors({});
        setShowCreateSprfModal(false);
      },
      onError: (errors) => {
        setCreateSprfProcessing(false);
        setSprfCreateErrors(errors ?? {});
      },
      onFinish: () => {
        setCreateSprfProcessing(false);
      },
    });
  };

  // ─── SPRF: Edit ───────────────────────────────────────────────────────────

  const buildSprfEditFormFromRow = (row) => ({
    location_id: row?.location_id ?? "",
    department_id: row?.department_id ?? "",
    director_customer_engagement_user_id:
      row?.director_customer_engagement_user_id ?? "",
    esd_director_user_id: row?.esd_director_user_id ?? "",
    vp_ccto_user_id: row?.vp_ccto_user_id ?? "",
    president_ceo_user_id: row?.president_ceo_user_id ?? "",
    is_active: Boolean(row?.is_active),
    remarks: row?.remarks ?? "",
  });

  const openEditSprfModal = (row) => {
    setEditSprfProcessing(false);
    setEditingSprfMatrix(row);
    setSprfEditForm(buildSprfEditFormFromRow(row));
    setSprfEditErrors({});
    setShowEditSprfModal(true);
  };

  const closeEditSprfModal = () => {
    if (editSprfProcessing) return;
    setShowEditSprfModal(false);
    setEditingSprfMatrix(null);
    setSprfEditErrors({});
  };

  const submitEditSprf = (e) => {
    e.preventDefault();

    if (!editingSprfMatrix?.id) return;

    setEditSprfProcessing(true);
    setSprfEditErrors({});

    router.put(
      route("admin.approver-matrix.sprf.update", editingSprfMatrix.id),
      sprfEditForm,
      {
        preserveScroll: true,
        onSuccess: () => {
          setEditSprfProcessing(false);
          setSprfEditErrors({});
          setShowEditSprfModal(false);
          setEditingSprfMatrix(null);
        },
        onError: (errors) => {
          setEditSprfProcessing(false);
          setSprfEditErrors(errors ?? {});
        },
        onFinish: () => {
          setEditSprfProcessing(false);
        },
      }
    );
  };

  // ─── SPRF: Activate (reuses the update endpoint, no dedicated route) ──────

  const activateSprfMatrix = (row) => {
    if (!row?.id || row?.is_active) return;

    if (
      !confirm(
        "Activate this SPRF approver matrix? Any other active matrix for the same location and department must already be deactivated."
      )
    ) {
      return;
    }

    router.put(
      route("admin.approver-matrix.sprf.update", row.id),
      { ...buildSprfEditFormFromRow(row), is_active: true },
      {
        preserveScroll: true,
        onError: (errors) => {
          alert(
            errors?.is_active ??
              "Could not activate this matrix. Please try again."
          );
        },
      }
    );
  };

  const goToPage = (p) => {
    applyRoiFilters({ page: p });
  };

  const openCreateForActiveTab = () => {
    if (activeMatrixTab === "SPRF") {
      openCreateSprfModal();
      return;
    }

    openCreateModal();
  };

  const [isRoiMobileSearchOpen, setIsRoiMobileSearchOpen] = useState(false);
  const roiSearchBoxRef = useRef(null);
  const roiSearchInputRef = useRef(null);

  useEffect(() => {
    if (isRoiMobileSearchOpen && roiSearchInputRef.current) {
      roiSearchInputRef.current.focus();
    }
  }, [isRoiMobileSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roiSearchBoxRef.current && !roiSearchBoxRef.current.contains(event.target)) {
        setIsRoiMobileSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <Head title="Approver Matrix" />

      <NewApproverMatrixModal
        show={showCreateModal}
        onClose={closeCreateModal}
        processing={createProcessing}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={submitCreate}
        users={users}
        locations={locations}
        departments={departments}
      />

      <EditApproverMatrixModal
        show={showEditModal}
        onClose={closeEditModal}
        processing={editProcessing}
        form={editForm}
        setForm={setEditForm}
        onSubmit={submitEdit}
        editingMatrix={editingMatrix}
        users={users}
      />

      <NewSprfApproverMatrixModal
        show={showCreateSprfModal}
        onClose={closeCreateSprfModal}
        processing={createSprfProcessing}
        form={sprfCreateForm}
        setForm={setSprfCreateForm}
        onSubmit={submitCreateSprf}
        locations={locations}
        departments={departments}
        users={users}
        errors={sprfCreateErrors}
      />

      <EditSprfApproverMatrixModal
        show={showEditSprfModal}
        onClose={closeEditSprfModal}
        processing={editSprfProcessing}
        editingMatrix={editingSprfMatrix}
        form={sprfEditForm}
        setForm={setSprfEditForm}
        onSubmit={submitEditSprf}
        locations={locations}
        departments={departments}
        users={users}
        errors={sprfEditErrors}
      />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-4 sm:mx-8 md:mx-10 pt-4 md:pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">
                  Approver Matrix
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  {activeMatrixTab === "ROI"
                    ? "Manage ROI approval routing per location and department."
                    : "Manage SPRF approval routing per location and department."}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-[11px] md:text-xs text-slate-500">{formattedDate}</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex rounded-full bg-[#f8f8f8] w-fit border border-[#2c2c2e10] border-b-[#2c2c2e]/15 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveMatrixTab("ROI")}
                  className={`px-8 text-sm m-0.5 mr-0 py-1 ${
                    activeMatrixTab === "ROI"
                      ? "bg-[#B5EBA2]/50 font-extrabold rounded-full text-[#289800]   "
                      : "rounded-t-xl text-slate-500"
                  }`}
                >
                  ROI
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMatrixTab("SPRF")}
                  className={`px-8 text-sm m-0.5 ml-0 py-1 ${
                    activeMatrixTab === "SPRF"
                      ? "bg-[#B5EBA2]/50 font-extrabold rounded-full text-[#289800]"
                      : "rounded-t-xl text-slate-500"
                  }`}
                >
                  SPRF
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-[#289800] hover:brightness-95 md:text-xs lg:text-sm"
                onClick={openCreateForActiveTab}
              >
                <IoAddCircle className="w-6 h-6" />
              </button>
            </div>

            {activeMatrixTab === "ROI" && (
              <div className="mt-2">
                <div className="mb-3 flex flex-wrap items-center gap-0.5 sm:gap-1 rounded-lg border border-black/10 px-2 py-[6px] bg-white">
                  <FilterPill
                    label="Status"
                    value={roiFilters.status ?? ""}
                    options={roiStatusFilterOptions}
                    onChange={(v) => applyRoiFilters({ status: v, page: 1 })}
                  />
                  <FilterPill
                    label="Location"
                    value={roiFilters.location ?? ""}
                    options={locationFilterOptions}
                    onChange={(v) => applyRoiFilters({ location: v, page: 1 })}
                  />
                  <FilterPill
                    label="Department"
                    value={roiFilters.department ?? ""}
                    options={departmentFilterOptions}
                    onChange={(v) => applyRoiFilters({ department: v, page: 1 })}
                  />

                  <div ref={roiSearchBoxRef} className="relative flex items-center justify-end ml-auto">
                    <button
                      type="button"
                      className={`p-1.5 rounded-lg border border-black/10 sm:hidden transition-colors ${
                        isRoiMobileSearchOpen
                          ? "bg-slate-100 text-slate-700"
                          : "text-slate-500 hover:text-slate-800 bg-white"
                      }`}
                      onClick={() => setIsRoiMobileSearchOpen(!isRoiMobileSearchOpen)}
                    >
                      {isRoiMobileSearchOpen ? <FiX className="h-4 w-4" /> : <FiSearch className="h-4 w-4" />}
                    </button>

                    <div
                      className={`
                        absolute right-0 top-[calc(100%+0.5rem)] z-50 md:z-0 w-64 origin-top-right rounded-xl bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/10 transition-all duration-200
                        ${isRoiMobileSearchOpen ? "scale-100 opacity-100 visible" : "scale-95 opacity-0 invisible pointer-events-none"}
                        sm:pointer-events-auto sm:visible sm:relative sm:top-0 sm:w-auto sm:scale-100 sm:opacity-100 sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none
                      `}
                    >
                      <div className="relative w-full sm:w-52 md:w-[240px]">
                        <FiSearch className="pointer-events-none absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          ref={roiSearchInputRef}
                          type="text"
                          value={roiSearchQuery}
                          onChange={(e) => setRoiSearchQuery(e.target.value)}
                          placeholder="Search location or department..."
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-0.5 sm:py-1 pl-8 sm:pl-9 text-[12px] md:text-[13px] text-slate-800 shadow-inner placeholder:text-slate-300 outline-none focus:ring-0 focus:border-[#289800]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-white shadow-md border border-black/10 overflow-hidden">
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-[#efeff4] border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-2 text-left font-bold">
                            <SortHeader
                              label="LOCATION"
                              sortKey="location_name"
                              sortBy={roiFilters.sortBy ?? ""}
                              sortDirection={roiFilters.sortDirection ?? "asc"}
                              onSort={handleRoiSort}
                            />
                          </th>
                          <th className="px-4 py-2 text-center font-bold">
                            <SortHeader
                              label="DEPARTMENT"
                              sortKey="department_name"
                              sortBy={roiFilters.sortBy ?? ""}
                              sortDirection={roiFilters.sortDirection ?? "asc"}
                              onSort={handleRoiSort}
                              align="center"
                            />
                          </th>
                          <th className="px-4 py-2 text-center font-bold min-w-[420px]">
                            Approvers
                          </th>
                          <th className="px-4 py-2 text-center font-bold">
                            <SortHeader
                              label="STATUS"
                              sortKey="status"
                              sortBy={roiFilters.sortBy ?? ""}
                              sortDirection={roiFilters.sortDirection ?? "asc"}
                              onSort={handleRoiSort}
                              align="center"
                            />
                          </th>
                          <th className="px-4 py-2 text-center font-bold">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {matrixRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-10 text-center text-sm text-slate-500"
                            >
                              No approver matrix rows found.
                            </td>
                          </tr>
                        ) : (
                          matrixRows.map((row, index) => {
                            const rowKey = String(
                              row.id ?? `${row.location_name}-${row.dept_name}-${index}`
                            );

                            const status = row?.status ?? null;
                            const normalizedStatus = String(status ?? "").toLowerCase();

                            return (
                              <tr
                                key={rowKey}
                                className="border-b border-slate-100 hover:bg-slate-50/60 align-top"
                              >
                                <td className="px-6 py-3 text-[11px] lg:text-sm text-slate-900">
                                  {row.location_name ?? "—"}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  <span className="text-[11px] lg:text-sm text-slate-900">
                                    {row.dept_name ?? "—"}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-center">
                                  <div className="flex flex-col gap-1.5">
                                    <ApproverLine
                                      label="Reviewed by"
                                      value={row?.reviewed_by_name}
                                    />
                                    <ApproverLine
                                      label="Checked by"
                                      value={row?.checked_by_name}
                                    />
                                    <ApproverLine
                                      label="Endorsed by"
                                      value={row?.endorsed_by_name}
                                    />
                                    <ApproverLine
                                      label="Confirmed by"
                                      value={row?.confirmed_by_name}
                                    />
                                    <ApproverLine
                                      label="Approved by"
                                      value={row?.approved_by_name}
                                    />
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {normalizedStatus === "active" ? (
                                    <StatusPill tone="green">Active</StatusPill>
                                  ) : normalizedStatus === "inactive" ? (
                                    <StatusPill tone="red">Inactive</StatusPill>
                                  ) : (
                                    <StatusPill tone="gray">{status ?? "—"}</StatusPill>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="w-full flex justify-center items-center">
                                    <button
                                      type="button"
                                      className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                                      title="Edit"
                                      onClick={() => openEditModal(row)}
                                    >
                                      <MdEdit className="text-[14px]" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="sm:hidden divide-y divide-slate-100">
                    {matrixRows.length === 0 ? (
                      <div className="px-6 py-10 text-center text-sm text-slate-500">
                        No approver matrix rows found.
                      </div>
                    ) : (
                      matrixRows.map((row, index) => {
                        const rowKey = String(
                          row.id ?? `${row.location_name}-${row.dept_name}-${index}-card`
                        );

                        const status = row?.status ?? null;
                        const normalizedStatus = String(status ?? "").toLowerCase();

                        return (
                          <div key={rowKey} className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {row.location_name ?? "—"}
                                </p>
                                <p className="text-xs text-slate-600 truncate">
                                  {row.dept_name ?? "—"}
                                </p>
                              </div>

                              <div className="shrink-0">
                                {normalizedStatus === "active" ? (
                                  <StatusPill tone="green">Active</StatusPill>
                                ) : normalizedStatus === "inactive" ? (
                                  <StatusPill tone="red">Inactive</StatusPill>
                                ) : (
                                  <StatusPill tone="gray">{status ?? "—"}</StatusPill>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-col gap-1.5 pl-3">
                              <ApproverLine
                                align="start"
                                label="Reviewed by"
                                value={row?.reviewed_by_name}
                              />
                              <ApproverLine
                                align="start"
                                label="Checked by"
                                value={row?.checked_by_name}
                              />
                              <ApproverLine
                                align="start"
                                label="Endorsed by"
                                value={row?.endorsed_by_name}
                              />
                              <ApproverLine
                                align="start"
                                label="Confirmed by"
                                value={row?.confirmed_by_name}
                              />
                              <ApproverLine
                                align="start"
                                label="Approved by"
                                value={row?.approved_by_name}
                              />
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 py-1 px-2 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] text-xs font-semibold"
                                title="Edit"
                                onClick={() => openEditModal(row)}
                              >
                                <MdEdit className="text-[13px]" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {pagination && pagination.lastPage > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                      <p className="text-xs text-slate-500">
                        Page {pagination.page} of {pagination.lastPage}
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={pagination.page <= 1}
                          onClick={() => goToPage(pagination.page - 1)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          disabled={pagination.page >= pagination.lastPage}
                          onClick={() => goToPage(pagination.page + 1)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeMatrixTab === "SPRF" && (
              <div className="mt-2">
                <div className="mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-black/10 px-1 sm:px-2 py-[6px] bg-white">
                  <FilterPill
                    label="Status"
                    value={sprfFilters.status ?? ""}
                    options={sprfStatusFilterOptions}
                    onChange={(v) => applySprfFilters({ status: v })}
                  />
                  <FilterPill
                    label="Location"
                    value={sprfFilters.location ?? ""}
                    options={locationFilterOptions}
                    onChange={(v) => applySprfFilters({ location: v })}
                  />
                  <FilterPill
                    label="Department"
                    value={sprfFilters.department ?? ""}
                    options={departmentFilterOptions}
                    onChange={(v) => applySprfFilters({ department: v })}
                  />

                  <div ref={roiSearchBoxRef} className="relative flex items-center justify-end ml-auto">
                    {/* Mobile Toggle Button - Swaps between Search and X */}
                    <button
                      type="button"
                      className={`p-1.5 rounded-lg border border-black/10 sm:hidden transition-colors ${
                        isRoiMobileSearchOpen
                          ? "bg-slate-100 text-slate-700"
                          : "text-slate-500 hover:text-slate-800 bg-white"
                      }`}
                      onClick={() => setIsRoiMobileSearchOpen(!isRoiMobileSearchOpen)}
                    >
                      {isRoiMobileSearchOpen ? <FiX className="h-4 w-4" /> : <FiSearch className="h-4 w-4" />}
                    </button>

                    {/* Search Input Container - Dropdown on mobile, Inline on sm+ */}
                    <div
                      className={`
                        absolute right-0 top-[calc(100%+0.5rem)] z-40 md:z-0 w-64 origin-top-right rounded-xl bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/10 transition-all duration-200
                        ${isRoiMobileSearchOpen ? "scale-100 opacity-100 visible" : "scale-95 opacity-0 invisible pointer-events-none"}
                        sm:pointer-events-auto sm:visible sm:relative sm:top-0 sm:w-auto sm:scale-100 sm:opacity-100 sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none
                      `}
                    >
                      <div className="relative w-full sm:w-64">
                        <FiSearch className="pointer-events-none absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          ref={roiSearchInputRef}
                          type="text"
                          value={roiSearchQuery}
                          onChange={(e) => setRoiSearchQuery(e.target.value)}
                          placeholder="Search location or department..."
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-0.5 sm:py-1 pl-8 sm:pl-9 text-[12px] md:text-[13px] text-slate-800 shadow-inner placeholder:text-slate-300 outline-none focus:ring-0 focus:border-[#289800]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-white shadow-md border border-black/10 overflow-hidden">
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-[#efeff4] border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-2 text-left font-bold">
                            <SortHeader
                              label="LOCATION"
                              sortKey="location_name"
                              sortBy={sprfFilters.sortBy ?? ""}
                              sortDirection={sprfFilters.sortDirection ?? "asc"}
                              onSort={handleSprfSort}
                            />
                          </th>
                          <th className="px-4 py-2 text-center font-bold">
                            <SortHeader
                              label="DEPARTMENT"
                              sortKey="department_name"
                              sortBy={sprfFilters.sortBy ?? ""}
                              sortDirection={sprfFilters.sortDirection ?? "asc"}
                              onSort={handleSprfSort}
                              align="center"
                            />
                          </th>
                          <th className="px-4 py-2 text-center font-bold">Condition</th>
                          <th className="px-4 py-2 text-center font-bold min-w-[320px]">
                            Approvers
                          </th>
                          <th className="px-4 py-2 text-center font-bold">
                            <SortHeader
                              label="STATUS"
                              sortKey="status"
                              sortBy={sprfFilters.sortBy ?? ""}
                              sortDirection={sprfFilters.sortDirection ?? "asc"}
                              onSort={handleSprfSort}
                              align="center"
                            />
                          </th>
                          <th className="px-4 py-2 text-center font-bold">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sprfMatrixRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-10 text-center text-sm text-slate-500"
                            >
                              No SPRF approver matrix rows found.
                            </td>
                          </tr>
                        ) : (
                          sprfMatrixRows.map((row, index) => {
                            const rowKey = String(row.id ?? `sprf-${index}`);
                            const isActive = Boolean(row.is_active);

                            const selectedConditionLabel =
                              sprfConditionFilter[rowKey] ?? "";
                            const selectedCondition =
                              SPRF_CONDITIONS.find((c) => c.label === selectedConditionLabel) ?? null;

                            // When no condition is selected, show all approvers
                            const visibleApproverKeys = selectedCondition
                              ? selectedCondition.keys
                              : Object.keys(SPRF_APPROVER_LABELS);

                            return (
                              <tr
                                key={rowKey}
                                className=" hover:bg-gray-50 border-t hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-10px_-12px_10px_rgba(255,255,255,0.1),-1px_1px_1px_rgba(0,0,0,0.1)] border-black/5 align-top"
                              >
                                <td className="px-6 py-3 text-[11px] lg:text-sm text-slate-900">
                                  {row.location_name ?? "—"}
                                </td>

                                <td className="px-4 py-3 text-center text-[11px] lg:text-sm text-slate-900">
                                  {row.department_name ?? "—"}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  <select
                                    value={selectedConditionLabel}
                                    onChange={(e) =>
                                      setSprfConditionFilter((prev) => ({
                                        ...prev,
                                        [rowKey]: e.target.value,
                                      }))
                                    }
                                    className="rounded-lg border border-slate-300 px-2 pr-7 py-1.5 text-xs focus:outline-none focus:ring-0 focus:border-[#4FA34E] bg-white"
                                  >
                                    <option value="">Select a condition</option>
                                    {SPRF_CONDITIONS.map((c) => (
                                      <option key={c.label} value={c.label}>
                                        {c.label}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                <td className="px-4 py-3 text-center">
                                  <div className="flex flex-col gap-1.5">
                                    {visibleApproverKeys.map((nameKey) => (
                                      <ApproverLine
                                        key={nameKey}
                                        label={SPRF_APPROVER_LABELS[nameKey]}
                                        value={row[nameKey]}
                                        note={
                                          selectedConditionLabel === "Rebate Request" &&
                                          nameKey === "director_customer_engagement_user_name"
                                            ? "Rebate justification required"
                                            : null
                                        }
                                      />
                                    ))}
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {isActive ? (
                                    <StatusPill tone="green">Active</StatusPill>
                                  ) : (
                                    <StatusPill tone="red">Inactive</StatusPill>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="w-full flex justify-center items-center">
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                                        title="Edit"
                                        onClick={() => openEditSprfModal(row)}
                                      >
                                        <MdEdit className="text-[14px]" />
                                      </button>

                                      {!isActive && (
                                        <button
                                          type="button"
                                          title="Activate"
                                          onClick={() => activateSprfMatrix(row)}
                                          className="px-1 py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] text-xs font-semibold"
                                        >
                                          <MdOutlinePowerSettingsNew />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="sm:hidden divide-y divide-slate-100">
                    {sprfMatrixRows.length === 0 ? (
                      <div className="px-6 py-10 text-center text-sm text-slate-500">
                        No SPRF approver matrix rows found.
                      </div>
                    ) : (
                      sprfMatrixRows.map((row, index) => {
                        const rowKey = String(row.id ?? `sprf-${index}-card`);
                        const isActive = Boolean(row.is_active);

                        const selectedConditionLabel =
                          sprfConditionFilter[rowKey] ?? "";
                        const selectedCondition =
                          SPRF_CONDITIONS.find((c) => c.label === selectedConditionLabel) ?? null;

                        const visibleApproverKeys = selectedCondition
                          ? selectedCondition.keys
                          : Object.keys(SPRF_APPROVER_LABELS);

                        return (
                          <div key={rowKey} className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {row.location_name ?? "—"}
                                </p>
                                <p className="text-xs text-slate-600 truncate">
                                  {row.department_name ?? "—"}
                                </p>
                              </div>

                              <div className="shrink-0">
                                {isActive ? (
                                  <StatusPill tone="green">Active</StatusPill>
                                ) : (
                                  <StatusPill tone="red">Inactive</StatusPill>
                                )}
                              </div>
                            </div>

                            <div className="mt-2.5">
                              <select
                                value={selectedConditionLabel}
                                onChange={(e) =>
                                  setSprfConditionFilter((prev) => ({
                                    ...prev,
                                    [rowKey]: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-300 px-2 pr-7 py-1.5 text-xs focus:outline-none focus:ring-0 focus:border-[#4FA34E] bg-white"
                              >
                                <option value="">Select a condition</option>
                                {SPRF_CONDITIONS.map((c) => (
                                  <option key={c.label} value={c.label}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="mt-3 flex flex-col pl-1 gap-1.5">
                              {visibleApproverKeys.map((nameKey) => (
                                <ApproverLine
                                  key={nameKey}
                                  align="start"
                                  label={SPRF_APPROVER_LABELS[nameKey]}
                                  value={row[nameKey]}
                                  note={
                                    selectedConditionLabel === "Rebate Request" &&
                                    nameKey === "director_customer_engagement_user_name"
                                      ? "Rebate justification required"
                                      : null
                                  }
                                />
                              ))}
                            </div>

                            <div className="mt-2 flex justify-end gap-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 py-1 px-2 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] text-xs font-semibold"
                                title="Edit"
                                onClick={() => openEditSprfModal(row)}
                              >
                                <MdEdit className="text-[13px]" />
                                <span>Edit</span>
                              </button>

                              {!isActive && (
                                <button
                                  type="button"
                                  title="Activate"
                                  onClick={() => activateSprfMatrix(row)}
                                  className="inline-flex items-center gap-1 py-1 px-2 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] text-xs font-semibold"
                                >
                                  <MdOutlinePowerSettingsNew />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ApproverMatrix;

ApproverMatrix.layout = (page) => <AuthenticatedLayout children={page} />;