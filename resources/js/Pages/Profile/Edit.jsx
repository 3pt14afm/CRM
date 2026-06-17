import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ChangePasswordModal from './Partials/ChangePasswordModal';

export default function Edit({ profile }) {
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const subtitle = [profile.position, profile.department].filter(Boolean).join(' • ');

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Profile
                </h2>
            }
        >
            <Head title="Profile" />

            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-[#31a307]/10 px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-2xl">
                    <div className="overflow-hidden rounded-2xl bg-white border border-[#00000010] border-b-black/20 border-r-black/20 shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)]">
                        {/* Header: avatar + name + role */}
                        <div className="flex items-center gap-4 p-6 sm:p-8">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-darkgreen to-green text-xl font-semibold text-white">
                                {getInitials(profile.name)}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{profile.name}</h3>
                                {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Personal Information — read-only */}
                        <div className="p-6 sm:p-8">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 pb-3">
                                Personal Information
                            </h4>
                            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <InfoField label="Employee ID" value={profile.employeeId} />
                                <InfoField label="Full Name" value={profile.name} />
                                <InfoField label="Email" value={profile.email} />
                                <InfoField label="Location" value={profile.location} />
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Security & Access */}
                        <div className="p-6 sm:p-8">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                Security &amp; Access
                            </h4>

                            <div className="mt-4 space-y-1">
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
                </div>
            </div>

            <ChangePasswordModal
                show={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
        </AuthenticatedLayout>
    );
}

function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

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
        <div className="flex items-center justify-between gap-4 rounded-xl px-2 py-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={onAction}
                disabled={disabled}
                className={
                    disabled
                        ? 'cursor-not-allowed text-sm font-medium text-gray-300'
                        : 'text-sm font-medium text-darkgreen transition hover:text-[#2a9e00]'
                }
            >
                {action} <span aria-hidden="true">›</span>
            </button>
        </div>
    );
}

function LockIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
            <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" strokeLinecap="round" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
                d="M10 2.5l6 2.25v4.5c0 4-2.6 6.75-6 8.25-3.4-1.5-6-4.25-6-8.25v-4.5L10 2.5Z"
                strokeLinejoin="round"
            />
        </svg>
    );
}