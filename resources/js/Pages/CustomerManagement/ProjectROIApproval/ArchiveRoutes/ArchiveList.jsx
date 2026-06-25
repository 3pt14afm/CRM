import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import FilterChip from '@/Components/roi/filters/FilterChip';
import FilterToolbar from '@/Components/roi/filters/FilterToolbar';
import TextFilterPopup from '@/Components/roi/filters/TextFilterPopup';
import LocationFilterPopup from '@/Components/roi/filters/LocationFilterPopup';
import { FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import {
  MdSearch, MdCheck, MdExpandMore,
  MdOutlineFilterAlt, MdDateRange, MdClose,
  MdCheckCircle, MdCancel, MdPerson, MdLocationOn, MdVerifiedUser,
  MdOutlineClose, MdOutlineCancel,
} from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';
import { route as ziggyRoute } from 'ziggy-js';
import SearchControl from '@/Components/roi/filters/SearchControl';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';

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

function ArchiveList({ archiveProjects: initialArchiveProjects, stats: initialStats, filters, locations = [] }) {
  const [localArchiveProjects, setLocalArchiveProjects] = useState(initialArchiveProjects);
  const [localStats, setLocalStats] = useState(initialStats); // <-- 1. Store stats in local state

  const [search,       setSearch]       = useState(filters?.search      ?? "");
  const [statusFilter, setStatusFilter] = useState(filters?.status      ?? "");
  const [perPage,      setPerPage]      = useState(filters?.per_page    ?? 10);
  const [dateFrom,     setDateFrom]     = useState(filters?.date_from   ?? "");
  const [dateTo,       setDateTo]       = useState(filters?.date_to     ?? "");
  const [decidedBy,    setDecidedBy]    = useState(filters?.decided_by  ?? "");
  const [preparedBy,   setPreparedBy]   = useState(filters?.prepared_by ?? "");
  const [locationId,   setLocationId]   = useState(filters?.location_id ?? "");

  const [showDatePicker,    setShowDatePicker]    = useState(false);
  const [showPerPagePicker, setShowPerPagePicker] = useState(false);
  const [showDecidedBy,     setShowDecidedBy]     = useState(false);
  const [showPreparedBy,    setShowPreparedBy]    = useState(false);
  const [showLocation,      setShowLocation]      = useState(false);

  const [perPageInput, setPerPageInput] = useState(String(filters?.per_page ?? 10));
  const [loading,      setLoading]      = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // <-- Track silent background loads separately

  const datePickerRef    = useRef(null);
  const perPagePickerRef = useRef(null);
  const decidedByRef     = useRef(null);
  const preparedByRef    = useRef(null);
  const locationRef      = useRef(null);
  
  const [sortOrder, setSortOrder] = useState(""); // "" | "desc" | "asc"

  useEffect(() => { 
    setLocalArchiveProjects(initialArchiveProjects); 
    setLocalStats(initialStats); // <-- Sync local stats when props refresh
  }, [initialArchiveProjects, initialStats]);

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current    && !datePickerRef.current.contains(e.target))    setShowDatePicker(false);
      if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target)) setShowPerPagePicker(false);
      if (decidedByRef.current     && !decidedByRef.current.contains(e.target))     setShowDecidedBy(false);
      if (preparedByRef.current    && !preparedByRef.current.contains(e.target))    setShowPreparedBy(false);
      if (locationRef.current      && !locationRef.current.contains(e.target))      setShowLocation(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- Auto-refresh every 60 seconds ---
  useEffect(() => {
    const interval = setInterval(() => {
      fetchArchivedData({ silent: true }); // uses current filter states
    }, 60_000);

    return () => clearInterval(interval);
  }, [search, statusFilter, perPage, dateFrom, dateTo, decidedBy, preparedBy, locationId, sortOrder]);

  const handleSortToggle = () => {
    const next = sortOrder === "" ? "desc" : sortOrder === "desc" ? "asc" : "";
    setSortOrder(next);
    fetchArchivedData({ currentSortOrder: next });
  };

  const selectedLocationName = useMemo(() =>
    locationId ? (locations.find((l) => String(l.id) === String(locationId))?.name ?? "") : ""
  , [locationId, locations]);

  const hasActiveFilters = !!(search || statusFilter || dateFrom || dateTo || decidedBy || preparedBy || locationId);

  const tiles = useMemo(() => {
    // <-- 2. Read from localStats instead of the stale stats prop -->
    const totalArchiveProjects  = localStats?.totalArchiveProjects  ?? localArchiveProjects?.total ?? 0;
    const recentlyArchivedToday = localStats?.recentlyArchivedToday ?? "—";
    return [
      { label: "Total Archives",    value: totalArchiveProjects,  icon: <FaFolderOpen />,  variant: "normal" },
      { label: "Recently Archived", value: recentlyArchivedToday, icon: <IoTimeOutline />, variant: "normal" },
    ];
  }, [localStats, localArchiveProjects]);

  const columns = useMemo(() => [
    {
      key: "PreparedBy",
      header: <div>PREPARED BY</div>,
      cell: (r) => <span className="text-[#195c00] font-medium ">{r.user?.name ?? r.prepared_by_name ?? "—"}</span>,
    },
    {
      key: "reference",
      header: <div className="text-center w-full">REFERENCE</div>,
      cell: (r) => <span className="font-mono flex justify-center items-center">{r.reference ?? "—"}</span>,
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
      header: <div className="text-center">CONTRACT TERM</div>,
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
        cell: (row) => {
      const s = String(row.status ?? "").toLowerCase();
      const isRejected  = s === "rejected";
      const isApproved  = s === "approved";
      const isCancelled = s === "cancelled";
      return (
        <div className="flex justify-center items-center">
          <div className={`flex items-center gap-1 whitespace-nowrap text-[9px] xl:text-[10px] font-medium px-1 py-0.5 rounded-xl
            ${isRejected
              ? "bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20"
              : isApproved
              ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
              : isCancelled
              ? "bg-red-600/10 text-red-600 border border-red-300"
              : "bg-blue-100 text-blue-700 border border-blue-200"
            }`}>
            {isRejected ? (
              <MdOutlineClose className="text-[11px] xl:text-[13px] flex-shrink-0" />
            ) : isApproved ? (
              <MdCheck className="text-[11px] xl:text-[13px] flex-shrink-0" />
            ) : isCancelled ? (
              <MdOutlineCancel className="text-[11px] xl:text-[13px] flex-shrink-0" />
            ) : (
              <span className="w-[12px] h-[12px] xl:w-[14px] xl:h-[14px] rounded-full bg-blue-700/20 flex-shrink-0" />
            )}
              <span className="truncate max-w-[75px] hover:whitespace-normal hover:max-w-full hover:cursor-pointer">
                {row.decided_by_name ?? "—"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "decided_at",
      header: (
        <div className="flex justify-center items-center w-full text-slate-500">
          <FaRegClock className="text-sm" title="Decision Date" />
        </div>
      ),
      cell: (r) => (
        <span className="text-slate-600 text-[10px] flex justify-center items-center whitespace-nowrap">
          {r.decided_at_display ? formatDateLabel(r.decided_at_display) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="px-1 py-1 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] border border-[#B5EBA2]/40 font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/30"
            onClick={() => router.visit(ziggyRoute("roi.archive.show", r.id))}
          >
            <IoEyeOutline className="text-[17px]" />
          </button>
        </div>
      ),
    },
  ], []);

  /* ── Fetch ── */
  const fetchArchivedData = async ({
    silent            = false,
    targetPage        = 1,
    currentSearch     = search,
    currentStatus     = statusFilter,
    currentPerPage    = perPage,
    currentDateFrom   = dateFrom,
    currentDateTo     = dateTo,
    currentDecidedBy  = decidedBy,
    currentPreparedBy = preparedBy,
    currentLocationId = locationId,
    currentSortOrder  = sortOrder,
  } = {}) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const response = await axios.get(ziggyRoute("roi.archive"), {
        params: {
          page:        targetPage,
          search:      currentSearch      || undefined,
          status:      currentStatus      || undefined,
          per_page:    currentPerPage,
          date_from:   currentDateFrom    || undefined,
          date_to:     currentDateTo      || undefined,
          decided_by:  currentDecidedBy   || undefined,
          prepared_by: currentPreparedBy  || undefined,
          location_id: currentLocationId  || undefined,
          sort_by:     "decided_at",
          sort_order:  currentSortOrder   || undefined,
        },
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
      });
      
      // Extract project list payload
      const projectsPayload = response.data?.props?.archiveProjects ?? response.data?.archiveProjects ?? response.data;
      setLocalArchiveProjects(projectsPayload);
      
      // <-- 3. Extract and set the stats payload as well -->
      const statsPayload = response.data?.props?.stats ?? response.data?.stats ?? null;
      if (statsPayload) {
        setLocalStats(statsPayload);
      }
    } catch (error) {
      console.error("Failed to query archived records:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchArchivedData({ targetPage: 1 }), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleStatusChange    = (val) => { setStatusFilter(val); fetchArchivedData({ currentStatus: val }); };
  const handleDecidedByApply  = (val) => { setDecidedBy(val);   fetchArchivedData({ currentDecidedBy: val }); };
  const handlePreparedByApply = (val) => { setPreparedBy(val);  fetchArchivedData({ currentPreparedBy: val }); };
  const handleLocationApply   = (val) => { setLocationId(val);  fetchArchivedData({ currentLocationId: val }); };
  const handleDateApply       = ()    => { setShowDatePicker(false); fetchArchivedData(); };
  const handleDateClear       = ()    => {
    setDateFrom("");
    setDateTo("");
    setShowDatePicker(false);
    fetchArchivedData({ currentDateFrom: undefined, currentDateTo: undefined });
  };
  const handlePerPageInputApply = () => {
    const raw = parseInt(perPageInput, 10);
    const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 500) : perPage;
    setPerPage(num); setPerPageInput(String(num)); setShowPerPagePicker(false);
    fetchArchivedData({ currentPerPage: num });
  };
  const handleClearAllFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setDecidedBy("");
    setPreparedBy("");
    setLocationId("");
    setShowDatePicker(false);
    setShowDecidedBy(false);
    setShowPreparedBy(false);
    setShowLocation(false);
    fetchArchivedData({
      currentSearch:     "",
      currentStatus:     "",
      currentDateFrom:   undefined,
      currentDateTo:     undefined,
      currentDecidedBy:  "",
      currentPreparedBy: "",
      currentLocationId: "",
    });
  };

  const goToPage = (p) => fetchArchivedData({ targetPage: p });

  const hasDateFilter = dateFrom || dateTo;
  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo)   return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  const rows = localArchiveProjects?.data ?? [];
  const pagination = localArchiveProjects && typeof localArchiveProjects.current_page === "number"
    ? {
        page:         localArchiveProjects.current_page,
        perPage:      localArchiveProjects.per_page ?? perPage,
        total:        localArchiveProjects.total ?? rows.length,
        onPageChange: goToPage,
      }
    : null;

  /* ── Search control ── */
  const searchControl = (
    <SearchControl
      search={search}
      onSearchChange={setSearch}
      sortOrder={sortOrder}
      onSortToggle={handleSortToggle}
      loading={loading || isRefreshing} // Show loading state on screen refresh triggers
      onRefresh={() => fetchArchivedData({ targetPage: localArchiveProjects?.current_page ?? 1 })}
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
 
  // Status icon changes based on value — pass it via `statusIcon`:
  const statusIcon =
    statusFilter === "approved"  ? <MdCheckCircle className="text-[#4FA34E] text-sm" /> :
    statusFilter === "rejected"  ? <MdCancel className="text-red-500 text-sm" /> :
    statusFilter === "cancelled" ? <MdOutlineCancel className="text-red-500 text-sm" /> :
    null;
 
  // Replace the `filterToolbar` variable:
  const filterToolbar = (
    <ListFilterToolbar
      hasActiveFilters={hasActiveFilters}
      onClearAll={handleClearAllFilters}
   
      statusOptions={[
        { value: "",         label: "All Status" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "cancelled", label: "Cancelled" },
      ]}
      statusFilter={statusFilter}
      onStatusChange={handleStatusChange}
      statusIcon={statusIcon}
   
      perPage={perPage}
      perPageInput={perPageInput}
      onPerPageInputChange={setPerPageInput}
      onPerPageApply={handlePerPageInputApply}
   
      extraFilters={decidedBySlot}
   
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
    <ProjectListSection
      tiles={tiles}
      tableTitle="Archived Projects"
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.id)}
      pagination={pagination}
      searchControl={searchControl}
      filterControl={filterToolbar}
      loading={loading || isRefreshing}
      emptyText="No matching records found."
    />
  );
}

export default ArchiveList;