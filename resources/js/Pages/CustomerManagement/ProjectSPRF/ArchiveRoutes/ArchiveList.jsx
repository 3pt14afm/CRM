import React, { useMemo, useState, useEffect, useRef } from 'react';
import { router, Head } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import { 
  MdCheckCircle, MdCancel, MdOutlineClose, MdCheck, 
  MdOutlineCancel, MdVerifiedUser, MdPerson 
} from 'react-icons/md';
import { route as ziggyRoute } from 'ziggy-js';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchControl from '@/Components/roi/filters/SearchControl';
import SortHeader from '@/Components/roi/filters/SortHeader';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';
import FilterChip from '@/Components/roi/filters/FilterChip';

function formatDateToLongStyle(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

const approvalLevelLabel = (value) => {
  if (value === 'PRESIDENT_AND_CEO') return 'President & CEO';
  if (value === 'VP_AND_CCTO') return 'VP & CCTO';
  if (value === 'ESD_DIRECTOR') return 'ESD Director';
  if (value === 'DIRECTOR_CUSTOMER_ENGAGEMENT') return 'Director - Customer Engagement';
  return '—';
};

const companyTypeLabel = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value) === 0 ? 'Potential' : 'Existing';
};

/* ─── TextFilterPopup ─── */
function TextFilterPopup({ icon, label, placeholder, value, onChange, onApply, open, onClose }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value, open]);

  const apply = () => { onApply(draft); onClose(); };
  const clear  = () => { setDraft(''); onApply(''); onClose(); };

  if (!open) return null;
  return (
    <div className="absolute left-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[12px] font-semibold text-slate-700 tracking-wide">{label}</span>
      </div>
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E] text-slate-700"
        onKeyDown={(e) => e.key === 'Enter' && apply()}
      />
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        <button type="button" onClick={clear} className="flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50">Clear</button>
        <button type="button" onClick={apply} className="flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]">Apply</button>
      </div>
    </div>
  );
}

function ArchiveList({ archiveProjects = null, stats = null, filters = {} }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  }).format(today);

  const rows = archiveProjects?.data ?? [];

  // ── Filter state ──
  const [search,        setSearch]        = useState(filters.search         ?? '');
  const [statusFilter,  setStatusFilter]  = useState(filters.status         ?? '');
  const [typeFilter,    setTypeFilter]    = useState(filters.type           ?? '');
  const [perPage,       setPerPage]       = useState(filters.per_page       ?? 10);
  const [perPageInput,  setPerPageInput]  = useState(filters.per_page       ?? 10);
  const [preparedBy,    setPreparedBy]    = useState(filters.prepared_by    ?? '');
  const [dateFrom,      setDateFrom]      = useState(filters.date_from      ?? '');
  const [dateTo,        setDateTo]        = useState(filters.date_to        ?? '');
  const [approvalLevel, setApprovalLevel] = useState(filters.approval_level ?? '');

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
      status:         statusFilter,
      type:           typeFilter,
      per_page:       perPage,
      prepared_by:    preparedBy,
      date_from:      dateFrom,
      date_to:        dateTo,
      approval_level: approvalLevel,
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
  const handleStatusChange        = (val) => { setStatusFilter(val);  runQuery({ status: val }); };
  const handleTypeChange          = (val) => { setTypeFilter(val);    runQuery({ type: val }); };
  const handleApprovalLevelChange = (val) => { setApprovalLevel(val); runQuery({ approval_level: val }); };
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
    setStatusFilter('');
    setTypeFilter('');
    setPerPage(10);
    setPerPageInput(10);
    setPreparedBy('');
    setDateFrom('');
    setDateTo('');
    setApprovalLevel('');
    setSortBy('');
    setSortOrder('');
    setShowPreparedBy(false);
    router.get(ziggyRoute('sprf.archive'), {}, { preserveScroll: true, preserveState: true });
  };

  const hasActiveFilters = !!(
    search || statusFilter || typeFilter !== '' || dateFrom || dateTo ||
    preparedBy || approvalLevel || perPage !== 10 || sortBy
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
        <SortHeader label="SPRF #" sortKey="sprf_no" align="center"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <div className="text-center"><span className="font-mono text-xs flex justify-center items-center text-slate-500">{r.sprf_no ?? '—'}</span></div>,
    },
    {
      key: 'sub_category',
      header: (
        <SortHeader label="SUB CATEGORY" sortKey="sub_category" align="center"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <span className="font-medium flex justify-center items-center">{r.sub_category ?? '—'}</span>,
    },
    {
      key: 'company_name',
      header: (
        <SortHeader label="ACCOUNT" sortKey="company_name" align="center"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <div className="w-full flex justify-center font-medium items-center"><span>{r.company_name ?? '—'}</span></div>,
    },
    {
      key: 'account_manager',
      header: (
        <SortHeader label="ACCOUNT MANAGER" sortKey="account_manager" align="center"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <div className="w-full flex justify-center font-medium items-center"><span>{r.account_manager ?? '—'}</span></div>,
    },
    {
      key: 'type',
      header: (
        <SortHeader label="TYPE" sortKey="type" align="center"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <div className="w-full flex justify-center font-medium items-center"><span>{companyTypeLabel(r.type)}</span></div>,
    },
    {
      key: 'approval_level',
      header: (
        <SortHeader label="APPROVAL LEVEL" sortKey="approval_level" align="center"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => (
        <span className="font-medium text-blue-700 flex justify-center items-center text-center text-[11px] xl:text-xs">
          {approvalLevelLabel(r.approval_level)}
        </span>
      ),
    },
    {
      key: 'status',
      header: (
        <SortHeader label="STATUS" sortKey="status" align="center"
          sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (row) => {
        const s          = String(row.status ?? '').toLowerCase();
        const isRejected  = s === 'rejected';
        const isApproved  = s === 'approved';
        const isCancelled = s === 'cancelled';
        return (
          <div className="flex justify-center items-center">
            <div className={`flex items-center gap-1 whitespace-nowrap text-[9px] xl:text-[10px] font-medium px-1 py-0.5 rounded-xl
              ${isRejected ? 'bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20'
                : isApproved ? 'bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20'
                : isCancelled ? 'bg-red-600/10 text-red-600 border border-red-300'
                : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
              {isRejected ? <MdOutlineClose className="text-[11px] xl:text-[13px] flex-shrink-0" />
                : isApproved ? <MdCheck className="text-[11px] xl:text-[13px] flex-shrink-0" />
                : isCancelled ? <MdOutlineCancel className="text-[11px] xl:text-[13px] flex-shrink-0" />
                : <span className="w-[12px] h-[12px] xl:w-[14px] xl:h-[14px] rounded-full bg-blue-700/20 flex-shrink-0" />}
              <span className="truncate max-w-[75px] hover:whitespace-normal hover:max-w-full hover:cursor-pointer">{row.decided_by_name ?? '—'}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'decided_at',
      header: (
        <button type="button" onClick={() => handleSort('decided_at')}
          className="flex justify-center items-center w-full text-slate-500 gap-1">
          <FaRegClock className="text-sm" title="Decision Date" />
          <span className={`text-[11px] leading-none ${sortBy === 'decided_at' ? 'text-[#289800]' : 'text-slate-400'}`}>
            {sortBy === 'decided_at' ? (sortOrder === 'desc' ? '▼' : '▲') : '⇅'}
          </span>
        </button>
      ),
      cell: (r) => (
        <div className="w-full text-slate-600 flex justify-center items-center text-center">
          <span className="text-[10px] xl:text-[11px]">{r.decided_at_display ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
        <div className="flex justify-center items-center gap-2">
          <button
            className="px-1 py-1 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/3"
            onClick={() => router.visit(ziggyRoute('sprf.archive.show', r.id))}
          >
            <IoEyeOutline className="text-[17px]" />
          </button>
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

  /* ─── New Component-based Filter Toolbar ─── */
  const statusIcon =
    statusFilter === "approved"  ? <MdCheckCircle className="text-[#4FA34E] text-sm" /> :
    statusFilter === "rejected"  ? <MdCancel className="text-red-500 text-sm" /> :
    statusFilter === "cancelled" ? <MdOutlineCancel className="text-red-500 text-sm" /> :
    null;

  // Custom Approval Level Dropdown
  const approvalLevelSlot = (
    <div className="relative h-7 md:h-9 flex items-center flex-shrink-0">
      <MdVerifiedUser className="absolute left-1.5 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
      <select 
        value={approvalLevel} 
        onChange={(e) => handleApprovalLevelChange(e.target.value)}
        className="h-7 md:h-9 w-[90px] md:w-36 sm:w-44 pl-5 md:pl-8 pr-6 py-0 text-[11px] md:text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-0 focus:border-[#4FA34E] text-slate-700"
      >
        <option value="">All Levels</option>
        <option value="DIRECTOR_CUSTOMER_ENGAGEMENT">Director - Customer Engagement</option>
        <option value="ESD_DIRECTOR">ESD Director</option>
        <option value="VP_AND_CCTO">VP &amp; CCTO</option>
        <option value="PRESIDENT_AND_CEO">President &amp; CEO</option>
      </select>
    </div>
  );

  // Custom Prepared By Popup (Using MdPerson)
  // const preparedBySlot = (
  //   <div className="relative flex-shrink-0" ref={preparedByRef}>
  //     <FilterChip
  //       active={!!preparedBy}
  //       icon={<MdPerson size={15} />}
  //       label="Prepared By"
  //       value={preparedBy}
  //       onClick={() => setShowPreparedBy((p) => !p)}
  //       onClear={() => handlePreparedByApply("")}
  //     />
  //     <TextFilterPopup
  //       open={showPreparedBy}
  //       label="Prepared By"
  //       placeholder="e.g. Maria Santos"
  //       icon={<MdPerson size={14} className="text-[#4FA34E]" />}
  //       value={preparedBy}
  //       onChange={setPreparedBy}
  //       onApply={handlePreparedByApply}
  //       onClose={() => setShowPreparedBy(false)}
  //     />
  //   </div>
  // );

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
      statusIcon={statusIcon}
      
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
      
      extraFilters={approvalLevelSlot}
      // extraFiltersEnd={preparedBySlot}
      
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
            decided by <span className="text-slate-700 font-semibold">{r.decided_by_name ?? '—'}</span>
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