import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ChangePasswordModal from './Partials/ChangePasswordModal';
import ProfileBanner from './Partials/ProfileBanner';
import BasicInfoCard from './Partials/BasicInfoCard';
import SecurityCard from './Partials/SecurityCard';
import SignatureSection from './Partials/SignatureSection';
import LocationCard from './Partials/LocationCard';

export default function Edit({ profile }) {
    const [showPasswordModal, setShowPasswordModal] = useState(false);

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

                    <ProfileBanner profile={profile} />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                        {/* Left Column */}
                        <div className="space-y-6 lg:col-span-2">
                            <BasicInfoCard profile={profile} />
                            <SecurityCard onChangePassword={() => setShowPasswordModal(true)} />
                            <SignatureSection profile={profile} />
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6 lg:col-span-1">
                            <LocationCard location={profile.location} />
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