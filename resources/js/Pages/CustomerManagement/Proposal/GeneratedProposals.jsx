import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFileInvoice, FaFolderOpen, FaCheckCircle, FaPen } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import { route as ziggyRoute } from "ziggy-js";

const LS = {
  get: (key, fallback = "") => {
    try { return localStorage.getItem(`myproposals_${key}`) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(`myproposals_${key}`, value); }
    catch {}
  },
};

// ─── Tab switcher (ROI / SPRF) ───────────────────────────────────
function ProjectTypeTabs({ active, onChange, roiCount, sprfCount }) {
  const tabs = [
    { key: 'roi',  label: 'ROI Proposals',  count: roiCount },
    { key: 'sprf', label: 'SPRF Proposals', count: sprfCount },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 px-1 mb-3">
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

function GeneratedProposals({ roiProposals, sprfProposals, stats }) {
  const [activeTab, setActiveTab] = useState(() => LS.get('active_tab', 'roi'));

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    LS.set('active_tab', tab);
  };

  const roiCount  = stats?.totalRoiMine  ?? roiProposals?.total  ?? 0;
  const sprfCount = stats?.totalSprfMine ?? sprfProposals?.total ?? 0;

  const activeData = activeTab === 'sprf' ? sprfProposals : roiProposals;
  const rows = activeData?.data ?? [];

  const tiles = useMemo(() => {
    const total     = activeTab === 'sprf' ? sprfCount : roiCount;
    const generated = activeTab === 'sprf'
      ? (stats?.generatedSprfCount ?? 0)
      : (stats?.generatedRoiCount ?? 0);
    return [
      { label: "Total Proposals",       value: total,     icon: <FaFolderOpen />,  variant: "normal" },
      { label: "Generated/Finalized",   value: generated, icon: <FaCheckCircle />, variant: "normal" },
    ];
  }, [stats, activeTab, roiCount, sprfCount]);

  const columns = useMemo(() => [
    {
      key: "proposal_ref",
      header: "PROPOSAL REF",
      cell: (r) => <span className="font-bold text-slate-700">{r.proposal_ref}</span>,
    },
    {
      key: "company_name",
      header: "CLIENT / COMPANY",
      cell: (r) => <span className="font-medium text-slate-600">{r.company_name ?? "—"}</span>,
    },
    {
      key: "project_ref",
      header: activeTab === 'sprf' ? "SPRF NO." : "ARCHIVE REF",
      cell: (r) => <span className="text-xs text-slate-400">{r.project_ref}</span>,
    },
    {
      header: "STATUS",
      key: "status",
      cell: (r) => {
        const isGenerated = r.status === 'generated';
        return (
          <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
            isGenerated
              ? "bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20"
              : "bg-amber-50 text-amber-600 border-amber-200"
          }`}>
            {r.status}
          </span>
        );
      },
    },
    {
      key: "updated_at",
      header: "LAST MODIFIED",
      cell: (r) => (
        <div className="flex items-center gap-1 text-slate-500">
          <IoTimeOutline />
          <span className="text-xs">{r.updated_at}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      cell: (r) => (
        <button
          className="px-2 py-1 flex flex-row ml-4 gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
          type="button"
          onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id, type: activeTab }))}
        >
          {r.status === 'generated' ? (
            <FaFileInvoice className="text-[12px]" />
          ) : (
            <FaPen className="text-[12px]" />
          )}
        </button>
      ),
    },
  ], [activeTab]);

  const goToPage = (p) => {
    // Each tab paginates via its own query-string key (roi_page / sprf_page)
    // so switching pages on one tab doesn't reset the other's page.
    const pageParam = activeTab === 'sprf' ? { sprf_page: p } : { roi_page: p };
    router.get(ziggyRoute("proposals.index"), pageParam, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const pagination = activeData?.current_page ? {
    page: activeData.current_page,
    perPage: activeData.per_page,
    total: activeData.total,
    onPageChange: goToPage,
  } : null;

  // --- Mobile card layout (below md) ---
  const renderProposalCard = (r) => {
    const isGenerated = r.status === 'generated';
    return (
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{r.proposal_ref}</p>
            <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
              isGenerated
                ? "bg-[#E9F7E7] text-[#2DA300] border-[#2DA300]/20"
                : "bg-amber-50 text-amber-600 border-amber-200"
            }`}>
              {r.status}
            </span>
          </div>
          <p className="text-xs text-slate-600 truncate mt-0.5">{r.company_name ?? '—'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{r.project_ref}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <IoTimeOutline />
            <span>{r.updated_at}</span>
          </p>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="px-2 py-1 flex flex-row justify-center gap-2 items-center rounded-lg bg-[#B5EBA2]/10 text-[#289800] font-semibold hover:bg-[#B5EBA2]/50 transition-colors shadow-sm border border-[#289800]/10"
            onClick={() => router.visit(ziggyRoute("proposals.show", { id: r.id, type: activeTab }))}
          >
            {isGenerated ? (
              <FaFileInvoice className="text-[12px]" />
            ) : (
              <FaPen className="text-[11px]" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle={activeTab === 'sprf' ? "My SPRF Proposals" : "My ROI Proposals"}
      columns={columns}
      rows={rows}
      rowKey={(r) => `${activeTab}-${r.proposal_id}`}
      pagination={pagination}
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
  );
}

export default GeneratedProposals;