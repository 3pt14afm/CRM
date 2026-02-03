import Sidebar from '@/Components/Sidebar';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function AuthenticatedLayout({ children }) {
    const { auth } = usePage().props;

    // Redirect if not authenticated
    useEffect(() => {
        if (!auth.user) {
            router.visit('/login'); // or your login route
        }
    }, [auth.user]);

    // Optionally render nothing until auth is verified
    if (!auth.user) return null;

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-white">
                {children}
            </main>
        </div>
    );
}
