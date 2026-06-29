import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import FilterChip from '@/Components/roi/filters/FilterChip';
import FilterToolbar from '@/Components/roi/filters/FilterToolbar';
import TextFilterPopup from '@/Components/roi/filters/TextFilterPopup';
import LocationFilterPopup from '@/Components/roi/filters/LocationFilterPopup';
import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import {
  MdSearch, MdOutlineFilterAlt, MdDateRange, MdClose, MdExpandMore,
  MdPerson, MdLocationOn,
} from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchControl from '@/Components/roi/filters/SearchControl';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';

function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric',
  });
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
  const [currentPage,  setCurrentPage]  = useState(() => {
    const stored = LS.get('page', "");
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  });
  const [sortOrder,    setSortOrder]    = useState(() => LS.get('sort_order',  filters?.sort_order  ?? ""));

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

  // Persist all filters + page + sort to localStorage
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
    LS.set('sort_order',  sortOrder);
  }, [search, statusFilter, typeFilter, dateFrom, dateTo, preparedBy, locationId, perPage, currentPage, sortOrder]);

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

  // Always keep ref pointed at the latest version of fetchCurrentData
  const fetchCurrentDataRef = useRef(null);
  useEffect(() => {
    fetchCurrentDataRef.current = fetchCurrentData;
  });

  // Auto-refresh every 60 seconds — interval never restarts, never stale
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentDataRef.current?.({ silent: true });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const selectedLocationName = useMemo(() =>
    locationId ? (locations.find((l) => String(l.id) === String(locationId))?.name ?? "") : ""
  , [locationId, locations]);

  const hasActiveFilters = !!(search || statusFilter || typeFilter !== "" || dateFrom || dateTo || preparedBy || locationId ||  perPage !== 10);

  const tiles = useMemo(() => {
    const totalCurrentProjects = localStats?.totalCurrentProjects ?? localCurrentProjects?.total ?? 0;
    const recentlyAddedToday   = localStats?.recentlyAddedToday ?? "—";
    return [
      { label: "Total Currents", value: totalCurrentProjects, icon: <FaFolderOpen />,  variant: "normal" },
      { label: "Recently Added", value: recentlyAddedToday,   icon: <IoTimeOutline />, variant: "normal" },
    ];
  }, [localStats, localCurrentProjects]);

  const columns = useMemo(() => [
    {
      key: "Created by",
      header: "PREPARED BY",
      cell: (r) => <span className="text-[#195c00] font-semibold">{r.user?.name ?? "—"}</span>,
    },
    {
      key: "reference",
      header: <div className="text-center w-full">REFERENCE</div>,
      cell: (r) => <span className="font-medium flex justify-center items-center">{r.reference ?? "—"}</span>,
    },
    {
      key: "company_sap_code",
      header: <div className="text-center w-full">SAP CODE</div>,
      cell: (r) => (
        <span className="font-mono text-sm text-[#33721c] flex justify-center items-center">
          {r.company_sap_code ?? "—"}
        </span>
      ),
    },
    {
      key: "company_name",
      header: <div className="text-center w-full">COMPANY NAME</div>,
      cell: (r) =>
        <div className="flex justify-center items-center w-full h-full">
          <span className="font-medium text-center block truncate max-w-[150px] hover:max-w-max hover:whitespace-normal cursor-pointer transition-all duration-200">
            {r.company_name ?? "—"}
          </span>
        </div>,
    },
    {
      key: "contract_years",
      header: <div className="text-center w-full">CONTRACT TERM</div>,
      cell: (r) => (
        <span className="font-medium flex justify-center items-center">
          {r.contract_years != null ? `${r.contract_years}` : "—"}
        </span>
      ),
    },
    {
      key: "contract_type",
      header: <div className="text-center w-full">CONTRACT TYPE</div>,
      cell: (r) => <span className="font-medium flex justify-center items-center">{r.contract_type ?? "—"}</span>,
    },
    {
      key: "type",
      header: <div className="text-center w-full">TYPE</div>,
      cell: (r) => (
        <span className={`font-medium flex justify-center items-center ${r.type === 1 ? "text-[#289800]" : "text-gray-500"}`}>
          {r.type === 1 ? "Existing" : "Potential"}
        </span>
      ),
    },
    {
      key: "status",
      header: <div className="text-center w-full">STATUS</div>,
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
      header: <div className="text-center w-full">LAST SAVED</div>,
      cell: (r) => (
        <span className="text-slate-600 text-[11px] xl:text-xs flex justify-center items-center">
          {r.last_saved_display ?? "—"}
        </span>
      ),
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
  ], []);

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
    currentSortOrder  = sortOrder,
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
          sort_by:     "last_saved_at",
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
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setPreparedBy("");
    setLocationId("");

    // Reset pagination items per page to 10
    setPerPage(10);
    setPerPageInput("10");

    setShowDatePicker(false);
    setShowPreparedBy(false);
    setShowLocation(false);

    LS.clearAll();

    // Ensure 'per_page' is also cleared/reset in localStorage
    LS.set('per_page', "10");

    fetchCurrentData({
      currentSearch:     "",
      currentStatus:     "",
      currentType:       "",
      currentDateFrom:   undefined,
      currentDateTo:     undefined,
      currentPreparedBy: "",
      currentLocationId: "",
      targetPage:        1,
    });
  };

  const handleSortToggle = () => {
    const next = sortOrder === "" ? "desc" : sortOrder === "desc" ? "asc" : "";
    setSortOrder(next);
    LS.set('sort_order', next);
    fetchCurrentData({ currentSortOrder: next });
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

  const searchControl = (
    <SearchControl
      search={search}
      onSearchChange={setSearch}
      sortOrder={sortOrder}
      onSortToggle={handleSortToggle}
      loading={loading}
      isRefreshing={isRefreshing}
      onRefresh={() => fetchCurrentData({ targetPage: localCurrentProjects?.current_page ?? 1 })}
    />
  );

  /* ── Filter toolbar ── */
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
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-24">
        <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-3 flex justify-between items-end">
          <div className="flex items-baseline gap-1">
            <h1 className="font-semibold text-sm text-slate-500 hidden sm:block">Project ROI Approval</h1>
            <span className="text-slate-400 hidden sm:block">/</span>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900">Current</p>
          </div>
          <span className="text-xs text-slate-500">{formattedDate}</span>
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
        />
      </div>

      <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
        <div className="px-4 sm:px-10 py-3 flex items-center justify-end" />
      </div>
    </div>
  );
}

export default CurrentList;
CurrentList.layout = (page) => <AuthenticatedLayout children={page} />;