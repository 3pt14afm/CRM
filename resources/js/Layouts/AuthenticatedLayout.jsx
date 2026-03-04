import Sidebar from '@/Components/Sidebar';

export default function AuthenticatedLayout({ children }) {
    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-white/80">
                {children}
            </main>
        </div>
    );
}
