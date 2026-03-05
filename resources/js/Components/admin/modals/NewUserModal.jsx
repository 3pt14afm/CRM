import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function NewUserModal({
  show,
  onClose,
  processing,

  // data
  positions,
  employees,
  loadingPositions,
  loadingEmployees,
  locationOptions,
  roleOptions,
  selectedEmployee,
  assignMainLocationName,
  assignMainLocationId,

  // form
  assignForm,
  setAssignForm,
  assignErrors,

  // actions
  toggleAssignLocation,
  onSubmit,
}) {
  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="Assign User"
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#289800] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
            disabled={processing || !assignForm.employee_id}
            title={!assignForm.employee_id ? "Select a person first" : undefined}
          >
            {processing ? "Saving..." : "Assign User"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}