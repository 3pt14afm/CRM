import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import {
  MdSearch, MdOutlineFilterAlt, MdDateRange, MdClose, MdExpandMore,
  MdCheckCircle, MdCancel, MdPerson, MdLocationOn, MdVerifiedUser,
} from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric',
  });
}

/* ─── Text filter popup (Prepared By) ────────────────────────────────────── */
function TextFilterPopup({ icon, label, placeholder, value, onChange, onApply, open, onClose }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value, open]);
  const apply = () => { onChange(draft); onApply(draft); onClose(); };
  const clear  = () => { setDraft(""); onChange(""); onApply(""); onClose(); };
  if (!open) return null;
  return (
    <div className="absolute left-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-[#E9F7E7] border border-[#4FA34E]/20">{icon}</div>
          <span className="text-[12px] font-semibold text-slate-700 tracking-wide">{label}</span>
        </div>
        <button type="button" onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <MdClose size={13} />
        </button>
      </div>
      <div className="px-3 py-3">
        <input autoFocus type="text" value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="w-full h-9 px-3 text-[13px] bg-white text-slate-700 border border-gray-200 rounded-lg
            focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
            transition-[border-color,box-shadow] duration-150" />
      </div>
      <div className="px-3 pb-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <button type="button" onClick={clear}
          className="flex-1 h-8 text-[12px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors duration-150">
          Clear
        </button>
        <button type="button" onClick={apply}
          className="flex-1 h-8 text-[12px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c] transition-colors duration-150">
          Apply
        </button>
      </div>
    </div>
  );
}

/* ─── Location searchable dropdown popup ─────────────────────────────────── */
function LocationFilterPopup({ locations = [], selectedId, onApply, open, onClose }) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(selectedId);
  const inputRef            = useRef(null);

  useEffect(() => {
    if (open) { setPicked(selectedId); setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open, selectedId]);

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.name ?? "").toLowerCase().includes(q) ||
      (l.code ?? "").toLowerCase().includes(q)
    );
  });

  const apply = (id) => { onApply(id ?? picked); onClose(); };
  const clear  = ()  => { setPicked(""); onApply(""); onClose(); };

  if (!open) return null;
  return (
    <div className="absolute left-0 top-11 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden flex flex-col"
      style={{ maxHeight: 340 }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-[#E9F7E7] border border-[#4FA34E]/20">
            <MdLocationOn size={14} className="text-[#4FA34E]" />
          </div>
          <span className="text-[12px] font-semibold text-slate-700 tracking-wide">Filter by Location</span>
        </div>
        <button type="button" onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <MdClose size={13} />
        </button>
      </div>

      {/* Search input */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={inputRef} type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search location…"
            className="w-full h-8 pl-8 pr-3 text-[13px] bg-slate-50 text-slate-700 border border-gray-200 rounded-lg
              focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
              transition-[border-color,box-shadow] duration-150" />
        </div>
      </div>

      {/* Location list */}
      <div className="overflow-y-auto flex-1 px-2 pb-2">
        {filtered.length === 0 ? (
          <p className="text-center text-[12px] text-slate-400 py-4">No locations found</p>
        ) : (
          filtered.map((l) => {
            const isActive = String(picked) === String(l.id);
            return (
              <button key={l.id} type="button"
                onClick={() => apply(l.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors duration-100 group
                  ${isActive ? "bg-[#E9F7E7]" : "hover:bg-slate-50"}`}>
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold
                  ${isActive ? "bg-[#4FA34E] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}>
                  {l.code?.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-medium truncate ${isActive ? "text-[#2DA300]" : "text-slate-700"}`}>{l.name}</p>
                  <p className="text-[10px] text-slate-400">{l.code}</p>
                </div>
                {isActive && <MdCheckCircle size={15} className="text-[#4FA34E] flex-shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex-shrink-0">
        <button type="button" onClick={clear}
          className="w-full h-8 text-[12px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors duration-150">
          Clear filter
        </button>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
function CurrentList({ currentProjects: initialCurrentProjects, stats, filters, locations = [] }) {
  const [localCurrentProjects, setLocalCurrentProjects] = useState(initialCurrentProjects);
  const [search,       setSearch]       = useState(filters?.search      ?? "");
  const [statusFilter, setStatusFilter] = useState(filters?.status      ?? "");
  const [dateFrom,     setDateFrom]     = useState(filters?.date_from   ?? "");
  const [dateTo,       setDateTo]       = useState(filters?.date_to     ?? "");
  const [preparedBy,   setPreparedBy]   = useState(filters?.prepared_by ?? "");
  const [locationId,   setLocationId]   = useState(filters?.location_id ?? "");
  const [perPage,      setPerPage]      = useState(filters?.per_page    ?? 10);
  const [perPageInput, setPerPageInput] = useState(String(filters?.per_page ?? 10));

  const [showDatePicker,    setShowDatePicker]    = useState(false);
  const [showPerPagePicker, setShowPerPagePicker] = useState(false);
  const [showPreparedBy,    setShowPreparedBy]    = useState(false);
  const [showLocation,      setShowLocation]      = useState(false);

  const [loading, setLoading] = useState(false);

  const datePickerRef    = useRef(null);
  const perPagePickerRef = useRef(null);
  const preparedByRef    = useRef(null);
  const locationRef      = useRef(null);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  }).format(today);

  useEffect(() => {
    setLocalCurrentProjects(initialCurrentProjects);
  }, [initialCurrentProjects]);

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

  // Resolved name for the active location chip label
  const selectedLocationName = useMemo(() =>
    locationId ? (locations.find((l) => String(l.id) === String(locationId))?.name ?? "") : ""
  , [locationId, locations]);

  const tiles = useMemo(() => {
    const totalCurrentProjects = stats?.totalCurrentProjects ?? localCurrentProjects?.total ?? 0;
    const recentlyAddedToday = stats?.recentlyAddedToday ?? "—";
    return [
      { label: "Total Currents", value: totalCurrentProjects, icon: <FaFolderOpen />, variant: "normal" },
      { label: "Recently Added", value: recentlyAddedToday, icon: <IoTimeOutline />, variant: "normal" },
    ];
  }, [stats, localCurrentProjects]);

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
      cell: (r) => <span className="font-medium flex justify-center items-center">{r.company_name ?? "—"}</span>,
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
    targetPage      = 1,
    currentSearch   = search,
    currentStatus   = statusFilter,
    currentPerPage  = perPage,
    currentDateFrom = dateFrom,
    currentDateTo   = dateTo,
    currentPreparedBy = preparedBy,
    currentLocationId = locationId,
  } = {}) => {
    setLoading(true);
    try {
      const response = await axios.get(route("roi.current"), {
        params: {
          page:        targetPage,
          search:      currentSearch      || undefined,
          status:      currentStatus      || undefined,
          per_page:    currentPerPage,
          date_from:   currentDateFrom    || undefined,
          date_to:     currentDateTo      || undefined,
          prepared_by: currentPreparedBy  || undefined,
          location_id: currentLocationId  || undefined,
        },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
        },
      });
      const payload = response.data?.props?.currentProjects ?? response.data?.currentProjects ?? response.data;
      setLocalCurrentProjects(payload);
    } catch (error) {
      console.error("Failed to fetch current projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchCurrentData({ targetPage: 1 });
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleStatusChange    = (val) => { setStatusFilter(val);  fetchCurrentData({ currentStatus: val }); };
  const handlePreparedByApply = (val) => { setPreparedBy(val);    fetchCurrentData({ currentPreparedBy: val }); };
  const handleLocationApply   = (val) => { setLocationId(val);    fetchCurrentData({ currentLocationId: val }); };
  const handleDateApply       = ()    => { setShowDatePicker(false); fetchCurrentData(); };
  const handleDateClear       = ()    => {
    setDateFrom("");
    setDateTo("");
    setShowDatePicker(false);
    fetchCurrentData({ currentDateFrom: undefined, currentDateTo: undefined });
  };

  const handlePerPageInputApply = () => {
    const raw = parseInt(perPageInput, 10);
    const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 500) : perPage;
    setPerPage(num); setPerPageInput(String(num)); setShowPerPagePicker(false);
    fetchCurrentData({ currentPerPage: num });
  };

  const goToPage = (p) => fetchCurrentData({ targetPage: p });

  const hasDateFilter = dateFrom || dateTo;
  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo)   return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  const rows = localCurrentProjects?.data ?? [];
  const pagination = localCurrentProjects && typeof localCurrentProjects.current_page === "number"
    ? {
        page: localCurrentProjects.current_page,
        perPage: localCurrentProjects.per_page ?? perPage,
        total: localCurrentProjects.total ?? rows.length,
        onPageChange: goToPage,
      }
    : null;

  /* ── FilterChip ── */
  const FilterChip = ({ active, icon, label, value, onClick, onClear }) => (
    <button type="button" onClick={onClick}
      className={`h-9 flex items-center gap-1.5 px-2.5 text-[13px] font-medium border rounded-lg transition-all duration-150 whitespace-nowrap
        ${active
          ? "border-[#4FA34E]/40 bg-[#E9F7E7] text-[#2DA300]"
          : "border-gray-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-gray-300"
        }`}
    >
      <span className={active ? "text-[#4FA34E]" : "text-slate-400"}>{icon}</span>
      {active
        ? <span className="text-[12px] max-w-[120px] truncate">{value}</span>
        : <span className="text-[12px]">{label}</span>
      }
      {active && (
        <span className="ml-0.5 flex items-center text-[#2DA300] hover:text-red-400 transition-colors"
          onMouseDown={(e) => { e.stopPropagation(); onClear(); }}>
          <MdClose size={13} />
        </span>
      )}
    </button>
  );

  /* ── Search control (top bar) ── */
  const searchControl = (
    <div className="relative h-9 flex items-center">
      <MdSearch className="absolute left-2.5 text-slate-400 text-base pointer-events-none z-10" />
      <input type="text" placeholder="Search projects…" value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`h-9 w-full sm:w-52 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg bg-white text-black
          placeholder:text-slate-400 focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
          transition-[border-color,box-shadow] duration-150
          ${loading ? "opacity-60 pointer-events-none" : ""}`} />
    </div>
  );

  /* ── Filter toolbar ── */
  const filterToolbar = (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">

      {/* Status */}
      <div className="relative h-9 flex items-center flex-shrink-0">
        <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
        <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 w-28 sm:w-36 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer
            focus:outline-none flex items-center focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
            transition-[border-color,box-shadow] duration-150 text-slate-700">
          <option value="">All Status</option>
          <option value="for_review">For Review</option>
          <option value="for_checking">For Checking</option>
          <option value="for_endorsement">For Endorsement</option>
          <option value="for_confirmation">For Confirmation</option>
          <option value="for_approval">For Approval</option>
        </select>
      </div>

      {/* Per Page */}
      <div className="relative h-9 flex items-center flex-shrink-0" ref={perPagePickerRef}>
        <button type="button" onClick={() => setShowPerPagePicker(!showPerPagePicker)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-[13px] text-slate-600 flex items-center gap-1.5 bg-white hover:bg-slate-50 transition-colors">
          <TbLayoutRows size={15} className="text-slate-400" />
          <span>Rows: {perPage}</span>
          <MdExpandMore size={14} className="text-slate-400" />
        </button>
        {showPerPagePicker && (
          <div className="absolute left-0 top-11 z-50 w-40 bg-white border border-gray-200 rounded-2xl shadow-lg p-3">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Rows per page</span>
            <div className="flex items-center gap-1.5">
              <input autoFocus type="number" value={perPageInput}
                onChange={(e) => setPerPageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePerPageInputApply()}
                className="w-16 h-8 px-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]" />
              <button type="button" onClick={handlePerPageInputApply}
                className="h-8 flex-1 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prepared By */}
      <div className="relative flex-shrink-0" ref={preparedByRef}>
        <FilterChip
          active={!!preparedBy}
          icon={<MdPerson size={15} />}
          label="Prepared By"
          value={preparedBy}
          onClick={() => { setShowPreparedBy((p) => !p); setShowLocation(false); setShowDatePicker(false); }}
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

      {/* Location — chip + searchable popup */}
      <div className="relative flex-shrink-0" ref={locationRef}>
        <FilterChip
          active={!!locationId}
          icon={<MdLocationOn size={15} />}
          label="Location"
          value={selectedLocationName}
          onClick={() => { setShowLocation((p) => !p); setShowPreparedBy(false); setShowDatePicker(false); }}
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
          onClick={() => { setShowDatePicker((p) => !p); setShowPreparedBy(false); setShowLocation(false); }}
          onClear={handleDateClear}
        />
        {showDatePicker && (
          <div className="absolute left-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MdDateRange size={16} className="text-[#4FA34E]" />
              <span className="text-[12px] font-semibold text-slate-700 tracking-wide">Filter by Date</span>
            </div>
            <div className="space-y-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]" />
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button type="button" onClick={handleDateClear}
                className="flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50">
                Clear
              </button>
              <button type="button" onClick={handleDateApply}
                className="flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-24">

        {/* Header */}
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
CurrentList.layout = page => <AuthenticatedLayout children={page} />;