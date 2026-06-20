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
  MdOutlineClose,
} from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';
import { route as ziggyRoute } from 'ziggy-js';

function formatDateLabel(dateStr) {
  try {
    if (!dateStr) return "—";
    const datePart = dateStr.split(' ')[0];
    const [year, month, day] = datePart.split('-');
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
  } catch {
    return "—";
  }
}

function ArchiveList({ archiveProjects: initialArchiveProjects, stats, filters, locations = [] }) {
  const [localArchiveProjects, setLocalArchiveProjects] = useState(initialArchiveProjects);

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

  const datePickerRef    = useRef(null);
  const perPagePickerRef = useRef(null);
  const decidedByRef     = useRef(null);
  const preparedByRef    = useRef(null);
  const locationRef      = useRef(null);

  useEffect(() => { setLocalArchiveProjects(initialArchiveProjects); }, [initialArchiveProjects]);

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

  const selectedLocationName = useMemo(() =>
    locationId ? (locations.find((l) => String(l.id) === String(locationId))?.name ?? "") : ""
  , [locationId, locations]);

  const hasActiveFilters = !!(search || statusFilter || dateFrom || dateTo || decidedBy || preparedBy || locationId);

  const tiles = useMemo(() => {
    const totalArchiveProjects  = stats?.totalArchiveProjects  ?? localArchiveProjects?.total ?? 0;
    const recentlyArchivedToday = stats?.recentlyArchivedToday ?? "—";
    return [
      { label: "Total Archives",    value: totalArchiveProjects,  icon: <FaFolderOpen />,  variant: "normal" },
      { label: "Recently Archived", value: recentlyArchivedToday, icon: <IoTimeOutline />, variant: "normal" },
    ];
  }, [stats, localArchiveProjects]);

  const columns = useMemo(() => [
    {
      key: "PreparedBy",
      header: <div>PREPARED BY</div>,
      cell: (r) => <span className="text-[#195c00] font-medium">{r.user?.name ?? r.prepared_by_name ?? "—"}</span>,
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
      cell: (r) => <span className="font-medium flex justify-center items-center text-center">{r.company_name ?? "—"}</span>,
    },
    {
      key: "contract_years",
      header: <div className="text-center max-w-16">CONTRACT TERM</div>,
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
      key: "status",
      header: <div className="text-center w-full">STATUS</div>,
      cell: (row) => {
        const s = String(row.status ?? "").toLowerCase();
        const isRejected = s === "rejected";
        const isApproved = s === "approved";
        return (
          <div className="flex justify-center items-center">
            <div className={`flex items-center gap-1 whitespace-nowrap text-[9px] xl:text-[10px] font-medium px-1 py-0.5 rounded-xl
              ${isRejected
                ? "bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20"
                : isApproved
                ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}>
              {isRejected ? (
                <MdOutlineClose className="text-[11px] xl:text-[13px] flex-shrink-0" />
              ) : isApproved ? (
                <MdCheck className="text-[11px] xl:text-[13px] flex-shrink-0" />
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
        <span className="text-slate-600 text-xs flex justify-center items-center whitespace-nowrap">
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
    targetPage        = 1,
    currentSearch     = search,
    currentStatus     = statusFilter,
    currentPerPage    = perPage,
    currentDateFrom   = dateFrom,
    currentDateTo     = dateTo,
    currentDecidedBy  = decidedBy,
    currentPreparedBy = preparedBy,
    currentLocationId = locationId,
  } = {}) => {
    setLoading(true);
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
        },
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
      });
      const payload = response.data?.props?.archiveProjects ?? response.data?.archiveProjects ?? response.data;
      setLocalArchiveProjects(payload);
    } catch (error) {
      console.error("Failed to query archived records:", error);
    } finally {
      setLoading(false);
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
    <div className="relative h-7 flex items-center">
      <MdSearch className="absolute left-2.5 text-slate-400 text-base pointer-events-none z-10" />
      <input
        type="text"
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`h-8 w-64 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg bg-white text-black
          placeholder:text-slate-400 focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
          ${loading ? "opacity-60 pointer-events-none" : ""}`}
      />
    </div>
  );

  /* ── Filter toolbar ── */
  const filterToolbar = (
    <FilterToolbar hasActiveFilters={hasActiveFilters} onClearAll={handleClearAllFilters}>

      {/* Status */}
      <div className="relative h-9 flex items-center flex-shrink-0">
        {statusFilter === "approved"
          ? <MdCheckCircle className="absolute left-2.5 text-[#4FA34E] text-sm pointer-events-none z-10" />
          : statusFilter === "rejected"
          ? <MdCancel className="absolute left-2.5 text-red-500 text-sm pointer-events-none z-10" />
          : <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
        }
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 w-28 sm:w-32 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer
            focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
            transition-[border-color,box-shadow] duration-150 text-slate-700"
        >
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Per Page */}
      <div className="relative h-9 flex items-center flex-shrink-0" ref={perPagePickerRef}>
        <button
          type="button"
          onClick={() => setShowPerPagePicker(!showPerPagePicker)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-[13px] text-slate-600 flex items-center gap-1.5 bg-white hover:bg-slate-50 transition-colors"
        >
          <TbLayoutRows size={15} className="text-slate-400" />
          <span>Rows: {perPage}</span>
          <MdExpandMore size={14} className="text-slate-400" />
        </button>
        {showPerPagePicker && (
          <div className="absolute left-0 top-11 z-50 w-40 bg-white border border-gray-200 rounded-2xl shadow-lg p-3">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Rows per page</span>
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="number"
                value={perPageInput}
                onChange={(e) => setPerPageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePerPageInputApply()}
                className="w-16 h-8 px-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
              />
              <button
                type="button"
                onClick={handlePerPageInputApply}
                className="h-8 flex-1 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decided By */}
      <div className="relative flex-shrink-0" ref={decidedByRef}>
        <FilterChip
          active={!!decidedBy}
          icon={<MdVerifiedUser size={15} />}
          label="Decided By"
          value={decidedBy}
          onClick={() => { setShowDecidedBy((p) => !p); setShowPreparedBy(false); setShowLocation(false); setShowDatePicker(false); }}
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

      {/* Prepared By */}
      <div className="relative flex-shrink-0" ref={preparedByRef}>
        <FilterChip
          active={!!preparedBy}
          icon={<MdPerson size={15} />}
          label="Prepared By"
          value={preparedBy}
          onClick={() => { setShowPreparedBy((p) => !p); setShowDecidedBy(false); setShowLocation(false); setShowDatePicker(false); }}
          onClear={() => handlePreparedByApply("")}
        />
        <TextFilterPopup
          open={showPreparedBy}
          label="Prepared By"
          placeholder="e.g. Maria Santos"
          icon={<MdPerson size={14} className="text-[#4FA34E]" />}
          value={preparedBy}
          onChange={setPreparedBy}
          onApply={handlePreparedByApply}
          onClose={() => setShowPreparedBy(false)}
        />
      </div>

      {/* Location */}
      <div className="relative flex-shrink-0" ref={locationRef}>
        <FilterChip
          active={!!locationId}
          icon={<MdLocationOn size={15} />}
          label="Location"
          value={selectedLocationName}
          onClick={() => { setShowLocation((p) => !p); setShowDecidedBy(false); setShowPreparedBy(false); setShowDatePicker(false); }}
          onClear={() => handleLocationApply("")}
        />
        <LocationFilterPopup
          open={showLocation}
          locations={locations}
          selectedId={locationId}
          onApply={handleLocationApply}
          onClose={() => setShowLocation(false)}
        />
      </div>

      {/* Date Range */}
      <div className="relative flex-shrink-0" ref={datePickerRef}>
        <FilterChip
          active={!!hasDateFilter}
          icon={<MdDateRange size={15} />}
          label="Date Range"
          value={dateLabel}
          onClick={() => { setShowDatePicker((p) => !p); setShowDecidedBy(false); setShowPreparedBy(false); setShowLocation(false); }}
          onClear={handleDateClear}
        />
        {showDatePicker && (
          <div className="absolute left-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MdDateRange size={16} className="text-[#4FA34E]" />
              <span className="text-[12px] font-semibold text-slate-700 tracking-wide">Filter by Date</span>
            </div>
            <div className="space-y-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
              />
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDateClear}
                className="flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleDateApply}
                className="flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

    </FilterToolbar>
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
      loading={loading}
      emptyText="No matching records found."
    />
  );
}

export default ArchiveList;