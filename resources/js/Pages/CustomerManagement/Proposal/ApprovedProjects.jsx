import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import FilterChip from '@/Components/roi/filters/FilterChip';
import LocationFilterPopup from '@/Components/roi/filters/LocationFilterPopup';
import TextFilterPopup from '@/Components/roi/filters/TextFilterPopup';
import { FaFileInvoice, FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import { MdVerifiedUser } from 'react-icons/md';
import { route as ziggyRoute } from 'ziggy-js';
import SearchControl from '@/Components/roi/filters/SearchControl';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';
import SortHeader from '@/Components/roi/filters/SortHeader';

function formatDateLabel(dateStr) {
  try {
    if (!dateStr) return "—";
    const datePart = dateStr.split(' ')[0];
    const [year, month, day] = datePart.split('-');
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: '2-digit', timeZone: 'UTC',
    });
  } catch {
    return "—";
  }
}

const LS = {
  get: (key, fallback = "") => {
    try { return localStorage.getItem(`approve_filter_${key}`) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(`approve_filter_${key}`, value); }
    catch {}
  },
  clearAll: () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('approve_filter_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  },
};

// ─── Tab switcher (ROI / SPRF) ───────────────────────────────────
function ProjectTypeTabs({ active, onChange, roiCount, sprfCount }) {
  const tabs = [
    { key: 'roi',  label: 'ROI Projects',  count: roiCount },
    { key: 'sprf', label: 'SPRF Projects', count: sprfCount },
  ];

  return (
    <div className="flex items-center ml-3 -mb-2 pt-5 gap-1  px-1">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "text-[#289800]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? "bg-[#E9F7E7] text-[#2DA300]" : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#289800] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ApproveProjects({
  roiProjects: initialRoiProjects,
  sprfProjects: initialSprfProjects,
  stats: initialStats,
  filters,
  locations = [],
}) {
  const [activeTab, setActiveTab] = useState(() => LS.get('active_tab', 'roi'));

  const [localRoiProjects,  setLocalRoiProjects]  = useState(initialRoiProjects);
  const [localSprfProjects, setLocalSprfProjects] = useState(initialSprfProjects);
  const [localStats,        setLocalStats]        = useState(initialStats);

  const [search,     setSearch]     = useState(() => LS.get('search',      filters?.search      ?? ""));
  const [typeFilter,  setTypeFilter] = useState(() => LS.get('type',       filters?.type        ?? ""));
  const [perPage,     setPerPage]    = useState(() => {
    const stored = LS.get('per_page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : (filters?.per_page ?? 10);
  });
  const [dateFrom,    setDateFrom]    = useState(() => LS.get('date_from',   filters?.date_from   ?? ""));
  const [dateTo,      setDateTo]      = useState(() => LS.get('date_to',     filters?.date_to     ?? ""));
  const [decidedBy,   setDecidedBy]   = useState(() => LS.get('decided_by',  filters?.decided_by  ?? ""));
  const [locationId,  setLocationId]  = useState(() => LS.get('location_id', filters?.location_id ?? ""));
  const [currentPage, setCurrentPage] = useState(() => {
    const stored = LS.get('page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  });

  const [showDatePicker,    setShowDatePicker]    = useState(false);
  const [showPerPagePicker, setShowPerPagePicker] = useState(false);
  const [showDecidedBy,     setShowDecidedBy]     = useState(false);
  const [showLocation,      setShowLocation]      = useState(false);

  const [perPageInput, setPerPageInput] = useState(() => {
    const stored = LS.get('per_page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? String(parsed) : String(filters?.per_page ?? 10);
  });
  const [loading,      setLoading]      = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const datePickerRef    = useRef(null);
  const perPagePickerRef = useRef(null);
  const decidedByRef     = useRef(null);
  const locationRef      = useRef(null);

  const [sortBy,    setSortBy]    = useState(() => LS.get('sort_by',    filters?.sort_by    ?? ""));
  const [sortOrder, setSortOrder] = useState(() => LS.get('sort_order', filters?.sort_order ?? ""));

  // Persist filters (incl. active tab) to localStorage whenever they change
  useEffect(() => {
    LS.set('search',      search);
    LS.set('type',        String(typeFilter));
    LS.set('date_from',   dateFrom);
    LS.set('date_to',     dateTo);
    LS.set('decided_by',  decidedBy);
    LS.set('location_id', String(locationId));
    LS.set('per_page',    String(perPage));
    LS.set('page',        String(currentPage));
    LS.set('sort_by',     sortBy);
    LS.set('sort_order',  sortOrder);
    LS.set('active_tab',  activeTab);
  }, [search, typeFilter, dateFrom, dateTo, decidedBy, locationId, perPage, currentPage, sortBy, sortOrder, activeTab]);

  useEffect(() => {
    setLocalRoiProjects(initialRoiProjects);
    setLocalSprfProjects(initialSprfProjects);
    setLocalStats(initialStats);
  }, [initialRoiProjects, initialSprfProjects, initialStats]);

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current    && !datePickerRef.current.contains(e.target))    setShowDatePicker(false);
      if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target)) setShowPerPagePicker(false);
      if (decidedByRef.current     && !decidedByRef.current.contains(e.target))     setShowDecidedBy(false);
      if (locationRef.current      && !locationRef.current.contains(e.target))      setShowLocation(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchApproveDataRef = useRef(null);
  useEffect(() => {
    fetchApproveDataRef.current = fetchApproveData;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      fetchApproveDataRef.current?.({ silent: true });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Switching tabs resets to page 1 for whichever list becomes active
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(key);
    setSortOrder(newOrder);
    LS.set('sort_by',    key);
    LS.set('sort_order', newOrder);
    fetchApproveData({ currentSortBy: key, currentSortOrder: newOrder });
  };

  const selectedLocationName = useMemo(() =>
    locationId ? (locations.find((l) => String(l.id) === String(locationId))?.name ?? "") : ""
  , [locationId, locations]);

  const hasActiveFilters = !!(search || typeFilter !== "" || dateFrom || dateTo || decidedBy || locationId || perPage !== 10 || sortBy !== "" || sortOrder !== "");

  const roiCount  = localStats?.totalRoiProjects  ?? localRoiProjects?.total  ?? 0;
  const sprfCount = localStats?.totalSprfProjects ?? localSprfProjects?.total ?? 0;

  const tiles = useMemo(() => {
    const totalArchiveProjects  = activeTab === 'sprf' ? sprfCount : roiCount;
    const recentlyArchivedToday = localStats?.recentlyArchivedToday ?? "—";
    return [
      { label: "Total Archives",    value: totalArchiveProjects,  icon: <FaFolderOpen />,  variant: "normal" },
      { label: "Recently Archived", value: recentlyArchivedToday, icon: <IoTimeOutline />, variant: "normal" },
    ];
  }, [localStats, activeTab, roiCount, sprfCount]);

  // ─── ROI columns (unchanged) ─────────────────────────────────
  const roiColumns = useMemo(() => [
    {
      key: "user_name",
      header: (
        <SortHeader label="PREPARED BY" sortKey="prepared_by_name" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <span className="text-[#289800] font-semibold">{r.user?.name ?? "—"}</span>,
    },
    {
      key: "reference",
      header: (
        <SortHeader label="REFERENCE" sortKey="reference" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="center" />
      ),
      cell: (r) => <span className="font-semibold flex justify-center items-center">{r.reference ?? "—"}</span>,
    },
    {
      key: "company_name",
      header: (
        <SortHeader label="COMPANY NAME" sortKey="company_name" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="center" />
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
        <SortHeader label="CONTRACT TERM" sortKey="contract_years" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="center" />
      ),
      cell: (r) => (
        <span className="font-medium flex justify-center items-center">
          {r.contract_years != null ? `${r.contract_years} Years` : "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: (
        <SortHeader label="TYPE" sortKey="type" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="center" />
      ),
      cell: (r) => (
        <span className={`font-medium flex justify-center items-center ${r.type === 1 ? "text-[#289800]" : "text-gray-500"}`}>
          {r.type === 1 ? "Existing" : "Potential"}
        </span>
      ),
    },
    {
      header: "STATUS",
      key: "status",
      cell: (row) => (
        <div className="flex justify-center items-center">
          <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20">
            {row.status ?? "APPROVED"}
          </span>
        </div>
      ),
    },
    {
      key: "approved_by_name",
      header: (
        <button type="button" onClick={() => handleSort('decided_at')} className="flex justify-center items-center w-full text-slate-500 gap-1">
          <span>APPROVED BY</span>
          <span className={`text-[11px] leading-none ${sortBy === 'decided_at' ? 'text-[#289800]' : 'text-slate-400'}`}>
            {sortBy === 'decided_at' ? (sortOrder === 'desc' ? '▼' : '▲') : '⇅'}
          </span>
        </button>
      ),
      cell: (r) => <span className="text-slate-800 flex justify-center items-center">{r.decided_by_name ?? "—"}</span>,
    },
{
  key: "decided_at",
  header: (
    <SortHeader
      label={<IoTimeOutline size={14} />}
      sortKey="decided_at"
      sortBy={sortBy}
      sortDirection={sortOrder}
      onSort={handleSort}
      align="center"
    />
  ),
  cell: (r) => (
    <span className="text-slate-600 flex justify-center items-center text-xs">
      {r.decided_at_display ?? "—"}
    </span>
  ),
},
    {
      key: "actions",
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
        <div className="flex justify-center items-center">
          <button
            className="px-3 py-1 flex flex-row justify-center gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
            type="button"
            onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id, type: 'roi' }))}
          >
            <FaFileInvoice className="text-[15px]" />
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sortBy, sortOrder]);

  // ─── SPRF columns ─────────────────────────────────────────────
  // NOTE: SprfArchiveProject doesn't have company_name or contract_years —
  // using sprf_no as the reference and company_sap_code in place of company name.
  const sprfColumns = useMemo(() => [
    {
      key: "preparer_name",
      header: (
        <SortHeader label="PREPARED BY" sortKey="prepared_by_name" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} />
      ),
      cell: (r) => <span className="text-[#289800] font-semibold">{r.preparer?.name ?? "—"}</span>,
    },
    {
      key: "sprf_no",
      header: (
        <SortHeader label="SPRF NO." sortKey="sprf_no" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="center" />
      ),
      cell: (r) => <span className="font-semibold flex justify-center items-center">{r.sprf_no ?? "—"}</span>,
    },
    {
      key: "company_sap_code",
      header: (
        <SortHeader label="COMPANY (SAP CODE)" sortKey="company_sap_code" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="center" />
      ),
      cell: (r) => (
        <div className="flex justify-center items-center w-full h-full">
          <span className="font-medium text-center block truncate max-w-[150px] hover:max-w-max hover:whitespace-normal cursor-pointer transition-all duration-200">
            {r.company_sap_code ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "account",
      header: (
        <SortHeader label="ACCOUNT" sortKey="account" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="center" />
      ),
      cell: (r) => <span className="font-medium flex justify-center items-center">{r.account ?? "—"}</span>,
    },
    {
      header: "STATUS",
      key: "status",
      cell: (row) => (
        <div className="flex justify-center items-center">
          <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20">
            {row.status ?? "APPROVED"}
          </span>
        </div>
      ),
    },
    {
      key: "approved_by_name",
      header: (
        <button type="button" onClick={() => handleSort('decided_at')} className="flex justify-center items-center w-full text-slate-500 gap-1">
          <span>APPROVED BY</span>
          <span className={`text-[11px] leading-none ${sortBy === 'decided_at' ? 'text-[#289800]' : 'text-slate-400'}`}>
            {sortBy === 'decided_at' ? (sortOrder === 'desc' ? '▼' : '▲') : '⇅'}
          </span>
        </button>
      ),
      cell: (r) => <span className="text-slate-800 flex justify-center items-center">{r.decided_by_name ?? "—"}</span>,
    },
    {
  key: "decided_at",
  header: (
    <button
      type="button"
      onClick={() => handleSort('decided_at')}
      className="flex justify-center items-center w-full text-slate-500 gap-1"
    >
      <IoTimeOutline size={14} />
      <span className={`text-[11px] leading-none ${
        sortBy === 'decided_at' ? 'text-[#289800]' : 'text-slate-400'
      }`}>
        {sortBy === 'decided_at' ? (sortOrder === 'desc' ? '▼' : '▲') : '⇅'}
      </span>
    </button>
  ),
  cell: (r) => (
    <span className="text-slate-600 flex justify-center items-center text-xs">
      {r.decided_at_display ?? "—"}
    </span>
  ),
},
    {
      key: "actions",
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
        <div className="flex justify-center items-center">
          <button
            className="px-3 py-1 flex flex-row justify-center gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
            type="button"
            onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id, type: 'sprf' }))}
          >
            <FaFileInvoice className="text-[15px]" />
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sortBy, sortOrder]);

  /* ── Fetch (both lists come back from the same endpoint every time) ── */
  const fetchApproveData = async ({
    silent            = false,
    targetPage        = currentPage,
    currentSearch     = search,
    currentType       = typeFilter,
    currentPerPage    = perPage,
    currentDateFrom   = dateFrom,
    currentDateTo     = dateTo,
    currentDecidedBy  = decidedBy,
    currentLocationId = locationId,
    currentSortBy     = sortBy,
    currentSortOrder  = sortOrder,
  } = {}) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const response = await axios.get(ziggyRoute("proposals.index"), {
        params: {
          page:        targetPage,
          search:      currentSearch     || undefined,
          per_page:    currentPerPage,
          date_from:   currentDateFrom   || undefined,
          date_to:     currentDateTo     || undefined,
          decided_by:  currentDecidedBy  || undefined,
          location_id: currentLocationId || undefined,
          sort_by:     currentSortBy     || undefined,
          sort_order:  currentSortOrder  || undefined,
          type:        currentType !== "" ? currentType : undefined,
        },
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
      });

      const props = response.data?.props ?? response.data;
      const roiPayload  = props?.roiProjects  ?? null;
      const sprfPayload = props?.sprfProjects ?? null;

      if (roiPayload)  setLocalRoiProjects(roiPayload);
      if (sprfPayload) setLocalSprfProjects(sprfPayload);
      setCurrentPage(targetPage);

      const statsPayload = props?.stats ?? null;
      if (statsPayload) setLocalStats(statsPayload);
    } catch (error) {
      console.error("Failed to query approved records:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchApproveData({ targetPage: 1 }), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleTypeChange       = (val) => { setTypeFilter(val);   fetchApproveData({ currentType: val,       targetPage: 1 }); };
  const handleDecidedByApply   = (val) => { setDecidedBy(val);    fetchApproveData({ currentDecidedBy: val,  targetPage: 1 }); };
  const handleLocationApply    = (val) => { setLocationId(val);   fetchApproveData({ currentLocationId: val, targetPage: 1 }); };
  const handleDateApply        = ()    => { setShowDatePicker(false); fetchApproveData({ targetPage: 1 }); };
  const handleDateClear        = ()    => {
    setDateFrom("");
    setDateTo("");
    setShowDatePicker(false);
    fetchApproveData({ currentDateFrom: undefined, currentDateTo: undefined, targetPage: 1 });
  };
  const handlePerPageInputApply = () => {
    const raw = parseInt(perPageInput, 10);
    const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 500) : perPage;
    setPerPage(num); setPerPageInput(String(num)); setShowPerPagePicker(false);
    fetchApproveData({ currentPerPage: num, targetPage: 1 });
  };

  const handleClearAllFilters = () => {
    setSearch("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setDecidedBy("");
    setLocationId("");
    setPerPage(10);
    setPerPageInput("10");
    setSortBy("");
    setSortOrder("");
    setShowDatePicker(false);
    setShowDecidedBy(false);
    setShowLocation(false);
    LS.clearAll();
    LS.set('per_page',   "10");
    LS.set('sort_by',    "");
    LS.set('sort_order', "");
    LS.set('active_tab', activeTab);

    fetchApproveData({
      currentSearch:     "",
      currentType:       "",
      currentDateFrom:   undefined,
      currentDateTo:     undefined,
      currentDecidedBy:  "",
      currentLocationId: "",
      currentSortBy:     "",
      currentSortOrder:  "",
      targetPage:        1,
    });
  };

  const goToPage = (p) => fetchApproveData({ targetPage: p });

  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo)   return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  // ─── Active list resolution ───────────────────────────────────
  const activeProjects = activeTab === 'sprf' ? localSprfProjects : localRoiProjects;
  const rows = activeProjects?.data ?? [];
  const pagination = activeProjects && typeof activeProjects.current_page === "number"
    ? {
        page:         activeProjects.current_page,
        perPage:      activeProjects.per_page ?? perPage,
        total:        activeProjects.total ?? rows.length,
        onPageChange: goToPage,
      }
    : null;
  const activeColumns = activeTab === 'sprf' ? sprfColumns : roiColumns;

  const searchControl = (
    <SearchControl
      search={search}
      onSearchChange={setSearch}
      sortOrder={sortOrder}
      onSortToggle={() => handleSort(sortBy || 'decided_at')}
      loading={loading || isRefreshing}
      onRefresh={() => fetchApproveData({ targetPage: activeProjects?.current_page ?? 1 })}
    />
  );

  const decidedBySlot = (
    <div className="relative flex-shrink-0" ref={decidedByRef}>
      <FilterChip
        active={!!decidedBy}
        icon={<MdVerifiedUser size={15} />}
        label="Decided By"
        value={decidedBy}
        onClick={() => setShowDecidedBy((p) => !p)}
        onClear={() => handleDecidedByApply("")}
      />
      <TextFilterPopup
        open={showDecidedBy}
        label="Decided By"
        placeholder="e.g. Juan dela Cruz"
        icon={<MdVerifiedUser size={14} className="text-[#4FA34E]" />}
        value={decidedBy}
        onChange={setDecidedBy}
        onApply={handleDecidedByApply}
        onClose={() => setShowDecidedBy(false)}
      />
    </div>
  );

  const filterToolbar = (
    <>

      <ListFilterToolbar
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAllFilters}
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
        extraFilters={decidedBySlot}
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
                <ProjectTypeTabs
        active={activeTab}
        onChange={handleTabChange}
        roiCount={roiCount}
        sprfCount={sprfCount}
      />
    </>
  );

  // --- Mobile card layout (below md) ---
  const renderRoiCard = (r) => (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">{r.reference ?? '—'}</p>
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20">
            {r.status ?? 'APPROVED'}
          </span>
        </div>
        <p className="text-xs text-slate-600 truncate mt-0.5">{r.company_name ?? '—'}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {r.contract_years != null ? `${r.contract_years} Years` : '—'} · {r.type === 1 ? 'Existing' : 'Potential'}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Prepared by <span className="font-medium text-slate-700">{r.user?.name ?? '—'}</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Approved by <span className="font-medium text-slate-700">{r.decided_by_name ?? '—'}</span>
        </p>
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="px-3 py-1 flex flex-row justify-center gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
          onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id, type: 'roi' }))}
        >
          <FaFileInvoice className="text-[15px]" />
        </button>
      </div>
    </div>
  );

  const renderSprfCard = (r) => (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">{r.sprf_no ?? '—'}</p>
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20">
            {r.status ?? 'APPROVED'}
          </span>
        </div>
        <p className="text-xs text-slate-600 truncate mt-0.5">{r.company_sap_code ?? '—'}</p>
        <p className="mt-1 text-[11px] text-slate-500">{r.account ?? '—'}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Prepared by <span className="font-medium text-slate-700">{r.preparer?.name ?? '—'}</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Approved by <span className="font-medium text-slate-700">{r.decided_by_name ?? '—'}</span>
        </p>
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="px-3 py-1 flex flex-row justify-center gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
          onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id, type: 'sprf' }))}
        >
          <FaFileInvoice className="text-[15px]" />
        </button>
      </div>
    </div>
  );

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle={activeTab === 'sprf' ? "Approved SPRF Projects" : "Approved ROI Projects"}
      columns={activeColumns}
      rows={rows}
      rowKey={(r) => `${activeTab}-${r.id}`}
      pagination={pagination}
      searchControl={searchControl}
      filterControl={filterToolbar}
      loading={loading || isRefreshing}
      emptyText="No matching records found."
      renderCard={activeTab === 'sprf' ? renderSprfCard : renderRoiCard}
    />
  );
}

export default ApproveProjects;