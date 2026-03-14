import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import NewApproverMatrixModal from "@/Components/admin/modals/NewApproverMatrixModal";
import EditApproverMatrixModal from "@/Components/admin/modals/EditApproverMatrixModal";
import { MdEdit } from "react-icons/md";

function StatusPill({ children, tone = "neutral" }) {
  const classes = {
    green: "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20",
    red: "bg-red-100 text-red-600 border border-red-200",
    amber: "bg-amber-100 text-amber-700 border border-amber-200",
    gray: "bg-slate-100 text-slate-500 border border-slate-200",
  };

  return (
    <span
      className={`px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wider ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function ApproverLine({ label, value }) {
  return (
    <div className="text-[11px] lg:text-xs text-slate-700">
      <span className="font-semibold text-slate-900">{label}</span>
      <span className="text-slate-500"> — </span>
      <span>{value && String(value).trim() !== "" ? value : "Not setup"}</span>
    </div>
  );
}

function ApproverMatrix({ stats, matrices }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState(null);

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

  const goToPage = (p) => {
    router.get(
      route("admin.approver-matrix.index"),
      { page: p },
      { preserveScroll: true, preserveState: true }
    );
  };

  const pagination =
    matrices && typeof matrices.current_page === "number"
      ? {
          page: matrices.current_page,
          perPage: matrices.per_page ?? 10,
          total: matrices.total ?? matrixRows.length,
          lastPage: matrices.last_page ?? 1,
        }
      : null;

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

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-10 pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">
                  Approver Matrix
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage ROI approval routing per location and department.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-slate-500">{formattedDate}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-[#289800] px-3 py-2 text-white font-semibold shadow-sm hover:brightness-95 md:text-xs lg:text-sm"
                onClick={openCreateModal}
              >
                + New Matrix
              </button>
            </div>

            <div className="mt-5">
              <div className="rounded-lg bg-white shadow-sm border border-slate-200/70 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-lightgreen/10 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-2 text-left font-semibold">Location</th>
                        <th className="px-4 py-2 text-center font-semibold">Department</th>
                        <th className="px-4 py-2 text-center font-semibold min-w-[420px]">
                          Approvers
                        </th>
                        <th className="px-4 py-2 text-center font-semibold">Status</th>
                        <th className="px-4 py-2 text-center font-semibold">Actions</th>
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
                                  <ApproverLine label="Reviewed by" value={row?.reviewed_by_name} />
                                  <ApproverLine label="Checked by" value={row?.checked_by_name} />
                                  <ApproverLine label="Endorsed by" value={row?.endorsed_by_name} />
                                  <ApproverLine label="Confirmed by" value={row?.confirmed_by_name} />
                                  <ApproverLine label="Approved by" value={row?.approved_by_name} />
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
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                                      title="Edit"
                                      onClick={() => openEditModal(row)}
                                    >
                                      <MdEdit className="text-[14px]" />
                                    </button>
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
          </div>
        </div>

        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end" />
        </div>
      </div>
    </>
  );
}

export default ApproverMatrix;
ApproverMatrix.layout = (page) => <AuthenticatedLayout children={page} />;