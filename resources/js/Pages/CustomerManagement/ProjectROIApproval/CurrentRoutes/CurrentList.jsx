import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import { MdSearch, MdOutlineFilterAlt, MdDateRange, MdClose, MdExpandMore } from 'react-icons/md';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric',
  });
}

function CurrentList({ currentProjects: initialCurrentProjects, stats, filters }) {
  const [localCurrentProjects, setLocalCurrentProjects] = useState(initialCurrentProjects);
  const [search, setSearch] = useState(filters?.search ?? "");
  const [statusFilter, setStatusFilter] = useState(filters?.status ?? "");
  const [dateFrom, setDateFrom] = useState(filters?.date_from ?? "");
  const [dateTo, setDateTo] = useState(filters?.date_to ?? "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const datePickerRef = useRef(null);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  }).format(today);

  useEffect(() => {
    setLocalCurrentProjects(initialCurrentProjects);
  }, [initialCurrentProjects]);

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

  const fetchCurrentData = async (
    targetPage = 1,
    currentSearch = search,
    currentStatus = statusFilter,
    currentDateFrom = dateFrom,
    currentDateTo = dateTo,
  ) => {
    setLoading(true);
    try {
      const response = await axios.get(route("roi.current"), {
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
      const payload = response.data?.props?.currentProjects ?? response.data?.currentProjects ?? response.data;
      setLocalCurrentProjects(payload);
    } catch (error) {
      console.error("Failed to fetch current projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCurrentData(1, search, statusFilter, dateFrom, dateTo);
    }, 400);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    fetchCurrentData(1, search, val, dateFrom, dateTo);
  };

  const handleDateApply = () => {
    setShowDatePicker(false);
    fetchCurrentData(1, search, statusFilter, dateFrom, dateTo);
  };

  const handleDateClear = () => {
    setDateFrom("");
    setDateTo("");
    setShowDatePicker(false);
    fetchCurrentData(1, search, statusFilter, "", "");
  };

  const goToPage = (p) => {
    fetchCurrentData(p, search, statusFilter, dateFrom, dateTo);
  };

  const hasDateFilter = dateFrom || dateTo;

  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo) return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  const rows = localCurrentProjects?.data ?? [];
  const pagination = localCurrentProjects && typeof localCurrentProjects.current_page === "number"
    ? {
        page: localCurrentProjects.current_page,
        perPage: localCurrentProjects.per_page ?? 10,
        total: localCurrentProjects.total ?? rows.length,
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
          placeholder="Search projects…"
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
        <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 w-28 sm:w-32 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white text-black appearance-none cursor-pointer
      focus:outline-none flex items-center focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
      transition-[border-color,box-shadow] duration-150"
        >
          <option value="">All Status</option>
          <option value="for_review">For Review</option>
          <option value="for_checking">For Checking</option>
          <option value="for_endorsement">For Endorsement</option>
          <option value="for_confirmation">For Confirmation</option>
          <option value="for_approval">For Approval</option>
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

        {showDatePicker && (
          <div className="absolute right-0 top-11 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">

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

            <div className="px-4 py-4 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-white text-slate-700 border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
                    transition-[border-color,box-shadow] duration-150"
                />
                {dateFrom && (
                  <p className="mt-1 text-[11px] text-[#4FA34E] font-medium pl-1">{formatDateLabel(dateFrom)}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-slate-400 font-medium">to</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">To</label>
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
                  <p className="mt-1 text-[11px] text-[#4FA34E] font-medium pl-1">{formatDateLabel(dateTo)}</p>
                )}
              </div>
            </div>

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
CurrentList.layout = page => <AuthenticatedLayout children={page} />