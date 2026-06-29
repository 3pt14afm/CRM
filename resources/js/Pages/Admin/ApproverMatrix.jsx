import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import NewApproverMatrixModal from "@/Components/admin/modals/NewApproverMatrixModal";
import EditApproverMatrixModal from "@/Components/admin/modals/EditApproverMatrixModal";
import NewSprfApproverMatrixModal from "@/Components/admin/modals/NewSprfApproverMatrixModal";
import EditSprfApproverMatrixModal from "@/Components/admin/modals/EditSprfApproverMatrixModal";
import { MdEdit, MdOutlinePowerSettingsNew } from "react-icons/md";
import { IoAddCircle } from "react-icons/io5";

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

function ApproverLine({ label, value, note }) {
  return (
    <div className="text-[11px] lg:text-xs text-slate-700 flex items-center justify-center gap-1.5">
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
  is_active: false,
  remarks: "",
};

function ApproverMatrix({ stats, matrices, sprfMatrices = [], errors = {} }) {
  const [activeMatrixTab, setActiveMatrixTab] = useState("ROI");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState(null);

  const [showCreateSprfModal, setShowCreateSprfModal] = useState(false);
  const [createSprfProcessing, setCreateSprfProcessing] = useState(false);
  const [sprfCreateForm, setSprfCreateForm] = useState({ ...EMPTY_SPRF_FORM });

  const [showEditSprfModal, setShowEditSprfModal] = useState(false);
  const [editSprfProcessing, setEditSprfProcessing] = useState(false);
  const [editingSprfMatrix, setEditingSprfMatrix] = useState(null);
  const [sprfEditForm, setSprfEditForm] = useState({ ...EMPTY_SPRF_FORM });

  // Per-row condition filter: rowKey → condition label (local UI only, not saved)
  const [sprfConditionFilter, setSprfConditionFilter] = useState({});

  const users = stats?.users ?? [];
  const locations = stats?.locations ?? [];
  const departments = stats?.departments ?? [];

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
    setShowCreateSprfModal(true);
  };

  const closeCreateSprfModal = () => {
    if (createSprfProcessing) return;
    setShowCreateSprfModal(false);
  };

  const submitCreateSprf = (e) => {
    e.preventDefault();
    setCreateSprfProcessing(true);

    router.post(route("admin.approver-matrix.sprf.store"), sprfCreateForm, {
      preserveScroll: true,
      onSuccess: () => {
        setCreateSprfProcessing(false);
        setShowCreateSprfModal(false);
      },
      onError: () => {
        setCreateSprfProcessing(false);
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
    setShowEditSprfModal(true);
  };

  const closeEditSprfModal = () => {
    if (editSprfProcessing) return;
    setShowEditSprfModal(false);
    setEditingSprfMatrix(null);
  };

  const submitEditSprf = (e) => {
    e.preventDefault();

    if (!editingSprfMatrix?.id) return;

    setEditSprfProcessing(true);

    router.put(
      route("admin.approver-matrix.sprf.update", editingSprfMatrix.id),
      sprfEditForm,
      {
        preserveScroll: true,
        onSuccess: () => {
          setEditSprfProcessing(false);
          setShowEditSprfModal(false);
          setEditingSprfMatrix(null);
        },
        onError: () => {
          setEditSprfProcessing(false);
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
      { preserveScroll: true }
    );
  };

  const goToPage = (p) => {
    router.get(
      route("admin.approver-matrix.index"),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const openCreateForActiveTab = () => {
    if (activeMatrixTab === "SPRF") {
      openCreateSprfModal();
      return;
    }

    openCreateModal();
  };

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
        errors={errors}
      />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-10 pt-8">
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
                <span className="text-xs text-slate-500">{formattedDate}</span>
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
                <div className="rounded-lg bg-white shadow-md border border-black/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-[#efeff4] border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-2 text-left font-bold">Location</th>
                          <th className="px-4 py-2 text-center font-bold">Department</th>
                          <th className="px-4 py-2 text-center font-bold min-w-[420px]">
                            Approvers
                          </th>
                          <th className="px-4 py-2 text-center font-bold">Status</th>
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
              <div className="mt-5">
                <div className="rounded-lg bg-white shadow-md border border-black/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-[#efeff4] border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-2 text-left font-bold">Location</th>
                          <th className="px-4 py-2 text-center font-bold">Department</th>
                          <th className="px-4 py-2 text-center font-bold">Condition</th>
                          <th className="px-4 py-2 text-center font-bold min-w-[320px]">
                            Approvers
                          </th>
                          <th className="px-4 py-2 text-center font-bold">Status</th>
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