import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef, useMemo } from 'react';
import ChangePasswordModal from './Partials/ChangePasswordModal';
import { toast } from 'sonner';

export default function Edit({ profile }) {
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showSignatureViewer, setShowSignatureViewer] = useState(false);

    // Profile Picture state variables
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [showAvatarViewer, setShowAvatarViewer] = useState(false);
    const [pendingAvatar, setPendingAvatar] = useState(null);
    const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef(null);

    const signatureUrl = useMemo(() => {
        if (!profile.signature) return null;
        const cleanBaseUrl = profile.signature.split('?')[0];
        return `${cleanBaseUrl}?v=${new Date(profile.updated_at || Date.now()).getTime()}`;
    }, [profile]);

    const avatarUrl = profile.hasAvatar
        ? route('profile.avatar') + '?v=' + new Date(profile.updated_at || Date.now()).getTime()
        : null;

    const [pendingFile, setPendingFile] = useState(null);
    const [pendingPreview, setPendingPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const subtitle = [profile.position, profile.department].filter(Boolean).join(' • ');

    const cardStyle = "overflow-hidden rounded-2xl bg-white border border-[#00000010] border-b-black/20 border-r-black/20 shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)]";

    const locationName = typeof profile.location === 'object' && profile.location !== null ? profile.location.name : profile.location;
    const locationAddress = typeof profile.location === 'object' && profile.location !== null ? profile.location.address : profile.location;
    const mapQuery = encodeURIComponent(locationAddress || 'Cebu City, Philippines');

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
        if (!pendingFile) return;
        setUploading(true);

        router.post(route('profile.signature'), { signature: pendingFile }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['profile'] });
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

    // Profile picture selection logic
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

    const handleConfirmAvatarUpload = () => {
        if (!pendingAvatar) return;
        setUploadingAvatar(true);

        router.post(route('profile.update-avatar'), { avatar: pendingAvatar }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['profile'] });
                setPendingAvatar(null);
                setPendingAvatarPreview(null);
                setShowAvatarModal(false);
                setUploadingAvatar(false);
                toast.success('Profile picture updated successfully.');
            },
            onError: () => {
                setUploadingAvatar(false);
                toast.error('Failed to update profile picture. Please try again.');
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Profile
                </h2>
            }
        >
            <Head title="Profile" />

            <div className="flex min-h-screen justify-center bg-gradient-to-br from-green-50 via-white to-[#31a307]/10 py-4">
                <div className="w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl space-y-6 border border-gray rounded-2xl bg-white p-7">

                    {/* Top Banner & Profile Info Overlay */}
                    <div className="mb-8">
                        <div className="h-32 w-full rounded-2xl bg-gradient-to-br from-darkgreen/50 to-green/50 shadow-sm"></div>
                        <div className="px-8 -mt-9 flex flex-row items-end gap-4">

                            {/* Profile Picture Avatar Section */}
                            <div className="relative group">
                                {/* Clickable avatar — opens viewer if has avatar, else file picker */}
                                <button
                                    type="button"
                                    onClick={() => avatarUrl ? setShowAvatarViewer(true) : avatarInputRef.current?.click()}
                                    className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-darkgreen to-green text-xl font-semibold text-white shadow-sm"
                                    title={avatarUrl ? 'View profile picture' : 'Upload profile picture'}
                                >
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt={profile.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        getInitials(profile.name)
                                    )}
                                </button>

                                {/* Hidden file input */}
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    onChange={handleAvatarSelect}
                                />

                                {/* Edit pencil button */}
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                                    title="Change Profile Picture"
                                >
                                    <EditPenIcon />
                                </button>
                            </div>

                            <div className="mb-1">
                                <h3 className="text-lg font-semibold text-slate-900">{profile.name}</h3>
                                {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Main Grid Layout */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                        {/* Left Column */}
                        <div className="space-y-6 lg:col-span-2">

                            {/* Personal Information */}
                            <div className={cardStyle}>
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center gap-2 pb-4">
                                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Basic Information
                                        </h4>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <InfoField label="Employee ID" value={profile.employeeId} />
                                        <InfoField label="Full Name" value={profile.name} />
                                        <InfoField label="Email" value={profile.email} />
                                        <InfoField label="Location" value={locationName} />
                                    </div>
                                </div>
                            </div>

                            {/* Security & Access */}
                            <div className={cardStyle}>
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center gap-2 pb-4">
                                        <LockIcon className="h-4 w-4 text-gray-500" />
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Security & Access
                                        </h4>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <SecurityRow
                                            icon={<LockIcon />}
                                            title="Account Password"
                                            subtitle="Update your password to keep your account secure."
                                            action="Change Password"
                                            onAction={() => setShowPasswordModal(true)}
                                        />
                                        <SecurityRow
                                            icon={<ShieldIcon />}
                                            title="Two-Factor Authentication"
                                            subtitle="Not yet available"
                                            action="Manage"
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Signature */}
                            <div className={cardStyle}>
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center gap-2 pb-4">
                                        <SignatureIcon className="h-4 w-4 text-gray-500" />
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Signature
                                        </h4>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <SignatureRow
                                            icon={<SignatureIcon />}
                                            title="Employee Signature"
                                            subtitle="Upload your signature. Max file size: 3MB."
                                            action={signatureUrl ? 'Change' : 'Upload'}
                                            onAction={handleOpenSignatureModal}
                                            onView={() => setShowSignatureViewer(true)}
                                            signatureUrl={signatureUrl}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Right Column */}
                        <div className="space-y-6 lg:col-span-1">
                            <div className={cardStyle}>
                                <div className="p-2 sm:p-4">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 pb-2">
                                        Location
                                    </h4>
                                    <div className="overflow-hidden rounded-lg border border-gray-200 h-60 w-full bg-gray-100">
                                        <iframe
                                            title="User Location"
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            loading="lazy"
                                            allowFullScreen
                                            src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                                        ></iframe>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ChangePasswordModal
                show={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />

            {/* ── Avatar Viewer Modal ── */}
            {showAvatarViewer && avatarUrl && (
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
                                    alt={profile.name}
                                    className="h-48 w-48 rounded-full object-cover border-4 border-white shadow-md"
                                />
                            </div>
                            <p className="mt-3 text-center text-sm font-semibold text-gray-800">{profile.name}</p>
                            {profile.position && (
                                <p className="text-center text-xs text-gray-400 mt-0.5">{profile.position}</p>
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
                    onClick={() => {
                        setPendingAvatar(null);
                        setPendingAvatarPreview(null);
                        setShowAvatarModal(false);
                    }}
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
                                onClick={() => {
                                    setPendingAvatar(null);
                                    setPendingAvatarPreview(null);
                                    setShowAvatarModal(false);
                                }}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div>
                                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">
                                    Preview
                                </p>
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
                                    onClick={() => {
                                        setPendingAvatar(null);
                                        setPendingAvatarPreview(null);
                                        setShowAvatarModal(false);
                                    }}
                                    className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmAvatarUpload}
                                    disabled={!pendingAvatar || uploadingAvatar}
                                    className="rounded-xl bg-[#289800] px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                        aria-labelledby="signature-modal-title"
                    >
                        <div className="flex items-center justify-between">
                            <h2 id="signature-modal-title" className="text-lg font-semibold">
                                {signatureUrl ? 'Change Signature' : 'Upload Signature'}
                            </h2>
                            <button
                                type="button"
                                onClick={handleCloseSignatureModal}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div>
                                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">
                                    Preview
                                </p>
                                <div className="w-full h-40 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                    {pendingPreview ? (
                                        <img
                                            src={pendingPreview}
                                            alt="Signature preview"
                                            className="max-h-full max-w-full object-contain p-3"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-300">No image selected</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">
                                    Select Image
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 hover:border-[#289800] hover:bg-green-50 hover:text-[#289800] transition text-left"
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
                                    className="rounded-xl bg-[#289800] px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                        aria-labelledby="signature-viewer-title"
                    >
                        <div className="flex items-center justify-between">
                            <h2 id="signature-viewer-title" className="text-lg font-semibold">
                                My Signature
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowSignatureViewer(false)}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="mt-6">
                            <div className="w-full h-48 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                <img
                                    src={signatureUrl}
                                    alt="My signature"
                                    className="max-h-full max-w-full object-contain p-4"
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
        </AuthenticatedLayout>
    );
}

function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function InfoField({ label, value }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-400">{label}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{value || '—'}</p>
        </div>
    );
}

function SecurityRow({ icon, title, subtitle, action, onAction, disabled = false }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl pb-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-500 ring-1 ring-gray-300">
                    {icon}
                </div>
                <div>
                    <p className="text-[13px] font-medium text-gray-900">{title}</p>
                    <p className="text-[11px] text-gray-400">{subtitle}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={onAction}
                disabled={disabled}
                className={
                    disabled
                        ? 'cursor-not-allowed text-xs font-medium text-gray-300'
                        : 'text-xs font-medium text-darkgreen transition hover:text-[#2a9e00]'
                }
            >
                {action} <span aria-hidden="true">›</span>
            </button>
        </div>
    );
}

function SignatureRow({ icon, title, subtitle, action, onAction, onView, signatureUrl = null }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl pb-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-500 ring-1 ring-gray-300">
                    {icon}
                </div>
                <div>
                    <p className="text-[13px] font-medium text-gray-900">{title}</p>
                    <p className="text-[11px] text-gray-400">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {signatureUrl ? (
                    <button
                        type="button"
                        onClick={onView}
                        className="h-10 w-32 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center hover:border-gray-400 hover:shadow-sm transition"
                        title="Click to view"
                    >
                        <img
                            src={signatureUrl}
                            alt="Signature preview"
                            className="h-full w-full object-contain p-1"
                        />
                    </button>
                ) : (
                    <div className="h-10 w-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
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

function LockIcon({ className = "h-5 w-5" }) {
    return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
            <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" strokeLinecap="round" />
        </svg>
    );
}

function ShieldIcon({ className = "h-5 w-5" }) {
    return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
                d="M10 2.5l6 2.25v4.5c0 4-2.6 6.75-6 8.25-3.4-1.5-6-4.25-6-8.25v-4.5L10 2.5Z"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function SignatureIcon({ className = "h-5 w-5" }) {
    return (
        <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15c2-4 3-7 4-7s1.5 3 2.5 3S11 8 12 8s1.5 4 2.5 4S16 10 17 9" />
        </svg>
    );
}

function EditPenIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
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