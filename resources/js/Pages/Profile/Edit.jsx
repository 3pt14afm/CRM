import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ChangePasswordModal from './Partials/ChangePasswordModal';

export default function Edit({ profile }) {
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const subtitle = [profile.position, profile.department].filter(Boolean).join(' • ');

    // Reusing the exact card styling from the original code
    const cardStyle = "overflow-hidden rounded-2xl bg-white border border-[#00000010] border-b-black/20 border-r-black/20 shadow-[-2px_-2px_10px_rgba(245,245,245,0.8),0px_0px_0_rgba(255,255,255,0.8),2px_2px_4px_rgba(0,0,0,0.2)]";

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
                        {/* Banner Background - Updated to match avatar gradient */}
                        <div className="h-32 w-full rounded-2xl bg-gradient-to-br from-darkgreen/50 to-green/50 shadow-sm"></div>
                        
                        {/* Avatar & Name */}
                        <div className="px-8 -mt-9 flex flex-row items-end gap-4">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-darkgreen to-green text-xl font-semibold text-white shadow-sm">
                                {getInitials(profile.name)}
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
                                            Personal Information
                                        </h4>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <InfoField label="Employee ID" value={profile.employeeId} />
                                        <InfoField label="Full Name" value={profile.name} />
                                        <InfoField label="Email" value={profile.email} />
                                        <InfoField label="Location" value={profile.location} />
                                    </div>
                                </div>
                            </div>

                            {/* Security & Access */}
                            <div className={cardStyle}>
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center gap-2 pb-4">
                                        <LockIcon className="h-4 w-4 text-gray-500" />
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Security &amp; Access
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

                        </div>

                        {/* Right Column */}
                        <div className="space-y-6 lg:col-span-1">
                            
                            {/* Geolocation & Summary */}
                            <div className={cardStyle}>
                                <div className="p-2 sm:p-4">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 pb-2">
                                        Location
                                    </h4>
                                    
                                    {/* Map representation based on user location */}
                                    <div className="overflow-hidden rounded-lg border border-gray-200 h-60 w-full bg-gray-100">
                                        <iframe
                                            title="User Location"
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            loading="lazy"
                                            allowFullScreen
                                            src={`https://www.google.com/maps?q=${encodeURIComponent(profile.location || 'Cebu City, Philippines')}&output=embed`}
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