import { useMemo } from "react";
import AdminFormModal from "@/Components/admin/AdminFormModal";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";

export default function EditUserModal({
  show,
  onClose,
  processing,
  editingUser,

  // options
  locationOptions,
  positions,
  departments,
  loadingDepartments,

  // form
  editForm,
  setEditForm,
  editErrors,

  // actions
  onSubmit,
}) {
  const filteredPositions = useMemo(() => {
    if (!editForm.department_id) return [];
    return positions.filter(
      (position) => String(position.department_id) === String(editForm.department_id)
    );
  }, [positions, editForm.department_id]);

  return (
    <AdminFormModal
      show={show}
      onClose={onClose}
      processing={processing}
      title="Edit User"
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col rounded-md border justify-center items-center border-black/10 bg-white p-3">
          <p className="text-base font-bold text-slate-900">
            {editingUser
              ? `${editingUser.first_name ?? ""} ${editingUser.last_name ?? ""}`.trim()
              : "—"}
          </p>
          <p className="text-sm text-slate-500">{editingUser?.email ?? "—"}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              First Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
              value={editForm.first_name ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, first_name: e.target.value }))
              }
              placeholder="Enter first name"
            />
            {editErrors?.first_name ? (
              <p className="mt-1 text-xs text-red-600">{editErrors.first_name}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Last Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
              value={editForm.last_name ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, last_name: e.target.value }))
              }
              placeholder="Enter last name"
            />
            {editErrors?.last_name ? (
              <p className="mt-1 text-xs text-red-600">{editErrors.last_name}</p>
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
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
              value={editForm.employee_id ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, employee_id: e.target.value }))
              }
              placeholder="Enter employee ID"
            />
            {editErrors?.employee_id ? (
              <p className="mt-1 text-xs text-red-600">{editErrors.employee_id}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
              value={editForm.email ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="Enter email address"
            />
            {editErrors?.email ? (
              <p className="mt-1 text-xs text-red-600">{editErrors.email}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Department
            </label>
            <select
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
              value={editForm.department_id ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({
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
            {editErrors?.department_id ? (
              <p className="mt-1 text-xs text-red-600">{editErrors.department_id}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Position
            </label>
            <select
              className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800] disabled:bg-slate-100"
              value={editForm.position ?? ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, position: e.target.value }))
              }
              disabled={!editForm.department_id}
            >
              <option value="">
                {!editForm.department_id
                  ? "Select a department first"
                  : "Select a position"}
              </option>
              {filteredPositions.map((position) => (
                <option key={position.id} value={position.name}>
                  {position.name}
                </option>
              ))}
            </select>
            {editErrors?.position ? (
              <p className="mt-1 text-xs text-red-600">{editErrors.position}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Location
          </label>
          <select
            className="w-full rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-0 focus:border-[#289800]"
            value={editForm.primary_location_id ?? ""}
            onChange={(e) =>
              setEditForm((p) => ({
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
          {editErrors?.primary_location_id ? (
            <p className="mt-1 text-xs text-red-600">
              {editErrors.primary_location_id}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2">
          <div>
            <p className="text-xs font-semibold text-slate-700">Account Status</p>
            <p className="text-[11px] text-slate-500">
              Activate or deactivate this account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditForm((p) => ({ ...p, is_banned: !p.is_banned }))}
            className="rounded-md px-2 py-1 hover:bg-white"
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
            disabled={processing || !editingUser?.id}
          >
            {processing ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </AdminFormModal>
  );
}