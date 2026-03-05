import React, { useMemo, useState } from 'react'; // Added useState
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProjectListSection from '@/Components/roi/ProjectListSection';

// Icons
import { FaFileInvoice, FaFolderOpen } from "react-icons/fa";
import { IoTimeOutline, IoEyeOutline } from "react-icons/io5";

export default function ProposalList({ proposals, stats }) {
    // 1. Add Tab State
    const [activeTab, setActiveTab] = useState('archive'); 

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    }).format(today);

    const tiles = useMemo(() => {
        const totalproposals = stats?.totalArchiveProjects ?? proposals?.total ?? 0;
        const recentlyArchivedToday = stats?.recentlyArchivedToday ?? "—";

        return [
            {
                label: "Total Archives",
                value: totalproposals,
                icon: <FaFolderOpen />,
                variant: "normal",
            },
            {
                label: "Recently Archived",
                value: recentlyArchivedToday,
                icon: <IoTimeOutline />,
                variant: "normal",
            },
        ];
    }, [stats, proposals]);

    const columns = useMemo(() => [
        {
            key: "PreparedBy",
            header: "PREPARED BY",
            cell: (r) => (
                <span className="text-[#289800] font-semibold">{r.user?.name ?? "—"}</span>
            ),
        },
        {
            key: "reference",
            header: "REFERENCE",
            cell: (r) => (
                <span className="font-semibold">{r.reference ?? "—"}</span>
            ),
        },
        {
            key: "company_name",
            header: "COMPANY NAME",
            cell: (r) => r.company_name ?? "—",
        },
        {
            key: "contract_years",
            header: "CONTRACT TERM",
            cell: (r) => (r.contract_years != null ? `${r.contract_years}` : "—"),
        },
        {
            key: "status",
            header: "STATUS",
            cell: (row) => (
                <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20">
                    {row.status ?? "—"}
                </span>
            )
        },
        {
            key: "decided_by",
            header: "DECIDED BY",
            cell: (r) => (
                <span className="text-slate-800">{r.decided_by_name ?? "—"}</span>
            ),
        },
        {
            key: "decided_at",
            header: "DECIDED AT",
            cell: (r) => r.decided_at_display ?? "—",
        },
            {
            key: "actions",
            header: "ACTIONS",
            cell: (r) => (
                <div className="flex items-center gap-2">
                    <button
                        className="px-4 py-2 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
                        type="button"
                        // This navigates to the detailed view you want to use for generation
                        onClick={() => router.visit(route("proposals.show", r.id))}
                    >
                        <FaFileInvoice className="text-[16px]" />
                        <span className="text-xs uppercase tracking-wide">Generate Proposal</span>
                    </button>
                </div>
            ),
        },
    ], []);

    const rows = proposals?.data ?? [];

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
                    <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
                </div>
            </div>

            {/* 2. Tab Navigation - Keeping your existing style */}
            <div className="flex gap-6 mt-5 mx-10 mb-6 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('archive')}
                    className={`pb-2 font-semibold text-sm ${activeTab === 'archive' ? 'border-b-2 border-[#289800] text-[#289800]' : 'text-gray-500'}`}
                >
                    Archived Projects
                </button>
                <button 
                    onClick={() => setActiveTab('generated')}
                    className={`pb-2 font-semibold text-sm ${activeTab === 'generated' ? 'border-b-2 border-[#289800] text-[#289800]' : 'text-gray-500'}`}
                >
                    Generated Proposals
                </button>
            </div>

            {/* 3. Conditional Content Rendering */}
            {activeTab === 'archive' ? (
                <ProjectListSection
                    tiles={tiles}
                    tableTitle="Archived Projects"
                    columns={columns}
                    rows={rows}
                    rowKey={(r) => String(r.id)}
                    pagination={{
                        page: proposals.current_page,
                        perPage: proposals.per_page,
                        total: proposals.total,
                        onPageChange: (p) => router.get(route("proposals.list"), { page: p }, { preserveScroll: true }),
                    }}
                />
            ) : (
                <div className="mx-10 p-10 bg-white rounded-lg shadow border text-center text-gray-500">
                    <p>Generated proposals will appear here once the PDF export logic is implemented.</p>
                </div>
            )}
        </>
    )
}

ProposalList.layout = (page) => <AuthenticatedLayout children={page} />;