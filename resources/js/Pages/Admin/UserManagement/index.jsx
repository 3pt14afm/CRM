import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewUserModal from "@/Components/admin/modals/NewUserModal";
import EditUserModal from "@/Components/admin/modals/EditUserModal";
import { getUserColumns } from "./columns";
import { isUserActive, formatShortDate } from "./helpers";
import FilterPill from "@/Components/FilterPill";
import PerPageFilterPill from "./PerPageFilterPill";
import useAssignUserModal from "./hooks/useAssignUserModal";
import useEditUserModal from "./hooks/useEditUserModal";
import usePositions from "./hooks/usePositions";
import useDepartments from "./hooks/useDepartments";
import { BsPersonFillAdd } from "react-icons/bs";
import { FaUsers } from "react-icons/fa";
import { FiSearch, FiX } from "react-icons/fi";

function UserManagement({
  users,
  locations,
  departments: departmentOptionsProp = [],
  filters = {},
}) {
  const formattedDate = formatShortDate();

  const [tableUsers, setTableUsers] = useState(users);
  const [tableSearch, setTableSearch] = useState((filters.search ?? "").trim());
  const [searchQuery, setSearchQuery] = useState(filters.search ?? "");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const searchBoxRef = useRef(null);
  const isSearchFocusedRef = useRef(false);
  const suggestionCacheRef = useRef(new Map());
  const latestSuggestionRequestRef = useRef(0);

  useEffect(() => {
    setTableUsers(users);
    setTableSearch((filters.search ?? "").trim());
  }, [users, filters.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSearchSuggestions(false);
        isSearchFocusedRef.current = false;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isSearchFocusedRef.current) {
      setSearchQuery(filters.search ?? "");
    }
  }, [filters.search]);

  const locationOptions = useMemo(() => {
    const rows = locations?.data ?? [];
    return Array.isArray(rows) ? rows : [];
  }, [locations]);

  const { positions, loadingPositions } = usePositions();
  const { departments, loadingDepartments } = useDepartments();

  const assignModal = useAssignUserModal();
  const editModal = useEditUserModal();

  const buildFilterParams = useCallback(
    (nextFilters = {}) => ({
      status: nextFilters.status ?? filters.status ?? "",
      location: nextFilters.location ?? filters.location ?? "",
      position: nextFilters.position ?? filters.position ?? "",
      department: nextFilters.department ?? filters.department ?? "",
      search: nextFilters.search ?? searchQuery.trim(),
      perPage:
        nextFilters.perPage ??
        (filters.perPage === "all"
          ? "all"
          : String(filters.perPage ?? tableUsers?.per_page ?? 10)),
      sortBy: nextFilters.sortBy ?? filters.sortBy ?? "",
      sortDirection:
        nextFilters.sortDirection ?? filters.sortDirection ?? "asc",
      page: nextFilters.page ?? 1,
    }),
    [
      filters.status,
      filters.location,
      filters.position,
      filters.department,
      filters.perPage,
      filters.sortBy,
      filters.sortDirection,
      searchQuery,
      tableUsers?.per_page,
    ]
  );

  const replaceBrowserUrl = useCallback((params) => {
    const url = new URL(route("admin.user-management.index"), window.location.origin);

    Object.entries(params).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) {
        return;
      }

      if (key === "page" && Number(value) === 1) {
        return;
      }

      url.searchParams.set(key, String(value));
    });

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}`
    );
  }, []);

  const applyFilters = useCallback(
    (nextFilters = {}) => {
      router.get(
        route("admin.user-management.index"),
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

  const requestUsers = useCallback(
    async (rawSearch, signal) => {
      const normalized = rawSearch.trim();
      const params = buildFilterParams({ search: normalized, page: 1 });

      const { data } = await axios.get(route("admin.user-management.index"), {
        params,
        signal,
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-User-Search": "true",
        },
      });

      return {
        users: data?.users ?? null,
        params,
        normalized,
      };
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

  const userColumns = useMemo(
    () =>
      getUserColumns({
        onEdit: editModal.openEditModal,
        isUserActive,
        sortBy: filters.sortBy ?? "",
        sortDirection: filters.sortDirection ?? "asc",
        onSort: handleSort,
      }),
    [editModal.openEditModal, filters.sortBy, filters.sortDirection, handleSort]
  );

  useEffect(() => {
    const normalized = searchQuery.trim();

    if (normalized === tableSearch) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const timeout = setTimeout(async () => {
      try {
        const result = await requestUsers(normalized, controller.signal);

        if (!active || !result.users) {
          return;
        }

        setTableUsers(result.users);
        setTableSearch(result.normalized);
        replaceBrowserUrl(result.params);
      } catch (error) {
        if (!active || axios.isCancel(error) || error.name === "CanceledError") {
          return;
        }
        console.error("User search failed:", error);
      }
    }, 300);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, tableSearch, requestUsers, replaceBrowserUrl]);

  useEffect(() => {
    const q = searchQuery.trim();

    if (!showSearchSuggestions || q.length < 1) {
      setUserSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const cacheKey = q.toLowerCase();

    if (suggestionCacheRef.current.has(cacheKey)) {
      setUserSuggestions(suggestionCacheRef.current.get(cacheKey));
      setLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++latestSuggestionRequestRef.current;

    const timeout = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);

        const { data } = await axios.get(
          route("admin.user-management.suggestions"),
          {
            params: { search: q },
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
          }
        );

        if (requestId !== latestSuggestionRequestRef.current) {
          return;
        }

        const list = Array.isArray(data) ? data : [];
        suggestionCacheRef.current.set(cacheKey, list);
        setUserSuggestions(list);
      } catch (error) {
        if (
          requestId === latestSuggestionRequestRef.current &&
          !axios.isCancel(error) &&
          error.name !== "CanceledError"
        ) {
          setUserSuggestions([]);
        }
      } finally {
        if (requestId === latestSuggestionRequestRef.current) {
          setLoadingSuggestions(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, showSearchSuggestions]);

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

  const handleClearAll = useCallback(() => {
    setSearchQuery("");
    setShowSearchSuggestions(false);
    applyFilters({
      status: "",
      location: "",
      department: "",
      position: "",
      search: "",
      sortBy: "",
      sortDirection: "asc",
      page: 1,
    });
  }, [applyFilters]);

  const hasActiveFiltersOrSort = Boolean(
    filters.status ||
      filters.location ||
      filters.department ||
      filters.position ||
      filters.search ||
      filters.sortBy
  );

  const handleSelectSuggestion = useCallback((item) => {
    const value = item.value ?? "";
    setSearchQuery(value);
    setShowSearchSuggestions(false);
    setUserSuggestions([]);
  }, []);

  const userRows = tableUsers?.data ?? [];
  const userPagination =
    tableUsers && typeof tableUsers.current_page === "number"
      ? {
          page: tableUsers.current_page,
          perPage: tableUsers.per_page ?? 10,
          total: tableUsers.total ?? userRows.length,
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
        onResetPassword={editModal.onResetPassword}
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
                  Manage user accounts, assigned positions, and reporting
                  locations.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-slate-500">{formattedDate}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="-mx-4 md:-mx-6 lg:-mx-10">
                <div className="-mb-2 mx-6 lg:mx-10 sticky top-5 z-30 rounded-lg border border-black/10 border-b-black/20 border-r-black/20 bg-white px-4 py-2 shadow-[-2px_-2px_10px_rgba(245,245,245,1),0px_0px_0_rgba(255,255,255,1),2px_2px_4px_rgba(0,0,0,0.2)]">
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

                    <PerPageFilterPill
                      label="Show"
                      value={String(
                        filters.perPage === "all"
                          ? "all"
                          : filters.perPage ?? tableUsers?.per_page ?? 10
                      )}
                      onChange={(value) =>
                        applyFilters({ perPage: value, page: 1 })
                      }
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

                <ProjectListSection
                  tiles={[]}
                  tableTitle={
                    <div className="flex items-center gap-2">
                      <FaUsers className="h-5 w-5" />
                      <span>User Management</span>
                    </div>
                  }
                  columns={userColumns}
                  rows={userRows}
                  rowKey={(r) => String(r.id)}
                  pagination={userPagination}
                  rightControls={
                    <div className="flex items-center gap-2">
                      <div ref={searchBoxRef} className="relative">
                        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input
                          className="w-64 rounded-lg border border-black/10 bg-white px-3 py-1 pl-9 text-[13px] text-slate-800 shadow-inner placeholder:text-slate-300 outline-none focus:ring-0 focus:border-[#289800]"
                          value={searchQuery}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSearchQuery(value);
                            setShowSearchSuggestions(Boolean(value.trim()));
                          }}
                          onFocus={() => {
                            isSearchFocusedRef.current = true;
                            setShowSearchSuggestions(Boolean(searchQuery.trim()));
                          }}
                          placeholder="Type name, email, employee ID..."
                        />

                        {showSearchSuggestions && (
                          <div className="absolute right-0 z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg">
                            {loadingSuggestions ? (
                              <div className="px-3 py-2 text-sm text-slate-500">
                                Loading...
                              </div>
                            ) : userSuggestions.length > 0 ? (
                              userSuggestions.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[#FBFFFA]"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectSuggestion(item);
                                  }}
                                >
                                  <div className="font-medium text-slate-800">
                                    {item.label}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {item.subLabel}
                                    {item.position ? ` • ${item.position}` : ""}
                                  </div>
                                </button>
                              ))
                            ) : searchQuery.trim() ? (
                              <div className="px-3 py-2 text-sm text-slate-500">
                                No matches found.
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        title="Add User"
                        aria-label="Add User"
                        className="rounded-lg px-1 text-sm font-semibold text-[#289800] hover:brightness-95"
                        onClick={assignModal.openAssignModal}
                      >
                        <BsPersonFillAdd className="w-6 h-6" />
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

export default UserManagement;
UserManagement.layout = (page) => (
  <AuthenticatedLayout>{page}</AuthenticatedLayout>
);