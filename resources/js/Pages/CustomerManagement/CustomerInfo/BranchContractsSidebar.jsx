import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MdClose, MdDescription, MdCalendarToday, MdPictureAsPdf, MdEdit, MdOutlineFileUpload, MdSwapVert, MdFilterList, MdExpandMore } from 'react-icons/md';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';
import { route } from 'ziggy-js';

const STATUS_STYLES = {
    active:         { label: 'Active',         classes: 'bg-[#195c00]/10 text-[#195c00] border-[#195c00]/20' },
    extended:       { label: 'Extended',       classes: 'bg-[#195c00]/10 text-[#195c00] border-[#195c00]/20' },
    expiring_soon:  { label: 'Expiring Soon',  classes: 'bg-amber-100 text-amber-700 border-amber-300' },
    expired:        { label: 'Expired',        classes: 'bg-red-100 text-red-700 border-red-300' },
    terminated:     { label: 'Terminated',     classes: 'bg-slate-200 text-slate-600 border-slate-300' },
    archived:       { label: 'Archived',       classes: 'bg-slate-200 text-slate-600 border-slate-300' },
};

const STATUS_FILTER_OPTIONS = [
    { value: 'all',            label: 'All statuses' },
    { value: 'active',         label: 'Active' },
    { value: 'extended',       label: 'Extended' },
    { value: 'expiring_soon',  label: 'Expiring Soon' },
    { value: 'expired',        label: 'Expired' },
    { value: 'terminated',     label: 'Terminated' },
    { value: 'archived',       label: 'Archived' },
];

function StatusBadge({ status }) {
    const style = STATUS_STYLES[status] || { label: status || 'Unknown', classes: 'bg-slate-100 text-slate-500 border-slate-200' };
    return (
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border ${style.classes}`}>
            {style.label}
        </span>
    );
}

export default function BranchContractsSidebar({
    isOpen,
    branch,
    companyId,
    companyName,
    sapCode,
    onClose,
    rightOffset = 0,
    onPanelRectChange,
}) {
    const [isDesktop, setIsDesktop] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 640px)');
        const update = () => setIsDesktop(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (!isOpen || !isDesktop) {
            onPanelRectChange?.(null);
            return;
        }
        const report = () => {
            if (!panelRef.current) return;
            const rect = panelRef.current.getBoundingClientRect();
            onPanelRectChange?.({ top: rect.top, bottom: rect.bottom, right: rect.right });
        };
        const timeout = setTimeout(report, 520);
        window.addEventListener('resize', report);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', report);
        };
    }, [isOpen, isDesktop, rightOffset, onPanelRectChange]);

    const contracts = branch?.contracts ?? [];

    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc'); 
    useEffect(() => {
        setStatusFilter('all');
        setSortOrder('desc');
    }, [branch?.name]);

    const filteredContracts = useMemo(() => {
        const filtered = statusFilter === 'all'
            ? contracts
            : contracts.filter((c) => c.status === statusFilter);

        return [...filtered].sort((a, b) => {
            const aDate = a.start_date || '';
            const bDate = b.start_date || '';
            if (aDate === bDate) return 0;
            return sortOrder === 'asc'
                ? aDate.localeCompare(bDate)
                : bDate.localeCompare(aDate);
        });
    }, [contracts, statusFilter, sortOrder]);

    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const statusPickerRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (statusPickerRef.current && !statusPickerRef.current.contains(e.target))
                setShowStatusPicker(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[45] flex items-end justify-center sm:items-stretch sm:justify-end pointer-events-none">
            <div
                ref={panelRef}
                style={isOpen && isDesktop ? { marginRight: rightOffset } : undefined}
                className={`relative w-full h-[75vh] sm:w-[72%] md:max-w-[440px] sm:my-auto bg-[#f5f5f7]/90 backdrop-blur shadow-[-6px_0_18px_rgba(0,0,0,0.10)] border border-b border-black/15 flex flex-col rounded-t-3xl sm:rounded-3xl transform transition-[transform,margin-right] duration-500 ease-out
                    ${ isOpen ? 'translate-y-0 sm:translate-x-0 pointer-events-auto' : 'translate-y-full sm:translate-y-0 sm:translate-x-[120%] pointer-events-none' }`}
            >
                {/* Header */}
                <div className="px-4 md:px-6 p-3.5 flex justify-end items-center flex-shrink-0 rounded-t-3xl">
                    <div className="flex-1 text-center pt-1">
                        <h3 className="text-sm md:text-base font-extrabold text-slate-800 leading-tight">
                            Branch Contracts
                        </h3>
                        <div className="text-[10px] md:text-[11px] pt-1 font-medium text-slate-500 leading-snug">
                            {branch?.name || 'Unnamed branch'}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-800 transition-colors p-1"
                        aria-label="Close branch contracts"
                    >
                        <MdClose size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-0 pb-8 [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#195c0059]">
                    {branch ? (
                        <div className="flex flex-col">
                            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                                <span className="shrink-0 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border bg-[#195c00]/10 text-[#195c00] border-[#195c00]/20">
                                    {filteredContracts.length} of {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
                                </span>

                                {contracts.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="relative" ref={statusPickerRef}>
                                            <button
                                                type="button"
                                                onClick={() => setShowStatusPicker((p) => !p)}
                                                className="flex items-center gap-1 h-6 px-1.5 text-[9px] font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 transition-colors"
                                            >
                                                <MdFilterList size={12} />
                                                {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses'}
                                                <MdExpandMore size={12} className="text-slate-400" />
                                            </button>

                                            {showStatusPicker && (
                                                <div className="absolute left-0 top-7 z-50 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                                                    {STATUS_FILTER_OPTIONS.map((opt) => (
                                                        <div
                                                            key={opt.value}
                                                            onClick={() => {
                                                                setStatusFilter(opt.value);
                                                                setShowStatusPicker(false);
                                                            }}
                                                            className={`px-3 py-1.5 text-[11px] font-medium cursor-pointer hover:bg-[#E9F7E7] hover:text-[#195c00] transition-colors ${
                                                                statusFilter === opt.value ? 'text-[#195c00] font-bold' : 'text-slate-600'
                                                            }`}
                                                        >
                                                            {opt.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                                            title={sortOrder === 'asc' ? 'Coverage start: oldest first' : 'Coverage start: newest first'}
                                            className="flex items-center gap-1 h-6 px-1.5 text-[9px] font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 transition-colors"
                                        >
                                            <MdSwapVert size={12} />
                                            {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2.5">
                                {contracts.length > 0 && filteredContracts.length === 0 && (
                                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                                        <span className="text-slate-400 text-xs font-medium">
                                            No contracts match this filter
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter('all')}
                                            className="text-[11px] font-semibold text-[#195c00] hover:underline"
                                        >
                                            Clear filter
                                        </button>
                                    </div>
                                )}
                                {filteredContracts.length > 0 ? filteredContracts.map((c) => (
                                    <div
                                        key={c.id}
                                        className="border border-[#00000010] border-b-black/20 border-r-black/20 shadow-sm rounded-2xl bg-[#F2FAEE] backdrop-blur-sm overflow-hidden"
                                    >
                                        <div className="p-4 md:p-5 flex flex-col gap-4">
                                            {/* Doc # + status */}
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

                                            {/* Dates */}
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

                                            {/* PDF link */}
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
                                                        href={`${route('contract.upload')}?company_id=${companyId}&company_name=${encodeURIComponent(branch.name ?? companyName ?? '')}&sap_code=${encodeURIComponent(sapCode ?? '')}&can_upload=1&contract_id=${c.id}`}
                                                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100 hover:shadow-inner transition-colors"
                                                    >
                                                        <MdEdit size={14} /> Edit
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : (contracts.length === 0 && (
                                    <Link
                                        href={`${route('contract.upload')}?company_id=${companyId}&company_name=${encodeURIComponent(branch.name ?? companyName ?? '')}&sap_code=${encodeURIComponent(sapCode ?? '')}&can_upload=1&open_upload=1`}
                                        className="flex items-center justify-center gap-2 w-full h-10 rounded-md border border-dashed border-[#195c00]/40 text-[#195c00] text-xs font-medium hover:bg-[#d6f1d6] hover:border-[#195c00] transition-colors"
                                    >
                                        <MdOutlineFileUpload size={13} /> Upload a contract for this branch
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-slate-400 font-medium text-sm">No branch selected</span>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}