// resources/js/Pages/Admin/Panel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import ProjectListSection from "@/Components/roi/ProjectListSection";
import Modal from "@/Components/Modal";
import { IoCloseOutline } from "react-icons/io5";
import { FiMapPin, FiUsers } from "react-icons/fi";
import { MdDelete, MdEdit } from "react-icons/md";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";

function AdminPanel({ users, stats, locations, locationLookup }) {
  const [activeTab, setActiveTab] = useState("locations");

  // ─────────────────────────────────────────
  // Assign User Modal (Position → Person → Role → Locations)
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
  // NEW: Add Location picker state (Edit modal)
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

    const url = `${route("admin.directory.employees")}?position_id=${encodeURIComponent(
      assignForm.position_id
    )}`;

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

    // reset picker state
    setEditLocPickerOpen(false);
    setEditLocSearch("");

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editProcessing) return;
    setShowEditModal(false);
    setEditingUser(null);

    // reset picker state
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

  // NEW: picker data + close-on-outside + Escape
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

      // If click is outside the wrapper (button + popup), close
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
    toggleEditLocation(Number(id)); // adds if not present
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
        header: "STATUS",
        cell: (row) => {
          const active = isUserActive(row);
          return (
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
          );
        },
      },
      {
        key: "assigned_locations",
        header: "ASSIGNED LOCATIONS",
        cell: (r) => {
          const locs = r.assigned_locations ?? [];
          if (!Array.isArray(locs) || locs.length === 0) return "—";

          const first = locs.slice(0, 2);
          const remaining = locs.length - first.length;

          return (
            <div className="flex flex-wrap gap-1 items-center">
              {first.map((name, idx) => (
                <span
                  key={idx}
                  className="px-1 py-1 rounded-md text-[10px] lg:text-xs lg:font-medium font-semibold bg-[#f2faf1] text-[#289800] border border-[#2DA300]/20"
                >
                  {name}
                </span>
              ))}
              {remaining > 0 ? (
                <span className="px-1 py-[2px] rounded-md text-[10px] font-semibold lg:font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  +{remaining}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "role",
        header: "CURRENT ROLE",
        cell: (r) => r.role ?? "—",
      },
      {
        key: "actions",
        header: "ACTIONS",
        cell: (r) => {
          const active = isUserActive(r);

          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                title="Edit user"
                onClick={() => openEditModal(r)}
              >
                <MdEdit className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
              </button>

              {/* if you want the toggle back, you can re-enable this:
              <button
                type="button"
                className="rounded-md bg-white hover:bg-[#FBFFFA]"
                title={active ? "Deactivate user" : "Activate user"}
                onClick={() => setUserActive(r, !active)}
              >
                {active ? (
                  <BsToggleOn className="text-[26px] text-[#289800]" />
                ) : (
                  <BsToggleOff className="text-[26px] text-slate-400" />
                )}
              </button> */}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locationOptions]
  );

  // ─────────────────────────────────────────
  // Locations table columns
  // ─────────────────────────────────────────
  const locationRows = useMemo(() => {
    const raw = locations?.data ?? locations ?? stats?.locations ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [locations, stats]);

  const locationColumns = useMemo(
    () => [
      { key: "name", header: "LOCATION NAME", cell: (r) => r.name ?? "—" },
      { key: "code", header: "CODE", cell: (r) => r.code ?? "—" },
      {
        key: "status",
        header: "STATUS",
        cell: (r) => {
          const isActive = r.status === "Active" || r.is_active === true || r.active === true;
          return (
            <span
              className={`
                px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider
                ${
                  isActive
                    ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }
              `}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          );
        },
      },
      { key: "users_count", header: "USERS", cell: (r) => r.users_count ?? "—" },
      { key: "approvers_count", header: "APPROVERS", cell: (r) => r.approvers_count ?? "—" },
      {
        key: "actions",
        header: "ACTIONS",
        cell: () => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
              title="Edit"
              onClick={() => {}}
            >
              <MdEdit className="text-[14px]" />
            </button>
            <button
              type="button"
              className="px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10"
              title="Delete"
              onClick={() => {}}
            >
              <MdDelete className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const goToPage = (p) => {
    router.get(route("admin.index"), { page: p }, { preserveScroll: true, preserveState: true });
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
      <Head title="Admin Panel" />

      {/* ASSIGN EMPLOYEE MODAL */}
      <Modal show={showAssignModal} maxWidth="2xl" closeable={!assignProcessing} onClose={closeAssignModal}>
        <div className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-black/10">
            <h3 className="text-sm font-semibold text-slate-900">Assign User</h3>
            <button
              type="button"
              onClick={closeAssignModal}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
              disabled={assignProcessing}
            >
              <IoCloseOutline className="text-xl" />
            </button>
          </div>

          <form onSubmit={submitAssign} className="pt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Position</label>
              <select
                className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
                value={assignForm.position_id}
                onChange={(e) => setAssignForm((p) => ({ ...p, position_id: e.target.value }))}
              >
                <option value="">{loadingPositions ? "Loading..." : "Select a position"}</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {assignErrors.position_id ? <p className="mt-1 text-xs text-red-600">{assignErrors.position_id}</p> : null}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Person</label>
              <select
                className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
                value={assignForm.employee_id}
                onChange={(e) => setAssignForm((p) => ({ ...p, employee_id: e.target.value }))}
                disabled={!assignForm.position_id || loadingEmployees}
              >
                <option value="">
                  {!assignForm.position_id
                    ? "Select a position first"
                    : loadingEmployees
                    ? "Loading employees..."
                    : "Select a person"}
                </option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.employee_code ? ` (${e.employee_code})` : ""}
                    {e.primary_location_name ? ` — ${e.primary_location_name}` : ""}
                  </option>
                ))}
              </select>
              {assignErrors.employee_id ? <p className="mt-1 text-xs text-red-600">{assignErrors.employee_id}</p> : null}

              {selectedEmployee ? (
                <div className="mt-2 text-[11px] text-slate-500">
                  Main location: <span className="font-semibold text-slate-700">{assignMainLocationName ?? "—"}</span>
                </div>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
              <select
                className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
                value={assignForm.role}
                onChange={(e) => setAssignForm((p) => ({ ...p, role: e.target.value }))}
                disabled={!assignForm.employee_id}
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {assignErrors.role ? <p className="mt-1 text-xs text-red-600">{assignErrors.role}</p> : null}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Assigned Locations</label>
              <div className="rounded-lg border border-black/10 bg-[#FBFFFA] p-2 max-h-44 overflow-auto">
                {!assignForm.employee_id ? (
                  <p className="text-xs text-slate-500 p-2">Select a person first.</p>
                ) : locationOptions.length === 0 ? (
                  <p className="text-xs text-slate-500 p-2">No locations found.</p>
                ) : (
                  <div className="space-y-1">
                    {locationOptions.map((loc) => {
                      const id = Number(loc.id);
                      const checked = (assignForm.location ?? []).map(Number).includes(id);
                      const locked = assignMainLocationId && Number(assignMainLocationId) === id;

                      return (
                        <label
                          key={loc.id}
                          className={`flex items-center gap-2 rounded-md px-2 py-1 ${
                            locked ? "bg-white/60" : "hover:bg-white cursor-pointer"
                          }`}
                        >
                          <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggleAssignLocation(id)} />
                          <span className="text-sm text-slate-800">
                            {loc.name}
                            {locked ? <span className="text-[11px] text-slate-500"> (Main)</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {assignErrors.location ? <p className="mt-1 text-xs text-red-600">{assignErrors.location}</p> : null}
              {assignErrors["location.0"] ? <p className="mt-1 text-xs text-red-600">{assignErrors["location.0"]}</p> : null}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10">
              <button
                type="button"
                onClick={closeAssignModal}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={assignProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#289800] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
                disabled={assignProcessing || !assignForm.employee_id}
                title={!assignForm.employee_id ? "Select a person first" : undefined}
              >
                {assignProcessing ? "Saving..." : "Assign User"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal show={showEditModal} maxWidth="2xl" closeable={!editProcessing} onClose={closeEditModal}>
        <div className="p-5 bg-gray-50">
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <h3 className="text-sm font-semibold text-slate-900">Edit User</h3>
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
              disabled={editProcessing}
            >
              <IoCloseOutline className="text-xl" />
            </button>
          </div>

          <form onSubmit={submitEdit} className="pt-4 space-y-4">
            <div className="rounded-md border border-black/10 bg-white p-3">
              <p className="pb-2 text-xs text-slate-500">User</p>
              <p className="text-sm font-semibold text-slate-900">{editingUser?.name ?? "—"}</p>
              <p className="text-[11px] text-slate-500">{editingUser?.email ?? "—"}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                Main location:{" "}
                <span className="font-semibold text-slate-700">
                  {(() => {
                    const pid = getPrimaryLocationId(editingUser);
                    if (!pid) return "—";
                    return locationNameById.get(Number(pid)) ?? `#${pid}`;
                  })()}
                </span>
              </p>
            </div>

            {/* Active toggle inside modal (icon) */}
            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-slate-700">Account Status</p>
                <p className="text-[11px] text-slate-500">Activate or deactivate this account.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditForm((p) => ({ ...p, is_banned: !p.is_banned }))}
                className="px-2 py-1 rounded-md hover:bg-white"
                disabled={!editingUser?.id}
                title={!editForm.is_banned ? "Deactivate" : "Activate"}
              >
                {!editForm.is_banned ? (
                  <BsToggleOn className="text-[34px] text-[#289800]" />
                ) : (
                  <BsToggleOff className="text-[34px] text-slate-400" />
                )}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
              <select
                className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Locations (chips + working Add Location popover) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Assigned Locations</label>

              <div className="rounded-lg border border-black/10 bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  {(editForm.location ?? []).length === 0 ? (
                    <span className="text-xs text-slate-500">No assigned locations.</span>
                  ) : (
                    (editForm.location ?? []).map((locId) => {
                      const id = Number(locId);
                      const loc = locationOptions.find((l) => Number(l.id) === id);
                      if (!loc) return null;

                      const primaryId = getPrimaryLocationId(editingUser);
                      const locked = primaryId && Number(primaryId) === id;

                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs
                                     bg-emerald-100 text-emerald-900 border border-emerald-200"
                          title={locked ? "Main location" : "Remove location"}
                        >
                          <span className="whitespace-nowrap">
                            {loc.name}
                            {locked ? " (Main)" : ""}
                          </span>

                          {!locked && (
                            <button
                              type="button"
                              onClick={() => toggleEditLocation(id)}
                              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full
                                         text-emerald-900/70 hover:text-emerald-900 hover:bg-emerald-200"
                              aria-label={`Remove ${loc.name}`}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })
                  )}

                  {/* Add Location chip + popover */}
                  <div className="relative" ref={editLocPopoverRef}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs
                                 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      onClick={() => setEditLocPickerOpen((v) => !v)}
                      disabled={!editingUser?.id}
                      title={!editingUser?.id ? "Select a user first" : "Add a location"}
                    >
                      + Add Location
                    </button>

                    {editLocPickerOpen && (
                      <div
                        className="absolute z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg"
                        role="dialog"
                        aria-label="Add location"
                      >
                        <div className="p-2">
                          <input
                            autoFocus
                            value={editLocSearch}
                            onChange={(e) => setEditLocSearch(e.target.value)}
                            placeholder="Search locations..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm
                                       outline-none focus:ring-0 focus:border-[#289800]"
                          />
                        </div>

                        <div className="max-h-56 overflow-auto p-1">
                          {editAvailableToAdd.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-500">No locations to add.</div>
                          ) : (
                            editAvailableToAdd.map((loc) => (
                              <button
                                key={loc.id}
                                type="button"
                                onClick={() => addEditLocation(loc.id)}
                                className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-slate-50 active:bg-slate-100"
                              >
                                {loc.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={editProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#289800] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
                disabled={editProcessing || !editingUser?.id}
              >
                {editProcessing ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="mx-10 pt-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-slate-900 md:text-xl lg:text-2xl">Admin Management</h1>
                <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                  Manage system access, roles, and user permissions across all locations.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-slate-500">{formattedDate}</span>
              </div>
            </div>

            <div className="mt-6 border-b border-black/10">
              <div className="flex items-center gap-5">
                <TabButton
                  active={activeTab === "locations"}
                  onClick={() => setActiveTab("locations")}
                  icon={<FiMapPin />}
                  label="Locations"
                />
                <TabButton
                  active={activeTab === "users"}
                  onClick={() => setActiveTab("users")}
                  icon={<FiUsers />}
                  label="Users"
                />

                <div className="ml-auto">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#289800] px-3 py-2 text-white font-semibold shadow-sm hover:brightness-95 md:text-xs lg:text-sm"
                    onClick={() => {
                      if (activeTab === "users") openAssignModal();
                      else router.visit(route("admin.locations.index"));
                    }}
                  >
                    {activeTab === "users" ? "+ New User" : "+ New Location"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {activeTab === "users" ? (
                <>
                  <div className="-mx-4 md:-mx-6 lg:-mx-10 xl:-mx-14">
                    <div className="mx-6 lg:mx-10 xl:mx-14 rounded-lg border border-black/10 bg-white px-4 py-2 shadow-sm">
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
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 -mx-6 lg:-mx-10 xl:-mx-14 gap-4 px-4 md:px-6 lg:px-10 xl:px-14">
                    <StatCard label="Total Users" value={stats?.totalUsers ?? users?.total ?? userRows.length ?? "—"} />
                    <StatCard label="Recently Added" value={stats?.recentlyAddedToday ?? "—"} />
                  </div>
                </>
              ) : (
                <>
                  <div className="-mx-4 md:-mx-6 lg:-mx-10 xl:-mx-14 -mt-5">
                    <ProjectListSection
                      tiles={[]}
                      tableTitle="Locations"
                      columns={locationColumns}
                      rows={locationRows}
                      rowKey={(r, i) => String(r.id ?? i)}
                      pagination={null}
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      label="Total Locations"
                      value={stats?.totalLocations ?? locationRows.length ?? "—"}
                      sub={stats?.newLocationsLabel ?? "+ new"}
                    />
                    <StatCard label="Active Users" value={stats?.activeUsers ?? "—"} />
                  </div>
                </>
              )}
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

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        -mb-px inline-flex items-center gap-2 px-2 py-3 text-[11px] font-semibold md:text-xs lg:text-sm
        ${
          active
            ? "border-b-2 border-[#289800] text-[#289800]"
            : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"
        }
      `}
    >
      <span className="text-sm lg:text-[16px]">{icon}</span>
      {label}
    </button>
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

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        {sub ? (
          <span className="rounded-lg bg-[#B5EBA2]/25 shadow-inner px-2 py-1 text-[10px] font-bold text-[#289800]">
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default AdminPanel;
AdminPanel.layout = (page) => <AuthenticatedLayout children={page} />;