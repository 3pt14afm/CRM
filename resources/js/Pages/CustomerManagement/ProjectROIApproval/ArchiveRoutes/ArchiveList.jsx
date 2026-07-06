import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import FilterChip from '@/Components/roi/filters/FilterChip';
import TextFilterPopup from '@/Components/roi/filters/TextFilterPopup';
import { FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import { MdCheck, MdCheckCircle, MdCancel, MdVerifiedUser, MdOutlineClose, MdOutlineCancel, MdOutlineDescription } from 'react-icons/md';
import { route as ziggyRoute } from 'ziggy-js';
import SearchControl from '@/Components/roi/filters/SearchControl';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';
import SortHeader from '@/Components/roi/filters/SortHeader';
import { IoCopyOutline } from "react-icons/io5";
import { toast } from "sonner"; ``
import { createPortal } from "react-dom";

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
      try { return localStorage.getItem(`archive_filter_${key}`) ?? fallback; }
      catch { return fallback; }
    },
    set: (key, value) => {
      try { localStorage.setItem(`archive_filter_${key}`, value); }
      catch {}
    },
    clearAll: () => {
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('archive_filter_'))
          .forEach(k => localStorage.removeItem(k));
      } catch {}
    },
  };



;





function ActionsDropdown({ row, isAdmin, hideView = false }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const isOwner = !!row.is_owner;
  const isApproved = String(row.status ?? "").toLowerCase() === "approved";
  const canManage = isOwner && isApproved;

  const handleView = () => {
    setOpen(false);
    router.visit(ziggyRoute("roi.archive.show", row.id));
  };

  const handleDuplicate = () => {
    if (!row.id) { toast.error("Invalid Project ID"); return; }

    setOpen(false);

    toast.custom((t) => (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-xl w-[calc(100vw-2rem)] max-w-[500px] sm:w-[500px] outline-none ring-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="18" fill="#dbeafe"/>
              <path d="M14 13h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 20v-6a2 2 0 0 1 2-2h6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Duplicate this project?</p>
            <p className="text-xs text-gray-500 mt-0.5">This will withdraw it back to Draft as a copy.</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end w-full sm:w-auto">
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t);
              setTimeout(() => {
                const processId = `duplicate-${row.id}`;
                router.post(ziggyRoute("roi.archive.withdraw", row.id), {}, {
                  preserveScroll: true,
                  onStart:   () => toast.loading("Duplicating...", { id: processId }),
                  onSuccess: () => toast.success("Project duplicated to Draft.", { id: processId }),
                  onError:   (errors) => {
                    const message = Object.values(errors)[0] || "Failed to duplicate project.";
                    toast.error(message, { id: processId });
                  },
                });
              }, 50);
            }}
            className="flex-1 sm:flex-none text-white px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500"
          >
            Yes, Duplicate
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: "top-center" });
  };

  // Recalculate menu position whenever it's opened, and keep it in sync on scroll/resize
  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 130;
      // Anchor to bottom-right of the button, flip left if it would overflow the viewport
      let left = rect.right - menuWidth;
      if (left < 8) left = rect.left;

      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: left + window.scrollX,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Non-owner, or owner but not-yet-approved: just the plain "View" eye button
  if (!canManage) {
    if (hideView) return null;

    return (
      <div className="hidden lg:flex justify-center items-center">
        <button
          type="button"
          className="px-1 py-1 flex items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] border border-[#B5EBA2]/40 font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/30"
          onClick={(e) => { e.stopPropagation(); handleView(); }}
        >
          <IoEyeOutline className="text-[17px]" />
        </button>
      </div>
    );
  }

  // Owner + Approved: 3-dot button in the table; menu portaled to <body>
  return (
    <div className="relative flex justify-center items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className="px-1.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <span className="flex flex-col gap-[3px] items-center justify-center">
          <span className="w-[3px] h-[3px] rounded-full bg-current" />
          <span className="w-[3px] h-[3px] rounded-full bg-current" />
          <span className="w-[3px] h-[3px] rounded-full bg-current" />
        </span>
      </button>

      {open && createPortal(
        <>
          {/* Invisible overlay to close the menu when clicking outside */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />

          {/* Menu rendered directly on <body>, positioned via fixed coordinates */}
          <div
            className="fixed z-[9999] flex flex-col gap-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 min-w-[130px]"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {!hideView && (
              <button
                type="button"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#289800] bg-[#B5EBA2]/20 hover:bg-[#B5EBA2]/40 text-xs font-semibold"
                onClick={handleView}
              >
                <IoEyeOutline className="text-[15px]" />
                <span>View</span>
              </button>
            )}

            <button
              type="button"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 text-xs font-semibold"
              onClick={handleDuplicate}
            >
              <IoCopyOutline className="text-[15px]" />
              <span>Duplicate</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

  function ArchiveList({ archiveProjects: initialArchiveProjects, stats: initialStats, filters, locations = [], isAdmin = false }) {
    const [localArchiveProjects, setLocalArchiveProjects] = useState(initialArchiveProjects);
    const [localStats, setLocalStats] = useState(initialStats);

    const [search,       setSearch]       = useState(() => LS.get('search',      filters?.search      ?? ""));
    const [typeFilter,   setTypeFilter]   = useState(() => LS.get('type',        filters?.type        ?? ""));
    const [statusFilter, setStatusFilter] = useState(() => LS.get('status',      filters?.status      ?? ""));
    const [perPage,      setPerPage]      = useState(() => {
      const stored = LS.get('per_page', "");
      const parsed = parseInt(stored, 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : (filters?.per_page ?? 10);
    });
    const [dateFrom,     setDateFrom]     = useState(() => LS.get('date_from',   filters?.date_from   ?? ""));
    const [dateTo,       setDateTo]       = useState(() => LS.get('date_to',     filters?.date_to     ?? ""));
    const [decidedBy,    setDecidedBy]    = useState(() => LS.get('decided_by',  filters?.decided_by  ?? ""));
    const [preparedBy,   setPreparedBy]   = useState(() => LS.get('prepared_by', filters?.prepared_by ?? ""));
    const [locationId,   setLocationId]   = useState(() => LS.get('location_id', filters?.location_id ?? ""));
    const [currentPage,  setCurrentPage]  = useState(() => {
      const stored = LS.get('page', "");
      const parsed = parseInt(stored, 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 1;
    });

    const [showDatePicker,    setShowDatePicker]    = useState(false);
    const [showPerPagePicker, setShowPerPagePicker] = useState(false);
    const [showDecidedBy,     setShowDecidedBy]     = useState(false);
    const [showPreparedBy,    setShowPreparedBy]    = useState(false);
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
    const preparedByRef    = useRef(null);
    const locationRef      = useRef(null);

    // ── Sort state: two separate values instead of one ──
  const [sortBy,    setSortBy]    = useState(() => LS.get('sort_by',    filters?.sort_by    ?? ""));
  const [sortOrder, setSortOrder] = useState(() => LS.get('sort_order', filters?.sort_order ?? ""));
  
    // Persist filters to localStorage whenever they change
    useEffect(() => {
      LS.set('search',      search);
      LS.set('status',      statusFilter);
      LS.set('type',        String(typeFilter));
      LS.set('date_from',   dateFrom);
      LS.set('date_to',     dateTo);
      LS.set('decided_by',  decidedBy);
      LS.set('prepared_by', preparedBy);
      LS.set('location_id', String(locationId));
      LS.set('per_page',    String(perPage));
      LS.set('page',        String(currentPage));
      LS.set('sort_by',     sortBy);
      LS.set('sort_order',  sortOrder);
    }, [search, statusFilter, typeFilter, dateFrom, dateTo, decidedBy, preparedBy, locationId, perPage, currentPage, sortBy, sortOrder]);

    useEffect(() => {
      setLocalArchiveProjects(initialArchiveProjects);
      setLocalStats(initialStats);
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

    const fetchArchivedDataRef = useRef(null);
    useEffect(() => {
      fetchArchivedDataRef.current = fetchArchivedData;
    });

    useEffect(() => {
      const interval = setInterval(() => {
        fetchArchivedDataRef.current?.({ silent: true });
      }, 60_000);
      return () => clearInterval(interval);
    }, []);

  const handleSort = (key) => {
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(key);
    setSortOrder(newOrder);
    LS.set('sort_by',    key);
    LS.set('sort_order', newOrder);
    fetchArchivedData({ currentSortBy: key, currentSortOrder: newOrder });
  };

    const selectedLocationName = useMemo(() =>
      locationId ? (locations.find((l) => String(l.id) === String(locationId))?.name ?? "") : ""
    , [locationId, locations]);

    const hasActiveFilters = !!(search || statusFilter || typeFilter !== "" || dateFrom || dateTo || decidedBy || preparedBy || locationId || perPage !== 10 || sortBy !== "" || sortOrder !== "");

    const tiles = useMemo(() => {
      const totalArchiveProjects  = localStats?.totalArchiveProjects  ?? localArchiveProjects?.total ?? 0;
      const recentlyArchivedToday = localStats?.recentlyArchivedToday ?? "—";
      return [
        { label: "Total Archives",    value: totalArchiveProjects,  icon: <FaFolderOpen />,  variant: "normal" },
        { label: "Recently Archived", value: recentlyArchivedToday, icon: <IoTimeOutline />, variant: "normal" },
      ];
    }, [localStats, localArchiveProjects]);

    // ── Columns now use SortHeader ──
    const columns = useMemo(() => [
      {
        key: "PreparedBy",
        header: (
          <SortHeader
            label="PREPARED BY"
            sortKey="prepared_by_name"
            sortBy={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
          />
        ),
        cell: (r) => <span className="text-[#195c00] font-medium">{r.user?.name ?? r.prepared_by_name ?? "—"}</span>,
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
        cell: (r) => <span className="font-mono flex justify-center items-center">{r.reference ?? "—"}</span>,
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
          <button
            type="button"
            onClick={() => handleSort('decided_at')}
            className="flex justify-center items-center w-full text-slate-500 gap-1"
          >
            <FaRegClock className="text-sm" title="Decision Date" />
            <span className={`text-[11px] leading-none ${
              sortBy === 'decided_at' ? 'text-[#289800]' : 'text-slate-400'
            }`}>
              {sortBy === 'decided_at' ? (sortOrder === 'desc' ? '▼' : '▲') : '⇅'}
            </span>
          </button>
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
        cell: (r) => <ActionsDropdown row={r} isAdmin={isAdmin}  />,
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [sortBy, sortOrder]);

    /* ── Fetch ── */
    const fetchArchivedData = async ({
      silent            = false,
      targetPage        = currentPage,
      currentSearch     = search,
      currentStatus     = statusFilter,
      currentType       = typeFilter,
      currentPerPage    = perPage,
      currentDateFrom   = dateFrom,
      currentDateTo     = dateTo,
      currentDecidedBy  = decidedBy,
      currentPreparedBy = preparedBy,
      currentLocationId = locationId,
      currentSortBy     = sortBy,      // ← was hardcoded "decided_at"
      currentSortOrder  = sortOrder,
    } = {}) => {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      try {
        const response = await axios.get(ziggyRoute("roi.archive"), {
          params: {
            page:        targetPage,
            search:      currentSearch     || undefined,
            status:      currentStatus     || undefined,
            per_page:    currentPerPage,
            date_from:   currentDateFrom   || undefined,
            date_to:     currentDateTo     || undefined,
            decided_by:  currentDecidedBy  || undefined,
            prepared_by: currentPreparedBy || undefined,
            location_id: currentLocationId || undefined,
            sort_by:     currentSortBy     || undefined,  // ← dynamic now
            sort_order:  currentSortOrder  || undefined,
            type:        currentType !== "" ? currentType : undefined,
          },
          headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
        });

        const projectsPayload = response.data?.props?.archiveProjects ?? response.data?.archiveProjects ?? response.data;
        setLocalArchiveProjects(projectsPayload);
        setCurrentPage(targetPage);

        const statsPayload = response.data?.props?.stats ?? response.data?.stats ?? null;
        if (statsPayload) setLocalStats(statsPayload);
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

    const handleStatusChange    = (val) => { setStatusFilter(val); fetchArchivedData({ currentStatus: val,     targetPage: 1 }); };
    const handleTypeChange      = (val) => { setTypeFilter(val);   fetchArchivedData({ currentType: val,       targetPage: 1 }); };
    const handleDecidedByApply  = (val) => { setDecidedBy(val);    fetchArchivedData({ currentDecidedBy: val,  targetPage: 1 }); };
    const handlePreparedByApply = (val) => { setPreparedBy(val);   fetchArchivedData({ currentPreparedBy: val, targetPage: 1 }); };
    const handleLocationApply   = (val) => { setLocationId(val);   fetchArchivedData({ currentLocationId: val, targetPage: 1 }); };
    const handleDateApply       = ()    => { setShowDatePicker(false); fetchArchivedData({ targetPage: 1 }); };
    const handleDateClear       = ()    => {
      setDateFrom("");
      setDateTo("");
      setShowDatePicker(false);
      fetchArchivedData({ currentDateFrom: undefined, currentDateTo: undefined, targetPage: 1 });
    };
    const handlePerPageInputApply = () => {
      const raw = parseInt(perPageInput, 10);
      const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 500) : perPage;
      setPerPage(num); setPerPageInput(String(num)); setShowPerPagePicker(false);
      fetchArchivedData({ currentPerPage: num, targetPage: 1 });
    };

    const handleClearAllFilters = () => {
      setSearch("");
      setStatusFilter("");
      setTypeFilter("");
      setDateFrom("");
      setDateTo("");
      setDecidedBy("");
      setPreparedBy("");
      setLocationId("");
      setPerPage(10);
      setPerPageInput("10");
      // Reset sort to defaults
      setSortBy("");
      setSortOrder("");
      setShowDatePicker(false);
      setShowDecidedBy(false);
      setShowPreparedBy(false);
      setShowLocation(false);
      LS.clearAll();
      LS.set('per_page',   "10");
      LS.set('sort_by',    "");
      LS.set('sort_order', "");
      LS.set('sort_by',    "");
      LS.set('sort_order', "");

      fetchArchivedData({
        currentSearch:     "",
        currentStatus:     "",
        currentType:       "",
        currentDateFrom:   undefined,
        currentDateTo:     undefined,
        currentDecidedBy:  "",
        currentPreparedBy: "",
        currentLocationId: "",
        currentSortBy:     "",
        currentSortOrder:  "",
        
        targetPage:        1,
      });
    };

    const goToPage = (p) => fetchArchivedData({ targetPage: p });

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

    const searchControl = (
      <SearchControl
        search={search}
        onSearchChange={setSearch}
        sortOrder={sortOrder}
        onSortToggle={() => handleSort(sortBy || 'decided_at')}
        loading={loading || isRefreshing}
        onRefresh={() => fetchArchivedData({ targetPage: localArchiveProjects?.current_page ?? 1 })}
      />
    );

    const decidedBySlot = (
      <div className="relative flex-shrink-0" ref={decidedByRef}>
        <FilterChip
          active={!!decidedBy}
          icon={<MdVerifiedUser />}
          label="Decided By"
          value={decidedBy}
          onClick={() => setShowDecidedBy((p) => !p)}
          onClear={() => handleDecidedByApply("")}
        />
        <TextFilterPopup
          open={showDecidedBy}
          label="Decided By"
          placeholder="e.g. Juan dela Cruz"
          icon={<MdVerifiedUser className="text-[#4FA34E]" />}
          value={decidedBy}
          onChange={setDecidedBy}
          onApply={handleDecidedByApply}
          onClose={() => setShowDecidedBy(false)}
        />
      </div>
    );

    const statusIcon =
      statusFilter === "approved"  ? <MdCheckCircle className="text-[#4FA34E] text-sm" /> :
      statusFilter === "rejected"  ? <MdCancel className="text-red-500 text-sm" /> :
      statusFilter === "cancelled" ? <MdOutlineCancel className="text-red-500 text-sm" /> :
      null;

    const filterToolbar = (
      <ListFilterToolbar
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAllFilters}
        statusOptions={[
          { value: "",          label: "All Status" },
          { value: "approved",  label: "Approved" },
          { value: "rejected",  label: "Disapproved" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        typeOptions={[
          { value: "", label: "All Types" },
          { value: 1,  label: "Existing" },
          { value: 0,  label: "Potential" },
        ]}
        typeFilter={typeFilter}
        onTypeChange={handleTypeChange}
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

    // --- Mobile card layout (below md) ---
    // --- Mobile card layout (below md) ---
    const renderArchiveCard = (r) => {
      const s = String(r.status ?? "").toLowerCase();
      const isRejected = s === "rejected";
      const isApproved = s === "approved";
      const isCancelled = s === "cancelled";

      return (
        <div
          onClick={() => router.visit(ziggyRoute("roi.archive.show", r.id))}
          className="cursor-pointer px-2 py-3 hover:bg-slate-50 transition-colors rounded-xl"
        >
          <div className="gap-2">
            {/* Top Row: Type & Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">{r.type === 1 ? 'Existing' : 'Potential'}</p>
              <div className="flex items-center justify-end gap-1">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider whitespace-nowrap
                  ${isRejected
                    ? "bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20"
                    : isApproved
                    ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                    : isCancelled
                    ? "bg-red-600/10 text-red-600 border border-red-300"
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}>
                  {isRejected ? 'Disapproved' : (r.status ?? '—')}
                </span>
            
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <ActionsDropdown row={r} isAdmin={isAdmin} hideView={true}/>
                </div>
              </div>
            </div>

            {/* Middle Row: Company Details */}
            <div className="min-w-0 leading-relaxed pt-4">     
              <p className="text-xs font-medium">{r.reference ?? '—'}</p>
              <p className="text-sm font-semibold truncate">{r.company_name ?? '—'}</p>
              <p className="text-[11px] text-slate-800 font-semibold font-mono">{r.company_sap_code ?? ''}</p>
            </div>
          </div>

          {/* Bottom-Mid Row: Contract Info */}
          <div className="flex items-end justify-between mt-5 pb-1.5 text-[11px] uppercase font-medium text-zinc-700">
            <div className="flex flex-col">
              <span className="pb-2">{r.contract_type ?? '—'} {r.contract_years != null ? `· ${r.contract_years} yrs` : ''}</span>
              <span className="normal-case text-[10px] text-slate-500 italic">prepared by <span className="text-[#195c00] font-semibold">{r.user?.name ?? '—'}</span></span>
              <span className="normal-case text-[10px] text-slate-500 italic">
                decided by: <span className={`font-semibold
                  ${isRejected
                    ? "text-[#C40000]"
                    : isApproved
                    ? "text-[#2DA300]"
                    : isCancelled
                    ? "text-red-600"
                    : "text-blue-700"
                  }`}>{r.decided_by_name ?? '—'}</span>
              </span>
            </div>
            
            
            {/* Bottom Right Details: Decided by & Date */}
            <div className="flex flex-col items-end gap-0.5">
              <span className="normal-case text-[10px] text-slate-500">
                {r.decided_at_display ? formatDateLabel(r.decided_at_display) : '—'}
              </span>
            </div>
          </div>
        </div>
      );
    };

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
        renderCard={renderArchiveCard}
      />
    );
  }

export default ArchiveList;