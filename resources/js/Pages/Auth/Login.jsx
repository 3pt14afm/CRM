import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

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
            <Head title="Log in" />

             <div className="min-h-screen w-full flex  items-center justify-center bg-gray-200">

        {/* 2. The Card: Changed h-[60%] to a fixed h-[600px] or min-h-[60vh] for stability */}
        <div className="flex shadow-2xl w-[90%] md:w-[60%] min-h-[500px] rounded-3xl overflow-hidden bg-white">
            
            {/* Left Side (Blue section for Logo/Img) */}
            <div className="w-1/2 bg-blue-600 p-8 flex flex-col justify-between text-white">
                <div>
                    <div className="font-bold text-2xl">LOGO</div> 
                </div>
                
                <div className="flex justify-center">
                    <div className="w-32 h-32 bg-blue-400 rounded-full flex items-center justify-center">
                        {/* Placeholder for IMG */}
                        <span>IMG</span>
                    </div>
                </div>

                <div>
                    <p className="text-sm opacity-80 underline">DESC: Welcome to our CRM system.</p>
                </div>
            </div>

            {/* Right Side (White section for Form) */}
            <div className="flex flex-col justify-center items-center m-5">
                 <div>
                     <h1 className='text-3xl'>Account Login</h1>
                     <p className='text-sm'>Welcome back! Please enter your details.</p>
                 </div>
                 <div>
                    <div>
                        <p>Username</p>
                        <input type="text" />
                    </div>
                    <div>
                        <p>Password</p>
                        <input type="text" />
                        <p>Forgot Credentials</p>
                    </div>
                    <button>AUTHORIZE LOGIN</button>
                 </div>
            </div>

        </div>
    </div>
       </>
        
    );
}
