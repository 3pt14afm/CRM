import React, { forwardRef, useImperativeHandle, useState, useMemo, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { route } from 'ziggy-js';
import { MdClose, MdSearch, MdCalendarMonth, MdOutlineHistory, MdOutlineEdit, MdMoreVert, MdOutlineCancel, MdOutlineArchive, MdOutlinePictureAsPdf,  MdBlock,
  MdInbox, MdSchedule } from 'react-icons/md';
import { GrDocumentTime } from 'react-icons/gr';
import { FaFileUpload } from 'react-icons/fa';
import { toast } from 'sonner';


const ContractsModal = forwardRef(function ContractsModal({ modalRow, onClose, onUpload, onEdit, highlightContractId, onHighlightConsumed }, ref) {
    const [contractsList, setContractsList] = useState([]);
    const [contractBranches, setContractBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [isLoadingContracts, setIsLoadingContracts] = useState(false);
    const contractsRequestRef = useRef(null);
    const highlightedCardRef = useRef(null);

    // Which cards are currently showing their back (extension history) face.
    const [flippedIds, setFlippedIds] = useState(null);

    // ── Extend Date modal state ──
    const [extendTarget, setExtendTarget] = useState(null); // the contract being extended
    const [extendDateValue, setExtendDateValue] = useState('');
    const [extendError, setExtendError] = useState('');
    const [isExtending, setIsExtending] = useState(false);

    // ── 3-dot action menu (Edit / Terminate / Archive) ──
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuContainerRef = useRef(null);

    // Close the open action menu on outside click or Escape.
    useEffect(() => {
        if (openMenuId === null) return;

        const handleClickOutside = (e) => {
            if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') setOpenMenuId(null);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [openMenuId]);

    // ── Terminate contract modal state ──
    const [terminateTarget, setTerminateTarget] = useState(null);
    const [terminateError, setTerminateError] = useState('');
    const [isTerminating, setIsTerminating] = useState(false);

    // ── Archive contract modal state ──
    const [archiveTarget, setArchiveTarget] = useState(null);
    const [archiveError, setArchiveError] = useState('');
    const [isArchiving, setIsArchiving] = useState(false);

    // Fetches (or re-fetches) the contract list for the current modalRow
    // without touching the user's current branch/status/search/date filters
    // — used both for the initial load and for silent refreshes after a
    // new contract is uploaded from the still-open modal.
    const fetchContracts = useCallback(() => {
        if (!modalRow) return;

        if (contractsRequestRef.current) contractsRequestRef.current.abort();
        const controller = new AbortController();
        contractsRequestRef.current = controller;
        setIsLoadingContracts(true);

        axios.get(route('contract.contracts', modalRow.id), { signal: controller.signal })
            .then((res) => {
                setContractsList(res.data?.contracts ?? []);
                setContractBranches(res.data?.branches ?? []);
            })
            .catch((err) => {
                if (axios.isCancel?.(err) || err.name === 'CanceledError') return;
                console.error('Failed to load contracts:', err);
            })
            .finally(() => setIsLoadingContracts(false));
    }, [modalRow]);

    useEffect(() => {
        if (!highlightContractId || isLoadingContracts) return;
        if (!contractsList.some((c) => String(c.id) === String(highlightContractId))) return;

        const timeout = setTimeout(() => {
            highlightedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return () => clearTimeout(timeout);
    }, [highlightContractId, isLoadingContracts, contractsList, statusFilter, selectedBranch]);

    // Lets the parent trigger a refresh (e.g. right after a contract is
    // uploaded) without closing/reopening this modal.
    useImperativeHandle(ref, () => ({
        refresh: () => fetchContracts(),
    }), [fetchContracts]);

    useEffect(() => {
        if (!modalRow) return;

        setContractsList([]);
        setContractBranches([]);
        setSelectedBranch(modalRow.company_name ?? '');
        setStatusFilter('active');
        setSearchQuery('');
        setSelectedDate('');
        setFlippedIds({});

        fetchContracts();

        return () => {
            if (contractsRequestRef.current) contractsRequestRef.current.abort();
        };
    }, [modalRow]);

    useEffect(() => {
        if (!highlightContractId) return;
        setSelectedBranch('');
        setStatusFilter('all');
    }, [highlightContractId, modalRow]);

    // Format date to "Aug 8, 2026" style
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        // Handle YYYY-MM-DD format to avoid timezone shift issues
        const date = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)
            ? new Date(dateStr + 'T00:00:00')
            : new Date(dateStr);
        if (isNaN(date.getTime())) return String(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return '—';
        const date = new Date(dateTimeStr.replace(' ', 'T'));
        if (isNaN(date.getTime())) return String(dateTimeStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    // Status now comes straight from the database (Contract::computeStatus())
    // instead of being derived here in the frontend.
    const statusMeta = {
        active:         { label: 'Active',         badgeClass: 'bg-[#E9F7E7] text-[#2DA300]' },
        expiring_soon:  { label: 'Expiring Soon',   badgeClass: 'bg-amber-100 text-amber-700' },
        expired:        { label: 'Expired',         badgeClass: 'bg-red-100 text-[#C40000]' },
        extended:       { label: 'Extended',        badgeClass: 'bg-blue-100 text-blue-700' },
        terminated:     { label: 'Terminated',       badgeClass: 'bg-rose-100 text-rose-700' },
        archived:       { label: 'Archived',         badgeClass: 'bg-slate-200 text-slate-600' },
        unknown:        { label: 'No End Date',     badgeClass: 'bg-slate-100 text-slate-500' },
    };

    const statusBorderClass = {
        active:         'border-[#2DA300]/40',
        expiring_soon:  'border-amber-400/50',
        expired:        'border-[#C40000]/40',
        extended:       'border-blue-400/50',
        terminated:     'border-rose-400/50',
        archived:       'border-slate-300',
        unknown:        'border-slate-200',
    };

    const getMeta = (status) => statusMeta[status] ?? statusMeta.unknown;

    const filteredContracts = useMemo(() => {
        let result = contractsList;

        // 1. Filter by Branch
        if (selectedBranch) {
            result = result.filter((c) => c.company_name === selectedBranch);
        }

        // 2. Filter by Status
        // "Active" also includes contracts whose status is "extended" — an
        // extended contract's current effective end date is still in the
        // future, so it's active too, just with an extension on record. The
        // dedicated "Extended" tab remains for anyone who wants to see only
        // the ones that have been extended specifically.
        if (statusFilter === 'active') {
            result = result.filter((c) => c.status === 'active' || c.status === 'extended');
        } else if (statusFilter !== 'all') {
            result = result.filter((c) => c.status === statusFilter);
        }

        // 3. Filter by Search Query (Doc Num or Branch Name)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter((c) =>
                (c.doc_num?.toLowerCase().includes(q)) ||
                (c.company_name?.toLowerCase().includes(q))
            );
        }

        // 4. Filter by selected Date (Must fall between start and end date)
        if (selectedDate) {
            const filterDate = new Date(selectedDate + 'T00:00:00');
            filterDate.setHours(0, 0, 0, 0);

            result = result.filter((c) => {
                if (!c.start_date && !c.end_date) return false;

                const start = c.start_date ? new Date(c.start_date + 'T00:00:00') : null;
                const end = c.end_date ? new Date(c.end_date + 'T00:00:00') : null;

                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(0, 0, 0, 0);

                const isAfterStart = start ? filterDate >= start : true;
                const isBeforeEnd = end ? filterDate <= end : true;

                return isAfterStart && isBeforeEnd;
            });
        }

        return result;
    }, [contractsList, selectedBranch, statusFilter, searchQuery, selectedDate]);

    const statusCounts = useMemo(() => {
        const scoped = contractsList.filter((c) => !selectedBranch || c.company_name === selectedBranch);
        return {
            all:            scoped.length,
            // Active count includes extended contracts too — see the note
            // in filteredContracts above.
            active:         scoped.filter((c) => c.status === 'active' || c.status === 'extended').length,
            expiring_soon:  scoped.filter((c) => c.status === 'expiring_soon').length,
            expired:        scoped.filter((c) => c.status === 'expired').length,
            extended:       scoped.filter((c) => c.status === 'extended').length,
            terminated:     scoped.filter((c) => c.status === 'terminated').length,
            archived:       scoped.filter((c) => c.status === 'archived').length,
        };
    }, [contractsList, selectedBranch]);

    const toggleFlip = (id) => {
        setFlippedIds((prevId) => (prevId === id ? null : id));
    };
    // ── Edit contract handler ──
    // Only the admin or the contract's owning account manager can edit
    // (enforced server-side via c.can_edit). Hands the contract off to the
    // parent, which opens the Add/Edit Contract modal pre-filled with this
    // contract's data.
    const handleEditClick = (contract) => {
        if (!contract?.can_edit || !onEdit) return;
        onEdit(modalRow, contract);
    };

    // ── Extend Date modal handlers ──
    // The extend button stays clickable for anyone with manage permission
    // (c.can_edit) even once the 3-month extension window has closed
    // (c.extension_expired) — that way clicking it surfaces a clear toast
    // explaining why, instead of just looking greyed-out/broken.
    const openExtendModal = (contract) => {
        if (!contract.can_edit) return; // no permission at all — nothing to do

        if (contract.extension_expired) {
            toast.error('This contract expired more than 3 months ago and can no longer be extended.');
            return;
        }

        setExtendTarget(contract);
        setExtendDateValue('');
        setExtendError('');
    };

    const closeExtendModal = () => {
        if (isExtending) return;
        setExtendTarget(null);
        setExtendDateValue('');
        setExtendError('');
    };

    const currentEffectiveEnd = (contract) => {
        if (!contract) return null;
        const dates = (contract.extend_dates ?? []).map((e) => e.date).filter(Boolean).sort();
        return dates.length ? dates[dates.length - 1] : contract.end_date;
    };

    const submitExtend = () => {
        if (!extendTarget || !extendDateValue) return;
        setIsExtending(true);
        setExtendError('');

        axios.post(route('contract.extend', extendTarget.id), {
            extended_end_date: extendDateValue,
        })
            .then((res) => {
                const {
                    extend_dates, status,
                    can_edit, can_extend, extension_expired, can_terminate, can_archive,
                } = res.data;
                setContractsList((prev) =>
                    prev.map((c) =>
                        c.id === extendTarget.id
                            ? {
                                ...c,
                                extend_dates,
                                status,
                                // An expired contract that just got extended is
                                // "extended" now, not "expired" — these flags
                                // flip the 3-dot menu from Archive to
                                // Terminate immediately instead of only after
                                // the modal is reopened/refetched.
                                can_edit,
                                can_extend,
                                extension_expired,
                                can_terminate,
                                can_archive,
                            }
                            : c
                    )
                );
                setExtendTarget(null);
                setExtendDateValue('');
                toast.success('Contract extended successfully.');
            })
            .catch((err) => {
                // Falls back to the same "expired more than 3 months ago..."
                // message the server sends when this is caught late (e.g.
                // stale data in this modal) rather than pre-empted above.
                const message = err.response?.data?.message
                    || err.response?.data?.errors?.extended_end_date?.[0]
                    || 'Failed to extend contract. Please try again.';
                setExtendError(message);
                toast.error(message);
            })
            .finally(() => setIsExtending(false));
    };

    // ── Terminate contract handlers ──
    // Only offered while a contract is still "live" (active / extended /
    // expiring_soon) — enforced server-side via c.can_terminate. Once
    // terminated, a contract becomes final: view-only, no edit/extend/
    // terminate/archive ever again.
    const openTerminateModal = (contract) => {
        if (!contract?.can_terminate) return;
        setOpenMenuId(null);
        setTerminateTarget(contract);
        setTerminateError('');
    };

    const closeTerminateModal = () => {
        if (isTerminating) return;
        setTerminateTarget(null);
        setTerminateError('');
    };

    const submitTerminate = () => {
        if (!terminateTarget) return;
        setIsTerminating(true);
        setTerminateError('');

        axios.post(route('contract.terminate', terminateTarget.id))
            .then((res) => {
                const { status, terminated_at, terminated_by_name } = res.data;
                setContractsList((prev) =>
                    prev.map((c) =>
                        c.id === terminateTarget.id
                            ? { ...c, status, terminated_at, terminated_by_name, can_edit: false, can_extend: false, can_terminate: false, can_archive: false }
                            : c
                    )
                );
                setTerminateTarget(null);
                toast.success('Contract terminated.');
            })
            .catch((err) => {
                const message = err.response?.data?.message || 'Failed to terminate contract. Please try again.';
                setTerminateError(message);
                toast.error(message);
            })
            .finally(() => setIsTerminating(false));
    };

    // ── Archive contract handlers ──
    // Only offered once a contract has expired — enforced server-side via
    // c.can_archive. Once archived, a contract becomes final: view-only,
    // no edit/extend/terminate/archive ever again.
    const openArchiveModal = (contract) => {
        if (!contract?.can_archive) return;
        setOpenMenuId(null);
        setArchiveTarget(contract);
        setArchiveError('');
    };

    const closeArchiveModal = () => {
        if (isArchiving) return;
        setArchiveTarget(null);
        setArchiveError('');
    };

    const submitArchive = () => {
        if (!archiveTarget) return;
        setIsArchiving(true);
        setArchiveError('');

        axios.post(route('contract.archive', archiveTarget.id))
            .then((res) => {
                const { status, archived_at, archived_by_name } = res.data;
                setContractsList((prev) =>
                    prev.map((c) =>
                        c.id === archiveTarget.id
                            ? { ...c, status, archived_at, archived_by_name, can_edit: false, can_extend: false, can_terminate: false, can_archive: false }
                            : c
                    )
                );
                setArchiveTarget(null);
                toast.success('Contract archived.');
            })
            .catch((err) => {
                const message = err.response?.data?.message || 'Failed to archive contract. Please try again.';
                setArchiveError(message);
                toast.error(message);
            })
            .finally(() => setIsArchiving(false));
    };

    // ── Upload button handler ──
    // Fires the parent's Add Contract modal, pre-filled with whichever
    // branch is currently selected here (or the default company name when
    // "All branches" is selected). Closes this modal so the two overlays
    // don't stack.
    const handleUploadClick = () => {
        if (!modalRow || !onUpload) return;
        const branchName = selectedBranch || modalRow.company_name || '';
        onUpload(modalRow, branchName);
    };

    if (!modalRow) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4"
            onClick={onClose}
        >
            <div
                className=" w-[99%] lg:w-[70%] h-[80%] bg-[#f5f5f7] rounded-2xl shadow-xl p-8  flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-5 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900 font-mono">
                            SAP Code: {modalRow.sap_code ?? '—'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Contracts across all registered branches for this SAP code.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <MdClose size={20} />
                    </button>
                </div>

                {(contractBranches.length > 0 || modalRow.company_name) && (
                    <div className="mt-3 flex-shrink-0">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Branch / Company Name
                        </label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className=" w-full lg:w-[60%] h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                        >
                            <option value="">All branches</option>
                            {(contractBranches.length > 0
                                ? contractBranches
                                : [modalRow.company_name].filter(Boolean)
                            ).map((name) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Status filter tabs */}
                <div className="mt-5 flex items-center gap-3 flex-shrink-0 overflow-x-auto py-2">
                    {[
                        { key: 'all',            label: 'All' },
                        { key: 'active',         label: 'Active' },
                        { key: 'expiring_soon',  label: 'Expiring Soon' },
                        { key: 'expired',        label: 'Expired' },
                        { key: 'extended',       label: 'Extended' },
                        { key: 'terminated',     label: 'Terminated' },
                        { key: 'archived',       label: 'Archived' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setStatusFilter(tab.key)}
                            className={`relative h-7 px-3 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                                statusFilter === tab.key
                                    ? 'bg-[#4FA34E] text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {tab.label}
                            {statusCounts[tab.key] > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] rounded-full font-bold shadow-sm border border-white">
                                    {statusCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search bar and Date picker */}
                <div className="mt-4 flex items-center gap-2 flex-shrink-0 flex-wrap">

                    {/* Calendar Icon / Date Picker */}
                    <label className="relative cursor-pointer h-9 w-9 flex items-center justify-center hover:bg-slate-50 rounded-lg" title="Filter by active date">
                        <MdCalendarMonth className={selectedDate ? 'text-[#4FA34E]' : 'text-slate-500'} size={20} />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </label>

                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Doc # or Branch..."
                            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                        />
                    </div>

                    {/* Upload Contract button — opens the Add Contract modal
                        pre-filled with the branch currently selected above. */}
                    <button
                        type="button"
                        disabled={!modalRow?.can_upload}
                        onClick={handleUploadClick}
                        title={modalRow?.can_upload ? `Upload a contract for ${selectedBranch || modalRow.company_name || 'this branch'}` : 'Only the assigned account manager can upload a contract for this company'}
                        className={`flex items-center gap-1 h-9 px-3 rounded-lg text-[#4FA34E]  font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                            modalRow?.can_upload ? ' cursor-pointer' : 'cursor-not-allowed shadow-none'
                        }`}
                    >
                        <FaFileUpload className="text-2xl" />
                     
                    </button>

                      {/* Green X Clear Button - No BG, only shows if date is selected */}
                    {selectedDate && (
                        <button
                            type="button"
                            onClick={() => setSelectedDate('')}
                            className="h-9 w-9 flex items-center justify-center text-[#4FA34E] hover:text-[#3d8f3c]"
                            title="Clear date filter"
                        >
                            <MdClose size={20} />
                        </button>
                    )}
                </div>

                <div className="mt-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                    {/* Skeleton Loading State */}
                    {isLoadingContracts && (
                        Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={`skeleton-${index}`}
                                className="border border-gray-200 rounded-xl p-5 flex flex-col gap-2.5 animate-pulse"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                                    <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
                                </div>
                                <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
                                <div className="h-3 w-1/3 bg-slate-200 rounded"></div>
                                <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                                <div className="h-3 w-1/4 bg-slate-200 rounded mt-1"></div>
                            </div>
                        ))
                    )}

                    {!isLoadingContracts && filteredContracts.length === 0 && (
                        <p className="text-sm text-slate-500 py-6 text-center col-span-full">
                            No contracts match this filter.
                        </p>
                    )}

                    {!isLoadingContracts && filteredContracts.map((c) => {
                        const meta = getMeta(c.status);
                        const isFlipped = flippedIds === c.id;
                        const extensions = c.extend_dates ?? [];
                        const isHighlighted = highlightContractId && String(c.id) === String(highlightContractId);

                        return (
                            <div
                                key={c.id}
                                ref={isHighlighted ? highlightedCardRef : null}
                                className="relative group h-full"
                                style={{ perspective: '1200px' }}
                            >
                                <div
                                    className="relative w-full h-full transition-transform duration-700 ease-in-out"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                    }}
                                >
                                    {/* ── Front face ── */}
                                    <div
                                        className={`relative bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-slate-200 h-full ${
                                            isHighlighted ? `border-1 ${statusBorderClass[c.status] ?? statusBorderClass.unknown}` : ''
                                        }`}
                                        style={{ backfaceVisibility: 'hidden' }}
                                        onClick={() => { if (isHighlighted) onHighlightConsumed?.(); }}
                                    >
                                        {/* Header: Company & Status Badge */}
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-base font-semibold text-[#0f3800] leading-tight tracking-tight truncate">
                                                {c.company_name ?? '—'}
                                            </h3>
                                            <span className={`flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-3xl ${meta.badgeClass}`}>
                                                {meta.label}
                                            </span>
                                        </div>

                                        {/* Meta Information */}
                                        <div className="flex flex-col gap-2 ">
                                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="text-slate-400">SAP:</span> 
                                                    <span className="font-mono text-slate-700">{modalRow.sap_code ?? '—'}</span>
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="text-slate-400">Doc #:</span> 
                                                    <span className="font-mono text-slate-700">{c.doc_num ?? '—'}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                <span className="text-slate-400">Validity:</span>
                                                <span>{formatDate(c.start_date)}</span>
                                                <span className="text-slate-300 text-base">→</span>
                                                <span>{formatDate(c.end_date)}</span>
                                            </div>
                                        </div>

                                        {/* Status / Extension Message */}
                                        {/* Decreased min-h to 16px and added py-0 to reduce height */}
                                        <div className="min-h-[16px] flex items-center py-0">
                                            {c.status === 'terminated' ? (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                                    <MdOutlineCancel title='Terminated' size={13} /> 
                                                    {formatDate(c.terminated_at)}
                                                    {c.terminated_by_name ? ` by ${c.terminated_by_name}` : ''}
                                                </span>
                                            ) : c.status === 'archived' ? (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                                    <MdOutlineArchive title='Archived' size={13} /> 
                                                    {formatDate(c.archived_at)}
                                                    {c.archived_by_name ? ` by ${c.archived_by_name}` : ''}
                                                </span>
                                            ) : extensions.length > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                                                    <MdOutlineHistory title='Extended' size={13} /> 
                                                    to {formatDate(currentEffectiveEnd(c))}
                                                </span>
                                            ) : null}
                                        </div>

                                        {/* Footer: Actions */}
                                        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                                            {c.pdf_url ? (
                                                <a
                                                    href={c.pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4FA34E]  hover:text-emerald-700 transition-colors"
                                                >
                                                    <MdOutlinePictureAsPdf size={16} className="text-[#4FA34E] " />
                                                    View Contract
                                                </a>
                                            ) : (
                                                <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                                                    <MdBlock size={14} />
                                                    No PDF available
                                                </p>
                                            )}

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFlip(c.id)}
                                                    title="View extension history"
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 hover:scale-105"
                                                >
                                                    <MdOutlineHistory size={16} />
                                                </button>
                                                
                                                <button
                                                    type="button"
                                                    disabled={!c.can_edit}
                                                    onClick={() => openExtendModal(c)}
                                                    title={
                                                        !c.can_edit
                                                            ? 'Only the assigned account manager can extend this contract'
                                                            : c.extension_expired
                                                                ? 'This contract expired more than 3 months ago and can no longer be extended.'
                                                                : 'Extend end date'
                                                    }
                                                    className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 ${
                                                                        c.can_edit
                                                                            ? 'text-emerald-600 hover:bg-emerald-50'
                                                                            : 'text-slate-300 cursor-not-allowed'
                                                                    }`}
                                                >
                                                    <GrDocumentTime size={16} />
                                                </button>

                                                {c.can_edit && (
                                                    <div className="relative" ref={openMenuId === c.id ? menuContainerRef : null}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                                                            title="More actions"
                                                            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 hover:scale-105"
                                                        >
                                                            <MdMoreVert size={16} />
                                                        </button>

                                                        {openMenuId === c.id && (
                                                            <div className="absolute right-0 bottom-full mb-2 w-44 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/60 py-1.5 z-10 overflow-hidden">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setOpenMenuId(null); handleEditClick(c); }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <MdOutlineEdit size={15} className="text-slate-400" />
                                                                    Edit
                                                                </button>

                                                                {c.can_terminate && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openTerminateModal(c)}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                                                                    >
                                                                        <MdOutlineCancel size={15} />
                                                                        Terminate
                                                                    </button>
                                                                )}

                                                                {c.can_archive && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openArchiveModal(c)}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                                                                    >
                                                                        <MdOutlineArchive size={15} className="text-slate-400" />
                                                                        Archive
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Back face — extension history ── */}
                                    <div
                                        className="absolute inset-0 bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-3 shadow-md overflow-hidden"
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            transform: 'rotateY(180deg)',
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2 flex-shrink-0 pb-3 border-b border-slate-100">
                                            <div className="flex flex-col">
                                                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <MdOutlineHistory size={16} className="text-emerald-500" />
                                                    Extension History
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    Original end date: <span className="text-slate-600 font-medium">{formatDate(c.end_date)}</span>
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggleFlip(c.id)}
                                                title="Back to contract"
                                                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                            >
                                                <MdClose size={16} />
                                            </button>
                                        </div>

                                        {extensions.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-slate-400 py-4">
                                                <MdInbox size={32} className="text-slate-200" />
                                                <p className="text-xs font-medium">No extensions have been made on this contract yet.</p>
                                            </div>
                                        ) : (
                                            <ul className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
                                                {[...extensions].reverse().map((entry, idx) => (
                                                    <li
                                                        key={`${entry.date}-${idx}`}
                                                        className="relative pl-5 text-xs group/li"
                                                    >
                                                        {/* Timeline Dot & Line */}
                                                        <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white z-10"></span>
                                                        <span className="absolute left-[4px] top-2 bottom-[-12px] w-px bg-slate-200"></span>
                                                        
                                                        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 transition-all duration-200 group-hover/li:border-emerald-200 group-hover/li:bg-emerald-50/50">
                                                            <p className="font-semibold text-slate-800">
                                                                New end date: <span className="text-emerald-600">{formatDate(entry.date)}</span>
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                                                                <MdSchedule size={11} />
                                                                Extended {formatDateTime(entry.extended_at)}
                                                                {(entry.extended_by_name || entry.extended_by)
                                                                    ? ` by ${entry.extended_by_name || entry.extended_by}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Extend Date Modal ── */}
            {extendTarget && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4"
                    onClick={closeExtendModal}
                >
                    <div
                        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Extend Contract</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Doc #: {extendTarget.doc_num} · {extendTarget.company_name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeExtendModal}
                                disabled={isExtending}
                                className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
                            >
                                <MdClose size={20} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 mt-3">
                            Current end date: <span className="font-medium text-slate-700">{formatDate(currentEffectiveEnd(extendTarget))}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                            The original end date is never changed — this adds a new extension on top of it.
                        </p>

                        <div className="mt-4">
                            <label className="block text-xs font-medium text-slate-600 mb-1">New End Date</label>
                            <input
                                type="date"
                                value={extendDateValue}
                                min={currentEffectiveEnd(extendTarget) || undefined}
                                onChange={(e) => setExtendDateValue(e.target.value)}
                                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                            />
                            {extendError && <p className="text-[11px] text-[#C40000] mt-1">{extendError}</p>}
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={closeExtendModal}
                                disabled={isExtending}
                                className="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitExtend}
                                disabled={isExtending || !extendDateValue}
                                className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-[#4FA34E] hover:bg-[#3d8f3c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isExtending ? 'Saving…' : 'Save Extension'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Terminate Contract Modal ── */}
            {terminateTarget && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4"
                    onClick={closeTerminateModal}
                >
                    <div
                        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Terminate Contract</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Doc #: {terminateTarget.doc_num} · {terminateTarget.company_name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeTerminateModal}
                                disabled={isTerminating}
                                className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
                            >
                                <MdClose size={20} />
                            </button>
                        </div>

                        <p className="text-[11px] text-rose-600 mt-3">
                            This ends the contract immediately. Once terminated, it cannot be edited, extended, or
                            archived — only viewed.
                        </p>
                        {terminateError && <p className="text-[11px] text-[#C40000] mt-2">{terminateError}</p>}

                        <div className="flex items-center justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={closeTerminateModal}
                                disabled={isTerminating}
                                className="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitTerminate}
                                disabled={isTerminating}
                                className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isTerminating ? 'Terminating…' : 'Terminate Contract'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Archive Contract Modal ── */}
            {archiveTarget && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4"
                    onClick={closeArchiveModal}
                >
                    <div
                        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Archive Contract</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Doc #: {archiveTarget.doc_num} · {archiveTarget.company_name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeArchiveModal}
                                disabled={isArchiving}
                                className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
                            >
                                <MdClose size={20} />
                            </button>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-3">
                            This expired contract will be moved to Archived. Once archived, it cannot be edited,
                            extended, or terminated — only viewed.
                        </p>
                        {archiveError && <p className="text-[11px] text-[#C40000] mt-2">{archiveError}</p>}

                        <div className="flex items-center justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={closeArchiveModal}
                                disabled={isArchiving}
                                className="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitArchive}
                                disabled={isArchiving}
                                className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isArchiving ? 'Archiving…' : 'Archive Contract'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ContractsModal;