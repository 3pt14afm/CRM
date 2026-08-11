import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import ContractsModal from './ContractsModal'; 
import { route } from 'ziggy-js';
import { toast } from 'sonner';
import { MdSearch, MdOutlineFilterAlt, MdExpandMore, MdClose } from 'react-icons/md';
import { FaFileUpload, FaRegFileAlt } from 'react-icons/fa';
import { TbLayoutRows } from 'react-icons/tb';
import SortHeader from '@/Components/SortHeader';

const STORAGE_KEY = 'contract_upload_filters';

const DEFAULT_FILTERS = {
    search:         '',
    category:       '',
    delsan_company: '',
    per_page:       12,
    sort_by:        'company_name',
    sort_order:     'asc',
};

function loadPersistedFilters() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function UploadContract({ companies, filters = {}, categories = [] }) {
    const { auth } = usePage().props;
    const currentEmployeeId = auth?.user?.employee_id ?? null;

    const canUploadFor = (row) => !!row.can_upload;

    const [modalCompany, setModalCompany] = useState(null);
    const [editingContract, setEditingContract] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [docNum, setDocNum] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [isUploading, setIsUploading] = useState(false);

    const [companyNameOptions, setCompanyNameOptions] = useState([]);
    const [selectedCompanyName, setSelectedCompanyName] = useState('');
    
    // Searchable Dropdown state
    const [companyNameQuery, setCompanyNameQuery] = useState('');
    const [showCompanyNameDropdown, setShowCompanyNameDropdown] = useState(false);

    const filteredCompanyNameOptions = useMemo(() => {
        if (!companyNameQuery) return companyNameOptions;
        return companyNameOptions.filter(name =>
            name.toLowerCase().includes(companyNameQuery.toLowerCase())
        );
    }, [companyNameOptions, companyNameQuery]);

    const openUploadModal = (row, preferredCompanyName) => {
        if (!canUploadFor(row)) return;
        setModalCompany(row);
        setEditingContract(null);
        setPdfFile(null);
        setDocNum('');
        setStartDate('');
        setEndDate('');
        setFormErrors({});

        const uniqueNames = row.company_name_options?.length
            ? row.company_name_options
            : [row.company_name].filter(Boolean);
        setCompanyNameOptions(uniqueNames);

        // If we were told which branch to prefer (e.g. the branch selected
        // inside the Contracts modal) and it's actually one of this row's
        // known names, use it; otherwise fall back to the row's own name.
        const initialName = (preferredCompanyName && uniqueNames.includes(preferredCompanyName))
            ? preferredCompanyName
            : (row.company_name ?? '');
        setSelectedCompanyName(initialName);
        setCompanyNameQuery(initialName);
        setShowCompanyNameDropdown(false);
    };

    // Opens the same modal pre-filled with an existing contract's data.
    // Gated on the backend's per-contract `can_edit` flag (admin or the
    // contract's owning account manager only) — the ContractsModal already
    // checks this before calling us, but we re-check here too since this
    // function is reachable directly.
    const openEditModal = (row, contract) => {
        if (!contract?.can_edit) return;
        setModalCompany(row);
        setEditingContract(contract);
        setPdfFile(null);
        setDocNum(contract.doc_num ?? '');
        setStartDate(contract.start_date ?? '');
        setEndDate(contract.end_date ?? '');
        setFormErrors({});

        const uniqueNames = row.company_name_options?.length
            ? row.company_name_options
            : [row.company_name].filter(Boolean);
        setCompanyNameOptions(uniqueNames);

        const initialName = (contract.company_name && uniqueNames.includes(contract.company_name))
            ? contract.company_name
            : (row.company_name ?? '');
        setSelectedCompanyName(initialName);
        setCompanyNameQuery(initialName);
        setShowCompanyNameDropdown(false);
    };

    const closeUploadModal = () => {
        if (isUploading) return;
        setModalCompany(null);
        setEditingContract(null);
        setCompanyNameOptions([]);
        setSelectedCompanyName('');
        setCompanyNameQuery('');
        setShowCompanyNameDropdown(false);
    };

    // True when editing and at least one field (or a newly-picked PDF)
    // actually differs from the contract's original values. Used to keep
    // "Save Changes" disabled until there's something to save.
    const hasEditChanges = useMemo(() => {
        if (!editingContract) return false;
        if (pdfFile) return true;
        return (
            docNum !== (editingContract.doc_num ?? '') ||
            startDate !== (editingContract.start_date ?? '') ||
            endDate !== (editingContract.end_date ?? '') ||
            selectedCompanyName !== (editingContract.company_name ?? '')
        );
    }, [editingContract, pdfFile, docNum, startDate, endDate, selectedCompanyName]);

    // ── View Contracts modal state ──
    const [contractsModalRow, setContractsModalRow] = useState(null);
    const contractsModalRef = useRef(null);

    const [highlightContractId, setHighlightContractId] = useState(null);

    const openContractsModal = (row, contractIdToHighlight = null) => {
        setContractsModalRow(row);
        if (contractIdToHighlight) setHighlightContractId(String(contractIdToHighlight));
    };
    const closeContractsModal = () => {
        setContractsModalRow(null);
        setHighlightContractId(null);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const companyId = params.get('company_id');
        const companyName = params.get('company_name');
        const sapCode = params.get('sap_code');
        const canUpload = params.get('can_upload') === '1';
        const contractId = params.get('contract_id');
        const openUpload = params.get('open_upload') === '1';

        if (companyId) {
            const row = {
                id: companyId,
                company_name: companyName ?? '',
                sap_code: sapCode || null,
                can_upload: canUpload,
            };
            if (openUpload && canUpload) {
                openUploadModal(row, companyName ?? '');
            } else {
                openContractsModal(row, contractId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitContract = () => {
        if (!modalCompany) return;
        setIsUploading(true);
        setFormErrors({});

        const isEditing = !!editingContract;
        const url = isEditing
            ? route('contract.update', editingContract.id)
            : route('contract.store', modalCompany.id);

        router.post(
            url,
            {
                // On edit, the PDF is optional — omitting it keeps the file
                // already on record.
                pdf: pdfFile,
                doc_num: docNum,
                start_date: startDate,
                end_date: endDate,
                company_name: selectedCompanyName,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setModalCompany(null);
                    setEditingContract(null);
                    setCompanyNameOptions([]);
                    setSelectedCompanyName('');
                    setCompanyNameQuery('');
                    // The Contracts modal (if open) stays open behind the
                    // upload modal — refresh its list so the new/edited
                    // contract shows up without closing/reopening it.
                    contractsModalRef.current?.refresh();
                    toast.success(isEditing ? 'Contract updated successfully.' : 'Contract uploaded successfully.');
                },
                onError: (errors) => {
                    setFormErrors(errors);
                    const firstError = Object.values(errors ?? {})[0];
                    const message = Array.isArray(firstError) ? firstError[0] : firstError;
                    toast.error(message || (isEditing
                        ? 'Failed to update contract. Please try again.'
                        : 'Failed to upload contract. Please try again.'));
                },
                onFinish: () => {
                    setIsUploading(false);
                },
            }
        );
    };

    const [searchState, setSearchState] = useState(() => {
        const persisted = loadPersistedFilters();
        return {
            ...DEFAULT_FILTERS,
            ...(persisted ?? {}),
            ...(filters.search         !== undefined ? { search:         filters.search }         : {}),
            ...(filters.category       !== undefined ? { category:       filters.category }       : {}),
            ...(filters.delsan_company !== undefined ? { delsan_company: filters.delsan_company } : {}),
            ...(filters.per_page       !== undefined ? { per_page:       filters.per_page }       : {}),
            ...(filters.sort_by        !== undefined ? { sort_by:        filters.sort_by }        : {}),
            ...(filters.sort_order     !== undefined ? { sort_order:     filters.sort_order }     : {}),
        };
    });

    const [showPerPagePicker, setShowPerPagePicker] = useState(false);
    const [perPageInput, setPerPageInput] = useState(String(searchState.per_page));
    const perPagePickerRef = useRef(null);

    // UI-only grouping: the backend still returns one row per branch, but
    // rows sharing a sap_code are collapsed into a single row here and can
    // be expanded to reveal the sibling branches underneath it.
    const [expandedSapCodes, setExpandedSapCodes] = useState(() => new Set());
    const toggleGroup = (sapCode) => {
        if (!sapCode) return;
        setExpandedSapCodes((prev) => {
            const next = new Set(prev);
            if (next.has(sapCode)) next.delete(sapCode); else next.add(sapCode);
            return next;
        });
    };

    // Collapsed group parent: first click expands the branches instead of
    // opening the modal. Once expanded (or for any non-group / child row),
    // a click opens the Contracts modal as usual.
    const handleRowClick = (r) => {
        const groupCount = r._groupCount ?? 1;
        const isExpanded = r.sap_code && expandedSapCodes.has(r.sap_code);
        if (!r._isGroupChild && groupCount > 1 && !isExpanded) {
            toggleGroup(r.sap_code);
            return;
        }
        openContractsModal(r);
    };

    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchDebounceRef = useRef(null);
    const searchAbortRef = useRef(null);

    // Some handlers (e.g. the sort-header onClick) end up baked into
    // memoized JSX (existingColumns) that only recomputes when sort_by/
    // sort_order change. If those handlers closed over `searchState`
    // directly, they'd merge filters using a stale snapshot whenever other
    // filters (like per_page) changed without a sort change in between —
    // e.g. setting "Rows: 20" then clicking sort would silently revert
    // per_page back to whatever it was the last time the memo recomputed.
    // This ref is always current regardless of which render's closure is
    // calling into it.
    const searchStateRef = useRef(searchState);
    useEffect(() => {
        searchStateRef.current = searchState;
    }, [searchState]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(searchState));
        } catch { /* quota exceeded */ }
    }, [searchState]);

    useEffect(() => {
        const handler = (e) => {
            if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target))
                setShowPerPagePicker(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            if (searchAbortRef.current) searchAbortRef.current.abort();
        };
    }, []);

    const updateFilters = (newFilters) => {
        const updated = { ...searchStateRef.current, ...newFilters };
        setSearchState(updated);
        // Drop any stale AJAX search results so the render falls back to the
        // `companies` prop returned by this Inertia visit — otherwise sort/
        // filter/page changes made while `searchResults` is populated (i.e.
        // after typing in the search box) appear to do nothing, because
        // effectiveCompanies prefers searchResults over companies.
        setSearchResults(null);
        router.get(route('contract.upload'), updated, {
            preserveState: true,
            replace: true,
        });
    };

    const runSearch = (value, currentFilters) => {
        if (searchAbortRef.current) searchAbortRef.current.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;
        setIsSearching(true);

        axios.get(route('contract.upload'), {
            params: { ...currentFilters, search: value },
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            signal: controller.signal,
        })
            .then((res) => setSearchResults(res.data))
            .catch((err) => {
                if (axios.isCancel?.(err) || err.name === 'CanceledError') return;
                console.error('Search request failed:', err);
            })
            .finally(() => setIsSearching(false));
    };

    const handleSearchChange = (value) => {
        const updated = { ...searchState, search: value };
        setSearchState(updated);

        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            const params = new URLSearchParams(updated).toString();
            window.history.replaceState(window.history.state, '', `${route('contract.upload')}?${params}`);
            runSearch(value, updated);
        }, 350);
    };

    const handleSort = (key) => {
        const current = searchStateRef.current;
        const newOrder = current.sort_by === key && current.sort_order === 'asc' ? 'desc' : 'asc';
        updateFilters({ sort_by: key, sort_order: newOrder });
    };

    const isFiltered = useMemo(() => (
        searchState.search         !== DEFAULT_FILTERS.search         ||
        searchState.category       !== DEFAULT_FILTERS.category       ||
        searchState.delsan_company !== DEFAULT_FILTERS.delsan_company ||
        searchState.sort_by        !== DEFAULT_FILTERS.sort_by        ||
        searchState.sort_order     !== DEFAULT_FILTERS.sort_order
    ), [searchState]);

    const clearAllFilters = () => {
        const reset = { ...DEFAULT_FILTERS, per_page: searchState.per_page };
        setSearchState(reset);
        setPerPageInput(String(reset.per_page));
        setSearchResults(null);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reset)); } catch {}
        router.get(route('contract.upload'), reset, { preserveState: true, replace: true });
    };

    const handlePerPageInputApply = () => {
        const raw = parseInt(perPageInput, 10);
        const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 100) : searchState.per_page;
        setShowPerPagePicker(false);
        updateFilters({ per_page: num });
        setPerPageInput(String(num));
    };

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(today);

    // Same color rule used on the Customer Info "Existing Customers" table:
    // red for any expired contract, amber for expiring-soon, green for
    // healthy (active/extended), no color when there are no contracts at all.
    const CONTRACT_STATUS_CLASSES = {
        expired: 'text-red-600',
        warning: 'text-amber-500',
        good:    'text-lime-500',
        default: 'text-slate-500',
    };

    const STATUS_SEVERITY = { expired: 3, warning: 2, good: 1, default: 0 };

    const renderExistingCard = (r) => {
        const allowed = canUploadFor(r);
        const groupCount = r._groupCount ?? 1;
        const isExpanded = r.sap_code && expandedSapCodes.has(r.sap_code);
        const showGroupTotal = !r._isGroupChild && groupCount > 1 && !isExpanded;
        const count = showGroupTotal ? (r._groupTotalContracts ?? 0) : (r.contracts_count ?? 0);
        const countStatus = showGroupTotal ? r._groupContractsStatus : r.contracts_status;
        const countColorClass = count > 0 ? (CONTRACT_STATUS_CLASSES[countStatus] ?? '') : '';
        return (
            <div
                className={`flex flex-col gap-3 cursor-pointer ${r._isGroupChild ? 'pl-4 pr-2 py-1.5 border-l-2 border-[#195c00]/15' : ''}`}
                onClick={() => handleRowClick(r)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-600 text-xs">{r.sap_code}</span>
                        {!r._isGroupChild && groupCount > 1 && (
                            <span className="shrink-0 text-[9px] font-semibold text-[#195c00] bg-[#195c00]/10 px-1.5 py-0.5 rounded-full">
                                {groupCount} Branches
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        disabled={!allowed}
                        title={allowed ? undefined : 'Only the assigned account manager can upload a contract for this company'}
                        onClick={(e) => { e.stopPropagation(); openUploadModal(r); }}
                        className={`flex items-center gap-1 h-6 px-2 rounded-lg text-white text-[10px] font-semibold transition-colors shadow-sm whitespace-nowrap ${
                            allowed ? 'bg-[#4FA34E] hover:bg-[#3d8f3c] cursor-pointer' : 'bg-slate-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        <FaFileUpload className="text-xs" />
                    </button>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate text-[#0f3800]">{r.company_name ?? '—'}</p>
                        {!r._isGroupChild && groupCount > 1 && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleGroup(r.sap_code); }}
                                title={isExpanded ? 'Collapse branches' : `Show ${groupCount - 1} more branch${groupCount - 1 !== 1 ? 'es' : ''}`}
                                className="flex-shrink-0 text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                <MdExpandMore size={20} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] font-medium truncate uppercase">
                        {[r.client_category, r.delsan_company].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-[11px] font-medium text-slate-700">{r.client_manager ?? r.id_client_mngr ?? '—'}</p>
                        {count > 0 && (
                            <span className={`text-[11px] font-semibold ${countColorClass}`}>{count} contract{count === 1 ? '' : 's'}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const existingColumns = useMemo(() => [
        {
            key: 'sap_code',
            header: <SortHeader label="SAP CODE" sortKey="sap_code" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <span className={`font-mono text-xs lg:text-sm flex items-center ${r._isGroupChild ? 'text-slate-300' : 'text-slate-500'}`}>
                    {r._isGroupChild ? '' : (r.sap_code ?? '—')}
                </span>
            ),
        },
        {
            key: 'delsan_company',
            header: <SortHeader label="DELSAN" sortKey="delsan_company" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <span className={`font-medium flex items-center uppercase ${r._isGroupChild ? 'text-slate-600 font-normal' : ''}`}>
                    {r.delsan_company ?? '—'}
                </span>
            ),
        },
        {
            key: 'company_name',
            header: <SortHeader label="COMPANY NAME" sortKey="company_name" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => {
                if (r._isGroupChild) {
                    return (
                        <div className="relative flex items-center gap-1.5 pl-6">
                            <span className="absolute left-2 -top-2.5 bottom-1/2 w-px bg-slate-300" />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-px bg-slate-300" />
                            <span className="truncate text-slate-600 font-normal italic">{r.company_name ?? '—'}</span>
                        </div>
                    );
                }
                const groupCount = r._groupCount ?? 1;
                const isExpanded = r.sap_code && expandedSapCodes.has(r.sap_code);
                return (
                    <div className="font-medium flex items-center justify-between gap-1.5 text-[#0f3800]">
                        <span className="truncate">{r.company_name ?? '—'}</span>
                        {groupCount > 1 && (
                            <div className="flex items-center gap-5 flex-shrink-0">
                                <span className="text-[9px] font-semibold text-[#195c00] bg-[#195c00]/10 px-1.5 py-0.5 rounded-full">
                                    {groupCount}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleGroup(r.sap_code); }}
                                    title={isExpanded ? 'Collapse branches' : `Show ${groupCount - 1} more branch${groupCount - 1 !== 1 ? 'es' : ''}`}
                                    className="bg-white border shadow-sm rounded-md"
                                >
                                    <MdExpandMore size={20} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'client_category',
            header: <SortHeader label="CATEGORY" sortKey="client_category" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <span className={`font-medium flex min-w-28 items-center ${r._isGroupChild ? 'text-slate-600 font-normal' : ''}`}>
                    {r.client_category ?? '—'}
                </span>
            ),
        },
        {
            key: 'contracts_count',
            header: <SortHeader label="CONTRACTS" sortKey="contracts_count" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => {
                const isExpanded = r.sap_code && expandedSapCodes.has(r.sap_code);
                const groupCount = r._groupCount ?? 1;
                const showGroupTotal = !r._isGroupChild && groupCount > 1 && !isExpanded;
                const count = showGroupTotal ? (r._groupTotalContracts ?? 0) : (r.contracts_count ?? 0);
                const countStatus = showGroupTotal ? r._groupContractsStatus : r.contracts_status;
                const pillClass = count > 0 ? (CONTRACT_STATUS_CLASSES[countStatus] ?? '') : '';
                return (
                    <span className={`text-xs flex items-center justify-start py-1 ${
                        pillClass ? `${pillClass} font-semibold` : 'text-slate-600'
                    }`}>
                        {count > 0 ? count : ''}
                    </span>
                );
            },
        },
        {
            key: 'client_manager',
            header: <SortHeader label="ACCOUNT MANAGER" sortKey="client_manager" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <span className={`font-medium flex items-center ${r._isGroupChild ? 'text-slate-600 font-normal' : ''}`}>
                    {r.client_manager ?? r.id_client_mngr ?? '—'}
                </span>
            ),
        },
        {
            key: 'action',
            header: <div className="text-center">ACTION</div>,
            cell: (r) => {
                const allowed = canUploadFor(r);
                return (
                    <div className="flex items-center justify-center">
                        <button
                            type="button"
                            disabled={!allowed}
                            title={allowed ? "Upload Contract" : 'Only the assigned account manager can upload a contract for this company'}
                            onClick={(e) => { e.stopPropagation(); openUploadModal(r); }}
                            className={`flex items-center gap-1 h-7 px-2.5 rounded-lg text-[#4FA34E] text-[11px] font-semibold transition-colors  whitespace-nowrap ${
                                allowed ? 'cursor-pointer' : ' cursor-not-allowed shadow-none'
                            }`}
                        >
                            <FaFileUpload className="text-xl" />
                            
                        </button>
                    </div>
                );
            },
        },
    ], [searchState.sort_by, searchState.sort_order, expandedSapCodes]);

    const goToPage = (p) => {
        setSearchResults(null);
        router.get(route('contract.upload'), { ...searchStateRef.current, page: p }, { preserveState: true, preserveScroll: true });
    };

    const effectiveCompanies = searchResults?.companies ?? companies ?? { data: [] };
    const rows = effectiveCompanies?.data ?? [];
    const pagination = effectiveCompanies && typeof effectiveCompanies.current_page === 'number'
        ? { page: effectiveCompanies.current_page, perPage: effectiveCompanies.per_page ?? 12, total: effectiveCompanies.total ?? rows.length, onPageChange: goToPage }
        : null;

    const displayRows = useMemo(() => {
        const groupsBySapCode = new Map();
        const order = [];

        rows.forEach((r) => {
            if (!r.sap_code) {
                order.push({ rep: r, siblings: [] });
                return;
            }
            const existing = groupsBySapCode.get(r.sap_code);
            if (existing) {
                existing.siblings.push(r);
            } else {
                const group = { rep: r, siblings: [] };
                groupsBySapCode.set(r.sap_code, group);
                order.push(group);
            }
        });

        const flat = [];
        order.forEach(({ rep, siblings }) => {
            const groupMembers = [rep, ...siblings];
            const groupTotalContracts = groupMembers.reduce((sum, m) => sum + (m.contracts_count ?? 0), 0);
            const groupContractsStatus = groupMembers.reduce((worst, m) => {
                if (!(m.contracts_count > 0)) return worst;
                const s = m.contracts_status ?? 'default';
                return (STATUS_SEVERITY[s] ?? 0) > (STATUS_SEVERITY[worst] ?? -1) ? s : worst;
            }, 'default');

            flat.push({
                ...rep,
                _groupCount: siblings.length + 1,
                _isGroupChild: false,
                _groupTotalContracts: groupTotalContracts,
                _groupContractsStatus: groupContractsStatus,
            });
            if (rep.sap_code && siblings.length > 0 && expandedSapCodes.has(rep.sap_code)) {
                siblings.forEach((s) => flat.push({ ...s, _isGroupChild: true }));
            }
        });
        return flat;
    }, [rows, expandedSapCodes]);

    const searchControl = (
        <div className="relative h-7 md:h-8 flex items-center min-w-0 flex-shrink-0">
            <input
                type="text"
                placeholder="Search"
                value={searchState.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`peer h-7 md:h-8 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white outline-none focus:ring-0 focus:border-[#289800] transition-all duration-300
                    md:w-64 md:pl-8 md:pr-3 md:text-black md:placeholder:text-slate-400 md:cursor-text
                    ${searchState.search ? "w-40 pl-8 pr-3 text-black placeholder:text-slate-400" : "w-7 px-0 text-transparent placeholder:text-transparent cursor-pointer focus:w-40 focus:pl-8 focus:pr-3 focus:text-black focus:placeholder:text-slate-400 focus:cursor-text"}
                `}
            />
            <MdSearch className={`absolute text-slate-400 text-base pointer-events-none z-10 transition-all duration-300 ${searchState.search ? "left-2.5 translate-x-0" : "left-1/2 -translate-x-1/2 peer-focus:left-2.5 peer-focus:translate-x-0 md:left-2.5 md:translate-x-0"}`} />
        </div>
    );

    const filterToolbar = (
        <div className="flex flex-wrap items-center gap-1 md:gap-2 rounded-xl border border-gray-200 bg-white p-1 md:p-2 shadow-sm">
            <div className="relative h-7 md:h-9 flex items-center flex-shrink-0">
                <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
                <select
                    value={searchState.delsan_company}
                    onChange={(e) => updateFilters({ delsan_company: e.target.value })}
                    className="h-7 md:h-9 w-[90px] md:w-36 pl-[21px] md:pl-8 pr-4 py-0 text-[11px] md:text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer truncate focus:outline-none focus:ring-0 focus:border-[#4FA34E] transition-[border-color,box-shadow] duration-150 text-slate-700"
                >
                    <option value="">All Delsan</option>
                    <option value="DBIC">DBIC</option>
                    <option value="DOSC">DOSC</option>
                    <option value="DDTC">DDTC</option>
                </select>
            </div>

            <div className="relative h-7 md:h-9 flex items-center flex-shrink-0">
                <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
                <select
                    value={searchState.category}
                    onChange={(e) => updateFilters({ category: e.target.value })}
                    className="h-7 md:h-9 w-[90px] md:w-36 pl-[21px] truncate md:pl-8 pr-6 py-0 text-[11px] md:text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-0 focus:border-[#4FA34E] transition-[border-color,box-shadow] duration-150 text-slate-700"
                >
                    <option value="">All Categories</option>
                    {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            <div className="relative h-7 md:h-9 flex items-center flex-shrink-0" ref={perPagePickerRef}>
                <button
                    type="button"
                    onClick={() => setShowPerPagePicker((p) => !p)}
                    className="h-7 md:h-9 px-1 md:px-3 pl-[21px] truncate md:pl-8 border border-gray-200 rounded-lg text-[11px] md:text-[13px] text-slate-700 flex items-center md:gap-1.5 bg-white hover:bg-slate-50 transition-colors relative w-[60px] sm:w-24 md:w-36"
                >
                    <TbLayoutRows className="absolute left-1.5 md:left-2.5 text-slate-400 text-sm pointer-events-none" />
                    <span className="flex-1 text-left pt-0.5 truncate"><span className="hidden sm:inline">Rows: </span>{searchState.per_page}</span>
                    <MdExpandMore size={14} className="text-slate-400 flex-shrink-0" />
                </button>
                {showPerPagePicker && (
                    <div className="absolute -left-20 sm:-left-10 top-9 md:top-12 md:-left-2 z-50 w-36 bg-white border border-gray-300 rounded-2xl shadow-lg p-3">
                        <span className="block text-[9px] md:text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Rows per page</span>
                        <div className="flex items-center gap-1.5">
                            <input
                                autoFocus
                                type="number"
                                min="1"
                                max="100"
                                value={perPageInput}
                                onChange={(e) => setPerPageInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePerPageInputApply()}
                                className="w-16 h-6 md:h-7 px-2 text-[11px] sm:text-xs md:text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-0"
                            />
                            <button type="button" onClick={handlePerPageInputApply} className="h-6 md:h-7 min-w-11 flex-1 text-[10px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]">Apply</button>
                        </div>
                    </div>
                )}
            </div>

            {isFiltered && (
                <button type="button" onClick={clearAllFilters} className="flex items-center gap-0.5 md:gap-1 text-[11px] md:text-xs font-medium bg-[#B5EBA2]/50 text-emerald-900 hover:bg-red-100 hover:text-red-400 hover:shadow-inner shadow p-1 px-2 pr-2.5 rounded-lg transition-colors duration-150">
                    <MdClose className="md:size-3" />
                    <span>Clear</span>
                </button>
            )}
        </div>
    );

    return (
        <>
            <Head title="Upload Contract" />

            <div className="min-h-screen flex flex-col">
                <div className="flex-1 pb-24">
                    <div className="px-4 sm:px-6 lg:px-10 pt-8 mb-5 pb-0 flex justify-between items-end">
                        <div className="flex flex-col md:gap-1">
                            <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900">Upload Contract</p>
                            <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">Browse existing customer companies and upload a contract.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[11px] md:text-xs text-slate-500">{formattedDate}</h1>
                        </div>
                    </div>

                    <ProjectListSection
                        tableTitle="Existing Customers"
                        columns={existingColumns}
                        rows={displayRows}
                        rowKey={(r) => r._isGroupChild ? `sibling-${r.id}` : String(r.id)}
                        onRowClick={handleRowClick}
                        pagination={pagination}
                        searchControl={searchControl}
                        filterControl={filterToolbar}
                        loading={isSearching}
                        emptyText="No company records found."
                        renderCard={renderExistingCard}
                    />
                </div>
            </div>

            {/* ── Add Contract Modal ── */}
            {modalCompany && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4" onClick={closeUploadModal}>
                    <div className="lg:w-[50%] bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <h2 className="flex items-center gap-2 text-md md:text-lg font-semibold text-slate-900">
                                   <FaRegFileAlt size={17}/> {editingContract ? 'Edit Contract' : 'Add Contract'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-3">{modalCompany.company_name}</p>
                            </div>
                            <button type="button" onClick={closeUploadModal} disabled={isUploading} className="text-slate-400 hover:text-slate-600 disabled:opacity-40">
                                <MdClose size={20} />
                            </button>
                        </div>

                        <div className="mt-5 flex flex-col gap-5">
                            {/* Searchable Company name dropdown */}
                            {/* <div className="relative lg:w-[80%]">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={companyNameQuery}
                                    onFocus={() => setShowCompanyNameDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCompanyNameDropdown(false), 150)}
                                    onChange={(e) => {
                                        setCompanyNameQuery(e.target.value);
                                        setSelectedCompanyName('');
                                    }}
                                    placeholder="Search company name..."
                                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                                />
                                {formErrors.company_name && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.company_name}</p>}
                                {showCompanyNameDropdown && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {filteredCompanyNameOptions.length === 0 ? (
                                            <div className="px-3 py-2 text-xs text-slate-500">No matches found</div>
                                        ) : (
                                            filteredCompanyNameOptions.map((name) => (
                                                <div
                                                    key={name}
                                                    onMouseDown={(e) => e.preventDefault()} 
                                                    onClick={() => {
                                                        setSelectedCompanyName(name);
                                                        setCompanyNameQuery(name);
                                                        setShowCompanyNameDropdown(false);
                                                    }}
                                                    className="px-3 py-2 text-sm text-slate-700 hover:bg-[#E9F7E7] hover:text-[#2DA300] cursor-pointer truncate"
                                                >
                                                    {name}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div> */}

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[11px] md:text-xs font-medium text-slate-600">
                                        Contract PDF{editingContract ? ' (optional)' : ''}
                                    </label>
                                    {editingContract && (
                                        editingContract.pdf_url ? (
                                            
                                            <a    href={editingContract.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] md:text-xs font-semibold text-[#4FA34E] hover:text-[#3d8f3c]"
                                            >
                                                View current PDF
                                            </a>
                                        ) : (
                                            <p className="text-[11px] text-slate-400">No PDF currently on file.</p>
                                        )
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                                    className="block w-full text-[11px] md:text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] md:file:text-xs file:font-semibold file:bg-[#E9F7E7] file:text-[#2DA300] hover:file:bg-[#dcf3d8] border border-gray-200 rounded-lg px-2 py-1.5"
                                />
                                {editingContract && !pdfFile && (
                                    <p className="text-[10px] md:text-[11px] text-slate-400 mt-1">Leave blank to keep the current file.</p>
                                )}
                                {formErrors.pdf && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.pdf}</p>}
                            </div>

                            <div>
                                <label className="block text-[11px] md:text-xs font-medium text-slate-600 mb-1.5">Document Number</label>
                                <input
                                    type="text"
                                    value={docNum}
                                    onChange={(e) => setDocNum(e.target.value)}
                                    placeholder="e.g. CNT-2026-0001"
                                    className="w-full h-9 px-3 text-xs md:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                                />
                                {formErrors.doc_num && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.doc_num}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] md:text-xs font-medium text-slate-600 mb-1.5">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full h-9 px-3 text-xs md:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                                    />
                                    {formErrors.start_date && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.start_date}</p>}
                                </div>
                                <div>
                                    <label className="block text-[11px] md:text-xs font-medium text-slate-600 mb-1.5">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full h-9 px-3 text-xs md:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                                    />
                                    {formErrors.end_date && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.end_date}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-6">
                            <button type="button" onClick={closeUploadModal} disabled={isUploading} className="h-9 px-4 rounded-lg text-xs md:text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitContract}
                                disabled={
                                    isUploading ||
                                    (!editingContract && !pdfFile) ||
                                    !docNum || !startDate || !endDate || !selectedCompanyName ||
                                    (editingContract && !hasEditChanges)
                                }
                                title={editingContract && !hasEditChanges && !isUploading ? 'No changes to save' : undefined}
                                className="h-9 px-4 rounded-lg text-xs md:text-sm font-semibold text-white bg-[#4FA34E] hover:bg-[#3d8f3c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isUploading
                                    ? (editingContract ? 'Saving…' : 'Uploading…')
                                    : (editingContract ? 'Save Changes' : 'Upload')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── View Contracts Modal ── */}
            <ContractsModal
                ref={contractsModalRef}
                modalRow={contractsModalRow}
                highlightContractId={highlightContractId}
                onHighlightConsumed={() => setHighlightContractId(null)}
                onClose={closeContractsModal}
                onUpload={(row, branchName) => openUploadModal(row, branchName)}
                onEdit={(row, contract) => openEditModal(row, contract)}
            />
        </>
    );
}

export default UploadContract;

UploadContract.layout = (page) => <AuthenticatedLayout children={page} />;