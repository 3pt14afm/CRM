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

    const avatarUrl = profile.hasAvatar
        ? route('profile.avatar') + '?v=' + new Date(profile.updated_at || Date.now()).getTime()
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
                <div className="h-32 w-full rounded-2xl bg-gradient-to-br from-darkgreen/50 to-green/50 shadow-sm" />

                {/* Avatar + Name Row */}
                <div className="px-8 -mt-9 flex flex-row items-end gap-4">

                    {/* Avatar */}
                    <div className="relative group">
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
                            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                            title="Change Profile Picture"
                        >
                            <EditPenIcon />
                        </button>
                    </div>

                    {/* Name + Subtitle */}
                    <div className="mb-1">
                        <h3 className="text-lg font-semibold text-slate-900">{profile.name}</h3>
                        {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
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

            {/* Avatar Upload Confirmation Modal */}
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