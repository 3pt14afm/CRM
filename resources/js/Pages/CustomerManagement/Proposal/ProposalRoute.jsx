import { Head, Link, usePage } from '@inertiajs/react';
import GeneratedProposals from './GeneratedProposals';
import { useState } from 'react';
import ApproveProjects from './ApprovedProjects';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ProposalRoute({
    roiProjects,
    sprfProjects,
    stats,
    roiProposals,
    sprfProposals,
    generatedstats,
}) {
    const [activeTab, setActiveTab] = useState('archive')

    const today = new Date().toLocaleDateString("en-US", {
        day: "2-digit", month: "2-digit", year: "2-digit"
    });

    return (
        <>
            <Head title="Proposal Generation" />

            <div className="pt-8 pb-1 flex justify-between mx-10">
                <div className="flex flex-col gap-1 items-baseline">
                    <p className="text-4xl font-semibold">Project Proposal</p>
                    <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                        Create and draft proposals from approved projects.
                    </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                    <h1 className="text-xs text-right text-slate-500"></h1>
                </div>
            </div>

            <div className="px-4 sm:px-4 lg:px-10 mt-6 mb-3">
                <div className="flex rounded-full bg-[#f8f8f8] w-fit border-2 border-[#2c2c2e10] border-b-[#2c2c2e]/15 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setActiveTab('archive')}
                        className={`px-2 lg:px-4 text-xs lg:text-sm m-0.5 mr-0 py-1.5 ${
                            activeTab === 'archive'
                                ? 'bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800]'
                                : 'rounded-t-xl text-slate-500'
                        }`}
                    >
                        Approved Projects
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('generated')}
                        className={`px-2 lg:px-4 text-xs lg:text-sm m-0.5 ml-0 py-1.5 ${
                            activeTab === 'generated'
                                ? 'bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800]'
                                : 'rounded-t-xl text-slate-500'
                        }`}
                    >
                        Generated Proposals
                    </button>
                </div>
            </div>

            <div className="pb-10">
                {activeTab === 'archive' && (
                    <ApproveProjects
                        roiProjects={roiProjects ?? { data: [] }}
                        sprfProjects={sprfProjects ?? { data: [] }}
                        stats={stats ?? {}}
                    />
                )}
                {activeTab === 'generated' && (
                    <GeneratedProposals
                        roiProposals={roiProposals ?? { data: [] }}
                        sprfProposals={sprfProposals ?? { data: [] }}
                        stats={generatedstats ?? {}}
                    />
                )}
            </div>
        </>
    );
}

ProposalRoute.layout = (page) => <AuthenticatedLayout children={page} />;