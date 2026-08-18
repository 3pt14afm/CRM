import React, { useMemo, useState, useEffect, useRef } from 'react';
import { router, Head } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import { MdOutlineClose, MdCheck, MdOutlineCancel, MdVerifiedUser, } from 'react-icons/md';
import { route as ziggyRoute } from 'ziggy-js';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchControl from '@/Components/roi/filters/SearchControl';
import SortHeader from '@/Components/SortHeader';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';
import ViewButton from '@/Components/ViewButton';

const approvalLevelLabel = (value) => {
  if (value === 'PRESIDENT_AND_CEO') return 'President & CEO';
  if (value === 'VP_AND_CCTO') return 'VP & CCTO';
  if (value === 'ESD_DIRECTOR') return 'ESD Director';
  if (value === 'DIRECTOR_CUSTOMER_ENGAGEMENT') return 'Director - Customer Engagement';
  if (value === 'ESD_ONLY') return 'ESD Director';
  return '—';
};

const companyTypeLabel = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value) === 0 ? 'Potential' : 'Existing';
};

function ArchiveList({ archiveProjects = null, stats = null, filters = {} }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  }).format(today);

  const rows = archiveProjects?.data ?? [];

  // ── Filter state ──
  const [search,        setSearch]        = useState(filters.search         ?? '');
  const [statusFilter,  setStatusFilter]  = useState(filters.status ?? []);
  const [typeFilter,    setTypeFilter]    = useState(filters.type   ?? []);
  const [perPage,       setPerPage]       = useState(filters.per_page       ?? 10);
  const [perPageInput,  setPerPageInput]  = useState(filters.per_page       ?? 10);
  const [preparedBy,    setPreparedBy]    = useState(filters.prepared_by    ?? '');
  const [dateFrom,      setDateFrom]      = useState(filters.date_from      ?? '');
  const [dateTo,        setDateTo]        = useState(filters.date_to        ?? '');
  const [approvalLevel, setApprovalLevel] = useState(() =>
    Array.isArray(filters.approval_level) ? filters.approval_level
      : filters.approval_level ? String(filters.approval_level).split(',').filter(Boolean)
      : []
  );

  // ── Sort state ──
  const [sortBy,    setSortBy]    = useState(filters.sort_by    ?? '');
  const [sortOrder, setSortOrder] = useState(filters.sort_order ?? '');

  // ── Popup visibility ──
  const [showPreparedBy, setShowPreparedBy] = useState(false);
  const preparedByRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (preparedByRef.current && !preparedByRef.current.contains(e.target)) setShowPreparedBy(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // ── Query runner ──
  const runQuery = (updatedParams = {}) => {
    const merged = {
      search,
      status: Array.isArray(statusFilter) ? statusFilter.join(',') : statusFilter,
      type:   Array.isArray(typeFilter)   ? typeFilter.join(',')   : typeFilter,
      per_page:       perPage,
      prepared_by:    preparedBy,
      date_from:      dateFrom,
      date_to:        dateTo,
      approval_level: Array.isArray(approvalLevel) ? approvalLevel.join(',') : approvalLevel,
      sort_by:        sortBy,
      sort_order:     sortOrder,
      page:           1,
      ...updatedParams,
    };
    Object.keys(merged).forEach((key) => {
      if (merged[key] === '' || merged[key] === null || merged[key] === undefined) delete merged[key];
    });
    router.get(ziggyRoute('sprf.archive'), merged, { preserveScroll: true, preserveState: true });
  };

  // ── Sort handler ──
  const handleSort = (key) => {
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(key);
    setSortOrder(newOrder);
    runQuery({ sort_by: key, sort_order: newOrder });
  };

  // ── Filter handlers ──
  const handleStatusChange = (val) => { setStatusFilter(val); runQuery({ status: val.join(',') }); };
  const handleTypeChange   = (val) => { setTypeFilter(val);   runQuery({ type: val.join(',') }); };
  const handleApprovalLevelChange = (arr) => { setApprovalLevel(arr); runQuery({ approval_level: arr.join(',') }); };
  const handlePreparedByApply     = (val) => { setPreparedBy(val);    runQuery({ prepared_by: val }); };
  const handleDateApply           = ()    => { runQuery(); };
  const handleDateClear           = ()    => {
    setDateFrom(''); setDateTo('');
    runQuery({ date_from: '', date_to: '' });
  };
  const handlePerPageInputApply = () => {
    const val = parseInt(perPageInput, 10) || 10;
    setPerPage(val);
    runQuery({ per_page: val });
  };

  // ── Clear All ──
  const handleClearAll = () => {
    setSearch('');
    setStatusFilter([]);
    setTypeFilter([]);
    setPerPage(10);
    setPerPageInput(10);
    setPreparedBy('');
    setDateFrom('');
    setDateTo('');
    setApprovalLevel([]);
    setSortBy('');
    setSortOrder('');
    setShowPreparedBy(false);
    router.get(ziggyRoute('sprf.archive'), {}, { preserveScroll: true, preserveState: true });
  };

  const hasActiveFilters = !!(
    search || statusFilter.length || typeFilter.length !== 0 || dateFrom || dateTo ||
    preparedBy || approvalLevel.length || perPage !== 10 || sortBy
  );

  // ── Tiles ──
  const tiles = useMemo(() => {
    const totalArchiveProjects  = stats?.totalArchiveProjects  ?? archiveProjects?.total ?? 0;
    const recentlyArchivedToday = stats?.recentlyArchivedToday ?? '0 Today';
    return [
      { label: 'Total Archives',    value: totalArchiveProjects,  icon: <FaFolderOpen />,  variant: 'normal' },
      { label: 'Recently Archived', value: recentlyArchivedToday, icon: <IoTimeOutline />, variant: 'normal' },
    ];
  }, [stats, archiveProjects]);

  // ── Columns with SortHeader ──
  const columns = useMemo(() => [
    {
      key: 'prepared_by',
      header: (
        <SortHeader label="PREPARED BY" sortKey="prepared_by"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <span className="text-[#195c00] font-semibold">{r.prepared_by ?? '—'}</span>,
    },
    {
      key: 'sprf_no',
      header: (
        <SortHeader label="SPRF #" sortKey="sprf_no"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <span className="font-mono text-xs flex items-center text-slate-500">{r.sprf_no ?? '—'}</span>,
    },
    {
      key: 'sub_category',
      header: (
        <SortHeader label="SUB CATEGORY" sortKey="sub_category"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <span className="font-medium flex items-center">{r.sub_category ?? '—'}</span>,
    },
    {
      key: 'company_name',
      header: (
        <SortHeader label="ACCOUNT" sortKey="company_name"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <div className="w-full flex font-medium items-center"><span>{r.company_name ?? '—'}</span></div>,
    },
    {
      key: 'account_manager',
      header: (
        <SortHeader label="ACCOUNT MANAGER" sortKey="account_manager"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <div className="w-full flex font-medium items-center"><span>{r.account_manager ?? '—'}</span></div>,
    },
    {
      key: 'type',
      header: (
        <SortHeader label="TYPE" sortKey="type"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <div className="w-full flex font-medium items-center"><span>{companyTypeLabel(r.type)}</span></div>,
    },
    {
      key: 'approval_level',
      header: (
        <SortHeader label="APPROVAL LEVEL" sortKey="approval_level"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => (
        <span className="font-medium text-blue-700 flex items-center text-[11px] xl:text-xs">
          {approvalLevelLabel(r.approval_level)}
        </span>
      ),
    },
    {
      key: 'status',
      header: (
          <SortHeader label="STATUS" sortKey="status"
            sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (row) => {
        const s          = String(row.status ?? '').toLowerCase();
        const isRejected  = s === 'rejected';
        const isApproved  = s === 'approved';
        const isCancelled = s === 'cancelled';
        
        return (
            <div className={`inline-flex items-center gap-1 max-w-full whitespace-nowrap text-[9px] xl:text-[10px] font-medium px-1 py-0.5 rounded-xl
              ${isRejected ? 'bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20'
                : isApproved ? 'bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20'
                : isCancelled ? 'bg-red-600/10 text-red-600 border border-red-300'
                : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
              {isRejected ? <MdOutlineClose className="text-[11px] xl:text-[13px] shrink-0" />
                : isApproved ? <MdCheck className="text-[11px] xl:text-[13px] shrink-0" />
                : isCancelled ? <MdOutlineCancel className="text-[11px] xl:text-[13px] shrink-0" />
                : <span className="w-[12px] h-[12px] xl:w-[14px] xl:h-[14px] rounded-full bg-blue-700/20 shrink-0" />}
              
              <span
                className="pr-1 truncate min-w-0 max-w-[60px] sm:max-w-[90px] md:max-w-[130px] lg:max-w-[160px] xl:max-w-none cursor-default"
                title={row.decided_by_name ?? '—'}
              >
                {row.decided_by_name ?? '—'}
              </span>
            </div>
        );
      },
    },
    {
      key: 'decided_at',
      header: (
        <SortHeader 
          label={<div className="flex items-center"><span>DATE ARCHIVED</span></div>} 
          sortKey="decided_at" 
          sortBy={sortBy} 
          sortDirection={sortOrder} 
          onSort={handleSort} 
        />
      ),
      cell: (r) => (
        <div className="w-full text-slate-600 flex items-center">
          <span className="text-[10px] xl:text-[11px]">{r.decided_at_display ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
        <div className="flex justify-center items-center gap-2">
          <ViewButton
            onClick={() => router.visit(ziggyRoute('sprf.archive.show', r.id))}
            label="View details"
          />
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sortBy, sortOrder]);

  const pagination = archiveProjects && typeof archiveProjects.current_page === 'number'
    ? {
        page:         archiveProjects.current_page,
        perPage:      archiveProjects.per_page ?? 10,
        total:        archiveProjects.total ?? rows.length,
        onPageChange: (p) => runQuery({ page: p }),
      }
    : null;

  /* ─── SearchControl ─── */
  const searchControl = (
    <SearchControl
      search={search}
      onSearchChange={(val) => { setSearch(val); runQuery({ search: val }); }}
      sortOrder={sortOrder}
      onSortToggle={() => handleSort(sortBy || 'decided_at')}
      loading={false}
      onRefresh={() => runQuery()}
    />
  );

  const filterToolbar = (
    <ListFilterToolbar
      hasActiveFilters={hasActiveFilters}
      onClearAll={handleClearAll}
      
      statusOptions={[
        { value: "",          label: "All Status" },
        { value: "approved",  label: "Approved" },
        { value: "rejected",  label: "Disapproved" },
        { value: "cancelled", label: "Cancelled" },
      ]}
      statusFilter={statusFilter}
      onStatusChange={handleStatusChange}
      
      perPage={perPage}
      perPageInput={perPageInput}
      onPerPageInputChange={setPerPageInput}
      onPerPageApply={handlePerPageInputApply}
      
      // Native Type options re-enabled here
      typeOptions={[
        { value: "", label: "All Types" },
        { value: 1,  label: "Existing" },
        { value: 0,  label: "Potential" },
      ]}
      typeFilter={typeFilter}
      onTypeChange={handleTypeChange}

      levelOptions={[
        { value: "", label: "All Levels" },
        { value: "DIRECTOR_CUSTOMER_ENGAGEMENT", label: "Director - Customer Engagement" },
        { value: "ESD_ONLY", label: "ESD Director" },
        { value: "VP_AND_CCTO", label: "VP & CCTO" },
        { value: "PRESIDENT_AND_CEO", label: "President & CEO" },
      ]}
      levelFilter={approvalLevel}
      onLevelChange={handleApprovalLevelChange}
            
      // Date Range (Native)
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      onDateApply={handleDateApply}
      onDateClear={handleDateClear}
      
      // Disabled strictly ROI-specific native elements
       preparedBy={preparedBy}
        onPreparedByChange={setPreparedBy}
        onPreparedByApply={handlePreparedByApply}
      locationId=""
      selectedLocationName=""
      locations={[]}
      onLocationApply={() => {}}
    />
  );

  // --- Mobile card layout (below md) ---
  const renderArchiveCard = (r) => {
    const s = String(r.status ?? '').toLowerCase();
    const isRejected = s === 'rejected';
    const isApproved = s === 'approved';
    const isCancelled = s === 'cancelled';

    const badgeClass = isRejected
      ? "bg-[#FDECEC] text-[#C40000] border-[#C40000]/20"
      : isApproved
      ? "bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20"
      : isCancelled
      ? "bg-red-600/10 text-red-600 border-red-300"
      : "bg-blue-100 text-blue-700 border-blue-200";

    const decisionLabel = isCancelled ? 'cancelled by' : isApproved ? 'approved by' : isRejected ? 'disapproved by' : 'decided by';

    return (
      <div
        onClick={() => router.visit(ziggyRoute('sprf.archive.show', r.id))}
        className="cursor-pointer px-2 py-3 hover:bg-slate-50 transition-colors rounded-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium text-slate-500">{companyTypeLabel(r.type)}</p>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border whitespace-nowrap ${badgeClass}`}>
              {isRejected ? 'Disapproved' : (r.status ?? '—')}
            </span>
            <span className="text-[10px] text-slate-500 italic">{r.decided_at_display ?? '—'}</span>
          </div>
        </div>

        <div className="min-w-0 leading-relaxed pt-1">
          <p className="text-xs font-medium">{r.sprf_no ?? '—'}</p>
          <p className="text-sm font-semibold truncate">{r.company_name ?? '—'}</p>
          <p className="text-[11px] text-slate-800 font-semibold">{r.sub_category ?? '—'} · {r.account_manager ?? '—'}</p>
        </div>

        <div className="mt-5 pb-1.5 text-[11px] uppercase font-medium text-zinc-700">
          <span>{approvalLevelLabel(r.approval_level)}</span>
        </div>

        <p className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="normal-case text-[10px] text-slate-500 italic">
            {decisionLabel}{' '} <span className="text-slate-700 font-semibold">{r.decided_by_name ?? '—'}</span>
          </span>
          <span className="normal-case text-[10px] text-slate-500">
            prepared by <span className="text-[#195c00] font-semibold">{r.prepared_by ?? '—'}</span>
          </span>
        </p>
      </div>
    );
  };

  return (
    <>
      {/* PAGE NAVIGATION TABS (Mobile Only) */}
      <div className="sticky top-0 z-30 px-4 py-1.5 pb-2 bg-[#f5f5f7] sm:hidden">
        <div className="flex rounded-full bg-[#f8f8f8] w-full border border-[#2c2c2e10] border-b-[#2c2c2e]/15 shadow-sm">
          <button
            type="button"
            onClick={() => router.visit(route('sprf.entry.list'))}
            className="flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            Drafts
          </button>
                  
          <button
            type="button"
            onClick={() => router.visit(route('sprf.current'))}
            className="flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            Current
          </button>
                    
          <button
            type="button"
            className="flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800] border border-[#B5EBA2]/60"
          >
            Archive
          </button>              
        </div>
      </div>    

      <Head title="SPRF Archive" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">

          <div className="px-4 sm:px-6 lg:px-10 pt-2 md:pt-8 pb-3 flex justify-between items-end">
            <div className="flex items-baseline gap-1">
              <h1 className="font-semibold text-[13px] sm:text-sm text-slate-500">Project SPRF Approval</h1>
              <p className="text-slate-400 hidden sm:block">/</p>
              <p className="text-2xl sm:text-3xl font-semibold text-slate-900 hidden sm:block">Archive</p>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-[10px] md:text-xs text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          <ProjectListSection
            tiles={tiles}
            tableTitle="Archived Projects"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={pagination}
            searchControl={searchControl}
            filterControl={filterToolbar}
            renderCard={renderArchiveCard}
          />
        </div>
      </div>
    </>
  );
}

export default ArchiveList;
ArchiveList.layout = (page) => <AuthenticatedLayout children={page} />;