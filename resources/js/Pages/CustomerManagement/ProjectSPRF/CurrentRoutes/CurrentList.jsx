import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router, Head } from '@inertiajs/react';
import { route as ziggyRoute } from 'ziggy-js';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';
import SearchControl from '@/Components/roi/filters/SearchControl';
import SortHeader from '@/Components/SortHeader';
import { FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
};

const approvalLevelLabel = (value) => {
  if (value === 'PRESIDENT_AND_CEO') return 'President & CEO';
  if (value === 'VP_AND_CCTO') return 'VP & CCTO';
  return 'Director - Enterprise Solutions';
};

function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric',
  });
}

const LS = {
  get: (key, fallback = "") => {
    try { return localStorage.getItem(`sprf_current_filter_${key}`) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(`sprf_current_filter_${key}`, value); }
    catch {}
  },
  clearAll: () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sprf_current_filter_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  },
};

function CurrentList({ currentProjects: initialCurrentProjects, stats: initialStats, filters = {} }) {
  const [localCurrentProjects, setLocalCurrentProjects] = useState(initialCurrentProjects);
  const [localStats, setLocalStats] = useState(initialStats);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(today);

  const [search,         setSearch]         = useState(() => LS.get('search',         filters?.search         ?? ""));
  const [statusFilter,   setStatusFilter]   = useState(() => LS.get('status',         filters?.status         ?? ""));
  const [typeFilter,     setTypeFilter]     = useState(() => LS.get('type',           filters?.type           ?? ""));
  const [dateFrom,       setDateFrom]       = useState(() => LS.get('date_from',      filters?.date_from      ?? ""));
  const [dateTo,         setDateTo]         = useState(() => LS.get('date_to',        filters?.date_to        ?? ""));
  const [preparedBy,     setPreparedBy]     = useState(() => LS.get('prepared_by',    filters?.prepared_by    ?? ""));
  const [approvalLevel,  setApprovalLevel]  = useState(() => LS.get('approval_level', filters?.approval_level ?? ""));

  const [perPage, setPerPage] = useState(() => {
    const stored = LS.get('per_page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : (filters?.per_page ?? 10);
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const stored = LS.get('page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  });
  const [perPageInput, setPerPageInput] = useState(() => {
    const stored = LS.get('per_page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? String(parsed) : String(filters?.per_page ?? 10);
  });

  const [sortBy,    setSortBy]    = useState(() => LS.get('sort_by',    filters?.sort_by    ?? ""));
  const [sortOrder, setSortOrder] = useState(() => LS.get('sort_order', filters?.sort_order ?? ""));

  const [loading,      setLoading]      = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persist filters
  useEffect(() => {
    LS.set('search',         search);
    LS.set('status',         statusFilter);
    LS.set('type',           String(typeFilter));
    LS.set('date_from',      dateFrom);
    LS.set('date_to',        dateTo);
    LS.set('prepared_by',    preparedBy);
    LS.set('approval_level', approvalLevel);
    LS.set('per_page',       String(perPage));
    LS.set('page',           String(currentPage));
    LS.set('sort_by',        sortBy);
    LS.set('sort_order',     sortOrder);
  }, [search, statusFilter, typeFilter, dateFrom, dateTo, preparedBy, approvalLevel, perPage, currentPage, sortBy, sortOrder]);

  useEffect(() => {
    setLocalCurrentProjects(initialCurrentProjects);
    setLocalStats(initialStats);
  }, [initialCurrentProjects, initialStats]);

  // ── Fetch ──
  const fetchCurrentData = async ({
    silent               = false,
    targetPage           = currentPage,
    currentSearch        = search,
    currentStatus        = statusFilter,
    currentType          = typeFilter,
    currentPerPage       = perPage,
    currentDateFrom      = dateFrom,
    currentDateTo        = dateTo,
    currentPreparedBy    = preparedBy,
    currentApprovalLevel = approvalLevel,
    currentSortBy        = sortBy,
    currentSortOrder     = sortOrder,
  } = {}) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const response = await axios.get(ziggyRoute('sprf.current'), {
        params: {
          page:            targetPage,
          search:          currentSearch        || undefined,
          status:          currentStatus        || undefined,
          per_page:        currentPerPage,
          date_from:       currentDateFrom      || undefined,
          date_to:         currentDateTo        || undefined,
          prepared_by:     currentPreparedBy    || undefined,
          approval_level:  currentApprovalLevel || undefined,
          sort_by:         currentSortBy        || undefined,
          sort_order:      currentSortOrder     || undefined,
          type:            currentType !== "" ? currentType : undefined,
        },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
        },
      });

      const projectsPayload = response.data?.props?.currentProjects ?? response.data?.currentProjects ?? response.data;
      setLocalCurrentProjects(projectsPayload);
      setCurrentPage(targetPage);

      const statsPayload = response.data?.props?.stats ?? response.data?.stats ?? null;
      if (statsPayload) setLocalStats(statsPayload);
    } catch (error) {
      console.error('Failed to fetch SPRF current projects:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchCurrentDataRef = useRef(null);
  useEffect(() => {
    fetchCurrentDataRef.current = fetchCurrentData;
  });

  // Auto-refresh every 60 seconds (silent)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentDataRef.current?.({ silent: true });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchCurrentData({ targetPage: 1 }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Sort handler ──
  const handleSort = (key) => {
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(key);
    setSortOrder(newOrder);
    fetchCurrentData({ currentSortBy: key, currentSortOrder: newOrder, targetPage: 1 });
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    fetchCurrentData({ currentStatus: val, targetPage: 1 });
  };

  const handleTypeChange = (val) => {
    setTypeFilter(val);
    fetchCurrentData({ currentType: val, targetPage: 1 });
  };

  const handleApprovalLevelChange = (val) => {
    setApprovalLevel(val);
    fetchCurrentData({ currentApprovalLevel: val, targetPage: 1 });
  };

  const handlePreparedByApply = (val) => {
    setPreparedBy(val);
    fetchCurrentData({ currentPreparedBy: val, targetPage: 1 });
  };

  const handleDateApply = () => {
    fetchCurrentData({ targetPage: 1 });
  };

  const handleDateClear = () => {
    setDateFrom('');
    setDateTo('');
    fetchCurrentData({ currentDateFrom: undefined, currentDateTo: undefined, targetPage: 1 });
  };

  const handlePerPageInputApply = () => {
    const raw = parseInt(perPageInput, 10);
    const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 500) : perPage;
    setPerPage(num);
    setPerPageInput(String(num));
    fetchCurrentData({ currentPerPage: num, targetPage: 1 });
  };

  const handleClearAllFilters = () => {
    LS.clearAll();
    LS.set('per_page', "10");

    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setPreparedBy("");
    setApprovalLevel("");
    setPerPage(10);
    setPerPageInput("10");
    setSortBy("");
    setSortOrder("");

    axios.get(ziggyRoute('sprf.current'), {
      params: { page: 1, per_page: 10 },
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
      },
    }).then((response) => {
      const projectsPayload = response.data?.props?.currentProjects ?? response.data?.currentProjects ?? response.data;
      setLocalCurrentProjects(projectsPayload);
      setCurrentPage(1);
      const statsPayload = response.data?.props?.stats ?? response.data?.stats ?? null;
      if (statsPayload) setLocalStats(statsPayload);
    }).catch((error) => {
      console.error('Failed to fetch SPRF current projects:', error);
    });
  };

  const goToPage = (p) => fetchCurrentData({ targetPage: p });

  const hasActiveFilters = !!(
    search || statusFilter || typeFilter !== "" || dateFrom || dateTo ||
    preparedBy || approvalLevel || perPage !== 10 ||
    sortBy !== "" || sortOrder !== ""
  );

  const tiles = useMemo(() => {
    const totalCurrentProjects = localStats?.totalCurrentProjects ?? localCurrentProjects?.total ?? 0;
    const recentlyAddedToday = localStats?.recentlyAddedToday ?? '0 Today';
    return [
      { label: 'Total Currents', value: totalCurrentProjects, icon: <FaFolderOpen />, variant: 'normal' },
      { label: 'Recently Added', value: recentlyAddedToday, icon: <IoTimeOutline />, variant: 'normal' },
    ];
  }, [localStats, localCurrentProjects]);

  const columns = useMemo(
    () => [
      {
        key: 'prepared_by',
        header: (
          <SortHeader
            label="PREPARED BY"
            sortKey="prepared_by"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (r) => <span className="text-[#195c00] font-semibold">{r.prepared_by ?? '—'}</span>,
      },
      {
        key: 'sprf_no',
        header: (
          <SortHeader
            label="SPRF #"
            sortKey="sprf_no"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (r) =>
          <div className=""><span className="font-medium">{r.sprf_no ?? '—'}</span></div> ,
      },
      {
        key: 'sub_category',
        header: (
          <SortHeader
            label="SUB CATEGORY"
            sortKey="sub_category"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (r) => <span className="font-medium flex items-center">{r.sub_category ?? '—'}</span>,
      },
      {
        key: 'company_name',
        header: (
          <SortHeader
            label="ACCOUNT"
            sortKey="company_name"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (r) => <div className="w-full flex font-medium items-center"><span>{r.company_name ?? '—'}</span></div>,
      },
      {
        key: 'account_manager',
        header: (
          <SortHeader
            label="ACCOUNT MANAGER"
            sortKey="account_manager"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (r) => <div className="w-full flex font-medium items-center"><span>{r.account_manager ?? '—'}</span></div>,
      },
      {
        key: 'type',
        header: (
          <SortHeader
            label="TYPE"
            sortKey="type"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (r) => (
          <span className={`font-medium flex items-center ${r.type === 1 ? "text-[#289800]" : "text-gray-500"}`}>
            {r.type === 1 ? "Existing" : r.type === 0 ? "Potential" : "—"}
          </span>
        ),
      },
      {
        key: 'approval_level',
        header: (
          <SortHeader
            label="APPROVAL LEVEL"
            sortKey="approval_level"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
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
          <SortHeader
            label="STATUS"
            sortKey="status"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (row) => {
          const isSentBack = Boolean(row.status_display_suffix);
          const mainLabel = row.status_display_main ?? row.status ?? '—';
          const isForReview = mainLabel === 'For Review';
          const isReceivingApprover = isSentBack && isForReview;

          const colorClasses = isReceivingApprover
            ? { badge: 'bg-orange-100 text-orange-700 border-orange-200', suffix: 'text-orange-500', by: 'text-orange-700' }
            : isForReview
              ? { badge: 'bg-purple-100 text-purple-700 border-purple-200', suffix: 'text-purple-500', by: 'text-purple-700' }
              : { badge: 'bg-blue-100 text-blue-700 border-blue-200', suffix: 'text-blue-500', by: 'text-blue-700' };

          return (
              <div className="flex flex-col items-start leading-tight">
                <span className={`inline-block px-2 py-1 text-center rounded-2xl lg:rounded-full text-[8px] xl:text-[9px] font-bold tracking-wider border ${colorClasses.badge}`}>
                  <span className="uppercase">
                    {mainLabel}
                    <span className={`font-normal text-[10px] normal-case italic ${colorClasses.suffix}`}>{row.status_display_suffix}</span>
                  </span>
                </span>
                <span className={`mt-1 text-[10px] italic ${colorClasses.by}`}>by: {row.current_approver ?? '—'}</span>
              </div>
          );
        },
      },
      {
        key: 'submitted_at',
        header: (
          <SortHeader
            label={<div className="flex items-center gap-1"><span>SUBMIT DATE</span></div>}
            sortKey="submitted_at"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (r) => (
          <div className="w-full text-slate-600 flex items-center">
            <span className="text-[10px] xl:text-[11px]">{formatDateTime(r.submitted_at)}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) => (
          <div className="flex justify-center items-center gap-2">
            <button
              className="px-1 py-1 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold"
              onClick={() => router.visit(ziggyRoute('sprf.current.show', r.id))}
            >
              <IoEyeOutline className="text-[17px]" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortOrder]
  );

  const rows = localCurrentProjects?.data ?? [];
  const pagination = localCurrentProjects && typeof localCurrentProjects.current_page === 'number'
    ? {
        page: localCurrentProjects.current_page,
        perPage: localCurrentProjects.per_page ?? perPage,
        total: localCurrentProjects.total ?? rows.length,
        onPageChange: goToPage,
      }
    : null;

  // --- Mobile card layout (below md) ---
  const renderCurrentCard = (r) => {
    const isSentBack = Boolean(r.status_display_suffix);
    const mainLabel = r.status_display_main ?? r.status ?? '—';
    const isForReview = mainLabel === 'For Review';
    const isReceivingApprover = isSentBack && isForReview;

    const badgeClass = isReceivingApprover
      ? 'bg-orange-100 text-orange-700 border-orange-200'
      : isForReview
        ? 'bg-purple-100 text-purple-700 border-purple-200'
        : 'bg-blue-100 text-blue-700 border-blue-200';

    return (
      <div
        onClick={() => router.visit(ziggyRoute('sprf.current.show', r.id))}
        className="cursor-pointer px-2 py-3"
      >
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[11px] font-medium ${r.type === 1 ? 'text-[#289800]' : 'text-gray-500'}`}>
            {r.type === 1 ? 'Existing' : r.type === 0 ? 'Potential' : '—'}
          </p>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border whitespace-nowrap ${badgeClass}`}>
              {mainLabel}
            </span>
            <span className="text-[10px] text-blue-700 italic">by: {r.current_approver ?? '—'}</span>
          </div>
        </div>

        <div className="min-w-0 leading-relaxed pt-1">
          <p className="text-[11px] font-medium">{r.sprf_no ?? '—'}</p>
          <p className="text-sm font-semibold truncate">{r.company_name ?? '—'}</p>
          <p className="text-[11px] text-slate-800 font-semibold">{r.sub_category ?? '—'} · {r.account_manager ?? '—'}</p>
        </div>

        <div className="mt-5 pb-1.5 text-[11px] uppercase font-medium text-zinc-700">
          <span>{approvalLevelLabel(r.approval_level)}</span>
        </div>

        <p className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="normal-case text-[10px] text-slate-500 italic">
            prepared by <span className="text-[#195c00] font-semibold">{r.prepared_by ?? '—'}</span>
          </span>
          <span className="normal-case text-[10px] text-slate-500">{formatDateTime(r.submitted_at)}</span>
        </p>
      </div>
    );
  };

  const searchControl = (
    <SearchControl
      search={search}
      onSearchChange={setSearch}
      sortOrder={sortOrder}
      onSortToggle={() => handleSort(sortBy || 'submitted_at')}
      loading={loading}
      isRefreshing={isRefreshing}
      onRefresh={() => fetchCurrentData({ targetPage: localCurrentProjects?.current_page ?? 1 })}
    />
  );

  const filterToolbar = (
    <ListFilterToolbar
      hasActiveFilters={hasActiveFilters}
      onClearAll={handleClearAllFilters}

      statusOptions={[
        { value: "",              label: "All Status" },
        { value: "for_review",    label: "For Review" },
        { value: "under_review",  label: "Under Review" },
      ]}
      statusFilter={statusFilter}
      onStatusChange={handleStatusChange}

      typeOptions={[
        { value: "", label: "All Types" },
        { value: 1,  label: "Existing" },
        { value: 0,  label: "Potential" },
      ]}
      typeFilter={typeFilter}
      onTypeChange={handleTypeChange}

      perPage={perPage}
      perPageInput={perPageInput}
      onPerPageInputChange={setPerPageInput}
      onPerPageApply={handlePerPageInputApply}

      preparedBy={preparedBy}
      onPreparedByChange={setPreparedBy}
      onPreparedByApply={handlePreparedByApply}

      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      onDateApply={handleDateApply}
      onDateClear={handleDateClear}
    />
  );

  return (
    <>
      {/* PAGE NAVIGATION TABS (Mobile Only) */}
      <div className="sticky top-0 z-30 px-4 py-1.5 pb-2 sm:hidden">
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
            className="flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800] border border-[#B5EBA2]/60"
          >
            Current
          </button>
                  
          <button
            type="button"
            onClick={() => router.visit(route('sprf.archive'))}
            className="flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            Archive
          </button>              
        </div>
      </div>   
      
      <Head title="SPRF Current" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">

          <div className="px-4 sm:px-6 lg:px-10 pt-2 md:pt-8 pb-3 flex justify-between items-end">
            <div className="flex items-baseline gap-1">
              <h1 className="font-semibold text-[13px] sm:text-sm text-slate-500">Project SPRF Approval</h1>
              <p className="text-slate-400 hidden sm:block">/</p>
              <p className="text-2xl sm:text-3xl font-semibold text-slate-900 hidden sm:block">Current</p>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-[10px] md:text-xs text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          <ProjectListSection
            tiles={tiles}
            tableTitle="Current Projects"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={pagination}
            searchControl={searchControl}
            filterControl={filterToolbar}
            loading={loading}
            emptyText="No matching records found."
            renderCard={renderCurrentCard}
          />
        </div>
      </div>
    </>
  );
}

export default CurrentList;
CurrentList.layout = page => <AuthenticatedLayout children={page} />;