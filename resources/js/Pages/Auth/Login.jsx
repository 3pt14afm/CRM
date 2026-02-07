import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useRef } from "react";
import { FaUser } from "react-icons/fa";
import { MdLock } from "react-icons/md";
import { LuEye, LuEyeClosed } from "react-icons/lu";


export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const [showPassword, setShowPassword] = useState(false);
    const passwordRef = useRef(null);

    const togglePassword = () => {
    const el = passwordRef.current;
    if (!el) {
        setShowPassword((v) => !v);
        return;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    setShowPassword((v) => !v);

    requestAnimationFrame(() => {
        el.focus();
        try {
        el.setSelectionRange(start, end);
        } catch {
        // Some browsers can throw when type changes; ignore safely
        }
    });
    };

    return (
        <form onSubmit={submit}>
            <Head title="Log in" />

            <div className="min-h-screen w-full flex items-center justify-center bg-gray-200 font-sans p-4">
                <div className="flex shadow-2xl w-full max-w-5xl min-h-[600px] rounded-3xl overflow-hidden bg-white">
                    
                    {/* Left Side: Branding */}
                    <div className="hidden md:flex w-[55%] bg-[#2D7813] p-8 flex-col justify-between items-center text-white">
                       <div className="w-[237px] h-[88.79px] flex items-center justify-center bg-[linear-gradient(0deg,#CDCDCD_0%,#FFFFFF_100%)]">

                            <img src="/images/logo.png" alt="Logo" />

                        </div>
                        
                        <div className="flex justify-center w-full">
                            <img src="/images/graphics.png" alt="Graphics" className="max-w-full h-auto object-contain" />
                        </div>
                    </div>

                    {/* Right Side: Form */}
                    <div className="flex flex-col justify-center items-start flex-1 p-8 md:p-12">
                        <div className="mb-8">
                            <h1 className='text-text-secondary font-bold text-4xl mb-2'>Account Login</h1>
                            <p className='text-sm text-darkgreen opacity-55'>Welcome back! Please enter your details.</p>
                        </div>

                        <div className="w-full">
                            {/* Email/Username Field */}
                            <div className="mb-4">
                                <InputLabel htmlFor="email" value="Username" className="text-text-secondary font-bold text-sm mb-2 ml-1" />

                                <div className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-[#d9d9d9]/30 border border-darkgreen/20 transition focus-within:border-darkgreen focus-within:bg-white group ${errors.email ? 'border-red-500' : ''}`}>
                                    <FaUser className="text-darkgreen/50 group-focus-within:text-darkgreen w-4 h-4 ml-3" />
                                    <input 
                                        id="email"
                                        type="email" 
                                        name="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="username" 
                                        className="flex-1 bg-transparent border-none text-sm placeholder:text-darkgreen/50 focus:ring-0"
                                    />
                                </div>
                                
                                
                            </div>

                            {/* Password Field */}
                            <div className="mb-2">
                                <InputLabel htmlFor="password" value="Password" className="text-text-secondary font-bold text-sm mb-2 ml-1" />

                                <div className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-[#d9d9d9]/30 border border-darkgreen/20 transition focus-within:border-darkgreen focus-within:bg-white group ${errors.password ? 'border-red-500' : ''}`}>
                                    <MdLock className="text-darkgreen/50 group-focus-within:text-darkgreen w-5 h-5 ml-3" />
                                    <input 
                                        ref={passwordRef}
                                        id="password"
                                        type={showPassword ? "text" : "password"} 
                                        name="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"  
                                        className="flex-1 bg-transparent border-none text-sm placeholder:text-darkgreen/50 focus:ring-0" 
                                    />

                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}    
                                        onClick={togglePassword}
                                        className="mr-3 text-darkgreen/50 hover:text-darkgreen transition"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {/* CLOSED eye when hidden (default), OPEN eye when shown */}
                                        {showPassword ? <LuEye className="w-5 h-5" /> : <LuEyeClosed className="w-5 h-5" />}
                                    </button>
                                </div>
                                {/* Display Error for Password */}
                                <InputError message={errors.password} className="mt-2" />
                                {/* Display Error for Email */}
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            <div className="flex items-center justify-end mt-2">
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-darkgreen opacity-65 font-medium text-xs hover:opacity-100 transition"
                                    >
                                        Forgot Credentials?
                                    </Link>
                                )}
                            </div>

                            <PrimaryButton 
                                className="w-full h-[53px] rounded-xl justify-center mt-6" 
                                disabled={processing}
                            >
                                {processing ? 'AUTHORIZING...' : 'AUTHORIZE LOGIN'}
                            </PrimaryButton>
                        </div>
                    </div>

                </div>
            </div>
        </form>
    );
}