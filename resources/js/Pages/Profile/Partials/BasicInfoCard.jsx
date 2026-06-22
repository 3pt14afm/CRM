import { cardStyle } from './ProfileStyles';

function InfoField({ label, value }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-400">{label}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{value || '—'}</p>
        </div>
    );
}

export default function BasicInfoCard({ profile }) {
    const locationName =
        typeof profile.location === 'object' && profile.location !== null
            ? profile.location.name
            : profile.location;

    return (
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
    );
}