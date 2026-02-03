import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FaUser } from "react-icons/fa";
import { MdLock } from "react-icons/md";

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

    return (
       <>
       <form onSubmit={submit}>
            <Head title="Log in" />

            <div className="min-h-screen w-full flex items-center justify-center bg-gray-200 font-sans">

                {/* 2. The Card: Changed h-[60%] to a fixed h-[600px] or min-h-[60vh] for stability */}
                <div className="flex shadow-2xl w-[60%] min-h-[698px] rounded-3xl overflow-hidden bg-white min-w-0">
                
                    {/* Left Side (Green section for Logo/Img) */}
                    <div className="w-[55%] bg-[#2D7813] p-8 flex flex-col justify-between items-center text-white min-w-0 shadow-card">
                        <div className="w-[237px] h-[88.79px] flex items-center justify-center bg-[linear-gradient(0deg,#CDCDCD_0%,#FFFFFF_100%)]">
                            <img src="/images/logo.png" alt="Logo" /> 
                        </div>
                        
                        <div className="flex justify-center w-full min-w-0">
                            <div className="w-full max-w-[741px] h-[527px] flex items-center justify-center min-w-0">
                                <img src="/images/graphics.png" alt="Graphics" className="max-w-full h-auto" />
                            </div>
                        </div>
                    </div>

                    {/* Right Side (White section for Form) */}
                    <div className="flex flex-col justify-center items-start flex-1 min-w-0 m-10 p-5">
                        <div className="py-5">
                            <p className='text-text-secondary font-bold text-4xl p-1'>Account Login</p>
                            <p className='text-sm text-darkgreen opacity-55 p-1'>Welcome back! Please enter your details.</p>
                        </div>
                        <div className="w-full min-w-0">
                            <div className="w-full max-w-md min-w-0 my-1 mb-4">
                                <p className="text-text-secondary font-bold text-sm py-2 px-1"> Username </p>

                                <div className="w-full min-w-0 flex items-center gap-3 px-2 py-2 mx-1 rounded-xl bg-[#d9d9d9]/30 border border-darkgreen/20 cursor-text transition focus-within:border-darkgreen focus-within:bg-white focus-within:text-darkgreen group">
                                    
                                    <FaUser className="text-darkgreen/50 group-focus-within:text-darkgreen transition-opacity w-4 h-4 ml-3 " aria-hidden="true" />
                                    
                                    <input 
                                    type="email" 
                                    name="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="username" className="flex-1 w-full min-w-0 bg-transparent outline-none border-none text-sm placeholder:text-darkgreen/50 focus:outline-none focus:ring-0 focus:border-0"/>

                                </div>
                            </div>

                            <div className="w-full max-w-md min-w-0 my-1">
                                <p className="text-text-secondary font-bold text-sm py-2 px-1"> Password </p>

                                <div className="w-full flex items-center gap-3 px-2 py-2 mx-1 rounded-xl bg-[#d9d9d9]/30 border border-darkgreen/20 cursor-text transition focus-within:border-darkgreen focus-within:bg-white focus-within:text-darkgreen group">
                                    
                                    <MdLock className="text-darkgreen/50 group-focus-within:text-darkgreen transition-opacity w-5 h-5 ml-3 " aria-hidden="true"/>

                                    <input 
                                    onChange={(e) => setData('password', e.target.value)}
                                    type="password" 
                                    name="password"
                                    value={data.password}
                                    placeholder="••••••••"  className="flex-1 w-full min-w-0 bg-transparent outline-none border-none text-sm pl-2 placeholder:text-darkgreen/50 focus:outline-none focus:ring-0 focus:border-0" />

                                </div>
                            </div>

                            <a className="text-darkgreen opacity-65 font-medium text-xs p-5 pr-0 flex justify-end" href="">Forgot Credentials?</a>
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
       </>
        
    );
}
