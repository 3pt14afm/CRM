// resources/js/Pages/Admin/UserManagement.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import NewUserModal from "@/Components/admin/modals/NewUserModal";
import EditUserModal from "@/Components/admin/modals/EditUserModal";
import { MdEdit } from "react-icons/md";

function UserManagement({ users, stats, locations, locationLookup }) {
  // ─────────────────────────────────────────
  // New User Modal (Position → Person → Role → Locations)
  // ─────────────────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignProcessing, setAssignProcessing] = useState(false);
  const [assignErrors, setAssignErrors] = useState({});

  const [positions, setPositions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [assignForm, setAssignForm] = useState({
    position_id: "",
    employee_id: "",
    role: "user",
    location: [],
  });

  // ─────────────────────────────────────────
  // Edit User Modal (Read-only user info + edit role/locations + active toggle)
  // ─────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingUser, setEditingUser] = useState(null);

  const [editForm, setEditForm] = useState({
    role: "user",
    location: [],
    is_banned: false,
  });

  // ─────────────────────────────────────────
  // Add Location picker state (Edit modal)
  // ─────────────────────────────────────────
  const [editLocPickerOpen, setEditLocPickerOpen] = useState(false);
  const [editLocSearch, setEditLocSearch] = useState("");
  const editLocPopoverRef = useRef(null);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  // locations is paginated in panel(): locations.data
  const locationOptions = useMemo(() => {
    const rows = locations?.data ?? [];
    return Array.isArray(rows) ? rows : [];
  }, [locations]);

  const roleOptions = useMemo(
    () => [
      { value: "user", label: "User" },
      { value: "preparer", label: "Preparer" },
      { value: "reviewer", label: "Reviewer" },
      { value: "checker", label: "Checker" },
      { value: "endorser", label: "Endorser" },
      { value: "confirmer", label: "Confirmer" },
      { value: "approver", label: "Approver" },
      { value: "admin", label: "Admin" },
    ],
    []
  );

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────
  const isUserActive = (u) => {
    if (typeof u?.is_banned === "boolean") return u.is_banned === false;
    if (typeof u?.status === "string") return u.status === "Active";
    return true;
  };

  const getPrimaryLocationId = (u) => {
    const id = u?.primary_location_id ?? u?.primaryLocationId ?? null;
    return id == null ? null : Number(id);
  };

  const ensurePrimaryInLocations = (locIds, primaryId) => {
    const set = new Set((Array.isArray(locIds) ? locIds : []).map((x) => Number(x)));
    if (primaryId) set.add(Number(primaryId));
    return Array.from(set);
  };

  const locationNameById = useMemo(() => {
    const map = new Map();
    const rows = Array.isArray(locationLookup) ? locationLookup : [];
    rows.forEach((l) => map.set(Number(l.id), l.name));
    return map;
  }, [locationLookup]);

  const setUserActive = (u, makeActive) => {
    if (!u?.id) return;

    const r = makeActive ? route("admin.users.unban", u.id) : route("admin.users.ban", u.id);

    setEditingUser((prev) => {
      if (!prev || Number(prev.id) !== Number(u.id)) return prev;
      return { ...prev, is_banned: !makeActive, status: makeActive ? "Active" : "Inactive" };
    });

    router.patch(
      r,
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          router.reload({ only: ["users", "stats"] });
        },
        onError: () => {
          setEditingUser((prev) => {
            if (!prev || Number(prev.id) !== Number(u.id)) return prev;
            return { ...prev, is_banned: makeActive, status: makeActive ? "Inactive" : "Active" };
          });
        },
      }
    );
  };

  // ─────────────────────────────────────────
  // Assign Modal logic
  // ─────────────────────────────────────────
  const selectedEmployee = useMemo(() => {
    const id = Number(assignForm.employee_id || 0);
    return employees.find((e) => Number(e.id) === id) ?? null;
  }, [assignForm.employee_id, employees]);

  const assignMainLocationId = useMemo(() => {
    const id = selectedEmployee?.primary_location_id;
    return typeof id === "number" ? id : id ? Number(id) : null;
  }, [selectedEmployee]);

  const assignMainLocationName = useMemo(() => {
    if (!assignMainLocationId) return null;
    return locationNameById.get(Number(assignMainLocationId)) ?? selectedEmployee?.primary_location_name ?? null;
  }, [assignMainLocationId, locationNameById, selectedEmployee]);

  useEffect(() => {
    if (!assignMainLocationId) return;
    setAssignForm((p) => ({
      ...p,
      location: ensurePrimaryInLocations(p.location ?? [], assignMainLocationId),
    }));
  }, [assignMainLocationId]);

  const openAssignModal = () => {
    setAssignErrors({});
    setAssignProcessing(false);
    setEmployees([]);
    setAssignForm({
      position_id: "",
      employee_id: "",
      role: "user",
      location: [],
    });
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    if (assignProcessing) return;
    setShowAssignModal(false);
  };

  useEffect(() => {
    if (!showAssignModal) return;

    setLoadingPositions(true);
    fetch(route("admin.directory.positions"), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load positions");
        return r.json();
      })
      .then((data) => setPositions(Array.isArray(data) ? data : []))
      .catch(() => setPositions([]))
      .finally(() => setLoadingPositions(false));
  }, [showAssignModal]);

  useEffect(() => {
    if (!showAssignModal) return;

    if (!assignForm.position_id) {
      setEmployees([]);
      setAssignForm((p) => ({ ...p, employee_id: "", location: [] }));
      return;
    }

    setLoadingEmployees(true);
    setEmployees([]);
    setAssignForm((p) => ({ ...p, employee_id: "", location: [] }));

    const url = `${route("admin.directory.employees")}?position_id=${encodeURIComponent(assignForm.position_id)}`;

    fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load employees");
        return r.json();
      })
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]))
      .finally(() => setLoadingEmployees(false));
  }, [assignForm.position_id, showAssignModal]);

  const toggleAssignLocation = (id) => {
    const n = Number(id);
    if (assignMainLocationId && Number(assignMainLocationId) === n) return;

    setAssignForm((p) => {
      const current = (p.location ?? []).map((x) => Number(x));
      const has = current.includes(n);
      const next = has ? current.filter((x) => x !== n) : [...current, n];
      return { ...p, location: ensurePrimaryInLocations(next, assignMainLocationId) };
    });
  };

  const submitAssign = (e) => {
    e.preventDefault();
    setAssignProcessing(true);
    setAssignErrors({});

    router.post(
      route("admin.users.assign-employee"),
      {
        employee_id: Number(assignForm.employee_id),
        role: assignForm.role,
        location: (assignForm.location ?? []).map((x) => Number(x)),
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setAssignProcessing(false);
          setShowAssignModal(false);
        },
        onError: (e) => {
          setAssignErrors(e || {});
          setAssignProcessing(false);
        },
        onFinish: () => setAssignProcessing(false),
      }
    );
  };

  // ─────────────────────────────────────────
  // Edit modal logic
  // ─────────────────────────────────────────
  const openEditModal = (u) => {
    setEditErrors({});
    setEditProcessing(false);
    setEditingUser(u);

    const primaryId = getPrimaryLocationId(u);
    const locIds = ensurePrimaryInLocations(u?.location ?? [], primaryId);

    setEditForm({
      role: u?.role ?? "user",
      location: locIds,
      is_banned: Boolean(u?.is_banned ?? false),
    });

    setEditLocPickerOpen(false);
    setEditLocSearch("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingUser(null);

    setEditLocPickerOpen(false);
    setEditLocSearch("");
  };

  const toggleEditLocation = (id) => {
    const n = Number(id);
    const primaryId = getPrimaryLocationId(editingUser);
    if (primaryId && Number(primaryId) === n) return;

    setEditForm((p) => {
      const current = (p.location ?? []).map((x) => Number(x));
      const has = current.includes(n);
      const next = has ? current.filter((x) => x !== n) : [...current, n];
      return { ...p, location: ensurePrimaryInLocations(next, primaryId) };
    });
  };

  const editSelectedIds = useMemo(() => (editForm.location ?? []).map(Number), [editForm.location]);

  const editAvailableToAdd = useMemo(() => {
    const s = editLocSearch.trim().toLowerCase();
    return locationOptions
      .map((l) => ({ ...l, idNum: Number(l.id) }))
      .filter((l) => !editSelectedIds.includes(l.idNum))
      .filter((l) => (s ? String(l.name ?? "").toLowerCase().includes(s) : true));
  }, [locationOptions, editSelectedIds, editLocSearch]);

  useEffect(() => {
    if (!editLocPickerOpen) return;

    const onMouseDown = (e) => {
      const wrap = editLocPopoverRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target)) setEditLocPickerOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setEditLocPickerOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [editLocPickerOpen]);

  const addEditLocation = (id) => {
    toggleEditLocation(Number(id));
    setEditLocSearch("");
    setEditLocPickerOpen(false);
  };

  const submitEdit = (e) => {
    e.preventDefault();
    if (!editingUser?.id) return;

    setEditProcessing(true);
    setEditErrors({});

    const payload = {
      name: editingUser.name,
      email: editingUser.email,
      role: editForm.role,
      location: (editForm.location ?? []).map((x) => Number(x)),
      primary_location_id: getPrimaryLocationId(editingUser) ?? null,
    };

    router.put(route("admin.users.update", editingUser.id), payload, {
      preserveScroll: true,
      onSuccess: () => {
        const shouldBan = Boolean(editForm.is_banned);
        const currentlyBanned = Boolean(editingUser?.is_banned);

        if (shouldBan !== currentlyBanned) {
          const r = shouldBan ? route("admin.users.ban", editingUser.id) : route("admin.users.unban", editingUser.id);

          router.patch(
            r,
            {},
            {
              preserveScroll: true,
              onSuccess: () => {
                router.reload({ only: ["users", "stats"] });
                setEditProcessing(false);
                setShowEditModal(false);
              },
              onError: (e) => {
                setEditErrors(e || {});
                setEditProcessing(false);
              },
            }
          );
        } else {
          router.reload({ only: ["users", "stats"] });
          setEditProcessing(false);
          setShowEditModal(false);
        }
      },
      onError: (e) => {
        setEditErrors(e || {});
        setEditProcessing(false);
      },
      onFinish: () => {},
    });
  };

  // ─────────────────────────────────────────
  // Users table columns
  // ─────────────────────────────────────────
  const userColumns = useMemo(
    () => [
      {
        key: "user",
        header: "USER",
        cell: (r) => (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{r.name ?? "—"}</span>
            <span className="text-[11px] text-slate-500">{r.email ?? "—"}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: <div className="text-center w-full">STATUS</div>,
        cell: (row) => {
            const active = isUserActive(row);

            return (
            <div className="w-full flex justify-center items-center">
                <span
                className={`
                    px-2 py-px rounded-full text-[10px] lg:text-xs lg:font-medium font-semibold tracking-wider
                    ${
                    active
                        ? "bg-[#E9F7E7] text-[#289800] border border-[#2DA300]/20"
                        : "bg-red-100 text-red-700 border border-red-200"
                    }
                `}
                >
                {active ? "Active" : "Inactive"}
                </span>
            </div>
            );
        },
        },
      {
        key: "assigned_locations",
        header: <div className="text-center w-full">ASSIGNED LOCATIONS</div>,
        cell: (r) => {
            const locs = r.assigned_locations ?? [];
            if (!Array.isArray(locs) || locs.length === 0) {
            return (
                <div className="w-full flex justify-center items-center">
                —
                </div>
            );
            }

            const first = locs.slice(0, 2);
            const remaining = locs.length - first.length;

            return (
            <div className="w-full flex justify-center items-center">
                <div className="flex flex-wrap gap-1 items-center justify-center">
                {first.map((name, idx) => (
                    <span
                        key={idx}
                        className="px-1 py-1 rounded-md text-center text-[10px] lg:text-xs lg:font-medium font-semibold bg-[#004f9811] text-[#004f98] border border-[#004f98]/20"
                        >
                        {name}
                    </span>
                ))}

                {remaining > 0 ? (
                    <span className="px-1 py-[1px] rounded-md text-[10px] font-semibold lg:font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    +{remaining}
                    </span>
                ) : null}
                </div>
            </div>
            );
        },
        },
      {
        key: "role",
        header: <div className="text-center w-full">CURRENT ROLE</div>,
        cell: (r) => (
            <div className="w-full flex justify-center items-center">
                <span className="text-[11px] lg:text-sm capitalize">{r.role ?? "—"}</span>
            </div>
        ),
        },
      {
        key: "actions",
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) => (
          <div className="w-full flex justify-center">
            <div className="flex items-center gap-2">
                <button
                type="button"
                className="px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                title="Edit user"
                onClick={() => openEditModal(r)}
                >
                <MdEdit className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
                </button>
            </div>
        </div>
       ),
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locationOptions]
  );

  // NOTE: keep pagination behavior, but route to this page now
  const goToPage = (p) => {
    router.get(route("admin.user-management.index"), { page: p }, { preserveScroll: true, preserveState: true });
  };

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

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <>
      <Head title="User Management" />

      <NewUserModal
        show={showAssignModal}
        onClose={closeAssignModal}
        processing={assignProcessing}
        positions={positions}
        employees={employees}
        loadingPositions={loadingPositions}
        loadingEmployees={loadingEmployees}
        locationOptions={locationOptions}
        roleOptions={roleOptions}
        selectedEmployee={selectedEmployee}
        assignMainLocationName={assignMainLocationName}
        assignMainLocationId={assignMainLocationId}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        assignErrors={assignErrors}
        toggleAssignLocation={toggleAssignLocation}
        onSubmit={submitAssign}
    />

    <EditUserModal
        show={showEditModal}
        onClose={closeEditModal}
        processing={editProcessing}
        editingUser={editingUser}
        locationNameById={locationNameById}
        roleOptions={roleOptions}
        locationOptions={locationOptions}
        editForm={editForm}
        setEditForm={setEditForm}
        getPrimaryLocationId={getPrimaryLocationId}
        toggleEditLocation={toggleEditLocation}
        editLocPickerOpen={editLocPickerOpen}
        setEditLocPickerOpen={setEditLocPickerOpen}
        editLocSearch={editLocSearch}
        setEditLocSearch={setEditLocSearch}
        editAvailableToAdd={editAvailableToAdd}
        addEditLocation={addEditLocation}
        onSubmit={submitEdit}
    />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-10 pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">User Management</h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage system access, roles, and user permissions across all locations.
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
                    onClick={openAssignModal}
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
                    <FilterPill label="Role" />
                    <FilterPill label="Status" />
                    <FilterPill label="Location" />
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

function FilterPill({ label }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-[#FBFFFA] px-3 py-[6px] text-xs font-semibold text-slate-700 hover:bg-white"
      onClick={() => {}}
      title={label}
    >
      {label}: <span className="text-slate-400 font-medium">All</span>
      <span className="text-slate-400">▾</span>
    </button>
  );
}

export default UserManagement;
UserManagement.layout = (page) => <AuthenticatedLayout children={page} />;