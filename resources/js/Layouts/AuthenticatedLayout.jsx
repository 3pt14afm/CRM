import Sidebar from '@/Components/Sidebar';

export default function AuthenticatedLayout({ children }) {
    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar stays here forever */}
            <Sidebar />

            {/* Content changes here */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}