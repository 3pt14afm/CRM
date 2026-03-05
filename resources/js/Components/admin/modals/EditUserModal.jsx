import { useEffect, useRef } from "react";
import AdminFormModal from "@/Components/admin/AdminFormModal";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";

export default function EditUserModal({
  show,
  onClose,
  processing,

  // user + maps
  editingUser,
  locationNameById,

  // options
  roleOptions,
  locationOptions,

  // form
  editForm,
  setEditForm,

  // helpers + actions
  getPrimaryLocationId,
  toggleEditLocation,
  editLocPickerOpen,
  setEditLocPickerOpen,
  editLocSearch,
  setEditLocSearch,
  editAvailableToAdd,
  addEditLocation,
  onSubmit,
}) {
  const popoverRef = useRef(null);

  // close popover on outside + escape (same behavior as your page)
  useEffect(() => {
    if (!editLocPickerOpen) return;

    const onMouseDown = (e) => {
      const wrap = popoverRef.current;
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
  }, [editLocPickerOpen, setEditLocPickerOpen]);

  return (
    <AdminFormModal show={show} onClose={onClose} processing={processing} title="Edit User" maxWidth="2xl">
      <form onSubmit={onSubmit} className="space-y-4">
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

        {/* Active toggle */}
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

        {/* Assigned Locations */}
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
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-emerald-100 text-emerald-900 border border-emerald-200"
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
                          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-emerald-900/70 hover:text-emerald-900 hover:bg-emerald-200"
                          aria-label={`Remove ${loc.name}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })
              )}

              {/* Add Location popover */}
              <div className="relative" ref={popoverRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  onClick={() => setEditLocPickerOpen((v) => !v)}
                  disabled={!editingUser?.id}
                  title={!editingUser?.id ? "Select a user first" : "Add a location"}
                >
                  + Add Location
                </button>

                {editLocPickerOpen && (
                  <div className="absolute z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg" role="dialog">
                    <div className="p-2">
                      <input
                        autoFocus
                        value={editLocSearch}
                        onChange={(e) => setEditLocSearch(e.target.value)}
                        placeholder="Search locations..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-0 focus:border-[#289800]"
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
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#289800] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
            disabled={processing || !editingUser?.id}
          >
            {processing ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}