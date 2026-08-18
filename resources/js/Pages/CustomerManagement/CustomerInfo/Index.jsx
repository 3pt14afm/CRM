import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { route } from 'ziggy-js';
import { MdSearch, MdOutlineFilterAlt, MdExpandMore, MdClose } from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';
import { usePage } from '@inertiajs/react';
import CompanyDetailsSidebar from './CompanyDetailsSidebar';
import ContractsSidebar from './ContractsSidebar';
import { FaRegClock } from 'react-icons/fa';
import SortHeader from '@/Components/SortHeader';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,} from "@/components/ui/tooltip";
import FilterToolbar from '@/Components/roi/filters/FilterToolbar';
import ScrollableMultiSelect from '@/Components/ScrollableMultiSelect';
import ExportDrawer from '@/Components/ExportDrawer';

const STORAGE_KEY = 'customerinfo_filters';

const DEFAULT_FILTERS = {
    search:         '',
    category:       [],
    status:         '1',  
    delsan_company: [],
    per_page:       100,
    sort_by:        'company_name',
    sort_order:     'asc',
};

const CONTRACTS_STATUS_COLOR = {
    expired:        'text-red-600 bg-red-50 border-red-200 hover:bg-red-200/70',
    expiring_soon:  'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-200/70',
    ok:             'text-[#2da300] bg-[#e9f7e7] border-[#2DA300]/20 hover:bg-[#2da300]/20',
    default:        'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-200/70',
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

function Index({ companies, potentials, filters, categories = [] }) {
    const [activeTab, setActiveTab] = useState('Existing');

    const [searchState, setSearchState] = useState(() => {
        const persisted = loadPersistedFilters();
        return {
            ...DEFAULT_FILTERS,
            ...(persisted?.per_page !== undefined ? { per_page: persisted.per_page } : {}),
            // URL params always win over persisted (user navigated with explicit params)
            ...(filters.search         !== undefined ? { search:         filters.search }         : {}),
            ...(filters.category       !== undefined ? { category:       filters.category }       : {}),
            ...(filters.status         !== undefined ? { status:         filters.status }         : {}),
            ...(filters.delsan_company !== undefined ? { delsan_company: filters.delsan_company } : {}),
            ...(filters.per_page       !== undefined ? { per_page:       filters.per_page }       : {}),
            ...(filters.sort_by        !== undefined ? { sort_by:        filters.sort_by }        : {}),
            ...(filters.sort_order     !== undefined ? { sort_order:     filters.sort_order }     : {}),
        };
    });

    const [selectedCompany, setSelectedCompany] = useState(null);
    const [isSidebarOpen,   setIsSidebarOpen]   = useState(false);

    const [contractsCompany,     setContractsCompany]     = useState(null);
    const [isContractsSidebarOpen, setIsContractsSidebarOpen] = useState(false);
    const [isExportDrawerOpen, setIsExportDrawerOpen] = useState(false);
    const [pendingUploadRow, setPendingUploadRow] = useState(null);

    // Per-page popup
    const [showPerPagePicker, setShowPerPagePicker] = useState(false);
    const [perPageInput,      setPerPageInput]      = useState(String(searchState.per_page));
    const perPagePickerRef = useRef(null);

    // Status dropdown popup (multi-select)
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const statusPickerRef = useRef(null);

    // ── Axios-based search state ──
    const [searchResults, setSearchResults] = useState(null); // { companies, potentials } | null, overrides Inertia props when set
    const [isSearching,   setIsSearching]   = useState(false);
    const searchDebounceRef = useRef(null);
    const searchAbortRef    = useRef(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['companies'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const handleExport = () => setIsExportDrawerOpen(true);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ per_page: searchState.per_page }));
        } catch { /* quota exceeded — silently ignore */ }
    }, [searchState.per_page]);

    // Close popups on outside click
    useEffect(() => {
        const handler = (e) => {
            if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target))
                setShowPerPagePicker(false);
            if (statusPickerRef.current && !statusPickerRef.current.contains(e.target))
                setShowStatusPicker(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Clean up any pending debounce/in-flight request on unmount
    useEffect(() => {
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            if (searchAbortRef.current) searchAbortRef.current.abort();
        };
    }, []);

    const updateFilters = (newFilters) => {
        const updated = { ...searchState, ...newFilters };
        setSearchState(updated);
        router.get(route('customerinfo.companies.index'), updated, {
            preserveState: true,
            replace: true,
        });
    };

    // ── Axios search: fetches results without a full Inertia page visit ──
    const runSearch = (value, currentFilters) => {
        // Cancel any in-flight request before starting a new one
        if (searchAbortRef.current) searchAbortRef.current.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;

        setIsSearching(true);

        axios.get(route('customerinfo.companies.index'), {
            params: { ...currentFilters, search: value },
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            signal: controller.signal,
        })
            .then((res) => {
                // Expecting { companies: {...paginator}, potentials: {...paginator} } from the backend
                setSearchResults(res.data);
            })
            .catch((err) => {
                if (axios.isCancel?.(err) || err.name === 'CanceledError') return;
                console.error('Search request failed:', err);
            })
            .finally(() => setIsSearching(false));
    };

const handleSearchChange = (value) => {
    const updated = { ...searchState, search: value };
    setSearchState(updated); // keep input responsive immediately

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
        // Sync the URL/history WITHOUT a server round-trip or Inertia visit
        const params = new URLSearchParams(updated).toString();
        window.history.replaceState(
            window.history.state,
            '',
            `${route('customerinfo.companies.index')}?${params}`
        );

        runSearch(value, updated);
    }, 350);
};
    // Saves the edited Address / Contact Number for a Potential company in one request.
    // Hits CustomerInfoController@updatePotential via the `customerinfo.potentials.update`
    // PATCH route (add it to web.php if it isn't there yet — see note below).
    const handleSaveCompanyFields = (companyId, fields) => {
        return new Promise((resolve, reject) => {
            router.patch(
                route('customerinfo.potentials.update', companyId),
                fields,
                {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedCompany((prev) =>
                            prev && prev.id === companyId ? { ...prev, ...fields } : prev
                        );
                        resolve();
                    },
                    onError: (errors) => reject(errors),
                }
            );
        });
    };

    const handleSort = (key) => {
        const newOrder = searchState.sort_by === key && searchState.sort_order === 'asc'
            ? 'desc' : 'asc';
        updateFilters({ sort_by: key, sort_order: newOrder });
    };

    // Status is a comma-separated string e.g. "0,1" or "1" or ""
    const selectedStatuses = useMemo(() =>
        searchState.status === '' ? [] : searchState.status.split(','),
        [searchState.status]
    );

    const toggleStatus = (val) => {
        const current = new Set(selectedStatuses);
        current.has(val) ? current.delete(val) : current.add(val);
        updateFilters({ status: [...current].join(',') });
    };

    const statusLabel = useMemo(() => {
        if (selectedStatuses.length === 0) return 'All Statuses';
        if (selectedStatuses.length === 2) return 'All Statuses';
        return selectedStatuses.includes('1') ? 'Active' : 'Inactive';
    }, [selectedStatuses]);

    const isFiltered = useMemo(() => {
        const norm = (v) => (Array.isArray(v) ? v.filter(Boolean).join(',') : (v ?? ''));

        return (
            norm(searchState.search)         !== norm(DEFAULT_FILTERS.search)         ||
            norm(searchState.category)       !== norm(DEFAULT_FILTERS.category)       ||
            norm(searchState.status)         !== norm(DEFAULT_FILTERS.status)         ||
            norm(searchState.delsan_company) !== norm(DEFAULT_FILTERS.delsan_company) ||
            norm(searchState.sort_by)        !== norm(DEFAULT_FILTERS.sort_by)        ||
            norm(searchState.sort_order)     !== norm(DEFAULT_FILTERS.sort_order)
        );
    }, [searchState]);

    const clearAllFilters = () => {
        const reset = { ...DEFAULT_FILTERS };
        setSearchState(reset);
        setPerPageInput(String(reset.per_page));
        setSearchResults(null); // drop any axios-search override so Inertia props take over again
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ per_page: reset.per_page })); } catch {}
        router.get(route('customerinfo.companies.index'), reset, {
            preserveState: true,
            replace: true,
        });
    };

    const handlePerPageInputApply = () => {
        const raw = parseInt(perPageInput, 10);
        const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 100) : searchState.per_page;
        setShowPerPagePicker(false);
        updateFilters({ per_page: num });
        setPerPageInput(String(num));
    };

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        day: '2-digit', month: '2-digit', year: '2-digit',
    }).format(today);

    const { auth } = usePage().props;

    /* ── Shared status pill cell ── */
    const statusCell = (row) => {
        const isActive = row.status == 1;
        return (
            <div className="flex items-center">
                <span className={`px-1 lg:px-1.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border
                    ${isActive
                        ? 'bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20'
                        : 'bg-[#FDECEC] text-[#C40000] border-[#C40000]/20'
                    }`}>
                    {isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
        );
    };

    /* ── Mobile card layout (below md) ── */
    const getInitials = (name) => (name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    const StatusBadgePill = ({ isActive }) => (
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border
            ${isActive
                ? 'bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20'
                : 'bg-[#FDECEC] text-[#C40000] border-[#C40000]/20'
            }`}>
            {isActive ? 'Active' : 'Inactive'}
        </span>
    );

    const renderExistingCard = (r) => {
        const isActive = r.status == 1;
        return (
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-600 text-xs">{r.sap_code}</span>
                    <span><StatusBadgePill isActive={isActive} /></span>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                    <p className={`text-xs font-semibold leading-snug truncate ${isActive ? 'text-[#0f3800]' : 'text-[#C40000]'}`}>
                        {r.company_name ?? '—'}
                    </p>
                    <p className="text-[11px] font-medium truncate uppercase">
                        {[r.client_category, r.delsan_company].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="text-[11px] font-medium text-slate-700">{r.client_manager ?? r.id_client_mngr ?? '—'}</p>
                </div>
                
            </div>
        );
    };

    const renderPotentialCard = (r) => {
        const isActive = r.status == 1;
        return (
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-[10px]">{r.client_manager ?? r.id_client_mngr ?? '—'}</span>
                    <span><StatusBadgePill isActive={isActive} /></span>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                    <p className={`text-xs font-semibold leading-snug truncate ${isActive ? 'text-[#0f3800]' : 'text-[#C40000]'}`}>
                        {r.company_name ?? '—'}
                    </p>
                    <p className="text-[11px] font-medium text-slate-700">{r.address ?? '—'}</p>
                </div>
                
            </div>
        );
    };


    /* ── Existing Columns (all columns + client_manager after delsan_company) ── */
    const existingColumns = useMemo(() => [
        {
            key: 'sap_code',
            header: (
                <SortHeader label="SAP CODE" sortKey="sap_code"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => (
                <span className="font-mono text-sm flex items-center text-slate-500">
                    {r.sap_code ?? '—'}
                </span>
            ),
        },
        {
            key: 'delsan_company',
            header: (
                <SortHeader label="DELSAN" sortKey="delsan_company"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => (
                <span className="font-medium flex items-center uppercase">
                    {r.delsan_company ?? '—'}
                </span>
            ),
        },
        {
            key: 'company_name',
            header: (
                <SortHeader 
                    label="COMPANY NAME" 
                    sortKey="company_name"
                    sortBy={searchState.sort_by} 
                    sortDirection={searchState.sort_order} 
                    onSort={handleSort} 
                />
            ),
            cell: (r) => {
                const isActive = r.status == 1;
                const branchCount = Array.isArray(r.branches) ? r.branches.length : 0;
                return (
                    <div className={`font-medium w-full flex items-center justify-between gap-2 min-w-[208px] ${isActive ? 'text-[#0f3800]' : 'text-[#C40000]'}`}>
                        {/* Replaced 'truncate' with 'line-clamp-2 break-words' */}
                        <span className="line-clamp-2 break-words text-wrap">
                            {r.company_name ?? '—'}
                        </span>
                        {branchCount > 0 && (
                            <span className="shrink-0 text-[9px] font-semibold text-[#195c00] bg-[#195c00]/10 px-1.5 py-0.5 rounded-full">
                                {branchCount} {branchCount === 1 ? 'Branch' : 'Branches'}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'client_category',
            header: (
                <SortHeader label="CATEGORY" sortKey="client_category"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => (
                <span className="font-medium flex min-w-28 items-center">
                    {r.client_category ?? '—'}
                </span>
            ),
        },
        {
            key: 'contracts',
            header: (
                <SortHeader label="CONTRACTS" sortKey="contracts"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => {
                if (r.contracts) {
                    return (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setContractsCompany(r);
                                            setIsContractsSidebarOpen(true);
                                        }}
                                        className={`text-[11px] flex items-center min-w-6 min-h-6 py-0.5 px-2 rounded-lg font-bold shadow hover:shadow-inner border ${CONTRACTS_STATUS_COLOR[r.contracts_status] || CONTRACTS_STATUS_COLOR.default}`}
                                    >
                                        {r.contracts}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>View contracts</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                }

                if (r.can_upload) {
                    return (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setContractsCompany(r);
                                            setIsContractsSidebarOpen(true);
                                        }}
                                        className="flex items-center justify-center w-full h-6 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Upload contract for this company</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                }

                return null;
            },
        },
        {
            key: 'address',
            header: "ADDRESS",
            cell: (r) => (
                <span className="text-[11px] flex items-center min-w-52 max-w-60 py-1 text-slate-600">
                    {r.address ?? '—'}
                </span>
            ),
        },
        {
            key: 'client_manager',
            header: (
                <SortHeader label="ACCOUNT MANAGER" sortKey="client_manager"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => (
                <span className="font-medium flex items-center">
                    {r.client_manager ?? r.id_client_mngr ?? '—'} 
                </span>
            ),
        },
        {
            key: 'status',
            header: (
                <SortHeader label="STATUS" sortKey="status"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: statusCell,
        },
            // eslint-disable-next-line react-hooks/exhaustive-deps
            ], [searchState.sort_by, searchState.sort_order]);

            /* ── Potentials Columns (company name, client manager, address, status only) ── */
            const potentialsColumns = useMemo(() => [
        {
            key: 'delsan_company',
            header: (
                <SortHeader label="DELSAN" sortKey="delsan_company"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => (
                <span className="font-medium flex items-center uppercase">
                    {r.delsan_company ?? '—'}
                </span>
            ),
        },
        {
            key: 'company_name',
            header: (
                <SortHeader label="COMPANY NAME" sortKey="company_name"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => (
                <div className="font-medium flex items-center min-w-52 max-w-60 text-[#0f3800]">
                    {r.company_name ?? '—'}
                </div>
            ),
        },
        {
            key: 'client_manager',
            header: (
                <SortHeader label="ACCOUNT MANAGER" sortKey="client_manager"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => (
                <span className="font-medium flex items-center">
                    {r.client_manager ?? '—'}
                </span>
            ),
        },
        {
            key: 'address',
            header: (
                <SortHeader label="ADDRESS" sortKey="address"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => (
                <span className="flex max-w-52 items-center text-slate-600">
                    {r.address ?? '—'}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: (
                <SortHeader
                    label={<div className="flex items-center"><FaRegClock className="text-sm" /></div>}
                    sortKey="created_at"
                    sortBy={searchState.sort_by}
                    sortDirection={searchState.sort_order}
                    onSort={handleSort}
                />
            ),
            cell: (r) => (
                <span className="text-slate-600 text-[10px] flex items-center whitespace-nowrap">
                    {r.created_at
                        ? new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).format(new Date(r.created_at))
                        : '—'}
                </span>
            ),
        },
        {
            key: 'status',
            header: (
                <SortHeader label="STATUS" sortKey="status"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: statusCell,
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [searchState.sort_by, searchState.sort_order]);

    /* ── Pagination ── */
    const goToPage = (p) => {
        router.get(
            route('customerinfo.companies.index'),
            { ...searchState, page: p },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Use axios search results when available (search term active), otherwise fall back to Inertia props
    const effectiveCompanies  = searchResults?.companies  ?? companies;
    const effectivePotentials = searchResults?.potentials ?? potentials;

    const rows       = effectiveCompanies?.data ?? [];
    const pagination = effectiveCompanies && typeof effectiveCompanies.current_page === 'number'
        ? {
            page:         effectiveCompanies.current_page,
            perPage:      effectiveCompanies.per_page ?? searchState.per_page,
            total:        effectiveCompanies.total ?? rows.length,
            onPageChange: goToPage,
          }
        : null;

    /* ── Search control ── */
    const searchControl = (
    <div className="relative h-7 md:h-8 flex items-center min-w-0 flex-shrink-0">        
        <input
            type="text"
            placeholder="Search"
            value={searchState.search ?? ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`peer h-7 md:h-8 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
                outline-none focus:ring-0 focus:border-[#289800] transition-all duration-300
                
                /* Desktop styling: Always expanded */
                md:w-64 md:pl-8 md:pr-3 md:text-black md:placeholder:text-slate-400 md:cursor-text
                
                /* Mobile styling: Conditional based on whether text has been entered */
                ${searchState.search 
                ? "w-40 pl-8 pr-3 text-black placeholder:text-slate-400" 
                : "w-7 px-0 text-transparent placeholder:text-transparent cursor-pointer focus:w-40 focus:pl-8 focus:pr-3 focus:text-black focus:placeholder:text-slate-400 focus:cursor-text"
                }
            `}
        />

        <MdSearch 
        className={`absolute text-slate-400 text-base pointer-events-none z-10 transition-all duration-300 
            /* Centers the icon when collapsed, moves it to the left when focused, typed in, or on desktop */
            ${searchState.search 
            ? "left-2.5 translate-x-0" 
            : "left-1/2 -translate-x-1/2 peer-focus:left-2.5 peer-focus:translate-x-0 md:left-2.5 md:translate-x-0"
            }`} 
        />
        
    </div>
    );

    {/* ── Filter toolbar ── */}
    const filterToolbar = (
        <FilterToolbar hasActiveFilters={isFiltered} onClearAll={clearAllFilters}>
            
            {/* Delsan Company Multi-Filter — only relevant for Existing */}
            {activeTab === 'Existing' && (
                <div className="relative w-[100px] md:w-28 flex flex-shrink-0 items-center">
                    <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs md:text-sm pointer-events-none z-10" />
                    <ScrollableMultiSelect
                        isSearchable={false}
                        pluralLabel="delsan"
                        values={searchState.delsan_company || []}
                        onChange={(arr) => updateFilters({ delsan_company: arr })}
                        options={[
                            { id: 'DBIC', name: 'DBIC' },
                            { id: 'DOSC', name: 'DOSC' },
                            { id: 'DDTC', name: 'DDTC' },
                        ]}
                        placeholder="Delsan"
                        className="!pl-[21px] md:!pl-8 pr-1 md:pr-2"
                    />
                </div>
            )}

            {/* Category Multi-Filter — only relevant for Existing */}
            {activeTab === 'Existing' && (
                <div className="relative w-[110px] md:w-40 flex flex-shrink-0 items-center">
                    <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs md:text-sm pointer-events-none z-10" />
                    <ScrollableMultiSelect
                        isSearchable={false}
                        pluralLabel="categories"
                        values={searchState.category || []}
                        onChange={(arr) => updateFilters({ category: arr })}
                        options={categories.map((cat) => ({ id: cat, name: cat }))}
                        placeholder="Categories"
                        className="!pl-[21px] md:!pl-8 pr-1 md:pr-2"
                    />
                </div>
            )}

            {/* Status — kept as your custom multi-select checkbox dropdown as requested */}
            <div className="relative h-7 md:h-9 flex items-center flex-shrink-0" ref={statusPickerRef}>
                <button
                    type="button"
                    onClick={() => setShowStatusPicker((p) => !p)}
                    className={`h-7 md:h-9 px-1 md:px-3 pl-[21px] truncate md:pl-8 border rounded-lg text-[11px] md:text-[13px] flex items-center md:gap-1.5 transition-colors relative w-[77px] md:w-28 ${
                        selectedStatuses.length > 0 
                            ? "border-[#289800] text-[#289800] font-medium bg-white" 
                            : "border-gray-200 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                >
                    <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 text-slate-400 text-xs md:text-sm pointer-events-none" />
                    <span className="flex-1 text-left pt-0.5 pl-[1px] truncate">{statusLabel}</span>
                    <MdExpandMore 
                        size={14} 
                        className={`flex-shrink-0 transition-transform duration-200 ${selectedStatuses.length > 0 ? "text-[#289800]" : "text-slate-400"} ${showStatusPicker ? "rotate-180" : ""}`} 
                    />
                </button>

                {showStatusPicker && (
                    <div className="absolute left-0 top-9 md:top-11 z-50 w-28 md:w-40 bg-white border border-gray-300 rounded-2xl shadow-lg p-3 flex flex-col gap-1.5">
                        <span className="block text-[9px] md:text-[11px] font-semibold text-slate-500 mb-0.5 uppercase tracking-wider">
                            Status
                        </span>
                        {[
                            { val: '1', label: 'Active',  dot: 'bg-[#2DA300]' },
                            { val: '0', label: 'Inactive', dot: 'bg-[#C40000]' },
                        ].map(({ val, label, dot }) => (
                            <label key={val} className="flex items-center gap-2 cursor-pointer select-none group">
                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(val)}
                                    onChange={() => toggleStatus(val)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 accent-[#4FA34E] cursor-pointer"
                                />
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                                <span className="text-[11px] md:text-[13px] text-slate-700 group-hover:text-slate-900">{label}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Rows Per Page Picker */}
            <div className="relative h-7 md:h-9 flex items-center flex-shrink-0" ref={perPagePickerRef}>
                <button
                    type="button"
                    onClick={() => setShowPerPagePicker((p) => !p)}
                    className="h-7 md:h-9 px-1 md:px-3 pl-[21px] truncate md:pl-8 border border-gray-200 rounded-lg text-[11px] md:text-xs text-slate-700 flex items-center md:gap-1.5 bg-white hover:bg-slate-50 transition-colors relative w-[60px] sm:w-24 md:w-32"
                >
                    <TbLayoutRows className="absolute left-1.5 md:left-2.5 text-slate-400 text-xs md:text-sm pointer-events-none" />
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

        </FilterToolbar>
    );

    return (
        <>
            <Head title="Customer Information Details" />

            <div className="min-h-screen flex flex-col">
                <div className="flex-1 pb-24">

                    {/* HEADER */}
                    <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-0 flex justify-between items-end">
                        <div className="flex flex-col md:gap-1">
                            <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900">
                                Customer Information Details
                            </p>
                            <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">
                                {activeTab === 'Existing'
                                    ? 'Browse and manage existing customer companies.'
                                    : 'View and manage potential customer companies.'}
                            </p>
                        </div>
                        <h1 className="text-[11px] md:text-xs text-slate-500">{formattedDate}</h1>
                    </div>

                    {/* TABS */}
                    <div className="px-4 sm:px-6 lg:px-10 mt-4 md:mt-6">
                        <div className="flex rounded-full bg-[#f8f8f8] w-full md:w-fit border border-[#2c2c2e10] border-b-[#2c2c2e]/15 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setActiveTab('Existing')}
                                className={`flex-1 md:flex-none text-center px-8 text-sm m-0.5 mr-0 py-1 ${
                                    activeTab === 'Existing'
                                        ? 'bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800] border border-[#B5EBA2]/60'
                                        : 'rounded-t-xl text-slate-500'
                                }`}
                            >
                                Existing
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('Potentials')}
                                className={`flex-1 md:flex-none text-center px-8 text-sm m-0.5 ml-0 py-1 ${
                                    activeTab === 'Potentials'
                                        ? 'bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800] border border-[#B5EBA2]/60'
                                        : 'rounded-t-xl text-slate-500'
                                }`}
                            >
                                Potential
                            </button>
                        </div>
                    </div>

                    {/* EXISTING TAB */}
                    {activeTab === 'Existing' && (
                        <ProjectListSection
                            tableTitle="Existing Customers"
                            columns={existingColumns}
                            rows={rows}
                            rowKey={(r) => String(r.id)}
                            pagination={pagination}
                            searchControl={searchControl}
                            onRefresh={handleRefresh}
                            refreshing={isRefreshing}
                            onExport={handleExport}
                            filterControl={filterToolbar}
                            loading={isSearching || isRefreshing}
                            onRowClick={(r) => {
                                setSelectedCompany(r);
                                setIsSidebarOpen(true);
                            }}
                            emptyText="No company records found."
                            renderCard={renderExistingCard}
                        />
                    )}

                    {/* POTENTIALS TAB */}
                    {activeTab === 'Potentials' && (
                        <ProjectListSection
                            tableTitle="Potential Customers"
                            columns={potentialsColumns}
                            rows={effectivePotentials?.data ?? []}
                            rowKey={(r) => String(r.id)}
                             loading={isSearching}
                            pagination={
                                effectivePotentials && typeof effectivePotentials.current_page === 'number'
                                    ? {
                                        page:         effectivePotentials.current_page,
                                        perPage:      effectivePotentials.per_page ?? searchState.per_page,
                                        total:        effectivePotentials.total ?? 0,
                                        onPageChange: (p) => router.get(
                                            route('customerinfo.companies.index'),
                                            { ...searchState, page: p },
                                            { preserveState: true, preserveScroll: true }
                                        ),
                                    }
                                    : null
                            }
                            searchControl={searchControl}
                            filterControl={filterToolbar}
                            onRowClick={(r) => {
                                setSelectedCompany(r);
                                setIsSidebarOpen(true);
                            }}
                            emptyText="No potential company records found."
                            renderCard={renderPotentialCard}
                        />
                    )}

                </div>
            </div>

            <CompanyDetailsSidebar
                isOpen={isSidebarOpen}
                company={selectedCompany}
                onClose={() => setIsSidebarOpen(false)}
                isPotential={activeTab === 'Potentials'}
                onSave={handleSaveCompanyFields}
            />
            <ContractsSidebar
                isOpen={isContractsSidebarOpen}
                companyId={contractsCompany?.id}
                companyName={contractsCompany?.company_name}
                onClose={() => setIsContractsSidebarOpen(false)}
            />
            <ExportDrawer
                open={isExportDrawerOpen}
                onOpenChange={setIsExportDrawerOpen}
                title={activeTab === 'Existing' ? 'Export Existing Customers' : 'Export Potential Customers'}
                exportRoute="customerinfo.companies.export"
                searchState={searchState}
                showTypeFilter={activeTab === 'Existing'}
                typeLabel="Categories"
                typeOptions={categories.map((cat) => ({ id: cat, name: cat }))}
                statusOptions={[
                    { id: '1', name: 'Active' },
                    { id: '0', name: 'Inactive' },
                ]}
            />
        </>
    );
}

export default Index;

Index.layout = (page) => <AuthenticatedLayout children={page} />;