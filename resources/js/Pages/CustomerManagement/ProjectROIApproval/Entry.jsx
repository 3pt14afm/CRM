import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Adjust path if needed
import { Head } from '@inertiajs/react';

export default function Entry() {
    return (
        <>
            <Head title="ROI Entry" />
            <div className="bg-white p-6 rounded shadow">
                <h1 className="text-2xl font-bold">Project ROI Entry</h1>
                <p className="mt-4">This is where your entry form will go.</p>
            </div>
        </>
    );
}

// THIS IS THE IMPORTANT PART
Entry.layout = page => <AuthenticatedLayout children={page} />