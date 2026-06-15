import React, { useMemo, useState, useEffect, useRef } from 'react';
import { router, Head } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline, IoEyeOutline } from 'react-icons/io5';
import {
  MdSearch, MdOutlineFilterAlt, MdDateRange, MdClose, MdExpandMore,
  MdPerson, MdVerifiedUser, MdCheckCircle, MdCancel
} from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb'; 
import { route as ziggyRoute } from 'ziggy-js';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// Helper to convert "YYYY-MM-DD" into "Month D, YYYY" (e.g., "June 6, 2026")
function formatDateToLongStyle(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = months[parseInt(month, 10) - 1];
  const dayNum = parseInt(day, 10);
  return `${monthName} ${dayNum}, ${year}`;
}

const approvalLevelLabel = (value) => {
  if (value === 'PRESIDENT_AND_CEO') return 'President & CEO';
  if (value === 'VP_AND_CCTO') return 'VP & CCTO';
  if (value === 'ESD_DIRECTOR') return 'ESD Director';
  return 'Director - Customer Engagement';
};

/* ─── FilterChip component from your ROI design ─── */
function FilterChip({ active, icon, label, value, onClick, onClear, hideLabelOnActive = false }) {
  return (
    <div className={`h-9 flex items-center rounded-lg border text-[13px] transition-all duration-150 ${
      active 
        ? 'border-[#4FA34E] bg-[#4FA34E]/5 text-[#2E7D32] font-medium pl-2.5 pr-1.5 gap-1.5' 
        : 'border-gray-200 bg-white text-slate-600 hover:bg-slate-50 pl-3 pr-2.5 gap-1.5'
    }`}>
      <button type="button" onClick={onClick} className="flex items-center gap-1.5 h-full focus:outline-none">
        {icon}
        {(!active || !hideLabelOnActive) && <span>{label}{active && ':'}</span>}
        {active && <span className="font-semibold text-[#1B5E20] max-w-[220px] truncate">{value}</span>}
        {!active && <MdExpandMore size={14} className="text-slate-400" />}
      </button>
      {active && (
        <button type="button" onClick={onClear} className="w-4 h-4 rounded-full flex items-center justify-center text-[#2E7D32]/60 hover:text-[#2E7D32] hover:bg-[#4FA34E]/10 transition-colors focus:outline-none">
          <MdClose size={12} />
        </button>
      )}
    </div>
  );
}

/* ─── TextFilterPopup component from your ROI design ─── */
function TextFilterPopup({ icon, label, placeholder, value, onChange, onApply, open, onClose }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value, open]);

  const apply = () => { onApply(draft); onClose(); };
  const clear  = () => { setDraft(""); onApply(""); onClose(); };

  if (!open) return null;
  return (
    <div className="absolute left-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[12px] font-semibold text-slate-700 tracking-wide">{label}</span>
      </div>
      <div className="relative">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 px-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E] text-slate-700"
          onKeyDown={(e) => e.key === 'Enter' && apply()}
        />
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        <button type="button" onClick={clear} className="flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50">
          Clear
        </button>
        <button type="button" onClick={apply} className="flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]">
          Apply
        </button>
      </div>
    </div>
  );
}

function ArchiveList({ archiveProjects = null, stats = null, filters = {} }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(today);

  const rows = archiveProjects?.data ?? [];

  // ROI Matching Filter States
  const [search, setSearch] = useState(filters.search ?? '');
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
  const [perPage, setPerPage] = useState(filters.per_page ?? 10);
  const [perPageInput, setPerPageInput] = useState(filters.per_page ?? 10);
  const [decidedBy, setDecidedBy] = useState(filters.decided_by ?? '');
  const [preparedBy, setPreparedBy] = useState(filters.prepared_by ?? '');
  
  const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
  const [dateTo, setDateTo] = useState(filters.date_to ?? '');

  // Dropdown visibility references matching ROI pattern
  const [showPerPagePicker, setShowPerPagePicker] = useState(false);
  const [showDecidedBy, setShowDecidedBy] = useState(false);
  const [showPreparedBy, setShowPreparedBy] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const perPagePickerRef = useRef(null);
  const decidedByRef = useRef(null);
  const preparedByRef = useRef(null);
  const datePickerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target)) setShowPerPagePicker(false);
      if (decidedByRef.current && !decidedByRef.current.contains(e.target)) setShowDecidedBy(false);
      if (preparedByRef.current && !preparedByRef.current.contains(e.target)) setShowPreparedBy(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const runQuery = (updatedParams) => {
    const merged = {
      search,
      status: statusFilter,
      per_page: perPage,
      decided_by: decidedBy,
      prepared_by: preparedBy,
      date_from: dateFrom,
      date_to: dateTo,
      page: 1,
      ...updatedParams
    };

    Object.keys(merged).forEach(key => {
      if (merged[key] === '' || merged[key] === null || merged[key] === undefined) {
        delete merged[key];
      }
    });

    router.get(ziggyRoute('sprf.archive'), merged, { preserveScroll: true, preserveState: true });
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    runQuery({ status: val });
  };

  const handlePerPageInputApply = () => {
    const val = parseInt(perPageInput, 10) || 10;
    setPerPage(val);
    setShowPerPagePicker(false);
    runQuery({ per_page: val });
  };

  const handleDecidedByApply = (val) => {
    setDecidedBy(val);
    runQuery({ decided_by: val });
  };

  const handlePreparedByApply = (val) => {
    setPreparedBy(val);
    runQuery({ prepared_by: val });
  };

  const handleDateApply = () => {
    setShowDatePicker(false);
    runQuery();
  };

  const handleDateClear = () => {
    setDateFrom('');
    setDateTo('');
    setShowDatePicker(false);
    runQuery({ date_from: '', date_to: '' });
  };

  const [approvalLevel, setApprovalLevel] = useState(filters.approval_level ?? '');

// 2. Add handler
const handleApprovalLevelChange = (val) => {
  setApprovalLevel(val);
  runQuery({ approval_level: val });
};

  const hasDateFilter = !!(dateFrom || dateTo);
  const dateLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${formatDateToLongStyle(dateFrom)} to ${formatDateToLongStyle(dateTo)}`;
    if (dateFrom) return `From ${formatDateToLongStyle(dateFrom)}`;
    if (dateTo) return `Until ${formatDateToLongStyle(dateTo)}`;
    return '';
  }, [dateFrom, dateTo]);

  const tiles = useMemo(() => {
    const totalArchiveProjects = stats?.totalArchiveProjects ?? archiveProjects?.total ?? 0;
    const recentlyArchivedToday = stats?.recentlyArchivedToday ?? '0 Today';
    return [
      { label: 'Total Archives', value: totalArchiveProjects, icon: <FaFolderOpen />, variant: 'normal' },
      { label: 'Recently Archived', value: recentlyArchivedToday, icon: <IoTimeOutline />, variant: 'normal' },
    ];
  }, [stats, archiveProjects]);

  // Synchronized table column tracking matching the layout blueprint of CurrentList.jsx
const columns = useMemo(
    () => [
      {
        key: 'prepared_by',
        header: 'PREPARED BY',
        cell: (r) => <span className="text-[#195c00] font-semibold">{r.prepared_by ?? '—'}</span>,
      },
      {
        key: 'sprf_no',
        header: <div className="text-center w-full">SPRF #</div>,
        cell: (r) => <div className="text-center"><span className="font-medium">{r.sprf_no ?? '—'}</span></div>,
      },
      {
        key: 'sub_category',
        header: <div className="text-center w-full">SUB CATEGORY</div>,
        cell: (r) => <span className="font-medium flex justify-center items-center">{r.sub_category ?? '—'}</span>,
      },
      {
        key: 'company_name',
        header: <div className="text-center w-full">ACCOUNT</div>,
        cell: (r) => <div className="w-full flex justify-center font-medium items-center"><span>{r.company_name ?? '—'}</span></div>,
      },
      {
        key: 'account_manager',
        header: <div className="text-center w-full">ACCOUNT MANAGER</div>,
        cell: (r) => <div className="w-full flex justify-center font-medium items-center"><span>{r.account_manager ?? '—'}</span></div>,
      },
      {
        key: 'approval_level',
        header: <div className="text-center w-full">APPROVAL LEVEL</div>,
        cell: (r) => (
          <span className="font-medium text-blue-700 flex justify-center items-center text-center text-[11px] xl:text-xs">
            {/* Ensure approvalLevelLabel function is imported/defined */}
            {approvalLevelLabel(r.approval_level)}
          </span>
        ),
      },
      {
        key: 'status',
        header: <div className="text-center w-full">STATUS</div>,
        cell: (row) => {
          const s = String(row.status ?? "").toLowerCase();
          const isRejected = s === "rejected";
          const isApproved = s === "approved";
          return (
            <div className="w-full flex justify-center items-center">
              <div className="flex flex-col items-center leading-tight">
                <span className={`inline-block px-2 py-1 text-center rounded-full text-[8px] xl:text-[9px] font-bold tracking-wider uppercase border
                  ${isRejected
                    ? "bg-[#FDECEC] text-[#C40000] border-[#C40000]/20"
                    : isApproved
                    ? "bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20"
                    : "bg-blue-100 text-blue-700 border-blue-200"
                  }`}>
                  {row.status ?? "—"}
                </span>
                {/* Decision context replacing 'current_approver' */}
                <span className="mt-1 text-[10px] text-center italic text-blue-700">by: {row.decided_by_name ?? '—'}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'decided_at',
        header: <div className="text-center w-full">SUBMITTED AT</div>,
        cell: (r) => (
          <div className="w-full text-slate-600 flex justify-center items-center text-center">
            <span className="text-[10px] xl:text-[11px]">{r.decided_at_display ?? '—'}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) => (
          <div className="flex justify-center items-center gap-2">
            <button
              className="px-2 py-2 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold"
              onClick={() => router.visit(ziggyRoute('sprf.archive.show', r.id))}
            >
              <IoEyeOutline className="text-[18px]" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const pagination =
    archiveProjects && typeof archiveProjects.current_page === 'number'
      ? {
          page: archiveProjects.current_page,
          perPage: archiveProjects.per_page ?? 10,
          total: archiveProjects.total ?? rows.length,
          onPageChange: (p) => runQuery({ page: p }),
        }
      : null;

  /* ─── Search Bar ─── */
  const searchControl = (
    <div className="relative w-full max-w-md">
      <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        placeholder="Search archives..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && runQuery({ search: e.target.value })}
        className="w-full h-9 pl-9 pr-8 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
      />
      {search && (
        <button 
          onClick={() => { setSearch(''); runQuery({ search: '' }); }} 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <MdClose size={16} />
        </button>
      )}
    </div>
  );

  /* ─── Filter toolbar ─── */
  const filterToolbar = (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">

      {/* Status Box */}
      <div className="relative h-9 flex items-center flex-shrink-0">
        {statusFilter === "approved"
          ? <MdCheckCircle className="absolute left-2.5 text-[#4FA34E] text-sm pointer-events-none z-10" />
          : statusFilter === "rejected"
          ? <MdCancel className="absolute left-2.5 text-red-500 text-sm pointer-events-none z-10" />
          : <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
        }
        <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 w-28 sm:w-36 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer
            focus:outline-none flex items-center focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
            transition-[border-color,box-shadow] duration-150 text-slate-700">
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Per Page picker */}
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

{/* Approval Level Filter */}
    <div className="relative h-9 flex items-center flex-shrink-0">
      <MdVerifiedUser className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
      <select value={approvalLevel} onChange={(e) => handleApprovalLevelChange(e.target.value)}
        className="h-9 w-36 sm:w-44 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:border-[#4FA34E] text-slate-700">
        <option value="">All Levels</option>
        <option value="DIRECTOR_CUSTOMER_ENGAGEMENT">Director - Customer Engagement</option>
        <option value="ESD_DIRECTOR">ESD Director</option>
        <option value="VP_AND_CCTO">VP & CCTO</option>
        <option value="PRESIDENT_AND_CEO">President & CEO</option>
      </select>
    </div>

      {/* Prepared By */}
      <div className="relative flex-shrink-0" ref={preparedByRef}>
        <FilterChip
          active={!!preparedBy}
          icon={<MdPerson size={15} />}
          label="Prepared By"
          value={preparedBy}
          onClick={() => { 
            setShowPreparedBy((p) => !p); 
            setShowDecidedBy(false);
            setShowDatePicker(false); 
          }}
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

      {/* Date Range Picker Popover */}
      <div className="relative flex-shrink-0" ref={datePickerRef}>
        <FilterChip
          active={!!hasDateFilter}
          icon={<MdDateRange size={15} />}
          label="Date Range"
          value={dateLabel}
          hideLabelOnActive={true} 
          onClick={() => { 
            setShowDatePicker((p) => !p); 
            setShowDecidedBy(false);
            setShowPreparedBy(false);
          }}
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
    <>
      <Head title="SPRF Archive" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project SPRF Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Archive</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          <ProjectListSection
            tiles={tiles}
            tableTitle="Archived Projects"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={pagination}
            searchControl={searchControl}
            filterControl={filterToolbar}
          />
 </div>

        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end" />
        </div>
      </div>
    </>
  );
}

export default ArchiveList;
ArchiveList.layout = page => <AuthenticatedLayout children={page} />;