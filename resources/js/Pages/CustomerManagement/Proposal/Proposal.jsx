import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react'; // Import router
import React, { useEffect, useState } from 'react';
import ProposalSideBar from '../../../Components/proposal/ProposalSideBar';
import Paper from '../../../Components/proposal/Paper';

export default function Proposal({ proposal, items, fees, is_owner = false }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(is_owner);
    const [processing, setProcessing] = useState(false);

    const [pageData, setPageData] = useState({ ...proposal });
    const [currentItems, setCurrentItems] = useState(items);
    const [currentFees, setCurrentFees] = useState(fees);

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
            alert("Error: Missing ID. Check console for details.");
            return;
        }

        setProcessing(true);
        router.post(route('proposals.draft', { id: projectId }), pageData, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const generateProposal = () => {
        const projectId = pageData.id || proposal.id;

        if (!projectId) {
            alert("Error: Missing ID.");
            return;
        }

        if (!confirm('Are you sure? This will lock the proposal.')) return;

        setProcessing(true);
        router.post(route('proposals.generate', { id: projectId }), pageData, {
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
            />
        </>
    );
}

Proposal.layout = (page) => <AuthenticatedLayout children={page} />;