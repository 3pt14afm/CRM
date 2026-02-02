import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <>
            <Head title="Customer Management Dashboard" />
            <h1 className="text-3xl font-bold text-gray-800">Customer Management Dashboard</h1>
            <div className="mt-6 p-6 bg-white rounded-lg shadow">
                <p>Welcome to your summary of accounts.</p>
            </div>
        </>
    );
}

// THIS IS THE SECRET SAUCE: It wraps this page in your sidebar layout
Dashboard.layout = page => <AuthenticatedLayout children={page} />