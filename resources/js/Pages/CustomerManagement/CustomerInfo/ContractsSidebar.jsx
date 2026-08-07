import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { route } from 'ziggy-js';
import { Link } from '@inertiajs/react';
import { MdClose, MdDescription, MdCalendarToday, MdPictureAsPdf, MdEdit } from 'react-icons/md';
import { createPortal } from 'react-dom';
import BranchContractsSidebar from './BranchContractsSidebar';

const fetchCompanyContracts = (companyId) =>
    axios.get(route('contract.contracts', companyId)).then((res) => res.data);

const STATUS_STYLES = {
    active:         { label: 'Active',         classes: 'bg-[#195c00]/10 text-[#195c00] border-[#195c00]/20' },
    extended:       { label: 'Extended',       classes: 'bg-[#195c00]/10 text-[#195c00] border-[#195c00]/20' },
    expiring_soon:  { label: 'Expiring Soon',  classes: 'bg-amber-100 text-amber-700 border-amber-300' },
    expired:        { label: 'Expired',        classes: 'bg-red-100 text-red-700 border-red-300' },
    terminated:     { label: 'Terminated',     classes: 'bg-slate-200 text-slate-600 border-slate-300' },
    archived:       { label: 'Archived',       classes: 'bg-slate-200 text-slate-600 border-slate-300' },
};

const COUNT_STATUS_COLOR = {
    expired:        'text-red-600',
    expiring_soon:  'text-amber-600',
};

function branchCountColor(contracts) {
    if (contracts.some((c) => c.status === 'expired')) return COUNT_STATUS_COLOR.expired;
    if (contracts.some((c) => c.status === 'expiring_soon')) return COUNT_STATUS_COLOR.expiring_soon;
    return 'text-emerald-600';
}

function StatusBadge({ status }) {
    const style = STATUS_STYLES[status] || { label: status || 'Unknown', classes: 'bg-slate-100 text-slate-500 border-slate-200' };
    return (
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border ${style.classes}`}>
            {style.label}
        </span>
    );
}

function ContractCard({ c, companyId, companyName, sapCode }) {
    return (
        <div className="border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm rounded-2xl bg-[#F2FAEE] backdrop-blur-sm overflow-hidden">
            <div className="p-4 md:p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="size-7 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                            <MdDescription className="text-[#289800] text-base md:text-md" />
                        </div>
                        <div className="pt-0.5 min-w-0 flex-1">
                            <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Document No.</div>
                            <div className="text-[10px] md:text-xs font-medium text-slate-800 leading-tight truncate">
                                {c.doc_num || 'Not provided'}
                            </div>
                        </div>
                    </div>
                    <StatusBadge status={c.status} />
                </div>

                <div className="flex items-start gap-3">
                    <div className="size-7 rounded-full bg-[#289800]/10 flex items-center justify-center flex-shrink-0 border border-[#289800]/10">
                        <MdCalendarToday className="text-[#289800] text-base md:text-md" />
                    </div>
                    <div className="pt-0.5 flex-1 min-w-0">
                        <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Coverage</div>
                        <div className="text-[10px] md:text-xs font-medium text-slate-800 leading-tight">
                            {c.start_date || 'N/A'} — {c.end_date || 'N/A'}
                        </div>
                        {Array.isArray(c.extend_dates) && c.extend_dates.length > 0 && (() => {
                            const sorted = [...c.extend_dates].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                            const latest = sorted[sorted.length - 1];
                            return (
                                <div className="text-[9px] md:text-[10px] font-medium text-[#195c00] mt-0.5">
                                    Extended to {latest?.date || 'N/A'}
                                    {sorted.length > 1 && ` (+${sorted.length - 1} more)`}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="flex gap-2">
                    {c.pdf_url && (
                        <a    href={c.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md border border-[#195c00]/30 text-[#195c00] text-xs font-semibold hover:bg-[#d6f1d6] hover:shadow-inner transition-colors"
                        >
                            <MdPictureAsPdf size={14} /> View PDF
                        </a>
                    )}
                    {c.can_edit && (
                        <Link
                            href={`${route('contract.upload')}?company_id=${companyId}&company_name=${encodeURIComponent(companyName ?? '')}&sap_code=${encodeURIComponent(sapCode ?? '')}&can_upload=1&contract_id=${c.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100 hover:shadow-inner transition-colors"
                        >
                            <MdEdit size={14} /> Edit
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ContractsSidebar({ isOpen, companyId, companyName, onClose }) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedBranch, setSelectedBranch] = useState(null);
    const [isBranchSidebarOpen, setIsBranchSidebarOpen] = useState(false);
    const [branchAnchor, setBranchAnchor] = useState(null);
    const [branchPanelRect, setBranchPanelRect] = useState(null);
    const selectedRowRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const panelRef = useRef(null);
    const [panelRect, setPanelRect] = useState({ width: 0, left: 0 });

    useEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        const measure = () => {
            const rect = el.getBoundingClientRect();
            setPanelRect({ width: rect.width, left: rect.left });
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    useEffect(() => {
        if (!isOpen || !companyId) {
            setData(null);
            setError(null);
            setSelectedBranch(null);
            setIsBranchSidebarOpen(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        fetchCompanyContracts(companyId)
            .then((res) => setData(res))
            .catch((err) => {
                console.error('Failed to load contracts:', err);
                setError('Could not load contracts for this company.');
            })
            .finally(() => setIsLoading(false));
    }, [isOpen, companyId]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedBranch(null);
            setIsBranchSidebarOpen(false);
            setBranchAnchor(null);
            setBranchPanelRect(null);
        }
    }, [isOpen]);

    // group the flat contracts list (which already spans every branch under
    // the company's sap_code) by branch/company name
    const branchGroups = React.useMemo(() => {
        if (!data) return [];
        const byName = new Map();
        (data.branches || []).forEach((name) => byName.set(name, []));
        (data.contracts || []).forEach((c) => {
            const key = c.company_name || 'Unknown branch';
            if (!byName.has(key)) byName.set(key, []);
            byName.get(key).push(c);
        });
        return Array.from(byName.entries()).map(([name, contracts]) => ({ name, contracts }));
    }, [data]);

    const hasSingleBranch = branchGroups.length <= 1;

    const openBranch = (group, e) => {
        selectedRowRef.current = e.currentTarget;
        const rect = e.currentTarget.getBoundingClientRect();
        setBranchAnchor({ top: rect.top + rect.height / 2, left: rect.left });
        setSelectedBranch(group);
        setIsBranchSidebarOpen(true);
    };

    const closeBranch = () => {
        setIsBranchSidebarOpen(false);
        setBranchAnchor(null);
        setBranchPanelRect(null);
    };

    const handleBackdropClick = () => {
        if (isBranchSidebarOpen) {
            closeBranch();
            return;
        }
        onClose();
    };

    useEffect(() => {
        if (!isBranchSidebarOpen) return;
        const container = scrollContainerRef.current;
        if (!container) return;
        const updateAnchor = () => {
            if (!selectedRowRef.current) return;
            const rect = selectedRowRef.current.getBoundingClientRect();
            setBranchAnchor({ top: rect.top + rect.height / 2, left: rect.left });
        };
        container.addEventListener('scroll', updateAnchor, { passive: true });
        return () => container.removeEventListener('scroll', updateAnchor);
    }, [isBranchSidebarOpen]);

    const connector = (isBranchSidebarOpen && branchAnchor && branchPanelRect)
        ? {
            x1: branchAnchor.left,
            y1: branchAnchor.top,
            x2: branchPanelRect.right,
            y2: (branchPanelRect.top + branchPanelRect.bottom) / 2,
          }
        : null;

    const totalContracts = data?.contracts?.length ?? 0;

    return (
        <>
            <div
                className={`fixed inset-0 backdrop-blur-[1px] bg-black/20 z-40 transition-all duration-500 ease-out ${ isOpen ? 'opacity-100 visible' : 'opacity-0 invisible' }`}
                onClick={handleBackdropClick}
            />

            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end pointer-events-none">
                <div ref={panelRef} className={`relative w-full max-h-[80vh] sm:max-h-none sm:w-[80%] md:max-w-[500px] sm:my-5 sm:mr-4 bg-[#f5f5f7]/80 backdrop-blur shadow-[-10px_0_20px_rgba(0,0,0,0.05)] border border-b border-black/15 flex flex-col rounded-t-3xl sm:rounded-3xl transform transition-transform duration-700 md:duration-500 ease-out ${ isOpen ? 'translate-y-0 sm:translate-x-0 pointer-events-auto' : 'translate-y-full sm:translate-y-0 sm:translate-x-[120%] pointer-events-none' }`}>

                    <div className="hidden sm:block absolute -left-5 top-9">
                        <button
                            onClick={onClose}
                            className="hidden sm:inline bg-white border border-gray-200 shadow-sm p-1.5 rounded-full hover:bg-gray-50 transition-colors"
                        >
                            <MdClose size={22} className="text-gray-700" />
                        </button>
                    </div>

                    <div className="px-4 md:px-7 p-3.5 flex justify-between items-center flex-shrink-0 rounded-t-3xl">
                        <div>
                            <h2 className="text-sm md:text-base font-bold text-slate-800">Contracts</h2>
                            <p className="text-[10px] md:text-[11px] font-medium text-slate-500">
                                {data?.company_name || companyName || '—'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="sm:hidden text-md text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <MdClose />
                        </button>
                    </div>

                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 md:px-8 pt-3 pb-10 [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#195c0059]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <span className="text-slate-400 font-medium text-sm">Loading contracts…</span>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-40">
                                <span className="text-red-500 font-medium text-sm">{error}</span>
                            </div>
                        ) : !data ? (
                            <div className="flex items-center justify-center h-40">
                                <span className="text-slate-400 font-medium text-sm">No data</span>
                            </div>
                        ) : hasSingleBranch ? (
                            // Only one branch — skip the branch list and show its contracts directly
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] md:text-[11px] font-bold text-slate-600 tracking-wide uppercase">
                                        {branchGroups[0]?.name || data.company_name}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#195c00] bg-[#195c00]/10 px-2 py-0.5 rounded-full">
                                        {totalContracts}
                                    </span>
                                </div>
                                {totalContracts > 0 ? (
                                    (branchGroups[0]?.contracts ?? []).map((c) => (
                                        <ContractCard key={c.id} c={c} companyId={companyId} companyName={data.company_name} sapCode={data.sap_code} />
                                    ))
                                ) : (
                                    <div className="flex items-center gap-2 bg-[#F6F7F8] shadow-inner border border-gray-300 px-3 py-1.5 rounded-md text-xs md:text-[13px] font-medium text-slate-400 italic">
                                        <div className="size-1.5 rounded-full bg-slate-300"></div>
                                        No contracts on file
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Multiple branches — list each branch with its own contract count
                            <div className="mt-1 border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm rounded-2xl bg-[#F2FAEE] backdrop-blur-sm overflow-hidden pb-5">
                                <div className="px-5 py-4 bg-[#F2FAEE] flex justify-between items-center">
                                    <h3 className="text-[10px] md:text-[11px] font-bold text-slate-600 tracking-wide uppercase">Branches</h3>
                                    <span className="text-[10px] font-semibold text-[#195c00] bg-[#195c00]/10 px-2 py-0.5 rounded-full">
                                        {totalContracts} total
                                    </span>
                                </div>

                                <div className="px-5 flex flex-col gap-2 mt-0.5">
                                    {branchGroups.map((group) => (
                                        <button
                                            key={group.name}
                                            type="button"
                                            onClick={(e) => openBranch(group, e)}
                                            title="View contracts"
                                            aria-label={`View contracts for ${group.name}`}
                                            className={`flex items-start gap-2.5 shadow-inner border px-3 py-2 rounded-lg text-left transition-colors ${
                                                isBranchSidebarOpen && selectedBranch?.name === group.name
                                                    ? 'bg-[#e1fde1] border-[#195c00] ring-1 ring-[#195c00]/40'
                                                    : 'bg-[#F6F7F8] border-gray-200 hover:border-[#195c00]/40 hover:bg-[#e1fde1]'
                                            }`}
                                        >
                                            <div className="size-1.5 rounded-full bg-[#195c00] mt-1.5 flex-shrink-0"></div>
                                            <div className="min-w-0 flex flex-col gap-1 w-full">
                                                <div className="text-xs md:text-[13px] font-semibold text-slate-700 truncate">
                                                    {group.name}
                                                </div>
                                                <div className={`text-[11px] leading-snug font-medium ${branchCountColor(group.contracts)}`}>
                                                    {group.contracts.length} contract{group.contracts.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {connector && createPortal(
                <svg className="fixed inset-0 z-[60] pointer-events-none" width="100vw" height="100vh">
                    <path
                        d={`M ${connector.x1} ${connector.y1} L ${(connector.x1 + connector.x2) / 2} ${connector.y1} L ${(connector.x1 + connector.x2) / 2} ${connector.y2} L ${connector.x2} ${connector.y2}`}
                        fill="none"
                        stroke="#195c00"
                        strokeWidth="3"
                    />
                    <circle cx={connector.x1} cy={connector.y1} r="4" fill="#195c00" />
                    <circle cx={connector.x2} cy={connector.y2} r="4" fill="#195c00" />
                </svg>,
                document.body
            )}

            <BranchContractsSidebar
                isOpen={isBranchSidebarOpen}
                branch={selectedBranch}
                companyId={companyId}
                companyName={data?.company_name}
                sapCode={data?.sap_code}
                onClose={closeBranch}
                rightOffset={panelRect.width + 32}
                onPanelRectChange={setBranchPanelRect}
            />
        </>
    );
}