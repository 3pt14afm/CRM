import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react'; // Import router
import React, { useEffect, useState } from 'react';
import ProposalSideBar from '../../../Components/proposal/ProposalSideBar';
import Paper from '../../../Components/proposal/Paper';
import { toast } from 'sonner';

export default function Proposal({ proposal, items, fees, is_owner = false }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(is_owner);
    const [processing, setProcessing] = useState(false);

    const [pageData, setPageData] = useState({ ...proposal });
    const [currentItems, setCurrentItems] = useState(items);
    const [currentFees, setCurrentFees] = useState(fees);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleUpdate = (field, value) => {
        setPageData(prev => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        setPageData({ ...proposal });
    }, [proposal]);

const saveDraft = () => {
    const projectId = pageData.id || proposal.id;

    if (!projectId) {
        console.error("ID not found in proposal data:", pageData);
        alert("Error: Missing ID.");
        return;
    }

    setProcessing(true);

    router.post(route('proposals.draft', { id: projectId }), pageData, {
        preserveScroll: true,

        onSuccess: () => {
            console.log("Draft saved successfully.");
        },

        onError: (errors) => {
            console.error("Save draft failed:", errors);
            toast.error("Failed to save draft.");
        },

        onFinish: () => {
            setProcessing(false);
        },
    });
};



    const generateProposal = () => {
        const projectId = pageData.id || proposal.id;

        if (!projectId) {
            alert("Error: Missing ID.");
            return;
        }

        setShowConfirmModal(true);
    };



const confirmGenerate = () => {
    const projectId = pageData.id || proposal.id;

    setShowConfirmModal(false);
    setProcessing(true);
    router.post(route('proposals.generate', { id: projectId }), pageData, {
        onSuccess: () => {
            toast.success('Proposal generated successfully.');
        },
        onError: (errors) => {
            const message = errors?.message || 'Something went wrong. Please try again.';
            toast.error(message);
        },
        onFinish: () => setProcessing(false),
    });
};

    return (
        <>
            <Head title="Proposal Generation" />

            {is_owner && (
                <ProposalSideBar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    proposal={pageData}
                    items={currentItems}
                    fees={currentFees}
                    onUpdate={handleUpdate}
                    onSaveDraft={saveDraft}
                    onGenerate={generateProposal}
                    processing={processing}
                    isLocked={proposal.status === 'generated'}
                />
            )}

            <Paper
                isSidebarOpen={is_owner && isSidebarOpen}
                proposal={pageData}
                items={currentItems}
                fees={currentFees}
                isOwner={is_owner}
            />

            {showConfirmModal && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
                    <h2 className="text-lg font-semibold mb-2">Confirm Generation</h2>
                    <p className="text-sm text-gray-600 mb-6">
                        Are you sure? This will lock the proposal.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowConfirmModal(false)}
                            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmGenerate}
                            disabled={processing}
                            className="px-4 py-2 text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                        >
                            {processing ? 'Generating...' : 'Yes, Generate'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

Proposal.layout = (page) => <AuthenticatedLayout children={page} />;