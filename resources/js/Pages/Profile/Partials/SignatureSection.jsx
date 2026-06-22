import { useState, useRef, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { cardStyle } from './ProfileStyles';
import { SignatureIcon, CloseIcon } from './ProfileIcons';

function SignatureRow({ icon, title, subtitle, action, onAction, onView, signatureUrl = null }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl pb-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-500 ring-1 ring-gray-300">
                    {icon}
                </div>
                <div>
                    <p className="text-[13px] font-medium text-gray-900">{title}</p>
                    <p className="text-[11px] text-gray-400">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {signatureUrl ? (
                    <button
                        type="button"
                        onClick={onView}
                        className="h-10 w-32 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center hover:border-gray-400 hover:shadow-sm transition"
                        title="Click to view"
                    >
                        <img
                            src={signatureUrl}
                            alt="Signature preview"
                            className="h-full w-full object-contain p-1"
                        />
                    </button>
                ) : (
                    <div className="h-10 w-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <p className="text-[10px] text-gray-300">No signature</p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onAction}
                    className="text-xs font-medium text-darkgreen transition hover:text-[#2a9e00]"
                >
                    {action} <span aria-hidden="true">›</span>
                </button>
            </div>
        </div>
    );
}

export default function SignatureSection({ profile }) {
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showSignatureViewer, setShowSignatureViewer] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingPreview, setPendingPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const signatureUrl = useMemo(() => {
        if (!profile.signature) return null;
        const cleanBaseUrl = profile.signature.split('?')[0];
        return `${cleanBaseUrl}?v=${new Date(profile.updated_at || Date.now()).getTime()}`;
    }, [profile]);

    const handleOpenSignatureModal = () => {
        setPendingFile(null);
        setPendingPreview(null);
        setShowSignatureModal(true);
    };

    const handleCloseSignatureModal = () => {
        setPendingFile(null);
        setPendingPreview(null);
        setShowSignatureModal(false);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            toast.error('Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.');
            e.target.value = '';
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            toast.error('File size must not exceed 3MB.');
            e.target.value = '';
            return;
        }

        setPendingFile(file);
        setPendingPreview(URL.createObjectURL(file));
        e.target.value = '';
    };

    const handleConfirmUpload = () => {
        if (!pendingFile) return;
        setUploading(true);

        router.post(route('profile.signature'), { signature: pendingFile }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['profile'] });
                setPendingFile(null);
                setPendingPreview(null);
                setShowSignatureModal(false);
                setUploading(false);
                toast.success('Signature uploaded successfully.');
            },
            onError: () => {
                setUploading(false);
                toast.error('Failed to upload signature. Please try again.');
            },
        });
    };

    return (
        <>
            <div className={cardStyle}>
                <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 pb-4">
                        <SignatureIcon className="h-4 w-4 text-gray-500" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Signature
                        </h4>
                    </div>
                    <div className="mt-2 space-y-1">
                        <SignatureRow
                            icon={<SignatureIcon />}
                            title="Employee Signature"
                            subtitle="Upload your signature. Max file size: 3MB."
                            action={signatureUrl ? 'Change' : 'Upload'}
                            onAction={handleOpenSignatureModal}
                            onView={() => setShowSignatureViewer(true)}
                            signatureUrl={signatureUrl}
                        />
                    </div>
                </div>
            </div>

            {/* Signature Upload Modal */}
            {showSignatureModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
                    onClick={handleCloseSignatureModal}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="signature-modal-title"
                    >
                        <div className="flex items-center justify-between">
                            <h2 id="signature-modal-title" className="text-lg font-semibold">
                                {signatureUrl ? 'Change Signature' : 'Upload Signature'}
                            </h2>
                            <button
                                type="button"
                                onClick={handleCloseSignatureModal}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div>
                                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">
                                    Preview
                                </p>
                                <div className="w-full h-40 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                    {pendingPreview ? (
                                        <img
                                            src={pendingPreview}
                                            alt="Signature preview"
                                            className="max-h-full max-w-full object-contain p-3"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-300">No image selected</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="block text-[13px] font-bold text-slate-600 mb-1.5">
                                    Select Image
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 hover:border-[#289800] hover:bg-green-50 hover:text-[#289800] transition text-left"
                                >
                                    {pendingFile ? (
                                        <span className="text-gray-700 font-medium">{pendingFile.name}</span>
                                    ) : (
                                        <span>Click to browse — PNG, JPG, JPEG, WEBP up to 3MB</span>
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-3">
                                <button
                                    type="button"
                                    onClick={handleCloseSignatureModal}
                                    className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmUpload}
                                    disabled={!pendingFile || uploading}
                                    className="rounded-xl bg-[#289800] px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {uploading ? 'Uploading…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Viewer Modal */}
            {showSignatureViewer && signatureUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/40 px-4"
                    onClick={() => setShowSignatureViewer(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="signature-viewer-title"
                    >
                        <div className="flex items-center justify-between">
                            <h2 id="signature-viewer-title" className="text-lg font-semibold">
                                My Signature
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowSignatureViewer(false)}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="mt-6">
                            <div className="w-full h-48 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                <img
                                    src={signatureUrl}
                                    alt="My signature"
                                    className="max-h-full max-w-full object-contain p-4"
                                />
                            </div>
                            <div className="flex justify-end mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowSignatureViewer(false)}
                                    className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}