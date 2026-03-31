import FlashMessages from '@/Components/FlashMessages';
import Sidebar from '@/Components/Sidebar';
import ForceChangePasswordModal from '@/Components/ForceChangePasswordModal';
import ChatBox from '@/Components/ai/Chatbot'
export default function AuthenticatedLayout({ children }) {
    return (
        <>
            <div className="flex h-screen bg-darkgreen/60">
                <Sidebar />
                <main className="flex-1 overflow-y-auto bg-[#f5f5f7]">
                    <FlashMessages />
                    {children}
                       <ChatBox/>
                </main>
            </div>

            <ForceChangePasswordModal />
        </>
    );
}