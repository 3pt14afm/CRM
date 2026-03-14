import Sidebar from '@/Components/Sidebar';

export default function AuthenticatedLayout({ children }) {
    return (
        <div className="flex h-screen bg-darkgreen/60">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-white/95">
                {children}
            </main>
        </div>
    );
}
