import { useState } from 'react';
import FlashMessages from '@/Components/FlashMessages';
import Sidebar from '@/Components/Sidebar';
import MobileTopNav from '@/Components/MobileTopNav';
import ForceChangePasswordModal from '@/Components/ForceChangePasswordModal';
import ChatBox from '@/Components/ai/Chatbot';

export default function AuthenticatedLayout({ children }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            <div className="flex h-screen bg-[#f5f5f7] md:pl-2">
                <div className="relative z-50">
                    <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
                </div>

                <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                    <MobileTopNav />

                    <main className="flex-1 overflow-y-auto bg-[#f5f5f7] md:rounded-2xl min-w-0">
                        <FlashMessages />
                        {children}
                        {/* <ChatBox /> */}
                    </main>
                </div>
            </div>

            <ForceChangePasswordModal />
        </>
    );
}