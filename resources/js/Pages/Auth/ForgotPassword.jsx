import { FaArrowLeft } from "react-icons/fa";
import { Head, Link } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";

export default function ForgotPassword() {
    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="text-center">
               

                <h2 className="text-3xl font-bold text-gray-900">
                    Forgot Password?
                </h2>

                <p className="mt-6 text-gray-600 px-6">
                    Please contact your administrator to reset your password.
                </p>

                <Link
                    href={route("login")}
                    className="mt-8 flex w-[80%] mx-8 items-center justify-center gap-2 rounded-xl bg-[#428f28] px-4 py-3 font-semibold text-white transition hover:bg-darkgreen"
                >
                    <FaArrowLeft />
                    Back to Login
                </Link>
            </div>
                <div className="mt-20 border-t pt-6">
                    <p className="text-[11px] uppercase text-gray-400">
                        Enterprise Resource Management System
                    </p>
                </div>
            
        </GuestLayout>
    );
}