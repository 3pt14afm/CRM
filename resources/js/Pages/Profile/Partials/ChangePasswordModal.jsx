import { useForm, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { LuEye, LuEyeClosed } from 'react-icons/lu';

export default function ChangePasswordModal({ show, onClose, userId }) {
       console.log('ChangePasswordModal userId:', userId); // add this
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetResult, setResetResult]           = useState(null); // { success: bool, message: string }
    const [resetLoading, setResetLoading]         = useState(false);

    useEffect(() => {
        if (!show) {
            reset();
            clearErrors();
            setShowResetConfirm(false);
            setResetResult(null);
        }
    }, [show]);

    if (!show) return null;

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

    function handleResetConfirm() {
        setResetLoading(true);
        router.post(
            route('admin.users.reset-password', { user: userId }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowResetConfirm(false);
                    setResetResult({ success: true, message: 'Password has been reset to default.' });
                },
                onError: () => {
                    setShowResetConfirm(false);
                    setResetResult({ success: false, message: 'Something went wrong. Please try again.' });
                },
                onFinish: () => setResetLoading(false),
            }
        );
    }

    return (
        <>
            {/* ── Main modal ── */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
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

                        <div className="flex items-center justify-between pt-3">
                            {/* Reset password — left side */}
                            <button
                                type="button"
                                onClick={() => setShowResetConfirm(true)}
                                className="text-sm font-medium text-red-500 transition hover:text-red-700"
                            >
                                Reset Password
                            </button>

                            {/* Cancel / Save — right side */}
                            <div className="flex items-center gap-4">
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
                        </div>
                    </form>
                </div>
            </div>

            {/* ── Reset confirmation modal ── */}
            {showResetConfirm && (
                <div className="fixed inset-0 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/50 px-4" style={{ zIndex: 9999 }}>
                    <div
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reset-confirm-title"
                    >
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <h3 id="reset-confirm-title" className="text-base font-semibold text-gray-900">
                                Reset Password?
                            </h3>
                            <p className="text-sm text-gray-500">
                                Are you sure you want to reset this password? It will be set back to the default password.
                            </p>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowResetConfirm(false)}
                                disabled={resetLoading}
                                className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                                No
                            </button>
                            <button
                                type="button"
                                onClick={handleResetConfirm}
                                disabled={resetLoading}
                                className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {resetLoading ? 'Resetting…' : 'Yes, Reset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Success / Error result modal ── */}
            {resetResult && (
                <div className="fixed inset-0 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/50 px-4" style={{ zIndex: 9999 }}>
                    <div
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reset-result-title"
                    >
                        <div className="flex flex-col items-center text-center gap-3">
                            {resetResult.success ? (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}
                            <h3 id="reset-result-title" className="text-base font-semibold text-gray-900">
                                {resetResult.success ? 'Password Reset' : 'Reset Failed'}
                            </h3>
                            <p className="text-sm text-gray-500">{resetResult.message}</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setResetResult(null);
                                if (resetResult.success) onClose();
                            }}
                            className="mt-6 w-full rounded-xl bg-[#289800] py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
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