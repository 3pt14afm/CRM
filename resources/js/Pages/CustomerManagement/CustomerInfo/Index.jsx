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
import { FaRegClock } from 'react-icons/fa';
import SortHeader from '@/Components/SortHeader';

const STORAGE_KEY = 'customerinfo_filters';

const DEFAULT_FILTERS = {
    search:         '',
    category:       '',
    status:         '1',  
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

function Index({ companies, potentials, filters, categories = [] }) {
    const [activeTab, setActiveTab] = useState('Existing');

    // Merge priority: URL filters → localStorage → defaults
    const [searchState, setSearchState] = useState(() => {
        const persisted = loadPersistedFilters();
        return {
            ...DEFAULT_FILTERS,
            ...(persisted ?? {}),
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

    // Persist filters to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(searchState));
        } catch { /* quota exceeded — silently ignore */ }
    }, [searchState]);

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

    const isFiltered = useMemo(() => (
        searchState.search         !== DEFAULT_FILTERS.search         ||
        searchState.category       !== DEFAULT_FILTERS.category       ||
        searchState.status         !== DEFAULT_FILTERS.status         ||
        searchState.delsan_company !== DEFAULT_FILTERS.delsan_company ||
        searchState.sort_by        !== DEFAULT_FILTERS.sort_by        ||
        searchState.sort_order     !== DEFAULT_FILTERS.sort_order
    ), [searchState]);

    const clearAllFilters = () => {
        const reset = {
            ...DEFAULT_FILTERS,
            per_page: searchState.per_page, // ← keep per_page as-is
        };
        setSearchState(reset);
        setPerPageInput(String(reset.per_page));
        setSearchResults(null); // drop any axios-search override so Inertia props take over again
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reset)); } catch {}
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
                <SortHeader label="COMPANY NAME" sortKey="company_name"
                    sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />
            ),
            cell: (r) => {
                const isActive = r.status == 1;
                return (
                    <div className={`font-medium flex items-center min-w-52 max-w-60 ${isActive ? 'text-[#0f3800]' : 'text-[#C40000]'}`}>
                        {r.company_name ?? '—'}
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
            key: 'address',
            header: "ADDRESS",
            cell: (r) => (
                <span className="text-xs flex items-center min-w-52 max-w-60 py-1 text-slate-600">
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
            perPage:      effectiveCompanies.per_page ?? 12,
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
        value={searchState.search}
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

    /* ── Filter toolbar ── */
    const filterToolbar = (
        <div className="flex flex-wrap items-center gap-1 md:gap-2 rounded-xl border border-gray-200 bg-white p-1 md:p-2 shadow-sm">

            {/* Delsan Company — only relevant for Existing */}
            {activeTab === 'Existing' && (
                <div className="relative h-7 md:h-9 flex items-center flex-shrink-0">
                    <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
                    <select
                        value={searchState.delsan_company}
                        onChange={(e) => updateFilters({ delsan_company: e.target.value })}
                        className="h-7 md:h-9 w-[90px] md:w-36 pl-[21px] md:pl-8 pr-4 py-0 text-[11px] md:text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer truncate
                            focus:outline-none focus:ring-0 focus:border-[#4FA34E]
                            transition-[border-color,box-shadow] duration-150 text-slate-700"
                    >
                        <option value="">All Delsan</option>
                        <option value="DBIC">DBIC</option>
                        <option value="DOSC">DOSC</option>
                        <option value="DDTC">DDTC</option>
                    </select>
                </div>
            )}

            {/* Category — only relevant for Existing */}
            {activeTab === 'Existing' && (
                <div className="relative h-7 md:h-9 flex items-center flex-shrink-0">
                    <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
                    <select
                        value={searchState.category}
                        onChange={(e) => updateFilters({ category: e.target.value })}
                        className="h-7 md:h-9 w-[90px] md:w-36 pl-[21px] truncate md:pl-8 pr-6 py-0 text-[11px] md:text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer
                            focus:outline-none focus:ring-0 focus:border-[#4FA34E]
                            transition-[border-color,box-shadow] duration-150 text-slate-700"
                    >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Status — multi-select dropdown */}
            <div className="relative h-7 md:h-9 flex items-center flex-shrink-0" ref={statusPickerRef}>
                <button
                    type="button"
                    onClick={() => setShowStatusPicker((p) => !p)}
                    className="h-7 md:h-9 px-1 md:px-3 pl-[21px] truncate md:pl-8 border border-gray-200 rounded-lg text-[11px] md:text-[13px] text-slate-700 flex items-center md:gap-1.5 bg-white hover:bg-slate-50 transition-colors relative w-[77px] md:w-36"
                >
                    <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 text-slate-400 text-sm pointer-events-none" />
                    <span className="flex-1 text-left pt-0.5 pl-[1px] truncate">{statusLabel}</span>
                    <MdExpandMore size={14} className="text-slate-400 flex-shrink-0" />
                </button>

                {showStatusPicker && (
                    <div className="absolute left-0 top-11 z-50 w-28 md:w-40 bg-white border border-gray-300 rounded-2xl shadow-lg p-3 flex flex-col gap-1.5">
                        <span className="block text-[9px] md:text-[11px] font-semibold text-slate-500 mb-0.5 uppercase tracking-wider">
                            Status
                        </span>
                        {[
                            { val: '1', label: 'Active',   dot: 'bg-[#2DA300]' },
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

            {/* Per Page */}
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
                        <span className="block text-[9px] md:text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                            Rows per page
                        </span>
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
                            <button
                                type="button"
                                onClick={handlePerPageInputApply}
                                className="h-6 md:h-7 min-w-11 flex-1 text-[10px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Clear All — only shown when any filter deviates from default */}
            {isFiltered && (
                <button
                    type="button"
                    onClick={clearAllFilters}
                    className="h-7 md:h-9 flex items-center gap-1 px-1 text-[11px] md:text-[13px] text-[#4FA34E] hover:text-slate-600 transition-colors flex-shrink-0"
                >
                    <MdClose className="md:size-4" />
                    <span>Clear all</span>
                </button>
            )}

        </div>
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
                            filterControl={filterToolbar}
                             loading={isSearching}
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
                                        perPage:      effectivePotentials.per_page ?? 12,
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
        </>
    );
}

export default Index;

Index.layout = (page) => <AuthenticatedLayout children={page} />;