import { GoQuestion } from "react-icons/go";
import SecurityIllustration from "@/assets/SecuritySystem.svg?react";

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="flex items-center justify-between border-b bg-white px-8 shadow-sm">
                <img
                    src="/images/logo.webp"
                    alt="Logo"
                    className="h-16 object-contain"
                />

                <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                    <GoQuestion size={20} />
                    Support
                </button>
            </header>

            {/* Main Content */}
            <main className="mx-auto flex max-w-4xl min-h-[600px] rounded-3xl items-center justify-center bg-[#428f28] m-10 shadow-md">

                {/* Left Animation */}
                <div className="hidden lg:flex flex-1 items-center w-[55%] justify-center rounded-l-3xl">
                    <SecurityIllustration className="w-[800px] h-auto" />
                </div>

                {/* Right Card */}
                <div className="w-[45%] min-h-[600px] flex flex-col items-center justify-end bg-white gap-24 bottom-0 rounded-r-3xl p-6 px-8 shadow-lg">
                    {children}
                </div>
            </main>
        </div>
    );
}