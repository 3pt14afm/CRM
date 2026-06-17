import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { LuEye, LuEyeClosed } from 'react-icons/lu';

export default function ChangePasswordModal({ show, onClose }) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    // Reset form state every time the modal closes, so reopening it
    // never shows a stale value or a leftover error from last time.
    useEffect(() => {
        if (!show) {
            reset();
            clearErrors();
        }
    }, [show]);

    if (!show) {
        return null;
    }

    function submit(e) {
        e.preventDefault();

        post(route('profile.password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white p-6  shadow-xl sm:p-7"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="change-password-title"
            >
                <div className="flex items-center justify-between">
                    <h2 id="change-password-title" className="text-lg font-semibold">
                        Change Password
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Close"
                    >
                        <CloseIcon />
                    </button>
                </div>

                <form onSubmit={submit} className="mt-6 space-y-4">
                    <PasswordField
                        id="current_password"
                        label="Current Password"
                        placeholder="Enter current password"
                        value={data.current_password}
                        onChange={(value) => setData('current_password', value)}
                        error={errors.current_password}
                        autoComplete="current-password"
                    />

                    <PasswordField
                        id="new_password"
                        label="New Password"
                        placeholder="Min. 8 characters"
                        value={data.new_password}
                        onChange={(value) => setData('new_password', value)}
                        error={errors.new_password}
                        autoComplete="new-password"
                    />

                    <PasswordField
                        id="new_password_confirmation"
                        label="Confirm New Password"
                        placeholder="Repeat new password"
                        value={data.new_password_confirmation}
                        onChange={(value) => setData('new_password_confirmation', value)}
                        error={errors.new_password_confirmation}
                        autoComplete="new-password"
                    />

                    <div className="flex items-center justify-end gap-4 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-[#289800] px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function PasswordField({ id, label, placeholder, value, onChange, error, autoComplete }) {
    const [visible, setVisible] = useState(false);

    return (
        <div>
            <label htmlFor={id} className="block text-[13px] font-bold text-slate-600">
                {label}
            </label>
            <div className="relative mt-1.5">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    onChange={(e) => onChange(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-transparent px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-darkgreen/50 focus:border-[#289800] focus:bg-white focus:outline-none focus:ring-0"
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                >
                    {visible ? <LuEye className="h-5 w-5" /> : <LuEyeClosed className="h-5 w-5" />}
                </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>
    );
}

function CloseIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
    );
}
