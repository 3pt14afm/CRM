import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFileInvoice, FaFolderOpen, FaTrophy } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { route as ziggyRoute } from "ziggy-js";
import SortHeader from '@/Components/roi/filters/SortHeader';

const LS = {
  get: (key, fallback = "") => {
    try { return localStorage.getItem(`archived_proposals_${key}`) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(`archived_proposals_${key}`, value); }
    catch {}
  },
};

function formatArchivedAt(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);

  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${mm}/${dd}/${yy} ${hh}:${min}`;
}

// ─── Tab switcher (ROI / SPRF) ───────────────────────────────────
function ProjectTypeTabs({ active, onChange, roiCount, sprfCount }) {
  const tabs = [
    { key: 'roi',  label: 'ROI Proposals',  count: roiCount },
    { key: 'sprf', label: 'SPRF Proposals', count: sprfCount },
  ];

  return (
    <div className="flex items-center gap-1 -mb-2  px-1">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
              isActive ? "text-[#289800]" : "text-slate-500 hover:text-slate-700"
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

function statusBadgeClasses(status) {
  if (status === 'awarded') {
    return "bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20";
  }
  // closed
  return "bg-slate-100 text-slate-500 border-slate-300";
}

function ArchivedProposals({ archivedRoiProposals, archivedSprfProposals, stats }) {
  const [activeTab, setActiveTab] = useState(() => LS.get('active_tab', 'roi'));
  const [search, setSearch] = useState(() => LS.get('arch_search', ''));
  const [statusFilter, setStatusFilter] = useState(() => LS.get('arch_status', 'all'));
  const [sortBy, setSortBy] = useState(() => LS.get('arch_sort_by', 'archived_at'));
  const [sortOrder, setSortOrder] = useState(() => LS.get('arch_sort_order', 'desc'));
  const [loading, setLoading] = useState(false);

  // Local state mirrors the initial Inertia props, but is updated via axios
  // responses instead of relying on Inertia's automatic prop refresh —
  // same approach as GeneratedProposals.jsx.
  const [roiData, setRoiData] = useState(archivedRoiProposals);
  const [sprfData, setSprfData] = useState(archivedSprfProposals);
  const [liveStats, setLiveStats] = useState(stats);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    LS.set('active_tab', tab);
  };

  const fetchFiltered = async ({ search: s, status: st, sortBy: sb, sortOrder: so }, page) => {
    setLoading(true);
    const pageParam = activeTab === 'sprf'
      ? { archived_sprf_page: page ?? 1 }
      : { archived_roi_page: page ?? 1 };

    try {
      const response = await axios.get(ziggyRoute("proposals.index"), {
        params: {
          ...pageParam,
          arch_search:     s  || undefined,
          arch_status:     st !== 'all' ? st : undefined,
          arch_sort_by:    sb || undefined,
          arch_sort_order: so || undefined,
        },
        headers: {
          // Ask the backend for a JSON payload instead of a full Inertia response
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
      });

      const data = response.data ?? {};
      if (data.archivedRoiProposals)  setRoiData(data.archivedRoiProposals);
      if (data.archivedSprfProposals) setSprfData(data.archivedSprfProposals);
      if (data.stats)                 setLiveStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch archived proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search -> server request
  useEffect(() => {
    const t = setTimeout(() => {
      LS.set('arch_search', search);
      fetchFiltered({ search, status: statusFilter, sortBy, sortOrder });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    LS.set('arch_status', status);
    fetchFiltered({ search, status, sortBy, sortOrder });
  };

  // Column header sort (click "CLIENT / COMPANY", "STATUS", etc.)
  const handleSort = (key) => {
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(key);
    setSortOrder(newOrder);
    LS.set('arch_sort_by', key);
    LS.set('arch_sort_order', newOrder);
    fetchFiltered({ search, status: statusFilter, sortBy: key, sortOrder: newOrder });
  };

  const roiCount  = liveStats?.archivedRoiCount  ?? roiData?.total  ?? 0;
  const sprfCount = liveStats?.archivedSprfCount ?? sprfData?.total ?? 0;

  const activeData = activeTab === 'sprf' ? sprfData : roiData;
  const rows = activeData?.data ?? [];

  const tiles = useMemo(() => [
    {
      label: "Archived Proposals",
      value: activeTab === 'sprf' ? sprfCount : roiCount,
      icon: <FaFolderOpen />,
      variant: "normal",
    },
    {
      label: "Awarded",
      value: rows.filter((r) => r.status === 'awarded').length,
      icon: <FaTrophy />,
      variant: "normal",
    },
  ], [activeTab, roiCount, sprfCount, rows]);

const columns = useMemo(() => [
    {
      key: "company_name",
      header: (
        <SortHeader label="CLIENT / COMPANY" sortKey="company_name" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="left" />
      ),
      cell: (r) => <span className="font-medium text-slate-600 flex justify-start">{r.company_name ?? "—"}</span>,
    },
    {
      key: "project_ref",
      header: (
        <SortHeader label={activeTab === 'sprf' ? "SPRF NO." : "ARCHIVE REF"} sortKey="project_ref" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="left" />
      ),
      cell: (r) => <span className="text-xs text-slate-400 flex justify-start">{r.project_ref}</span>,
    },
    {
      key: "status",
      header: (
        <SortHeader label="STATUS" sortKey="status" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="left" />
      ),
      cell: (r) => (
        <div className="flex justify-start">
          <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${statusBadgeClasses(r.status)}`}>
            {r.status}
          </span>
        </div>
      ),
    },
    {
      key: "archived_at",
      header: (
        <SortHeader label="ARCHIVED AT" sortKey="archived_at" sortBy={sortBy} sortDirection={sortOrder} onSort={handleSort} align="left" />
      ),
      cell: (r) => (
        <div className="flex justify-start">
          <span className="text-xs font-mono text-slate-600">
            {formatArchivedAt(r.archived_at)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="block text-center">ACTIONS</span>,
      cell: (r) => (
        <div className="flex justify-center">
          <button
            className="px-2 py-1 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
            type="button"
            onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id, type: activeTab }))}
          >
            <FaFileInvoice className="text-[12px]" />
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [activeTab, sortBy, sortOrder]);

  const goToPage = (p) => {
    fetchFiltered({ search, status: statusFilter, sortBy, sortOrder }, p);
  };

  const pagination = activeData?.current_page ? {
    page: activeData.current_page,
    perPage: activeData.per_page,
    total: activeData.total,
    onPageChange: goToPage,
  } : null;

  // --- Mobile card layout (below md) ---
  const renderProposalCard = (r) => (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-slate-700 truncate max-w-[190px] mt-0.5">{r.company_name ?? '—'}</p>
          <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${statusBadgeClasses(r.status)}`}>
            {r.status}
          </span>
        </div>
      
        <p className="text-[11px] text-slate-400 font-mono">{r.project_ref}</p>
        <p className="mt-1 text-[10px] text-slate-500">
          <span className="font-normal text-slate-700">{r.aging_display ?? ""}</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          <span className="font-medium text-slate-700 font-mono">{formatArchivedAt(r.archived_at)}</span>
        </p>
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="px-2 py-1 flex flex-row justify-center gap-2 items-center rounded-lg bg-[#B5EBA2]/10 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
          onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id, type: activeTab }))}
        >
          <FaFileInvoice className="text-[12px]" />
        </button>
      </div>
    </div>
  );

  // ─── Search + status select ───────────────────────────────────
  const searchControl = (
    <div className="flex flex-row items-center gap-1 md:gap-1.5 min-w-0 w-full sm:w-auto">
      <div className="relative h-7 md:h-8 flex items-center min-w-0 flex-shrink-0">
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`peer h-7 md:h-8 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
            outline-none focus:ring-0 focus:border-[#289800] transition-all duration-300

            md:w-52 md:pl-8 md:pr-3 md:text-black md:placeholder:text-slate-400 md:cursor-text

            ${search
              ? "w-40 pl-8 pr-3 text-black placeholder:text-slate-400"
              : "w-7 px-0 text-transparent placeholder:text-transparent cursor-pointer focus:w-40 focus:pl-8 focus:pr-3 focus:text-black focus:placeholder:text-slate-400 focus:cursor-text"
            }
          `}
        />
        <svg
          className={`absolute text-slate-400 pointer-events-none z-10 transition-all duration-300 w-4 h-4
            ${search ? "left-2.5 translate-x-0" : "left-1/2 -translate-x-1/2 peer-focus:left-2.5 peer-focus:translate-x-0 md:left-2.5 md:translate-x-0"}`}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      <div className="relative h-7 md:h-8 flex items-center flex-shrink-0">
        <MdOutlineFilterAlt className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10 transition-all duration-150" />

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-7 md:h-8 w-7 md:w-32 px-0 md:pl-8 md:pr-6 py-0 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
            text-transparent md:text-black appearance-none cursor-pointer !bg-none [&::-ms-expand]:hidden
            flex items-center outline-none focus:ring-0 focus:border-[#289800]
            transition-all duration-150"
        >
          <option className="text-black" value="all">&nbsp;&nbsp;All Status&nbsp;&nbsp;</option>
          <option className="text-black" value="awarded">&nbsp;&nbsp;Awarded&nbsp;&nbsp;</option>
          <option className="text-black" value="closed">&nbsp;&nbsp;Closed&nbsp;&nbsp;</option>
        </select>
      </div>
    </div>
  );

  return (
    <>
      <ProjectListSection
        tiles={tiles}
        tableTitle={activeTab === 'sprf' ? "Archived SPRF Proposals" : "Archived ROI Proposals"}
        columns={columns}
        rows={rows}
        rowKey={(r) => `${activeTab}-${r.proposal_id}`}
        pagination={pagination}
        loading={loading}
        emptyText="No archived proposals yet."
        searchControl={searchControl}
        filterControl={
          <ProjectTypeTabs
            active={activeTab}
            onChange={handleTabChange}
            roiCount={roiCount}
            sprfCount={sprfCount}
          />
        }
        renderCard={renderProposalCard}

      />
    </>
  );
}

export default ArchivedProposals;