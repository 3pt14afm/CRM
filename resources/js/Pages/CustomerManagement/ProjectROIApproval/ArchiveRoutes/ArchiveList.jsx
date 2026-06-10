import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import { MdSearch, MdCheckCircle, MdCancel, MdExpandMore, MdOutlineFilterAlt, MdDateRange, MdClose } from "react-icons/md";
import { route as ziggyRoute } from "ziggy-js";
import { router } from '@inertiajs/react';

function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric'
  });
}

function ArchiveList({ archiveProjects: initialArchiveProjects, stats, filters }) {
  const [localArchiveProjects, setLocalArchiveProjects] = useState(initialArchiveProjects);
  const [search, setSearch] = useState(filters?.search ?? "");
  const [statusFilter, setStatusFilter] = useState(filters?.status ?? "");
  const [dateFrom, setDateFrom] = useState(filters?.date_from ?? "");
  const [dateTo, setDateTo] = useState(filters?.date_to ?? "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const datePickerRef = useRef(null);

  useEffect(() => {
    setLocalArchiveProjects(initialArchiveProjects);
  }, [initialArchiveProjects]);

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tiles = useMemo(() => {
    const totalArchiveProjects = stats?.totalArchiveProjects ?? localArchiveProjects?.total ?? 0;
    const recentlyArchivedToday = stats?.recentlyArchivedToday ?? "—";
    return [
      { label: "Total Archives", value: totalArchiveProjects, icon: <FaFolderOpen />, variant: "normal" },
      { label: "Recently Archived", value: recentlyArchivedToday, icon: <IoTimeOutline />, variant: "normal" },
    ];
  }, [stats, localArchiveProjects]);

  const columns = useMemo(() => [
    {
      key: "PreparedBy",
      header: "PREPARED BY",
      cell: (r) => <span className="text-[#195c00] font-medium">{r.user?.name ?? "—"}</span>,
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
      header: <div className="text-center w-full">STATUS</div>,
      key: "status",
      cell: (row) => {
        const s = String(row.status ?? "").toLowerCase();
        const isRejected = s === "rejected";
        const isApproved = s === "approved";
        return (
          <div className="flex justify-center items-center">
            <span className={`rounded-full px-2 text-[9px] font-bold uppercase
              ${isRejected
                ? "bg-[#FDECEC] text-[#C40000] border border-[#C40000]/20"
                : isApproved
                ? "bg-[#E9F7E7] text-[#2DA300] border border-[#2DA300]/20"
                : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}>
              {row.status ?? "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "decided_by",
      header: <div className="text-center w-full">DECIDED BY</div>,
      cell: (r) => (
        <span className="text-blue-500 font-medium text-xs flex items-center justify-center">
          {r.decided_by_name ?? "—"}
        </span>
      ),
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
          {r.decided_at_display ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: <div className="text-center w-full">ACTIONS</div>,
      cell: (r) => (
        <div className="flex items-center justify-center gap-2">
          <button
            className="px-1.5 py-1 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] border border-[#B5EBA2]/40 font-semibold hover:shadow-inner hover:bg-[#B5EBA2]/30"
            type="button"
            onClick={() => router.visit(ziggyRoute("roi.archive.show", r.id))}
          >
            <IoEyeOutline className="text-[18px]" />
          </button>
        </div>
      ),
    },
  ], []);

  const fetchArchivedData = async (
    targetPage = 1,
    currentSearch = search,
    currentStatus = statusFilter,
    currentDateFrom = dateFrom,
    currentDateTo = dateTo,
  ) => {
    setLoading(true);
    try {
      const response = await axios.get(ziggyRoute("roi.archive"), {
        params: {
          page: targetPage,
          search: currentSearch || undefined,
          status: currentStatus || undefined,
          date_from: currentDateFrom || undefined,
          date_to: currentDateTo || undefined,
        },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
        },
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
    const delayDebounceFn = setTimeout(() => {
      fetchArchivedData(1, search, statusFilter, dateFrom, dateTo);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    fetchArchivedData(1, search, val, dateFrom, dateTo);
  };

  const handleDateApply = () => {
    setShowDatePicker(false);
    fetchArchivedData(1, search, statusFilter, dateFrom, dateTo);
  };

  const handleDateClear = () => {
    setDateFrom("");
    setDateTo("");
    setShowDatePicker(false);
    fetchArchivedData(1, search, statusFilter, "", "");
  };

  const goToPage = (p) => {
    fetchArchivedData(p, search, statusFilter, dateFrom, dateTo);
  };

  const hasDateFilter = dateFrom || dateTo;

  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo) return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  const rows = localArchiveProjects?.data ?? [];
  const pagination = localArchiveProjects && typeof localArchiveProjects.current_page === "number"
    ? {
        page: localArchiveProjects.current_page,
        perPage: localArchiveProjects.per_page ?? 10,
        total: localArchiveProjects.total ?? rows.length,
        onPageChange: goToPage,
      }
    : null;

  const searchControl = (
    <div className="flex flex-row items-center gap-1.5 min-w-0 w-full sm:w-auto">

      {/* Search */}
      <div className="relative h-9 flex items-center min-w-0 flex-1 sm:flex-none">
        <MdSearch className="absolute left-2.5 text-slate-400 text-base pointer-events-none z-10" />
        <input
          type="text"
          placeholder="Search archives…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`h-9 w-full sm:w-52 min-w-0 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg bg-white text-black placeholder:text-slate-400
            focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
            transition-[border-color,box-shadow] duration-150
            ${loading ? "opacity-60 pointer-events-none" : ""}`}
        />
      </div>

      {/* Status filter */}
<div className="relative h-9 flex items-center flex-shrink-0">
  {statusFilter === "approved" ? (
    <MdCheckCircle className="absolute left-2.5 text-[#4FA34E] text-sm pointer-events-none z-10" />
  ) : statusFilter === "rejected" ? (
    <MdCancel className="absolute left-2.5 text-red-500 text-sm pointer-events-none z-10" />
  ) : (
    <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
  )}
  <select
    value={statusFilter}
    onChange={(e) => handleStatusChange(e.target.value)}
    /* 🌟 Forced line-height to 0 to snap text perfectly center vertically */
    style={{ lineHeight: '0' }}
    className="h-9 w-28 sm:w-32 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white text-black appearance-none cursor-pointer
      focus:outline-none flex items-center focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
      transition-[border-color,box-shadow] duration-150"
  >
    <option value="">All Status</option>
    <option value="approved">Approved</option>
    <option value="rejected">Rejected</option>
  </select>
</div>

      {/* Date Range Picker */}
      <div className="relative flex-shrink-0" ref={datePickerRef}>
        <button
          type="button"
          onClick={() => setShowDatePicker((p) => !p)}
          className={`h-9 flex items-center gap-1.5 px-2.5 text-[13px] font-medium border rounded-lg transition-all duration-150 whitespace-nowrap
            ${hasDateFilter
              ? "border-[#4FA34E]/40 bg-[#E9F7E7] text-[#2DA300]"
              : "border-gray-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-gray-300"
            }`}
        >
          <MdDateRange size={15} className={hasDateFilter ? "text-[#4FA34E]" : "text-slate-400"} />
          {hasDateFilter && (
            <span className="hidden sm:inline text-[12px] max-w-[180px] truncate">{dateLabel}</span>
          )}
          {hasDateFilter && (
            <span
              className="ml-0.5 flex items-center text-[#2DA300] hover:text-red-400 transition-colors"
              onMouseDown={(e) => { e.stopPropagation(); handleDateClear(); }}
            >
              <MdClose size={13} />
            </span>
          )}
        </button>

        {/* Dropdown */}
        {showDatePicker && (
          <div className="absolute right-0 top-11 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">

            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-[#E9F7E7] border border-[#4FA34E]/20">
                  <MdDateRange size={15} className="text-[#4FA34E]" />
                </div>
                <span className="text-[12px] font-semibold text-slate-700 tracking-wide">Date Range</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <MdClose size={13} />
              </button>
            </div>

            {/* Date Inputs */}
            <div className="px-4 py-4 flex flex-col gap-3">

              {/* From */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-white text-slate-700 border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
                    transition-[border-color,box-shadow] duration-150"
                />
                {dateFrom && (
                  <p className="mt-1 text-[11px] text-[#4FA34E] font-medium pl-1">
                    {formatDateLabel(dateFrom)}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-slate-400 font-medium">to</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* To */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-white text-slate-700 border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
                    transition-[border-color,box-shadow] duration-150"
                />
                {dateTo && (
                  <p className="mt-1 text-[11px] text-[#4FA34E] font-medium pl-1">
                    {formatDateLabel(dateTo)}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex items-center gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={handleDateClear}
                className="flex-1 h-8 text-[12px] font-medium border border-gray-200 rounded-lg text-slate-500
                  hover:bg-slate-50 transition-colors duration-150"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleDateApply}
                className="flex-1 h-8 text-[12px] font-semibold rounded-lg text-white bg-[#4FA34E]
                  hover:bg-[#3d8f3c] transition-colors duration-150"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
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
      loading={loading}
      emptyText="No matching records found."
    />
  );
}

export default ArchiveList;