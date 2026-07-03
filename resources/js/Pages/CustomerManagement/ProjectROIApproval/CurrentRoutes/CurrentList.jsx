import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Head, router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import FilterChip from '@/Components/roi/filters/FilterChip';
import FilterToolbar from '@/Components/roi/filters/FilterToolbar';
import TextFilterPopup from '@/Components/roi/filters/TextFilterPopup';
import LocationFilterPopup from '@/Components/roi/filters/LocationFilterPopup';
import { FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import {
  MdSearch, MdOutlineFilterAlt, MdDateRange, MdClose, MdExpandMore,
  MdPerson, MdLocationOn,
} from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchControl from '@/Components/roi/filters/SearchControl';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';
import SortHeader from '@/Components/roi/filters/SortHeader';

function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric',
  });
}

function formatLastSavedDate(dateValue) {
  if (!dateValue) return null;
  const savedDate = new Date(dateValue);
  if (isNaN(savedDate.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const targetDate = new Date(savedDate);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  if (diffDays >= 1) {
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const yy = String(targetDate.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }
  return savedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const LS = {
  get: (key, fallback = "") => {
    try { return localStorage.getItem(`current_filter_${key}`) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(`current_filter_${key}`, value); }
    catch {}
  },
  clearAll: () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('current_filter_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  },
};



function CurrentList({ currentProjects: initialCurrentProjects, stats: initialStats, filters, locations = [] }) {
  const [localCurrentProjects, setLocalCurrentProjects] = useState(initialCurrentProjects);
  const [localStats, setLocalStats] = useState(initialStats);

  const [search,       setSearch]       = useState(() => LS.get('search',      filters?.search      ?? ""));
  const [statusFilter, setStatusFilter] = useState(() => LS.get('status',      filters?.status      ?? ""));
  const [typeFilter,   setTypeFilter]   = useState(() => LS.get('type',        filters?.type        ?? ""));
  const [dateFrom,     setDateFrom]     = useState(() => LS.get('date_from',   filters?.date_from   ?? ""));
  const [dateTo,       setDateTo]       = useState(() => LS.get('date_to',     filters?.date_to     ?? ""));
  const [preparedBy,   setPreparedBy]   = useState(() => LS.get('prepared_by', filters?.prepared_by ?? ""));
  const [locationId,   setLocationId]   = useState(() => LS.get('location_id', filters?.location_id ?? ""));
  const [perPage,      setPerPage]      = useState(() => {
    const stored = LS.get('per_page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : (filters?.per_page ?? 10);
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const stored = LS.get('page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  });

  // ── Sort state ──
const [sortBy,    setSortBy]    = useState(() => LS.get('sort_by',    filters?.sort_by    ?? ""));
const [sortOrder, setSortOrder] = useState(() => LS.get('sort_order', filters?.sort_order ?? ""));

  const [perPageInput, setPerPageInput] = useState(() => {
    const stored = LS.get('per_page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? String(parsed) : String(filters?.per_page ?? 10);
  });

  const [showDatePicker,    setShowDatePicker]    = useState(false);
  const [showPerPagePicker, setShowPerPagePicker] = useState(false);
  const [showPreparedBy,    setShowPreparedBy]    = useState(false);
  const [showLocation,      setShowLocation]      = useState(false);

  const [loading,      setLoading]      = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const datePickerRef    = useRef(null);
  const perPagePickerRef = useRef(null);
  const preparedByRef    = useRef(null);
  const locationRef      = useRef(null);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  }).format(today);

  // Persist filters
  useEffect(() => {
    LS.set('search',      search);
    LS.set('status',      statusFilter);
    LS.set('type',        String(typeFilter));
    LS.set('date_from',   dateFrom);
    LS.set('date_to',     dateTo);
    LS.set('prepared_by', preparedBy);
    LS.set('location_id', String(locationId));
    LS.set('per_page',    String(perPage));
    LS.set('page',        String(currentPage));
    LS.set('sort_by',     sortBy);
    LS.set('sort_order',  sortOrder);
  }, [search, statusFilter, typeFilter, dateFrom, dateTo, preparedBy, locationId, perPage, currentPage, sortBy, sortOrder]);

  useEffect(() => {
    setLocalCurrentProjects(initialCurrentProjects);
    setLocalStats(initialStats);
  }, [initialCurrentProjects, initialStats]);

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current    && !datePickerRef.current.contains(e.target))    setShowDatePicker(false);
      if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target)) setShowPerPagePicker(false);
      if (preparedByRef.current    && !preparedByRef.current.contains(e.target))    setShowPreparedBy(false);
      if (locationRef.current      && !locationRef.current.contains(e.target))      setShowLocation(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchCurrentDataRef = useRef(null);
  useEffect(() => {
    fetchCurrentDataRef.current = fetchCurrentData;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentDataRef.current?.({ silent: true });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Sort handler ──
  const handleSort = (key) => {
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(key);
    setSortOrder(newOrder);
    LS.set('sort_by',    key);
    LS.set('sort_order', newOrder);
    fetchCurrentData({ currentSortBy: key, currentSortOrder: newOrder });
  };

  const selectedLocationName = useMemo(() =>
    locationId ? (locations.find((l) => String(l.id) === String(locationId))?.name ?? "") : ""
  , [locationId, locations]);

  const hasActiveFilters = !!(
    search || statusFilter || typeFilter !== "" || dateFrom || dateTo ||
    preparedBy || locationId || perPage !== 10 ||
    sortBy !== "" || sortOrder !== ""   // ← include sort
  );

  const tiles = useMemo(() => {
    const totalCurrentProjects = localStats?.totalCurrentProjects ?? localCurrentProjects?.total ?? 0;
    const recentlyAddedToday   = localStats?.recentlyAddedToday ?? "—";
    return [
      { label: "Total Currents", value: totalCurrentProjects, icon: <FaFolderOpen />,  variant: "normal" },
      { label: "Recently Added", value: recentlyAddedToday,   icon: <IoTimeOutline />, variant: "normal" },
    ];
  }, [localStats, localCurrentProjects]);

  // ── Columns with SortHeader ──
  const columns = useMemo(() => [
    {
      key: "Created by",
      header: (
        <SortHeader
          label="PREPARED BY"
          sortKey="prepared_by_name"
          sortBy={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
        />
      ),
      cell: (r) => <span className="text-[#195c00] font-semibold">{r.user?.name ?? "—"}</span>,
    },
    {
      key: "reference",
      header: (
        <SortHeader
          label="REFERENCE"
          sortKey="reference"
          sortBy={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          align="center"
        />
      ),
      cell: (r) => <span className="font-medium flex justify-center items-center">{r.reference ?? "—"}</span>,
    },
    {
      key: "company_sap_code",
      header: (
        <SortHeader
          label="SAP CODE"
          sortKey="company_sap_code"
          sortBy={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          align="center"
        />
      ),
      cell: (r) => (
        <span className="font-mono text-xs text-[#33721c] flex justify-center items-center">
          {r.company_sap_code ?? "—"}
        </span>
      ),
    },
    {
      key: "company_name",
      header: (
        <SortHeader
          label="COMPANY NAME"
          sortKey="company_name"
          sortBy={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          align="center"
        />
      ),
      cell: (r) => (
        <div className="flex justify-center items-center w-full h-full">
          <span className="font-medium text-center block truncate max-w-[150px] hover:max-w-max hover:whitespace-normal cursor-pointer transition-all duration-200">
            {r.company_name ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "contract_years",
      header: (
        <SortHeader
          label="CONTRACT TERM"
          sortKey="contract_years"
          sortBy={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          align="center"
        />
      ),
      cell: (r) => (
        <span className="font-medium flex justify-center items-center">
          {r.contract_years != null ? `${r.contract_years}` : "—"}
        </span>
      ),
    },
    {
      key: "contract_type",
      header: (
        <SortHeader
          label="CONTRACT TYPE"
          sortKey="contract_type"
          sortBy={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          align="center"
        />
      ),
      cell: (r) => <span className="font-medium flex justify-center items-center">{r.contract_type ?? "—"}</span>,
    },
    {
      key: "type",
      header: (
        <SortHeader
          label="TYPE"
          sortKey="type"
          sortBy={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          align="center"
        />
      ),
      cell: (r) => (
        <span className={`font-medium flex justify-center items-center ${r.type === 1 ? "text-[#289800]" : "text-gray-500"}`}>
          {r.type === 1 ? "Existing" : "Potential"}
        </span>
      ),
    },
    {
      key: "status",
      header: (
        <SortHeader
          label="STATUS"
          sortKey="status"
          sortBy={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          align="center"
        />
      ),
      cell: (row) => (
        <div className="w-full flex justify-center items-center">
          <div className="flex flex-col items-center leading-tight">
            <span className="inline-block px-1 xl:px-2 py-1 text-center rounded-full text-[8px] xl:text-[9px] font-bold tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
              <span className="uppercase">{row.status_display_main ?? row.status}</span>
              {row.status_display_suffix && (
                <span className="font-normal text-[10px] text-gray-500">{row.status_display_suffix}</span>
              )}
            </span>
            <span className="mt-1 text-[10px] text-center italic text-blue-700">
              by: {row.status_assignee_name ?? "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "last_saved_at",
      header: (
        // Clock icon style matching ArchiveList's decided_at column
        <button
          type="button"
          onClick={() => handleSort('last_saved_at')}
          className="flex justify-center items-center w-full text-slate-500 gap-1"
        >
          <FaRegClock className="text-sm" title="Last Saved" />
          <span className={`text-[11px] leading-none ${
            sortBy === 'last_saved_at' ? 'text-[#289800]' : 'text-slate-400'
          }`}>
            {sortBy === 'last_saved_at' ? (sortOrder === 'desc' ? '▼' : '▲') : '⇅'}
          </span>
        </button>
      ),
      cell: (r) => {
        const displayVal = r.last_saved_display ?? r.last_saved_at;
        const timeDiff = new Date().getTime() - new Date(r.last_saved_at).getTime();
        const sevenDaysMs = 7 * 24 * 3600 * 1000;
        const isPastOneWeek = displayVal && (
          String(displayVal).includes('week') ||
          String(displayVal).includes('weeks') ||
          (String(displayVal).includes('day') && parseInt(displayVal) > 6) ||
          timeDiff >= sevenDaysMs
        );
        let formattedDate = "—";
        if (isPastOneWeek) {
          const d = new Date(r.last_saved_at);
          if (!isNaN(d.getTime())) {
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const yy = String(d.getFullYear()).slice(-2);
            formattedDate = `${mm}/${dd}/${yy}`;
          } else {
            formattedDate = displayVal;
          }
        } else {
          formattedDate = displayVal;
        }
        return (
          <span className="text-slate-600 text-[11px] xl:text-xs flex justify-center items-center">
            {formattedDate}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
        <div className="flex justify-center items-center gap-2">
          <button
            className="px-1.5 py-1 flex items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] border border-[#B5EBA2]/40 font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/30"
            onClick={() => router.visit(route("roi.current.show", r.id))}
          >
            <IoEyeOutline className="text-[18px]" />
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sortBy, sortOrder]);

  /* ── Fetch ── */
  const fetchCurrentData = async ({
    silent            = false,
    targetPage        = currentPage,
    currentSearch     = search,
    currentStatus     = statusFilter,
    currentType       = typeFilter,
    currentPerPage    = perPage,
    currentDateFrom   = dateFrom,
    currentDateTo     = dateTo,
    currentPreparedBy = preparedBy,
    currentLocationId = locationId,
    currentSortBy     = "",      // ← was hardcoded "last_saved_at"
    currentSortOrder  = "",
  } = {}) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const response = await axios.get(route("roi.current"), {
        params: {
          page:        targetPage,
          search:      currentSearch     || undefined,
          status:      currentStatus     || undefined,
          per_page:    currentPerPage,
          date_from:   currentDateFrom   || undefined,
          date_to:     currentDateTo     || undefined,
          prepared_by: currentPreparedBy || undefined,
          location_id: currentLocationId || undefined,
          sort_by:     currentSortBy     || undefined,  // ← dynamic
          sort_order:  currentSortOrder  || undefined,
          type:        currentType !== "" ? currentType : undefined,
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
      console.error("Failed to fetch current projects:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchCurrentData({ targetPage: 1 }), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleStatusChange    = (val) => { setStatusFilter(val); fetchCurrentData({ currentStatus: val,     targetPage: 1 }); };
  const handleTypeChange      = (val) => { setTypeFilter(val);   fetchCurrentData({ currentType: val,       targetPage: 1 }); };
  const handlePreparedByApply = (val) => { setPreparedBy(val);   fetchCurrentData({ currentPreparedBy: val, targetPage: 1 }); };
  const handleLocationApply   = (val) => { setLocationId(val);   fetchCurrentData({ currentLocationId: val, targetPage: 1 }); };
  const handleDateApply       = ()    => { setShowDatePicker(false); fetchCurrentData({ targetPage: 1 }); };
  const handleDateClear       = ()    => {
    setDateFrom("");
    setDateTo("");
    setShowDatePicker(false);
    fetchCurrentData({ currentDateFrom: undefined, currentDateTo: undefined, targetPage: 1 });
  };
  const handlePerPageInputApply = () => {
    const raw = parseInt(perPageInput, 10);
    const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 500) : perPage;
    setPerPage(num); setPerPageInput(String(num)); setShowPerPagePicker(false);
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
  setLocationId("");
  setPerPage(10);
  setPerPageInput("10");
  setSortBy("");
  setSortOrder("");
  setShowDatePicker(false);
  setShowPreparedBy(false);
  setShowLocation(false);

  // Call axios directly instead of fetchCurrentData
  // so we're not at the mercy of stale state
  axios.get(route("roi.current"), {
    params: {
      page:     1,
      per_page: 10,
      // intentionally omit sort_by and sort_order entirely
    },
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
    console.error("Failed to fetch current projects:", error);
  });
};

  const goToPage = (p) => fetchCurrentData({ targetPage: p });

  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo)   return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  const rows = localCurrentProjects?.data ?? [];
  const pagination = localCurrentProjects && typeof localCurrentProjects.current_page === "number"
    ? {
        page:         localCurrentProjects.current_page,
        perPage:      localCurrentProjects.per_page ?? perPage,
        total:        localCurrentProjects.total ?? rows.length,
        onPageChange: goToPage,
      }
    : null;

  // ── Sort badge (same as ArchiveList) ──
  const activeSortLabel = {
    prepared_by_name: 'Prepared By',
    reference:        'Reference',
    company_sap_code: 'SAP Code',
    company_name:     'Company',
    contract_years:   'Contract Term',
    contract_type:    'Contract Type',
    type:             'Existing/Potential',
    status:           'Status',
    last_saved_at:    'Last Saved',
  }[sortBy] ?? 'Last Saved';

  const isDefaultSort = sortBy === 'last_saved_at' && sortOrder === 'desc';

  const clearSort = () => {
    setSortBy("last_saved_at");
    setSortOrder("desc");
    LS.set('sort_by',    "last_saved_at");
    LS.set('sort_order', "desc");
    fetchCurrentData({ currentSortBy: "last_saved_at", currentSortOrder: "desc" });
  };

  // --- Mobile card layout (below md) ---
  const renderCurrentCard = (r) => (
    <div
      onClick={() => router.visit(route("roi.current.show", r.id))}
      className="cursor-pointer px-2 py-3"
    >
      <div className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs ${r.type === 1 ? "text-[#289800]" : "text-gray-500"}`}>{r.type === 1 ? 'Existing' : 'Potential'}</p>
          <div className="shrink-0 flex flex-col items-end gap-1 justify-end">
            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">
              {r.status_display_main ?? r.status}
            </span>
            <span className="text-[10px] text-blue-700 italic">by: {r.status_assignee_name ?? '—'}</span>
          </div>
        </div>

        <div className="min-w-0 leading-relaxed pt-1">     
            <p className="text-xs font-medium">{r.reference ?? '—'}</p>
            <p className="text-sm font-semibold truncate">{r.company_name ?? '—'}</p>
            <p className="text-[11px] text-slate-800 font-semibold font-mono">{r.company_sap_code ?? '—'}</p>
        </div>
      </div>

      <div className="mt-5 pb-1.5 text-[11px] uppercase font-medium text-zinc-700">
        <span>{r.contract_type ?? '—'}</span>
      </div>
      
      <p className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Prepared by <span className="text-[#195c00] font-semibold">{r.user?.name ?? '—'}</span></span>
        <span>{r.last_saved_display ?? '—'}</span>
      </p>
    </div>
  );

  const searchControl = (
    <div className="flex items-center gap-2">
      <SearchControl
        search={search}
        onSearchChange={setSearch}
        sortOrder={sortOrder}
        onSortToggle={() => handleSort(sortBy || 'last_saved_at')}
        loading={loading}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchCurrentData({ targetPage: localCurrentProjects?.current_page ?? 1 })}
      />
     
    </div>
  );

  const filterToolbar = (
    <ListFilterToolbar
      hasActiveFilters={hasActiveFilters}
      onClearAll={handleClearAllFilters}

      statusOptions={[
        { value: "",                  label: "All Status" },
        { value: "for_review",        label: "For Review" },
        { value: "for_checking",      label: "For Checking" },
        { value: "for_endorsement",   label: "For Endorsement" },
        { value: "for_confirmation",  label: "For Confirmation" },
        { value: "for_approval",      label: "For Approval" },
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

      locationId={locationId}
      selectedLocationName={selectedLocationName}
      locations={locations}
      onLocationApply={handleLocationApply}

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
    <Head title="ROI Current" />
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-24">
        <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-3 flex justify-between items-end">
          <div className="flex items-baseline gap-1">
            <h1 className="font-semibold text-xs md:text-sm text-slate-500 hidden sm:block">Project ROI Approval</h1>
            <span className="text-slate-400 hidden sm:block">/</span>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900">Current</p>
          </div>
          <span className="text-[11px] md:text-xs text-slate-500">{formattedDate}</span>
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
CurrentList.layout = (page) => <AuthenticatedLayout children={page} />;