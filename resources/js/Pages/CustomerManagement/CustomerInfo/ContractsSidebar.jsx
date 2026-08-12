import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { route } from 'ziggy-js';
import { Link } from '@inertiajs/react';
import { MdClose, MdDescription, MdCalendarToday, MdPictureAsPdf, MdEdit, MdOutlineFileUpload, MdSearch, MdKeyboardArrowDown } from 'react-icons/md';
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
    if (contracts.some((c) => ['active', 'extended'].includes(c.status))) return 'text-emerald-600';
    return 'text-slate-500';
}

// Same rollup, but across every company nested under a main_location group.
function locationCountColor(companies) {
    return branchCountColor(companies.flatMap((c) => c.contracts));
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
    const [branchSearch, setBranchSearch] = useState('');
    const [expandedLocations, setExpandedLocations] = useState(() => new Set());
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
            setExpandedLocations(new Set());
            return;
        }
        setIsLoading(true);
        setError(null);
        setExpandedLocations(new Set());
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
            setExpandedLocations(new Set());
        }
    }, [isOpen]);

    // map each company_name to its own contracts (the flat contracts list
    // already spans every branch under the company's sap_code)
    const contractsByCompanyName = useMemo(() => {
        const byName = new Map();
        (data?.contracts || []).forEach((c) => {
            const key = c.company_name || 'Unknown branch';
            if (!byName.has(key)) byName.set(key, []);
            byName.get(key).push(c);
        });
        return byName;
    }, [data]);

    // nest each company under its main_location — same grouping shape as
    // the Branches card on CompanyDetailsSidebar
    const locationGroups = useMemo(() => {
        if (!data) return [];
        return (data.branches || []).map((loc) => ({
            main_location_id: loc.main_location_id,
            main_location_name: loc.main_location_name,
            companies: (loc.companies || []).map((name) => ({
                name,
                contracts: contractsByCompanyName.get(name) || [],
            })),
        }));
    }, [data, contractsByCompanyName]);

    const totalCompanies = useMemo(
        () => locationGroups.reduce((sum, g) => sum + g.companies.length, 0),
        [locationGroups]
    );

    const filteredLocationGroups = useMemo(() => {
        if (!branchSearch) return locationGroups;
        const q = branchSearch.toLowerCase();
        return locationGroups
            .map((g) => {
                const locationMatches = (g.main_location_name || '').toLowerCase().includes(q);
                const companies = locationMatches
                    ? g.companies
                    : g.companies.filter((c) => c.name.toLowerCase().includes(q));
                return { ...g, companies };
            })
            .filter((g) => g.companies.length > 0);
    }, [locationGroups, branchSearch]);

    const hasSingleBranch = totalCompanies <= 1;

    const toggleLocation = (id, companies = []) => {
        setExpandedLocations((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                if (isBranchSidebarOpen && selectedBranch && companies.some((c) => c.name === selectedBranch.name)) {
                    closeBranch();
                }
            } else {
                next.add(id);
            }
            return next;
        });
    };

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
                <div ref={panelRef} className={`relative w-full max-h-[80vh] sm:max-h-none sm:w-[80%] md:max-w-[500px] sm:my-5 sm:mr-4 bg-[#f5f5f7]/90 backdrop-blur shadow-[-10px_0_20px_rgba(0,0,0,0.05)] border border-b border-black/15 flex flex-col rounded-t-3xl sm:rounded-3xl transform transition-transform duration-700 md:duration-500 ease-out ${ isOpen ? 'translate-y-0 sm:translate-x-0 pointer-events-auto' : 'translate-y-full sm:translate-y-0 sm:translate-x-[120%] pointer-events-none' }`}>

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
                            // Only one company — skip the location/branch list and show its contracts directly
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] md:text-[11px] font-bold text-slate-600 tracking-wide uppercase">
                                        {locationGroups[0]?.companies[0]?.name || data.company_name}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#195c00] bg-[#195c00]/10 px-2 py-0.5 rounded-full">
                                        {totalContracts}
                                    </span>
                                </div>
                                {totalContracts > 0 ? (
                                    (locationGroups[0]?.companies[0]?.contracts ?? []).map((c) => (
                                        <ContractCard key={c.id} c={c} companyId={companyId} companyName={data.company_name} sapCode={data.sap_code} />
                                    ))
                                ) : (
                                    <Link
                                        href={`${route('contract.upload')}?company_id=${companyId}&company_name=${encodeURIComponent(data.company_name ?? '')}&sap_code=${encodeURIComponent(data.sap_code ?? '')}&can_upload=1&open_upload=1`}
                                        className="flex items-center justify-center gap-2 w-full h-10 rounded-md border border-dashed border-[#195c00]/40 text-[#195c00] text-xs font-semibold hover:bg-[#d6f1d6] hover:border-[#195c00] transition-colors"
                                    >
                                        <MdOutlineFileUpload size={13} /> Upload a contract for this branch
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="mt-1 border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm rounded-2xl bg-[#F2FAEE] backdrop-blur-sm overflow-hidden pb-5">
                                <div className="px-5 py-4 bg-[#F2FAEE] flex justify-between items-center">
                                    <h3 className="text-[10px] md:text-[11px] font-bold text-slate-600 tracking-wide uppercase">Branches</h3>
                                    <span className="text-[10px] font-semibold text-[#195c00] bg-[#195c00]/10 px-2 py-0.5 rounded-full">
                                        {totalContracts} total
                                    </span>
                                </div>

                                <div className="px-5 pb-3">
                                    <div className="relative">
                                        <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                                        <input
                                            type="text"
                                            value={branchSearch}
                                            onChange={(e) => setBranchSearch(e.target.value)}
                                            placeholder="Search branch or company name..."
                                            className="w-full h-8 pl-8 pr-3 text-xs border border-[#195c00]/10 rounded-lg bg-[#195c00]/5 outline-none focus:ring-0 focus:border-[#195c00]/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="px-5 flex flex-col gap-2 mt-0.5">
                                    {filteredLocationGroups.length > 0 ? (
                                        filteredLocationGroups.map((group) => {
                                            const groupKey = group.main_location_id ?? group.main_location_name;
                                            const isExpanded = branchSearch.length > 0 || expandedLocations.has(groupKey);
                                            const locContracts = group.companies.flatMap((c) => c.contracts);

                                            return (
                                                <div key={groupKey} className="flex flex-col gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleLocation(groupKey, group.companies)}
                                                        title={isExpanded ? 'Collapse' : 'Expand'}
                                                        aria-expanded={isExpanded}
                                                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${group.main_location_name || 'Unnamed location'}`}
                                                        className="flex items-center gap-2.5 border px-5 py-2 rounded-lg text-left transition-colors bg-white border-gray-200 hover:border-[#195c00]/40 hover:bg-[#289800]/5 hover:shadow-inner"
                                                    >
                                                        <div className="min-w-0 flex flex-col gap-1 w-full">
                                                            <div className="text-xs md:text-[13px] font-semibold text-slate-700 truncate">
                                                                {group.main_location_name || 'Unnamed location'}
                                                            </div>
                                                            <div className={`text-[11px] leading-snug font-medium ${locContracts.length === 0 ? 'text-slate-400 italic' : locationCountColor(group.companies)}`}>
                                                                {locContracts.length === 0 ? 'No contracts' : `${locContracts.length} contract${locContracts.length !== 1 ? 's' : ''}`}
                                                                {' · '}{group.companies.length} compan{group.companies.length !== 1 ? 'ies' : 'y'}
                                                            </div>
                                                        </div>
                                                        <MdKeyboardArrowDown
                                                            size={16}
                                                            className={`flex-shrink-0 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="flex flex-col">
                                                            {group.companies.map((company, idx) => {
                                                                const isLastCompany = idx === group.companies.length - 1;
                                                                return (
                                                                    <div key={company.name} className="relative pl-6 pb-1.5 last:pb-0">
                                                                        <span className="absolute rounded-xl left-3 top-0 h-1/2 w-[2px] bg-gray-200" />
                                                                        {!isLastCompany && (
                                                                            <span className="absolute rounded-xl left-3 top-1/2 bottom-0 w-[2px] bg-gray-200" />
                                                                        )}
                                                                        <span className="absolute rounded-xl left-3 top-1/2 -translate-y-1/2 w-3 h-[2px] bg-gray-200" />

                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => openBranch(company, e)}
                                                                            title="View contracts"
                                                                            aria-label={`View contracts for ${company.name}`}
                                                                            className={`flex items-start gap-2.5 w-full border px-3 py-2 rounded-lg text-left transition-colors ${
                                                                                isBranchSidebarOpen && selectedBranch?.name === company.name
                                                                                    ? 'bg-[#289800]/10 border-[#195c00] ring-1 ring-[#195c00]/10 shadow-lg'
                                                                                    : 'bg-white border-gray-200 hover:border-[#195c00]/40 hover:bg-[#289800]/5 hover:shadow-inner'
                                                                            }`}
                                                                        >
                                                                            <div className="size-1.5 rounded-full bg-[#195c00] mt-1.5 flex-shrink-0"></div>
                                                                            <div className="min-w-0 flex flex-col gap-1 w-full">
                                                                                <div className="text-xs font-semibold text-slate-700 truncate">
                                                                                    {company.name}
                                                                                </div>
                                                                                <div className={`text-[11px] leading-snug font-medium ${company.contracts.length === 0 ? 'text-slate-400 italic' : branchCountColor(company.contracts)}`}>
                                                                                    {company.contracts.length === 0 ? 'No contracts' : `${company.contracts.length} contract${company.contracts.length !== 1 ? 's' : ''}`}
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                                            <span className="text-slate-400 text-xs font-medium">
                                                No branches match "{branchSearch}"
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setBranchSearch('')}
                                                className="text-[11px] font-semibold text-[#195c00] hover:underline"
                                            >
                                                Clear search
                                            </button>
                                        </div>
                                    )}
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