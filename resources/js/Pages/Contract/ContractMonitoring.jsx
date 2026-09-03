import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { route } from 'ziggy-js';
import { MdSearch, MdOutlineFilterAlt, MdExpandMore, MdOutlineCalendarMonth, } from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';
import SortHeader from '@/Components/SortHeader';
import ScrollableSelect from '@/Components/ScrollableSelect';
import ScrollableMultiSelect from '@/Components/ScrollableMultiSelect';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import FilterToolbar from '@/Components/roi/filters/FilterToolbar';
import { FaRegFilePdf, FaRegUser } from 'react-icons/fa6';
import ViewButton from '@/Components/ViewButton';
import ExportDrawer from '@/Components/ExportDrawer';


const DEFAULT_FILTERS = {
    search:         '',
    delsan_company: '',
    type:           [],
    status:         [],
    include_no_contracts: false,
    per_page:       100,
    sort_by:        'company_name',
    sort_order:     'asc',
};

const STATUS_CLASSES = {
    active:          'text-[#2da300] bg-[#e9f7e7] border-[#2DA300]/20',
    extended:        'text-emerald-600 bg-emerald-50 border-emerald-200',
    expiring_soon:   'text-amber-600 bg-amber-50 border-amber-200',
    expired:         'text-red-600 bg-red-50 border-red-200',
    terminated:      'text-slate-500 bg-slate-100 border-slate-200',
    archived:        'text-slate-500 bg-slate-100 border-slate-200',
};

const COUNT_STATUS_SEVERITY = {
    expired:        3,
    expiring_soon:  2,
    active:         1,
    extended:       1,
    terminated:     0,
    archived:       0,
    default:        0,
};

const COUNT_COLOR_CLASSES = {
    expired:        'text-red-600',
    expiring_soon:  'text-amber-500',
    active:         'text-lime-500',
    extended:       'text-lime-500',
    terminated:     'text-slate-400',
    archived:       'text-slate-400',
    default:        'text-slate-400',
};

function StatusPill({ status, label }) {
    const classes = STATUS_CLASSES[status] || 'text-slate-500 bg-slate-100 border-slate-200';
    return (
        <span className={`inline-flex items-center whitespace-nowrap px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-semibold border ${classes}`}>
            {label}
        </span>
    );
}

function formatShortDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '');
}

function formatDaysRemaining(days) {
    if (days === null || days === undefined) return '';

    const rounded = Math.round(days);
    if (rounded === 0) return 'Today';

    const overdue = rounded < 0;
    const abs = Math.abs(rounded);
    const months = Math.floor(abs / 30);
    const remDays = abs % 30;

    const parts = [];
    if (months > 0) parts.push(`${months}m`);
    if (remDays > 0 || months === 0) parts.push(`${remDays}d`);

    const label = parts.join(' ');
    return overdue ? `${label} overdue` : label;
}

function daysRemainingClass(days) {
    if (days === null || days === undefined) return 'text-slate-400';
    if (days < 0) return 'text-red-600';
    if (days <= 180) return 'text-amber-600';
    return 'text-[#2da300]';
}

function RemainingDaysLabel({ days }) {
    const label = formatDaysRemaining(days);

    if (label === '—') {
        return <span className="text-slate-400">—</span>;
    }

    const isOverdue = days < 0;

    if (isOverdue) {
        const overdueDays = Math.abs(days);
        const months = Math.floor(overdueDays / 30);
        const remainingDays = overdueDays % 30;

        const overdueLabel = [
            months > 0 ? `${months}m` : null,
            remainingDays > 0 ? `${remainingDays}d` : null,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <span className={`text-[10px] md:text-[11px] font-medium ${daysRemainingClass(days)}`}>
                <span className="flex flex-row md:flex-col md:leading-tight gap-1 md:gap-0">
                    <span>{overdueLabel}</span>
                    <span>overdue</span>
                </span>
            </span>
        );
    }

    return (
        <span className={`whitespace-nowrap text-[10px] md:text-[11px] font-medium ${daysRemainingClass(days)}`}>
            {label}
        </span>
    );
}

function ContractMonitoring({ companies, filters = {}, contractTypes = [], statusOptions = [] }) {
    const [searchState, setSearchState] = useState(() => ({
        // const persisted = loadPersistedFilters();
        // return {
            ...DEFAULT_FILTERS,
            // ...(persisted ?? {}),
            ...(filters.search         !== undefined ? { search:         filters.search }         : {}),
            ...(filters.delsan_company !== undefined ? { delsan_company: filters.delsan_company } : {}),
            ...(filters.type           !== undefined ? { type:           filters.type }           : {}),
            ...(filters.status         !== undefined ? { status:         filters.status }          : {}),
            ...(filters.include_no_contracts !== undefined ? { include_no_contracts: [true, 'true', '1', 1].includes(filters.include_no_contracts) } : {}),
            ...(filters.per_page       !== undefined ? { per_page:       filters.per_page }        : {}),
            ...(filters.sort_by        !== undefined ? { sort_by:        filters.sort_by }         : {}),
            ...(filters.sort_order     !== undefined ? { sort_order:     filters.sort_order }      : {}),
        // };
    }));

    const [showPerPagePicker, setShowPerPagePicker] = useState(false);
    const [perPageInput, setPerPageInput] = useState(String(searchState.per_page));
    const perPagePickerRef = useRef(null);

    const [expandedSapCodes, setExpandedSapCodes] = useState(() => new Set());
    const toggleGroup = (sapCode) => {
        if (!sapCode) return;
        setExpandedSapCodes((prev) => {
            const next = new Set(prev);
            if (next.has(sapCode)) next.delete(sapCode); else next.add(sapCode);
            return next;
        });
    };

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['companies'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchDebounceRef = useRef(null);
    const searchAbortRef = useRef(null);

    const searchStateRef = useRef(searchState);
    useEffect(() => { searchStateRef.current = searchState; }, [searchState]);

    // useEffect(() => {
    //     try { localStorage.setItem(STORAGE_KEY, JSON.stringify(searchState)); } catch {}
    // }, [searchState]);

    useEffect(() => {
        const handler = (e) => {
            if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target))
                setShowPerPagePicker(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => () => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        if (searchAbortRef.current) searchAbortRef.current.abort();
    }, []);

    const updateFilters = (newFilters) => {
        let updated = { ...searchStateRef.current, ...newFilters };

        if ('include_no_contracts' in newFilters && newFilters.include_no_contracts) {
            updated = { ...updated, status: [], type: [] };
        } else if (('status' in newFilters || 'type' in newFilters) && updated.include_no_contracts) {
            const hasActiveStatus = Array.isArray(newFilters.status) ? newFilters.status.length > 0 : !!newFilters.status;
            const hasActiveType = Array.isArray(newFilters.type) ? newFilters.type.length > 0 : !!newFilters.type;
            if (hasActiveStatus || hasActiveType) {
                updated = { ...updated, include_no_contracts: false };
            }
        }

        setSearchState(updated);
        setSearchResults(null);
        router.get(route('contract.monitoring'), updated, { preserveState: true, replace: true });
    };

    const runSearch = (value, currentFilters) => {
        if (searchAbortRef.current) searchAbortRef.current.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;
        setIsSearching(true);

        axios.get(route('contract.monitoring'), {
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
            window.history.replaceState(window.history.state, '', `${route('contract.monitoring')}?${params}`);
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
        searchState.delsan_company !== DEFAULT_FILTERS.delsan_company ||
        (searchState.type?.length ?? 0)   > 0 ||
        (searchState.status?.length ?? 0) > 0 ||
        searchState.include_no_contracts !== DEFAULT_FILTERS.include_no_contracts ||
        searchState.sort_by        !== DEFAULT_FILTERS.sort_by        ||
        searchState.sort_order     !== DEFAULT_FILTERS.sort_order
    ), [searchState]);

    const clearAllFilters = () => {
        const reset = { ...DEFAULT_FILTERS, per_page: searchState.per_page };
        setSearchState(reset);
        setPerPageInput(String(reset.per_page));
        setSearchResults(null);
        // try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reset)); } catch {}
        router.get(route('contract.monitoring'), reset, { preserveState: true, replace: true });
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

    const effectiveCompanies = searchResults?.companies ?? companies;

    const displayRows = useMemo(() => {
        const list = effectiveCompanies?.data ?? [];
        const seenSapCodes = new Set();
        const rows = [];

        list.forEach((c) => {
            if (c.sap_code) {
                if (seenSapCodes.has(c.sap_code)) return;
                seenSapCodes.add(c.sap_code);
            }

            const branchCount = c.branches?.length || 1;
            const isCollapsible = branchCount > 1;

            if (!isCollapsible) {
                const contractsForCompany = c.contracts ?? [];

                if (contractsForCompany.length === 0) {
                    rows.push({
                        _type: 'contract',
                        id: `no-contract-${c.id}`,
                        sap_code: c.sap_code,
                        company_name: c.company_name,
                        delsan_company: c.delsan_company,
                        location: c.location,
                        client_manager: c.client_manager,
                        id_client_mngr: c.id_client_mngr,
                        _groupId: c.id,
                        _topLevel: true,
                        _noContract: true,
                        status: null,
                        status_label: null,
                        contract_type: null,
                        start_date: null,
                        end_date: null,
                        remaining_days: null,
                        pdf_url: null,
                    });
                    return;
                }

                contractsForCompany.forEach((contract) => {
                    rows.push({
                        _type: 'contract',
                        ...contract,
                        sap_code: c.sap_code,
                        company_name: contract.company_name ?? c.company_name,
                        delsan_company: c.delsan_company,
                        location: c.location,
                        client_manager: c.client_manager,
                        id_client_mngr: c.id_client_mngr,
                        _groupId: c.id,
                        _topLevel: true,
                    });
                });
                return;
            }

            const isExpanded = c.sap_code && expandedSapCodes.has(c.sap_code);
            const allBranchContracts = c.branch_contracts ?? c.contracts ?? [];
            const contractsToShow = isExpanded ? allBranchContracts : (c.contracts ?? []);
            const contractsStatus = allBranchContracts.reduce((worst, contract) => {
                const s = contract.status ?? 'default';
                return (COUNT_STATUS_SEVERITY[s] ?? 0) > (COUNT_STATUS_SEVERITY[worst] ?? -1) ? s : worst;
            }, 'default');

            rows.push({
                _type: 'group',
                id: c.id,
                sap_code: c.sap_code,
                company_name: c.company_name,
                delsan_company: c.delsan_company,
                location: c.location,
                client_manager: c.client_manager,
                id_client_mngr: c.id_client_mngr,
                branchCount,
                isExpanded,
                contractCount: allBranchContracts.length,
                contractsStatus,
            });

            if (isExpanded) {
                const branchIdsWithContracts = new Set(
                    contractsToShow.map((contract) => contract.company_id)
                );

                contractsToShow.forEach((contract) => {
                    rows.push({ _type: 'contract', ...contract, _groupId: c.id });
                });

                (c.branches ?? []).forEach((branch) => {
                    if (!searchState.include_no_contracts) return;
                    if (branchIdsWithContracts.has(branch.id)) return;

                    rows.push({
                        _type: 'contract',
                        id: `no-contract-${branch.id}`,
                        sap_code: c.sap_code,
                        company_name: branch.company_name,
                        delsan_company: branch.delsan_company ?? c.delsan_company,
                        location: branch.location,
                        client_manager: branch.client_manager,
                        id_client_mngr: branch.id_client_mngr,
                        _groupId: c.id,
                        _noContract: true,
                        status: null,
                        status_label: null,
                        contract_type: null,
                        start_date: null,
                        end_date: null,
                        remaining_days: null,
                        pdf_url: null,
                    });
                });
            }
        });

        return rows;
    }, [effectiveCompanies, expandedSapCodes, searchState.include_no_contracts]);

    // ── Mobile card renderer ──
    const renderMonitoringCard = (r) => {
        // ── GROUP / COMPANY WITH BRANCHES ──
        if (r._type === 'group') {
            return (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-600 text-xs">
                                {r.sap_code}
                            </span>

                            {r.branchCount > 1 && (
                                <span className="shrink-0 text-[9px] font-semibold text-[#195c00] bg-[#195c00]/10 px-1.5 py-0.5 rounded-full">
                                    {r.branchCount} Branches
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold truncate text-[#0f3800]">
                                {r.company_name ?? '—'}
                            </p>

                            {r.branchCount > 1 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleGroup(r.sap_code);
                                    }}
                                    title={
                                        r.isExpanded
                                            ? 'Collapse branches'
                                            : `Show ${r.branchCount - 1} more branch${
                                                r.branchCount - 1 !== 1 ? 'es' : ''
                                            }`
                                    }
                                    className="flex-shrink-0 text-slate-600 hover:text-slate-800 transition-colors"
                                >
                                    <MdExpandMore
                                        size={20}
                                        className={`transition-transform duration-200 ${
                                            r.isExpanded ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                            )}
                        </div>

                        <p className="text-[11px] font-medium truncate uppercase">
                            {r.delsan_company ?? '—'}
                        </p>

                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[11px] font-medium text-slate-700">
                                {r.client_manager || r.id_client_mngr || ''}
                            </p>

                            <span
                                className={`text-[10px] font-semibold ${
                                    r.contractCount > 0
                                        ? (COUNT_COLOR_CLASSES[r.contractsStatus] ??
                                        COUNT_COLOR_CLASSES.default)
                                        : COUNT_COLOR_CLASSES.default
                                }`}
                            >
                                {r.contractCount} contract
                                {r.contractCount === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        // ── NO-BRANCH COMPANY ──
        // _topLevel === true identifies these rows.
        if (r._type === 'contract' && r._topLevel) {
            return (
                <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-600 text-xs">
                                {r.sap_code}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-xs font-semibold truncate text-[#0f3800]">
                                {r.company_name ?? '—'}
                            </p>

                            <StatusPill
                                status={r.status}
                                label={r.status_label}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-medium truncate mt-1">
                            <div className="flex items-center gap-1">
                                <FaRegUser/><span>{r.client_manager || r.id_client_mngr || ''}</span>
                            </div>
                            <span className="uppercase">{r.delsan_company ?? '—'}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] mt-1">
                            <span className="flex items-center gap-1">
                                <MdOutlineCalendarMonth/>
                                {formatShortDate(r.start_date) ?? '—'} –{' '}
                                {formatShortDate(r.end_date) ?? '—'}
                            </span>

                            <RemainingDaysLabel days={r.remaining_days} />
                        </div>

                        <div className="flex items-center justify-between mt-2.5">
                            <span className="text-[11px] text-slate-500">
                                {r.contract_type ?? '—'}
                            </span>

                            {r.pdf_url ? (
                                <button
                                    type="button"
                                    title="View PDF"
                                    onClick={() =>
                                        window.open(
                                            r.pdf_url,
                                            '_blank',
                                            'noopener,noreferrer'
                                        )
                                    }
                                    className="px-1.5 py-1 flex items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] border border-[#B5EBA2]/40 font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/30"
                                >
                                    <FaRegFilePdf className="text-[16px]" />
                                </button>
                            ) : (
                                ""
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // ── CHILD BRANCH ──
        // Keep the existing child-branch UI exactly as it was.
        return (
            <div className="flex flex-col pl-3 border-l-2 border-[#195c00]/15">
                <div className="flex items-center justify-between gap-4 mb-3 mt-1">
                    <span className="text-[11px] sm:text-xs text-slate-700 whitespace-normal">
                        {r.company_name ?? '—'}
                    </span>

                    <StatusPill
                        status={r.status}
                        label={r.status_label}
                    />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                    <div className="flex items-center gap-1">
                        <FaRegUser/><span>{r.client_manager || r.id_client_mngr || ''}</span>
                    </div>

                    <span className="uppercase">
                        {r.delsan_company ?? '—'}
                    </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                        <MdOutlineCalendarMonth/>
                        {formatShortDate(r.start_date) ?? '—'} –{' '}
                        {formatShortDate(r.end_date) ?? '—'}
                    </span>

                    <RemainingDaysLabel days={r.remaining_days} />
                </div>

                <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[11px] text-slate-500">
                        {r.contract_type ?? '—'}
                    </span>

                    {r.pdf_url ? (
                        <button
                            type="button"
                            title="View PDF"
                            onClick={() =>
                                window.open(
                                    r.pdf_url,
                                    '_blank',
                                    'noopener,noreferrer'
                                )
                            }
                            className="px-1.5 py-1 flex items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] border border-[#B5EBA2]/40 font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/30"
                        >
                            <FaRegFilePdf className="text-[16px]" />
                        </button>
                    ) : (
                        ""
                    )}
                </div>
            </div>
        );
    };

    // ── Desktop table columns ──
    const monitoringColumns = useMemo(() => [
        {
            key: 'sap_code',
            header: <SortHeader label="SAP CODE" sortKey="sap_code" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <div className="min-h-[32px] flex items-center">
                    {(r._type === 'group' || r._topLevel)
                        ? <span className="font-mono text-slate-600">{r.sap_code ?? ''}</span>
                        : ""}
                </div>
            ),
        },
        {
            key: 'company_name',
            header: (
                <SortHeader
                    label="NAME"
                    sortKey="company_name"
                    sortBy={searchState.sort_by}
                    sortDirection={searchState.sort_order}
                    onSort={handleSort}
                />
            ),
            cell: (r) => {
                if (r._type === 'group') {
                    return (
                        <div className="min-h-[32px] flex items-center font-medium justify-between text-[#0f3800]">
                            <span className="whitespace-normal min-w-24">
                                {r.company_name ?? '—'}
                            </span>

                            {r.branchCount > 1 && (
                                <div className="flex items-center gap-5 flex-shrink-0">
                                    <span className="text-[9px] font-semibold text-[#195c00] bg-[#195c00]/10 px-1.5 py-0.5 rounded-full">
                                        {r.branchCount} Branches
                                    </span>

                                    <ViewButton
                                        onClick={() => toggleGroup(r.sap_code)}
                                        icon={MdExpandMore}
                                        label={
                                            r.isExpanded
                                                ? 'Collapse branches'
                                                : `Show more branch${r.branchCount - 1 !== 1 ? 'es' : ''} with contract`
                                        }
                                        iconSize={`text-[20px] transition-transform duration-200 ${r.isExpanded ? 'rotate-180' : ''}`}
                                        className="bg-white border shadow-sm rounded-md -p-1 text-slate-700 hover:bg-slate-50"
                                    />
                                </div>
                            )}
                        </div>
                    );
                }

                if (r._topLevel) {
                    return (
                        <div className="min-h-[32px] max-h-[64px] flex items-center overflow-y-auto">
                            <span className="font-medium text-[#0f3800] break-words whitespace-normal">
                                {r.company_name ?? ''}
                            </span>
                        </div>
                    );
                }

                return (
                    <div className="min-h-[32px] max-h-[64px] border-l-2 flex items-center pl-4 overflow-y-auto">
                        <span className="text-slate-700 break-words whitespace-normal">
                            {r.company_name ?? ''}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'client_manager',
            header: <SortHeader label="ACCOUNT MANAGER" sortKey="client_manager" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <div className="min-h-[32px] flex items-center font-medium">{r.client_manager || r.id_client_mngr || ''}</div>
            ),
        },
        {
            key: 'uploader',
            header: <div>UPLOADER</div>,
            cell: (r) => (
                <div className="min-h-[32px] flex items-center font-medium">
                    {r._type === 'contract' && !r._noContract ? (r.uploader ?? '') : ''}
                </div>
            ),
        },
        {
            key: 'delsan_company',
            header: <SortHeader label="DELSAN" sortKey="delsan_company" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <div className="min-h-[32px] uppercase font-medium flex items-center">{r.delsan_company ?? ''}</div>
            ),
        },
        {
            key: 'dates',
            header: <SortHeader label="START – END" sortKey="dates" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <div className="min-h-[32px] flex items-center">
                    {r._type === 'contract' && !r._noContract
                        ? (
                            <div className="text-[11px] leading-snug py-1">
                                <div>{formatShortDate(r.start_date) ?? ''}</div>
                                <div>to {formatShortDate(r.end_date) ?? ''}</div>
                            </div>
                        )
                        : (r._noContract ? <span className="text-slate-300"></span> : "")}
                </div>
            ),
        },
        {
            key: 'location',
            header: <SortHeader label="LOCATION" sortKey="location" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <div className="min-h-[32px] flex items-center">
                    <span className="font-medium break-words">{r.location ?? ''}</span>
                </div>
            ),
        },
        {
            key: 'status',
            header: <SortHeader label="STATUS" sortKey="status" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <div className="min-h-[32px] flex items-center">
                    {r._type === 'group'
                        ? <span className={`text-[11px] font-semibold ${r.contractCount > 0 ? (COUNT_COLOR_CLASSES[r.contractsStatus] ?? COUNT_COLOR_CLASSES.default) : COUNT_COLOR_CLASSES.default}`}>{r.contractCount} contract{r.contractCount === 1 ? '' : 's'}</span>
                        : (r._noContract ? <span className="text-[11px] text-slate-400"></span>
                            : <StatusPill status={r.status} label={r.status_label} />)}
                </div>
            ),
        },
        {
            key: 'contract_type',
            header: <SortHeader label="TYPE" sortKey="contract_type" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <div className="min-h-[32px] flex items-center">
                    {r._type === 'contract'
                        ? <span className="block max-w-[90px] font-medium whitespace-normal break-words">{r.contract_type ?? ''}</span>
                        : ""}
                </div>
            ),
        },
        {
            key: 'remaining_days',
            header: <SortHeader label="DAYS" sortKey="remaining_days" sortBy={searchState.sort_by} sortDirection={searchState.sort_order} onSort={handleSort} />,
            cell: (r) => (
                <div className="min-h-[32px] flex items-center">
                    {r._type === 'contract'
                        ? <RemainingDaysLabel days={r.remaining_days} />
                        : <span className="text-slate-300"></span>}
                </div>
            ),
        },
        {
            key: 'action',
            header: <div className="text-center">ACTION</div>,
            cell: (r) => {
                if (r._type !== 'contract') return null;
                return (
                    <div className="min-h-[32px] flex items-center justify-center">
                        {r.pdf_url ? (
                            <ViewButton
                                onClick={() => window.open(r.pdf_url, '_blank', 'noopener,noreferrer')}
                                icon={FaRegFilePdf}
                                label="View Contract"
                                iconSize="text-[16px]"
                                className="px-1.5 py-1 border border-[#B5EBA2]/40 hover:shadow-inner hover:bg-[#B5EBA2]/30"
                            />
                        ) : (
                            ""
                        )}
                    </div>
                );
            },
        }
    ], [searchState.sort_by, searchState.sort_order, expandedSapCodes]);

    const goToPage = (p) => {
        setSearchResults(null);
        router.get(route('contract.monitoring'), { ...searchStateRef.current, page: p }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const pagination = effectiveCompanies && typeof effectiveCompanies.current_page === 'number'
        ? {
            page: effectiveCompanies.current_page,
            perPage: effectiveCompanies.per_page ?? searchState.per_page,
            total: effectiveCompanies.total ?? 0,
            onPageChange: goToPage,
        }
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

    const delsanOptions = [
        { id: "", name: "All Delsan" },
        { id: "DBIC", name: "DBIC" },
        { id: "DOSC", name: "DOSC" },
        // { id: "DDTC", name: "DDTC" }
    ];

    const mappedStatusOptions = statusOptions.map((s) => ({ id: s.value, name: s.label }));

    const filterToolbar = (
        <FilterToolbar hasActiveFilters={isFiltered} onClearAll={clearAllFilters}>
            
            {/* Delsan Company Filter */}
            <div className="relative w-[80px] md:w-28 flex flex-shrink-0 items-center">
                <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
                <ScrollableSelect
                    value={searchState.delsan_company}
                    onChange={(val) => updateFilters({ delsan_company: val })}
                    options={delsanOptions}
                    placeholder="Delsan"
                    className="!pl-[21px] md:!pl-8"
                />
            </div>

            <div className="relative w-[160px] flex flex-shrink-0 items-center">
                <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
                <ScrollableMultiSelect
                    isSearchable={false}
                    pluralLabel="types"
                    values={searchState.type || []}
                    onChange={(arr) => updateFilters({ type: arr })}
                    options={contractTypes}
                    placeholder="Contract Types"
                    className="!pl-[21px] md:!pl-8 pr-1 md:pr-2"
                />
            </div>

            {/* Status Multi-Filter */}
            <div className="relative w-[115px] flex flex-shrink-0 items-center">
                <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
                <ScrollableMultiSelect
                    isSearchable={false}
                    values={searchState.status || []}
                    onChange={(arr) => updateFilters({ status: arr })}
                    options={mappedStatusOptions}
                    placeholder="Status"
                    className="!pl-[21px] md:!pl-8 pr-1 md:pr-2"
                />
            </div>

            {/* Rows Per Page Picker */}
            <div className="relative h-7 md:h-9 flex items-center flex-shrink-0" ref={perPagePickerRef}>
                <button
                    type="button"
                    onClick={() => setShowPerPagePicker((p) => !p)}
                    className="h-7 md:h-9 px-1 md:px-3 pl-[21px] truncate md:pl-8 border border-gray-200 rounded-lg text-[11px] md:text-xs  text-slate-700 flex items-center md:gap-1.5 bg-white hover:bg-slate-50 transition-colors relative w-[60px] sm:w-24 md:w-32"
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

            {/* Include Companies With No Contracts */}
            <label className="flex items-center gap-1.5 h-7 md:h-9 px-2 flex-shrink-0 select-none cursor-pointer text-[11px] md:text-xs text-slate-700">
                <input
                    type="checkbox"
                    checked={searchState.include_no_contracts}
                    onChange={(e) => updateFilters({ include_no_contracts: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#289800] focus:ring-0 focus:ring-offset-0 accent-[#289800]"
                />
                <span className="whitespace-nowrap">
                    Show companies without contracts
                </span>
            </label>
        </FilterToolbar>
    );

    return (
        <>
            <Head title="Contract Monitoring" />

            <div className="min-h-screen flex flex-col">
                <div className="flex-1 pb-24">
                    <div className="px-4 sm:px-6 lg:px-10 pt-8 mb-5 pb-0 flex justify-between items-end">
                        <div className="flex flex-col md:gap-1">
                            <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900">Contract Monitoring</p>
                            <p className="text-[11px] text-slate-500 md:text-xs lg:text-sm">Track existing contracts by company, status, and remaining time.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[11px] md:text-xs text-slate-500">{formattedDate}</h1>
                        </div>
                    </div>

                    <ProjectListSection
                        tableTitle="Company Contracts"
                        columns={monitoringColumns}
                        rows={displayRows}
                        rowKey={(r) => r._type === 'group' ? `group-${r.id}` : `contract-${r.id}`}
                        pagination={pagination}
                        searchControl={searchControl}
                        onRefresh={handleRefresh}
                        refreshing={isRefreshing}
                        onExport={() => setExportDrawerOpen(true)}
                        filterControl={filterToolbar}
                        loading={isSearching || isRefreshing}
                        emptyText="No contracts found."
                        renderCard={renderMonitoringCard}
                    />
                </div>

                <ExportDrawer
                    open={exportDrawerOpen}
                    onOpenChange={setExportDrawerOpen}
                    title="Export Contracts"
                    description="Export everything, or narrow it down by Delsan company, contract type, and status."
                    exportRoute="contract.monitoring.export"
                    searchState={searchState}
                    statusOptions={mappedStatusOptions}
                    typeOptions={contractTypes}
                    showTypeFilter={true}
                    typeLabel="Contract Types"
                    extraParams={{ include_no_contracts: '0' }}
                    statusNote="Unchecked = default (active, extended, expiring, expired)."
                />
            </div>
        </>
    );
}

export default ContractMonitoring;

ContractMonitoring.layout = (page) => <AuthenticatedLayout children={page} />;