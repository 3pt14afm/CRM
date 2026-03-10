// resources/js/Pages/Admin/UserManagement.jsx

import React, { useCallback, useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewUserModal from "@/Components/admin/modals/NewUserModal";
import EditUserModal from "@/Components/admin/modals/EditUserModal";
import { getUserColumns } from "./columns";
import { isUserActive, formatShortDate } from "./helpers";
import FilterPill from "./FilterPill";
import useAssignUserModal from "./hooks/useAssignUserModal";
import useEditUserModal from "./hooks/useEditUserModal";
import usePositions from "./hooks/usePositions";
import useDepartments from "./hooks/useDepartments";

function UserManagement({ users, locations, departments: departmentOptionsProp = [], filters = {} }) {
  const formattedDate = formatShortDate();

  const locationOptions = useMemo(() => {
    const rows = locations?.data ?? [];
    return Array.isArray(rows) ? rows : [];
  }, [locations]);

  const { positions, loadingPositions } = usePositions();
  const { departments, loadingDepartments } = useDepartments();

  const assignModal = useAssignUserModal();
  const editModal = useEditUserModal();

  const userColumns = useMemo(
    () => getUserColumns({ onEdit: editModal.openEditModal, isUserActive }),
    [editModal.openEditModal]
  );

  const applyFilters = useCallback(
    (nextFilters = {}) => {
      router.get(
        route("admin.user-management.index"),
        {
          status: nextFilters.status ?? filters.status ?? "",
          location: nextFilters.location ?? filters.location ?? "",
          position: nextFilters.position ?? filters.position ?? "",
          department: nextFilters.department ?? filters.department ?? "",
          page: nextFilters.page ?? 1,
        },
        {
          preserveScroll: true,
          preserveState: true,
          replace: true,
        }
      );
    },
    [filters]
  );

  const goToPage = useCallback(
    (p) => {
      applyFilters({ page: p });
    },
    [applyFilters]
  );

  const handleStatusChange = useCallback(
    (value) => {
      applyFilters({ status: value, page: 1 });
    },
    [applyFilters]
  );

  const handleLocationChange = useCallback(
    (value) => {
      applyFilters({ location: value, page: 1 });
    },
    [applyFilters]
  );

  const handlePositionChange = useCallback(
    (value) => {
      applyFilters({ position: value, page: 1 });
    },
    [applyFilters]
  );

  const handleDepartmentChange = useCallback(
    (value) => {
      applyFilters({ department: value, page: 1 });
    },
    [applyFilters]
  );

  const userRows = users?.data ?? [];
  const userPagination =
    users && typeof users.current_page === "number"
      ? {
          page: users.current_page,
          perPage: users.per_page ?? 10,
          total: users.total ?? userRows.length,
          onPageChange: goToPage,
        }
      : null;

  const locationFilterOptions = useMemo(
    () => [
      { label: "All", value: "" },
      ...locationOptions.map((location) => ({
        label: location.name,
        value: String(location.id),
      })),
    ],
    [locationOptions]
  );

  const positionFilterOptions = useMemo(() => {
    const list = Array.isArray(positions) ? positions : [];
    return [
      { label: "All", value: "" },
      ...list.map((position) => ({
        label: position.name,
        value: position.name,
      })),
    ];
  }, [positions]);

  const departmentFilterOptions = useMemo(() => {
    const list =
      Array.isArray(departmentOptionsProp) && departmentOptionsProp.length
        ? departmentOptionsProp
        : Array.isArray(departments)
        ? departments
        : [];

    return [
      { label: "All", value: "" },
      ...list.map((department) => ({
        label: department.name,
        value: String(department.id),
      })),
    ];
  }, [departmentOptionsProp, departments]);

  const statusFilterOptions = useMemo(
    () => [
      { label: "All", value: "" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "banned" },
    ],
    []
  );

  return (
    <>
      <Head title="User Management" />

      <NewUserModal
        show={assignModal.showAssignModal}
        onClose={assignModal.closeAssignModal}
        processing={assignModal.assignProcessing}
        positions={positions}
        loadingPositions={loadingPositions}
        departments={departments}
        loadingDepartments={loadingDepartments}
        locationOptions={locationOptions}
        assignForm={assignModal.assignForm}
        setAssignForm={assignModal.setAssignForm}
        assignErrors={assignModal.assignErrors}
        onSubmit={assignModal.submitAssign}
      />

      <EditUserModal
        show={editModal.showEditModal}
        onClose={editModal.closeEditModal}
        processing={editModal.editProcessing}
        editingUser={editModal.editingUser}
        locationOptions={locationOptions}
        positions={positions}
        departments={departments}
        loadingDepartments={loadingDepartments}
        editForm={editModal.editForm}
        setEditForm={editModal.setEditForm}
        editErrors={editModal.editErrors}
        onSubmit={editModal.submitEdit}
      />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-10 pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">
                  User Management
                </h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage user accounts, assigned positions, and reporting locations.
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
                    onClick={assignModal.openAssignModal}
                  >
                    + New User
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="-mx-4 md:-mx-6 lg:-mx-10 xl:-mx-14">
                <div className="-mb-2 mx-6 lg:mx-10 xl:mx-14 rounded-lg border border-black/10 bg-white px-4 py-2 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <FilterPill
                      label="Status"
                      value={filters.status ?? ""}
                      options={statusFilterOptions}
                      onChange={handleStatusChange}
                    />

                    <FilterPill
                      label="Location"
                      value={String(filters.location ?? "")}
                      options={locationFilterOptions}
                      onChange={handleLocationChange}
                    />

                    <FilterPill
                      label="Department"
                      value={String(filters.department ?? "")}
                      options={departmentFilterOptions}
                      onChange={handleDepartmentChange}
                      disabled={loadingDepartments}
                    />

                    <FilterPill
                      label="Position"
                      value={filters.position ?? ""}
                      options={positionFilterOptions}
                      onChange={handlePositionChange}
                      disabled={loadingPositions}
                    />
                  </div>
                </div>

                <ProjectListSection
                  tiles={[]}
                  tableTitle="User Management"
                  columns={userColumns}
                  rows={userRows}
                  rowKey={(r) => String(r.id)}
                  pagination={userPagination}
                />
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

export default UserManagement;
UserManagement.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;