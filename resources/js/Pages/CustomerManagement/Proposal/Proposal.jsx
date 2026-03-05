import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React, { useState } from 'react';
import ProposalSideBar from './ProposalSideBar';
import Paper from './Paper';

export default function Proposal({ proposal, items, fees }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Create the "Source of Truth" state
    const [pageData, setPageData] = useState({
        ...proposal,
    });
    
    // Items and Fees state (in case you want to edit/delete them later)
    const [currentItems, setCurrentItems] = useState(items);
    const [currentFees, setCurrentFees] = useState(fees);

    // Updater function for top-level proposal fields
    const handleUpdate = (field, value) => {
        setPageData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <>
            <Head title="Proposal Generation" />
            
            <ProposalSideBar 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen}
                proposal={pageData}      // Pass the STATE, not the prop
                items={currentItems} 
                fees={currentFees}
                onUpdate={handleUpdate}  // Pass the updater
            />

            <Paper 
                isSidebarOpen={isSidebarOpen}
                proposal={pageData}      // Paper now reflects current state
                items={currentItems}
                fees={currentFees}
            />
        </>
    );
}

Proposal.layout = (page) => <AuthenticatedLayout children={page} />;