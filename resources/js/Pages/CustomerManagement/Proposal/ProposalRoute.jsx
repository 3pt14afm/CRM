import { Head, Link, usePage } from '@inertiajs/react'; // Added Link and usePage
import GeneratedProposals from './GeneratedProposals';
import { useState } from 'react';
import ApproveProjects from './ApprovedProjects';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ProposalRoute({ proposals, stats, generatedproposals, generatedstats }) {
    // 1. Determine active tab based on which data is present
    // Or you can pass an 'activeTab' string from the controller
    const [activeTab, setActiveTab] = useState('archive')

    const today = new Date().toLocaleDateString("en-US", {
        day: "2-digit", month: "2-digit", year: "2-digit"
    });

    return (
        <>
             <Head title="ROI Entry" />
            
            <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
                <div className="flex gap-1 items-baseline">
                    {/* <h1 className="font-semibold">Project Proposal</h1> */}
                    {/* <span className="mx-2">/</span> */}
                    <p className="text-4xl font-semibold">PROJECT PROPOSAL</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                    <h1 className="text-xs text-right text-slate-500"></h1>
                </div>
            </div>
            
            {/* Header ... */}

            {/* 2. Use Link instead of button for routing */}
         <div className="flex gap-6 mt-5 mx-10 mb-6 border-b border-gray-200">
    <p onClick={()=>setActiveTab('archive')}
        className={`pb-2 font-semibold text-sm ${activeTab === 'archive' ? 'border-b-2 border-[#289800] text-[#289800]' : 'text-gray-500'}`}
    >
        Approved Projects
    </p>
    <p onClick={()=>setActiveTab('generated')}
       
        className={`pb-2 font-semibold text-sm ${activeTab === 'generated' ? 'border-b-2 border-[#289800] text-[#289800]' : 'text-gray-500'}`}
    >
        Generated Proposals
    </p>
</div>

            {/* 3. Render based on what the controller sent back */}
            <div className="">
                {activeTab === 'archive' && (
                    <ApproveProjects
                        proposals={proposals ?? { data: [] }} 
                        stats={stats ?? {}} 
                    />
                )}
                {activeTab === 'generated' && (
                    <GeneratedProposals 
                        proposals={generatedproposals ?? { data: [] }} 
                        stats={generatedstats ?? {}} 
                    />
                )}
            </div>
        </>
    );
}


ProposalRoute.layout = (page) => <AuthenticatedLayout children={page} />;