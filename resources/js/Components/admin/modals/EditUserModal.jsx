import { useMemo, useState, useRef, useEffect } from "react";
import AdminFormModal from "@/Components/admin/AdminFormModal";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { router } from '@inertiajs/react';
import { toast } from 'sonner';


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
  onResetPassword,
}) {
  const filteredPositions = useMemo(() => {
    if (!editForm.department_id) return [];
    return positions.filter(
      (position) => String(position.department_id) === String(editForm.department_id)
    );
  }, [positions, editForm.department_id]);

  // --- Signature State & Handlers ---
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showSignatureViewer, setShowSignatureViewer] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);
  const fileInputRef = useRef(null);

  // --- Avatar State & Handlers ---
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const avatarInputRef = useRef(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetResult, setResetResult] = useState(null); // 'success' | 'error'
  const [resetProcessing, setResetProcessing] = useState(false);

// 2. Update the avatarUrl memo to depend on it
const avatarUrl = useMemo(() => {
  if (!editingUser?.employee_id) return null;
  return (
    route('profile.avatar', { employee: editingUser.employee_id }) +
    '?v=' +
    (avatarVersion > 0
      ? avatarVersion  // use local bump after upload
      : new Date(editingUser.updated_at || editingUser.employee_id).getTime())
  );
}, [editingUser?.employee_id, editingUser?.updated_at, avatarVersion]);

useEffect(() => {
  setAvatarError(false);
  setAvatarVersion(0); // ← add this
   setAvatarLoading(true); // ← add this
}, [editingUser?.employee_id]);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must not exceed 2MB.');
      e.target.value = '';
      return;
    }

    setPendingAvatar(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
    setShowAvatarModal(true);
    e.target.value = '';
  };

  function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const handleConfirmAvatarUpload = () => {
    if (!pendingAvatar || !editingUser?.id) return;
    setUploadingAvatar(true);

 router.post(route('admin.users.update-avatar', { id: editingUser.id }), { avatar: pendingAvatar }, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        setAvatarError(false);        // <-- add this
        setAvatarVersion(Date.now());
        router.reload({ only: ['users'] });
        setPendingAvatar(null);
        setPendingAvatarPreview(null);
        setShowAvatarModal(false);
        setUploadingAvatar(false);
        toast.success('Profile picture updated successfully.');
        setAvatarLoading(true);
      },
      onError: () => {
        setUploadingAvatar(false);
        toast.error('Failed to update profile picture. Please try again.');
      },
    });
  };


  const handleConfirmReset = () => {
    setResetProcessing(true);
    onResetPassword(editingUser.id, {
      onSuccess: () => {
        setResetProcessing(false);
        setShowResetConfirm(false);
        setResetResult('success');
      },
      onError: () => {
        setResetProcessing(false);
        setShowResetConfirm(false);
        setResetResult('error');
      },
    });
  };

  const handleCancelAvatarModal = () => {
    setPendingAvatar(null);
    setPendingAvatarPreview(null);
    setShowAvatarModal(false);
  };

  const signatureUrl = useMemo(() => {
    if (!editingUser?.employee_id) return null;
    return `/storage/signatures/${editingUser.employee_id}.png?v=${uploadVersion || new Date().getTime()}`;
  }, [editingUser, uploadVersion]);

  const handleOpenSignatureModal = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setShowSignatureModal(true);
  };

  const handleCloseSignatureModal = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setShowSignatureModal(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('File size must not exceed 3MB.');
      e.target.value = '';
      return;
    }

    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleConfirmUpload = () => {
    if (!pendingFile || !editingUser?.id) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('signature', pendingFile);

    router.post(`/admin/users/${editingUser?.id}/signature`, formData, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        setUploadVersion(new Date().getTime());
        setPendingFile(null);
        setPendingPreview(null);
        setShowSignatureModal(false);
        setUploading(false);
        toast.success('Signature uploaded successfully.');
      },
      onError: () => {
        setUploading(false);
        toast.error('Failed to upload signature. Please try again.');
      },
    });
  };

  const handleCloseModal = () => {
    setPendingFile(null);
    setPendingPreview(null);
    onClose();
  };

  const cardStyle = "overflow-hidden rounded-xl border border-black/10 bg-[#FBFFFA] p-4";

  return (
    <AdminFormModal
      show={show}
      onClose={handleCloseModal}
      processing={processing}
      title="Edit User"
      maxWidth="2xl"
    >
      {/* Outer form: flex column, height-constrained so inner body scrolls */}
      <form onSubmit={onSubmit} className="flex flex-col max-h-[75vh]">

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">

          {/* User identity header: avatar left, name + email center, change profile right */}
          <div className="flex items-center gap-4 rounded-xl border border-black/10 bg-white p-3">

            {/* Avatar — click to view if exists */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => (avatarUrl && !avatarError) ? setShowAvatarViewer(true) : avatarInputRef.current?.click()}
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-darkgreen to-green text-base font-semibold text-white shadow-sm"
                title={(avatarUrl && !avatarError) ? 'View profile picture' : 'Upload profile picture'}
              >
                {(avatarUrl && !avatarError) ? (
                  <div className="relative h-full w-full">
                    {avatarLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full">
                        <svg
                          className="h-5 w-5 animate-spin text-darkgreen"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      </div>
                    )}
                    <img
                      src={avatarUrl}
                      alt={editingUser ? `${editingUser.first_name} ${editingUser.last_name}` : 'User'}
                      className="h-full w-full object-cover"
                      onLoad={() => setAvatarLoading(false)}   // ← hides spinner when done
                      onError={() => { setAvatarError(true); setAvatarLoading(false); }}
                    />
                  </div>
                ) : (
                  getInitials(
                    editingUser
                      ? `${editingUser.first_name ?? ''} ${editingUser.last_name ?? ''}`.trim()
                      : ''
                  )
                )}
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />

            {/* Name + email */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">
                {editingUser
                  ? `${editingUser.first_name ?? ''} ${editingUser.last_name ?? ''}`.trim() || '—'
                  : '—'}
              </p>
              <p className="truncate text-xs text-slate-500">{editingUser?.email ?? '—'}</p>
            </div>

            {/* Change profile button */}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="shrink-0 text-xs font-medium text-darkgreen transition hover:text-[#2a9e00]"
              title="Change profile picture"
            >
              Change profile <span aria-hidden="true">›</span>
            </button>
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
                    company_position_id: "",
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
                value={editForm.company_position_id ?? ""}
                onChange={(e) => {
                  const selectedPosition = filteredPositions.find(
                    (position) => String(position.id) === e.target.value
                  );
                  setEditForm((p) => ({
                    ...p,
                    company_position_id: e.target.value,
                    position: selectedPosition?.name ?? "",
                  }));
                }}
                disabled={!editForm.department_id}
              >
                <option value="">
                  {!editForm.department_id
                    ? "Select a department first"
                    : "Select a position"}
                </option>
                {filteredPositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
              {editErrors?.company_position_id || editErrors?.position ? (
                <p className="mt-1 text-xs text-red-600">
                  {editErrors.company_position_id ?? editErrors.position}
                </p>
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

          {/* Signature Management Field */}
          <div className={cardStyle}>
            <SignatureRow
              icon={<SignatureIcon />}
              title="Employee Signature"
              subtitle="View or upload the user's signature. Max: 3MB."
              action={signatureUrl ? 'Change' : 'Upload'}
              onAction={handleOpenSignatureModal}
              onView={() => setShowSignatureViewer(true)}
              signatureUrl={signatureUrl}
            />
          </div>

          {/* 75% / 25% Split for Account Status & Reset Password */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-[#FBFFFA] px-3 py-2 md:col-span-3">
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

            <div className="flex items-center justify-center rounded-lg px-3 py-2 md:col-span-1">
           <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#289800] disabled:opacity-50"
              disabled={processing || !editingUser?.id}
            >
              Reset Password
            </button>
            </div>
          </div>

        </div>
        {/* ── End scrollable body ── */}

        {/* ── Sticky footer — always visible ── */}
        <div className="flex items-center justify-end gap-3 border-t border-black/10 pt-4 mt-4 bg-white shrink-0">
          <button
            type="button"
            onClick={handleCloseModal}
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

      {/* ── Avatar Viewer Modal ── */}
      {showAvatarViewer && avatarUrl && !avatarError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
          onClick={() => setShowAvatarViewer(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-viewer-title"
          >
            <div className="flex items-center justify-between">
              <h2 id="avatar-viewer-title" className="text-lg font-semibold">
                Profile Picture
              </h2>
              <button
                type="button"
                onClick={() => setShowAvatarViewer(false)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6">
              <div className="w-full rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-6">
                <img
                  src={avatarUrl}
                  alt={editingUser ? `${editingUser.first_name} ${editingUser.last_name}` : 'User'}
                  className="h-48 w-48 rounded-full object-cover border-4 border-white shadow-md"
                />
              </div>
              <p className="mt-3 text-center text-sm font-semibold text-gray-800">
                {editingUser ? `${editingUser.first_name ?? ''} ${editingUser.last_name ?? ''}`.trim() : '—'}
              </p>
              {editingUser?.position && (
                <p className="text-center text-xs text-gray-400 mt-0.5">{editingUser.position}</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowAvatarViewer(false);
                  avatarInputRef.current?.click();
                }}
                className="text-xs font-medium text-darkgreen transition hover:text-[#2a9e00]"
              >
                Change Picture <span aria-hidden="true">›</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAvatarViewer(false)}
                className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Avatar Upload Confirmation Modal ── */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
          onClick={handleCancelAvatarModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-modal-title"
          >
            <div className="flex items-center justify-between">
              <h2 id="avatar-modal-title" className="text-lg font-semibold">
                Update Profile Picture
              </h2>
              <button
                type="button"
                onClick={handleCancelAvatarModal}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">Preview</p>
                <div className="w-full h-48 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden p-3">
                  {pendingAvatarPreview ? (
                    <img
                      src={pendingAvatarPreview}
                      alt="Avatar preview"
                      className="max-h-full max-w-full object-contain rounded-full aspect-square border"
                    />
                  ) : (
                    <p className="text-sm text-gray-300">No image selected</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-3">
                <button
                  type="button"
                  onClick={handleCancelAvatarModal}
                  className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAvatarUpload}
                  disabled={!pendingAvatar || uploadingAvatar}
                  className="rounded-xl bg-[#289800] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingAvatar ? 'Uploading…' : 'Save Picture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Signature Upload Modal ── */}
      {showSignatureModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
          onClick={handleCloseSignatureModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload Signature</h2>
              <button
                type="button"
                onClick={handleCloseSignatureModal}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">Preview</p>
                <div className="w-full h-40 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden p-2">
                  {pendingPreview ? (
                    <img
                      src={pendingPreview}
                      alt="Signature preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-gray-300">No new image selected</p>
                  )}
                </div>
              </div>

              <div>
                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">Select Image</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 hover:border-[#289800] hover:bg-green-50 hover:text-[#289800] transition text-left truncate"
                >
                  {pendingFile ? (
                    <span className="text-gray-700 font-medium">{pendingFile.name}</span>
                  ) : (
                    <span>Click to browse — PNG, JPG, JPEG, WEBP up to 3MB</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-end gap-4 pt-3">
                <button
                  type="button"
                  onClick={handleCloseSignatureModal}
                  className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={!pendingFile || uploading}
                  className="rounded-xl bg-[#289800] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Signature Viewer Modal ── */}
      {showSignatureViewer && signatureUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
          onClick={() => setShowSignatureViewer(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Employee Signature</h2>
              <button
                type="button"
                onClick={() => setShowSignatureViewer(false)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6">
              <div className="w-full h-72 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-2">
                <img
                  src={signatureUrl}
                  alt="Signature preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowSignatureViewer(false)}
                  className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Confirmation Modal ── */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
          onClick={() => !resetProcessing && setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Reset Password</h2>
              <button
                type="button"
                onClick={() => !resetProcessing && setShowResetConfirm(false)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Are you sure you want to reset this user's password?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={resetProcessing}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetProcessing}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
              >
                {resetProcessing ? 'Resetting…' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Result Modal ── */}
      {resetResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
          onClick={() => setResetResult(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Icon */}
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              resetResult === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {resetResult === 'success' ? (
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-base font-semibold text-slate-900">
                {resetResult === 'success' ? 'Password Reset Sent' : 'Reset Failed'}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {resetResult === 'success'
                  ? 'The password reset has been triggered successfully.'
                  : 'Something went wrong. Please try again.'}
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="rounded-lg bg-[#289800] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


    </AdminFormModal>
  );
}

// ── Sub-components ──

function SignatureRow({ icon, title, subtitle, action, onAction, onView, signatureUrl }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-black/10">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {signatureUrl ? (
          <button
            type="button"
            onClick={onView}
            className="h-10 w-28 rounded-lg border border-black/10 bg-white overflow-hidden flex items-center justify-center hover:border-black/20 hover:shadow-sm transition"
            title="Click to view signature"
          >
            <img
              src={signatureUrl}
              alt="Signature preview"
              className="h-full w-full object-contain p-1"
            />
          </button>
        ) : (
          <div className="h-10 w-28 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <p className="text-[10px] text-gray-300">No signature</p>
          </div>
        )}
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-medium text-darkgreen transition hover:text-[#2a9e00]"
        >
          {action} <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  );
}

function SignatureIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15c2-4 3-7 4-7s1.5 3 2.5 3S11 8 12 8s1.5 4 2.5 4S16 10 17 9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}