import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { EditPenIcon, CloseIcon } from './ProfileIcons';

function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileBanner({ profile }) {
    const [showAvatarViewer, setShowAvatarViewer] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [pendingAvatar, setPendingAvatar] = useState(null);
    const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef(null);
    const [avatarLoading, setAvatarLoading] = useState(true);

    const avatarUrl = profile.hasAvatar
      ? route('profile.avatar', { employee: profile.employeeId }) + '?v=' + new Date(profile.updated_at || Date.now()).getTime()
        : null;

    const subtitle = [profile.position, profile.department].filter(Boolean).join(' • ');

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
                setAvatarLoading(true);   // ← reset so spinner shows for new image
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

    const handleCancelAvatarModal = () => {
        setPendingAvatar(null);
        setPendingAvatarPreview(null);
        setShowAvatarModal(false);
    };

    return (
        <>
            <div className="mb-8">
                {/* Banner */}
                <div className="h-24 sm:h-32 w-full rounded-2xl bg-gradient-to-br from-darkgreen/50 to-green/50 shadow-sm" />

                {/* Avatar + Name Row */}
                <div className="px-4 sm:px-8 -mt-7 sm:-mt-9 flex flex-row items-end gap-3 sm:gap-4">

                    {/* Avatar */}
                    <div className="relative group shrink-0">
                        <button
                            type="button"
                            onClick={() => avatarUrl ? setShowAvatarViewer(true) : avatarInputRef.current?.click()}
                            className="flex h-16 w-16 sm:h-24 sm:w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-darkgreen to-green text-base sm:text-xl font-semibold text-white shadow-sm"
                            title={avatarUrl ? 'View profile picture' : 'Upload profile picture'}
                        >
                        {avatarUrl ? (
                            <div className="relative h-full w-full">
                                {avatarLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-darkgreen to-green">
                                        <svg
                                            className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-white/70"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                    </div>
                                )}
                                <img
                                    src={avatarUrl}
                                    alt={profile.name}
                                    onLoad={() => setAvatarLoading(false)}
                                    onError={() => setAvatarLoading(false)}
                                    className={`h-full w-full object-cover transition-opacity duration-300 ${avatarLoading ? "opacity-0" : "opacity-100"}`}
                                />
                            </div>
                        ) : (
                            getInitials(profile.name)
                        )}
                        </button>

                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={handleAvatarSelect}
                        />

                        <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute bottom-0 right-0 flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                            title="Change Profile Picture"
                        >
                            <EditPenIcon />
                        </button>
                    </div>

                    {/* Name + Subtitle */}
                    <div className="mb-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{profile.name}</h3>
                        {subtitle && <p className="text-xs sm:text-[13px] text-slate-500 truncate">{subtitle}</p>}
                    </div>
                </div>
            </div>

            {/* Avatar Viewer Modal */}
            {showAvatarViewer && avatarUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
                    onClick={() => setShowAvatarViewer(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-7"
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
                            <div className="w-full rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-4 sm:p-6">
                                <img
                                    src={avatarUrl}
                                    alt={profile.name}
                                    className="h-36 w-36 sm:h-48 sm:w-48 rounded-full object-cover border-4 border-white shadow-md"
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

            {/* Avatar Upload Confirmation Modal */}
            {showAvatarModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
                    onClick={handleCancelAvatarModal}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-7"
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
                                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">
                                    Preview
                                </p>
                                <div className="w-full h-40 sm:h-48 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden p-3">
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
                                    className="rounded-xl bg-[#289800] px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {uploadingAvatar ? 'Uploading…' : 'Save Picture'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}