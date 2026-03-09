import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react'; // Import router
import React, { useEffect, useState } from 'react';
import ProposalSideBar from '../../../Components/proposal/ProposalSideBar';
import Paper from '../../../Components/proposal/Paper';

export default function Proposal({ proposal, items, fees }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

    // --- New Functions ---

   // Proposal.jsx

// Proposal.jsx

// Proposal.jsx

        const saveDraft = () => {
            // Look for 'id' because that's what your new controller uses in buildProposal
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
            
            <ProposalSideBar 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen}
                proposal={pageData}
                items={currentItems} 
                fees={currentFees}
                onUpdate={handleUpdate}
                // Pass the functions to the sidebar so your buttons can use them
                onSaveDraft={saveDraft}
                onGenerate={generateProposal}
                processing={processing}
                isLocked={proposal.status === 'generated'}
            />

            <Paper 
                isSidebarOpen={isSidebarOpen}
                proposal={pageData}
                items={currentItems}
                fees={currentFees}
            />
        </>
    );
}

Proposal.layout = (page) => <AuthenticatedLayout children={page} />;