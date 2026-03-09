import { useMemo } from "react";
import AdminFormModal from "@/Components/admin/AdminFormModal";

export default function NewUserModal({
  show,
  onClose,
  processing,

  // data
  positions,
  loadingPositions,
  departments,
  loadingDepartments,
  locationOptions,

  // form
  assignForm,
  setAssignForm,
  assignErrors,

  // actions
  onSubmit,
}) {
  const filteredPositions = useMemo(() => {
    if (!assignForm.department_id) return [];
    return positions.filter(
      (position) => String(position.department_id) === String(assignForm.department_id)
    );
  }, [positions, assignForm.department_id]);

  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="New User"
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              First Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
              value={assignForm.first_name ?? ""}
              onChange={(e) =>
                setAssignForm((p) => ({ ...p, first_name: e.target.value }))
              }
              placeholder="Enter first name"
            />
            {assignErrors.first_name ? (
              <p className="mt-1 text-xs text-red-600">{assignErrors.first_name}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Last Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
              value={assignForm.last_name ?? ""}
              onChange={(e) =>
                setAssignForm((p) => ({ ...p, last_name: e.target.value }))
              }
              placeholder="Enter last name"
            />
            {assignErrors.last_name ? (
              <p className="mt-1 text-xs text-red-600">{assignErrors.last_name}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Employee ID
            </label>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
              value={assignForm.employee_id ?? ""}
              onChange={(e) =>
                setAssignForm((p) => ({ ...p, employee_id: e.target.value }))
              }
              placeholder="Enter employee ID"
            />
            {assignErrors.employee_id ? (
              <p className="mt-1 text-xs text-red-600">{assignErrors.employee_id}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
              value={assignForm.email ?? ""}
              onChange={(e) =>
                setAssignForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="Enter email address"
            />
            {assignErrors.email ? (
              <p className="mt-1 text-xs text-red-600">{assignErrors.email}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Department
            </label>
            <select
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
              value={assignForm.department_id ?? ""}
              onChange={(e) =>
                setAssignForm((p) => ({
                  ...p,
                  department_id: e.target.value,
                  department:
                    departments.find((d) => String(d.id) === e.target.value)?.name ?? "",
                  position: "",
                }))
              }
            >
              <option value="">
                {loadingDepartments ? "Loading departments..." : "Select a department"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {assignErrors.department_id ? (
              <p className="mt-1 text-xs text-red-600">{assignErrors.department_id}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Position
            </label>
            <select
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30 disabled:bg-slate-100"
              value={assignForm.position ?? ""}
              onChange={(e) =>
                setAssignForm((p) => ({ ...p, position: e.target.value }))
              }
              disabled={!assignForm.department_id || loadingPositions}
            >
              <option value="">
                {!assignForm.department_id
                  ? "Select a department first"
                  : loadingPositions
                  ? "Loading positions..."
                  : "Select a position"}
              </option>
              {filteredPositions.map((position) => (
                <option key={position.id} value={position.name}>
                  {position.name}
                </option>
              ))}
            </select>
            {assignErrors.position ? (
              <p className="mt-1 text-xs text-red-600">{assignErrors.position}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Location
          </label>
          <select
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#289800]/30"
            value={assignForm.primary_location_id ?? ""}
            onChange={(e) =>
              setAssignForm((p) => ({
                ...p,
                primary_location_id: e.target.value,
              }))
            }
          >
            <option value="">Select a location</option>
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          {assignErrors.primary_location_id ? (
            <p className="mt-1 text-xs text-red-600">
              {assignErrors.primary_location_id}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#289800]/15 bg-[#F7FFF3] px-3 py-2 text-xs text-slate-600">
          Default password: <span className="font-semibold text-slate-800">P@ssw0rd</span>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-black/10 pt-4">
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
            disabled={
              processing ||
              !assignForm.first_name ||
              !assignForm.last_name ||
              !assignForm.employee_id ||
              !assignForm.email ||
              !assignForm.department_id ||
              !assignForm.position ||
              !assignForm.primary_location_id
            }
          >
            {processing ? "Saving..." : "Create User"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}