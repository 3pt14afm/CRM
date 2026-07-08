import React from 'react';

/**
 * Was defined identically (only `wrapperClassName` differed) in
 * ArchiveProposals.jsx, GeneratedProposals.jsx and ApprovedProjects.jsx.
 *
 * `tabs` defaults to the ROI / SPRF pair used everywhere today, but is
 * overridable so this stays reusable if a third project type is ever added.
 */
export default function ProjectTypeTabs({
  active,
  onChange,
  roiCount,
  sprfCount,
  roiLabel = 'ROI Proposals',
  sprfLabel = 'SPRF Proposals',
  wrapperClassName = 'flex items-center gap-1 -mb-2 px-1',
}) {
  const tabs = [
    { key: 'roi', label: roiLabel, count: roiCount },
    { key: 'sprf', label: sprfLabel, count: sprfCount },
  ];

  return (
    <div className={wrapperClassName}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
              isActive ? 'text-[#289800]' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-[#E9F7E7] text-[#2DA300]' : 'bg-slate-100 text-slate-500'
                }`}
              >
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