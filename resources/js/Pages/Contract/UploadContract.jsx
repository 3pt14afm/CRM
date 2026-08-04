import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import ContractsModal from './ContractsModal'; // <-- Import the new component
import { route } from 'ziggy-js';
import { MdSearch, MdOutlineFilterAlt, MdExpandMore, MdClose } from 'react-icons/md';
import { FaFileUpload } from 'react-icons/fa';
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

    // Authorization now comes straight from the backend's `can_upload` flag
    // on each row (App\Http\Controllers\Contract\ContractController::upload()),
    // which already accounts for admin status, direct assignment, and
    // sibling-branch assignment within the same SAP-code group. The frontend
    // no longer re-derives this from a single row's id_client_mngr, since the
    // company list is deduplicated to one representative row per SAP code and
    // that row's id_client_mngr may not reflect the branch the current user
    // actually manages.
    const canUploadFor = (row) => !!row.can_upload;

    // ── Add Contract modal state ──
    const [modalCompany, setModalCompany] = useState(null);
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

    const openUploadModal = (row) => {
        if (!canUploadFor(row)) return;
        setModalCompany(row);
        setPdfFile(null);
        setDocNum('');
        setStartDate('');
        setEndDate('');
        setFormErrors({});

        const uniqueNames = row.company_name_options?.length
            ? row.company_name_options
            : [row.company_name].filter(Boolean);
        setCompanyNameOptions(uniqueNames);
        setSelectedCompanyName(row.company_name ?? '');
        setCompanyNameQuery(row.company_name ?? '');
        setShowCompanyNameDropdown(false);
    };

    const closeUploadModal = () => {
        if (isUploading) return;
        setModalCompany(null);
        setCompanyNameOptions([]);
        setSelectedCompanyName('');
        setCompanyNameQuery('');
        setShowCompanyNameDropdown(false);
    };

    // ── View Contracts modal state ──
    const [contractsModalRow, setContractsModalRow] = useState(null);

    const openContractsModal = (row) => setContractsModalRow(row);
    const closeContractsModal = () => setContractsModalRow(null);

    const submitContract = () => {
        if (!modalCompany) return;
        setIsUploading(true);
        setFormErrors({});

        router.post(
            route('contract.store', modalCompany.id),
            {
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
                    setCompanyNameOptions([]);
                    setSelectedCompanyName('');
                    setCompanyNameQuery('');
                },
                onError: (errors) => {
                    setFormErrors(errors);
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

    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchDebounceRef = useRef(null);
    const searchAbortRef = useRef(null);

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
        const updated = { ...searchState, ...newFilters };
        setSearchState(updated);
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
        const newOrder = searchState.sort_by === key && searchState.sort_order === 'asc' ? 'desc' : 'asc';
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

    const renderExistingCard = (r) => {
        const allowed = canUploadFor(r);
        return (
            <div className="flex flex-col gap-1 cursor-pointer" onClick={() => openContractsModal(r)}>
                <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-600 text-xs">{r.sap_code}</span>
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
                        Add Contract
                    </button>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug truncate text-[#0f3800]">{r.company_name ?? '—'}</p>
                    <p className="text-[11px] font-medium truncate uppercase">
                        {[r.client_category, r.delsan_company].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="text-[11px] font-medium text-slate-700">{r.client_manager ?? r.id_client_mngr ?? '—'}</p>
                </div>
            </div>
        );
    };

    const existingColumns = useMemo(() => [
        {
            key: 'sap_code',
            header: <SortHeader label="SAP CODE" sortKey="sap_code" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => <span className="font-mono text-sm flex items-center text-slate-500">{r.sap_code ?? '—'}</span>,
        },
        {
            key: 'delsan_company',
            header: <SortHeader label="DELSAN" sortKey="delsan_company" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => <span className="font-medium flex items-center uppercase">{r.delsan_company ?? '—'}</span>,
        },
        {
            key: 'company_name',
            header: <SortHeader label="COMPANY NAME" sortKey="company_name" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => <div className="font-medium flex items-center min-w-52 max-w-60 text-[#0f3800]">{r.company_name ?? '—'}</div>,
        },
        {
            key: 'client_category',
            header: <SortHeader label="CATEGORY" sortKey="client_category" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => <span className="font-medium flex min-w-28 items-center">{r.client_category ?? '—'}</span>,
        },
        {
            key: 'address',
            header: "ADDRESS",
            cell: (r) => <span className="text-xs flex items-center min-w-52 max-w-60 py-1 text-slate-600">{r.address ?? '—'}</span>,
        },
        {
            key: 'client_manager',
            header: <SortHeader label="ACCOUNT MANAGER" sortKey="client_manager" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => <span className="font-medium flex items-center">{r.client_manager ?? r.id_client_mngr ?? '—'}</span>,
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
    ], [searchState.sort_by, searchState.sort_order]);

    const goToPage = (p) => {
        router.get(route('contract.upload'), { ...searchState, page: p }, { preserveState: true, preserveScroll: true });
    };

    const effectiveCompanies = searchResults?.companies ?? companies ?? { data: [] };
    const rows = effectiveCompanies?.data ?? [];
    const pagination = effectiveCompanies && typeof effectiveCompanies.current_page === 'number'
        ? { page: effectiveCompanies.current_page, perPage: effectiveCompanies.per_page ?? 12, total: effectiveCompanies.total ?? rows.length, onPageChange: goToPage }
        : null;

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
                <button type="button" onClick={clearAllFilters} className="h-7 md:h-9 flex items-center gap-1 px-1 text-[11px] md:text-[13px] text-[#4FA34E] hover:text-slate-600 transition-colors flex-shrink-0">
                    <MdClose className="md:size-4" />
                    <span>Clear all</span>
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
                        rows={rows}
                        rowKey={(r) => String(r.id)}
                        onRowClick={openContractsModal}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={closeUploadModal}>
                    <div className="w-[40%] bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Add Contract</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{modalCompany.company_name}</p>
                            </div>
                            <button type="button" onClick={closeUploadModal} disabled={isUploading} className="text-slate-400 hover:text-slate-600 disabled:opacity-40">
                                <MdClose size={20} />
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                            {/* Searchable Company name dropdown */}
                            <div className="relative w-[80%]">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={companyNameQuery}
                                    onFocus={() => setShowCompanyNameDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCompanyNameDropdown(false), 150)}
                                    onChange={(e) => {
                                        setCompanyNameQuery(e.target.value);
                                        setSelectedCompanyName(e.target.value);
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
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Contract PDF</label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#E9F7E7] file:text-[#2DA300] hover:file:bg-[#dcf3d8] border border-gray-200 rounded-lg px-2 py-1.5"
                                />
                                {formErrors.pdf && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.pdf}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Document Number</label>
                                <input
                                    type="text"
                                    value={docNum}
                                    onChange={(e) => setDocNum(e.target.value)}
                                    placeholder="e.g. CNT-2026-0001"
                                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                                />
                                {formErrors.doc_num && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.doc_num}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                                    />
                                    {formErrors.start_date && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.start_date}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-[#4FA34E]"
                                    />
                                    {formErrors.end_date && <p className="text-[11px] text-[#C40000] mt-1">{formErrors.end_date}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-6">
                            <button type="button" onClick={closeUploadModal} disabled={isUploading} className="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitContract}
                                disabled={isUploading || !pdfFile || !docNum || !startDate || !endDate || !selectedCompanyName}
                                className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-[#4FA34E] hover:bg-[#3d8f3c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isUploading ? 'Uploading…' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── View Contracts Modal ── */}
            <ContractsModal modalRow={contractsModalRow} onClose={closeContractsModal} />
        </>
    );
}

export default UploadContract;

UploadContract.layout = (page) => <AuthenticatedLayout children={page} />;