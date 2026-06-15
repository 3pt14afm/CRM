import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { route } from 'ziggy-js';
import { Building2 } from 'lucide-react';
import {
    MdSearch, MdOutlineFilterAlt, MdExpandMore,
} from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';
import { usePage } from '@inertiajs/react';
import CompanyDetailsSidebar from './CompanyDetailsSidebar';

function Index({ companies, filters, stats }) {
    const [searchState, setSearchState] = useState({
        search:         filters.search         || '',
        category:       filters.category       || '',
        status:         filters.status         ?? '',
        delsan_company: filters.delsan_company || '',
        per_page:       filters.per_page       || 12,
    });

    const [selectedCompany, setSelectedCompany] = useState(null);
    const [isSidebarOpen,   setIsSidebarOpen]   = useState(false);

    // Per-page popup
    const [showPerPagePicker, setShowPerPagePicker] = useState(false);
    const [perPageInput,      setPerPageInput]      = useState(String(filters.per_page || 12));
    const perPagePickerRef = useRef(null);

    // Close per-page popup on outside click
    useEffect(() => {
        const handler = (e) => {
            if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target))
                setShowPerPagePicker(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const updateFilters = (newFilters) => {
        const updated = { ...searchState, ...newFilters };
        setSearchState(updated);
        router.get(route('customerinfo.companies.index'), updated, {
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

    /* ── Tiles ── */
    const tiles = useMemo(() => [
        {
            label: 'Total Companies',
            value: stats?.totalCompanies ?? companies?.total ?? 0,
            icon:  <Building2 className="w-4 h-4" />,
            variant: 'normal',
        },
        {
            label: 'Active',
            value: stats?.totalActive ?? '—',
            icon:  <Building2 className="w-4 h-4" />,
            variant: 'normal',
        },
    ], [stats, companies]);

    /* ── Columns ── */
    const columns = useMemo(() => [
        {
            key:    'company_name',
            header: 'COMPANY NAME',
            cell:   (r) => (
                <span className="font-medium text-[#195c00]">
                    {r.company_name ?? '—'}
                </span>
            ),
        },
        {
            key:    'sap_code',
            header: <div className="text-center w-full">SAP CODE</div>,
            cell:   (r) => (
                <span className="font-mono text-sm flex justify-center items-center text-slate-500">
                    {r.sap_code ?? '—'}
                </span>
            ),
        },
        {
            key:    'client_category',
            header: <div className="text-center w-full">CATEGORY</div>,
            cell:   (r) => (
                <span className="font-medium flex justify-center items-center">
                    {r.client_category ?? '—'}
                </span>
            ),
        },
        {
            key:    'delsan_company',
            header: <div className="text-center w-full">DELSAN COMPANY</div>,
            cell:   (r) => (
                <span className="font-medium flex justify-center items-center uppercase">
                    {r.delsan_company ?? '—'}
                </span>
            ),
        },
        {
            key:    'status',
            header: <div className="text-center w-full">STATUS</div>,
            cell:   (row) => {
                const isActive = row.status == 1;
                return (
                    <div className="flex justify-center items-center">
                        <span className={`px-2 rounded-full text-[9px] font-bold uppercase tracking-wider border
                            ${isActive
                                ? 'bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20'
                                : 'bg-[#FDECEC] text-[#C40000] border-[#C40000]/20'
                            }`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                );
            },
        },
    ], []);

    /* ── Pagination ── */
    const goToPage = (p) => {
        router.get(
            route('customerinfo.companies.index'),
            { ...searchState, page: p },
            { preserveState: true, preserveScroll: true }
        );
    };

    const rows = companies?.data ?? [];
    const pagination = companies && typeof companies.current_page === 'number'
        ? {
            page:         companies.current_page,
            perPage:      companies.per_page ?? 12,
            total:        companies.total ?? rows.length,
            onPageChange: goToPage,
          }
        : null;

    /* ── Search control ── */
    const searchControl = (
        <div className="relative h-9 flex items-center">
            <MdSearch className="absolute left-2.5 text-slate-400 text-base pointer-events-none z-10" />
            <input
                type="text"
                placeholder="Search name, SAP code, address..."
                value={searchState.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="h-9 w-64 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg bg-white text-black
                    placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-[#4FA34E]
                    transition-[border-color,box-shadow] duration-150"
            />
        </div>
    );

    /* ── Filter toolbar ── */
    const filterToolbar = (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">

            {/* Delsan Company */}
            <div className="relative h-9 flex items-center flex-shrink-0">
                <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
                <select
                    value={searchState.delsan_company}
                    onChange={(e) => updateFilters({ delsan_company: e.target.value })}
                    className="h-9 w-32 sm:w-36 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer
                        focus:outline-none focus:ring-0 focus:border-[#4FA34E]
                        transition-[border-color,box-shadow] duration-150 text-slate-700"
                >
                    <option value="">All Delsan</option>
                    <option value="DBIC">DBIC</option>
                    <option value="DOSC">DOSC</option>
                    <option value="DDTC">DDTC</option>
                </select>
            </div>

            {/* Status */}
            <div className="relative h-9 flex items-center flex-shrink-0">
                <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
                <select
                    value={searchState.status}
                    onChange={(e) => updateFilters({ status: e.target.value })}
                    className="h-9 w-32 sm:w-36 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer
                        focus:outline-none focus:ring-0 focus:border-[#4FA34E]
                        transition-[border-color,box-shadow] duration-150 text-slate-700"
                >
                    <option value="">All Statuses</option>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                </select>
            </div>

            {/* Per Page */}
            <div className="relative h-9 flex items-center flex-shrink-0" ref={perPagePickerRef}>
                <button
                    type="button"
                    onClick={() => setShowPerPagePicker((p) => !p)}
                    className="h-9 px-3 border border-gray-200 rounded-lg text-[13px] text-slate-600 flex items-center gap-1.5 bg-white hover:bg-slate-50 transition-colors"
                >
                    <TbLayoutRows size={15} className="text-slate-400" />
                    <span>Rows: {searchState.per_page}</span>
                    <MdExpandMore size={14} className="text-slate-400" />
                </button>

                {showPerPagePicker && (
                    <div className="absolute left-0 top-11 z-50 w-36 bg-white border border-gray-200 rounded-2xl shadow-lg p-3">
                        <span className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
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
                                className="w-16 h-7 px-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-0"
                            />
                            <button
                                type="button"
                                onClick={handlePerPageInputApply}
                                className="h-7 min-w-11 flex-1 text-[10px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );

    return (
        <>
            <Head title="Customer Information Details" />

            <div className="min-h-screen flex flex-col">
                <div className="flex-1 pb-24">

                    {/* HEADER */}
                    <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-3 flex justify-between items-end">
                        <div className="flex items-baseline gap-1">
                            <p className="text-2xl sm:text-3xl font-semibold text-slate-900">
                                Customer Information Details
                            </p>
                        </div>
                        <h1 className="text-xs text-slate-500">{formattedDate}</h1>
                    </div>

                    {/* TABLE via ProjectListSection */}
                    <ProjectListSection
                        tableTitle="Companies"
                        columns={columns}
                        rows={rows}
                        rowKey={(r) => String(r.id)}
                        pagination={pagination}
                        searchControl={searchControl}
                        filterControl={filterToolbar}
                        onRowClick={(r) => {
                            setSelectedCompany(r);
                            setIsSidebarOpen(true);
                        }}
                        emptyText="No company records found."
                    />

                </div>
            </div>

            {/* SIDEBAR COMPONENT */}
            <CompanyDetailsSidebar
                isOpen={isSidebarOpen}
                company={selectedCompany}
                onClose={() => setIsSidebarOpen(false)}
            />
        </>
    );
}

export default Index;

Index.layout = (page) => <AuthenticatedLayout children={page} />;