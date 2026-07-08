import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFolderOpen, FaCheckCircle } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import { route as ziggyRoute } from 'ziggy-js';
import ProposalActionsDropdown from './ProposalActionsDropdown';
import ProjectTypeTabs from '@/Components/proposal/ProjectTypeTabs';
import SearchControl from '@/Components/roi/filters/SearchControl';
import StatusFilterSelect from '@/Components/proposal/StatusFilterSelect';
import StatusBadge from '@/Components/proposal/StatusBadge';
import ViewRecordButton from '@/Components/proposal/ViewRecordButton';
import { sortableColumn, actionsColumn, statusColumn } from '@/Components/proposal/columns';
import { FaPen } from 'react-icons/fa';
import { createStorage } from '@/hooks/proposal/useNamespacedStorage';
import { useTableSort } from '@/hooks/proposal/useTableSort';
import { buildPagination } from '@/utils/proposal/buildPagination';

const LS = createStorage('myproposals');

function GeneratedProposals({ roiProposals, sprfProposals, stats }) {
  const [activeTab, setActiveTab] = useState(() => LS.get('active_tab', 'roi'));
  const [search, setSearch] = useState(() => LS.get('gen_search', ''));
  const [statusFilter, setStatusFilter] = useState(() => LS.get('gen_status', 'all'));
  const [loading, setLoading] = useState(false);

  const [roiData, setRoiData] = useState(roiProposals);
  const [sprfData, setSprfData] = useState(sprfProposals);
  const [liveStats, setLiveStats] = useState(stats);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    LS.set('active_tab', tab);
  };

  const fetchFiltered = async ({ search: s, status: st, sortBy: sb, sortOrder: so }, page) => {
    setLoading(true);
    const pageParam = activeTab === 'sprf' ? { sprf_page: page ?? 1 } : { roi_page: page ?? 1 };

    try {
      const response = await axios.get(ziggyRoute('proposals.index'), {
        params: {
          ...pageParam,
          gen_search: s || undefined,
          gen_status: st !== 'all' ? st : undefined,
          gen_sort_by: sb || undefined,
          gen_sort_order: so || undefined,
        },
        headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      });

      const data = response.data ?? {};
      if (data.roiProposals) setRoiData(data.roiProposals);
      if (data.sprfProposals) setSprfData(data.sprfProposals);
      if (data.stats) setLiveStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  const { sortBy, sortOrder, handleSort } = useTableSort({
    initialSortBy: LS.get('gen_sort_by', 'updated_at'),
    initialSortOrder: LS.get('gen_sort_order', 'desc'),
    onChange: (sb, so) => {
      LS.set('gen_sort_by', sb);
      LS.set('gen_sort_order', so);
      fetchFiltered({ search, status: statusFilter, sortBy: sb, sortOrder: so });
    },
  });

  useEffect(() => {
    const t = setTimeout(() => {
      LS.set('gen_search', search);
      fetchFiltered({ search, status: statusFilter, sortBy, sortOrder });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    LS.set('gen_status', status);
    fetchFiltered({ search, status, sortBy, sortOrder });
  };

  const roiCount = liveStats?.totalRoiMine ?? roiData?.total ?? 0;
  const sprfCount = liveStats?.totalSprfMine ?? sprfData?.total ?? 0;

  const activeData = activeTab === 'sprf' ? sprfData : roiData;
  const rows = activeData?.data ?? [];

  const tiles = useMemo(() => {
    const total = activeTab === 'sprf' ? sprfCount : roiCount;
    const generated =
      activeTab === 'sprf' ? liveStats?.generatedSprfCount ?? 0 : liveStats?.generatedRoiCount ?? 0;
    return [
      { label: 'Total Proposals', value: total, icon: <FaFolderOpen />, variant: 'normal' },
      { label: 'Generated/Finalized', value: generated, icon: <FaCheckCircle />, variant: 'normal' },
    ];
  }, [liveStats, activeTab, roiCount, sprfCount]);

  // Re-fetch the current page/filters — used after a status change (award/close)
  // so the list reflects the update instead of showing stale data.
  const refreshCurrentPage = () => {
    fetchFiltered({ search, status: statusFilter, sortBy, sortOrder }, activeData?.current_page);
  };

  const columns = useMemo(
    () => [
      sortableColumn({
        key: 'company_name',
        label: 'CLIENT / COMPANY',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => (
          <span className="font-medium text-left block truncate max-w-[180px] hover:max-w-max hover:whitespace-normal cursor-pointer transition-all duration-200">{r.company_name ?? '—'}</span>
        ),
      }),
      sortableColumn({
        key: 'project_ref',
        label: activeTab === 'sprf' ? 'SPRF NO.' : 'ARCHIVE REF',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="text-xs text-slate-400 block">{r.project_ref}</span>,
      }),
      statusColumn({ sortable: true, sortBy, sortOrder, onSort: handleSort }),
      sortableColumn({
        key: 'updated_at',
        label: 'LAST MODIFIED',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => (
          <div className="flex items-center justify-start gap-1 text-slate-500">
            <IoTimeOutline />
            <span className="text-xs">{r.updated_at}</span>
          </div>
        ),
      }),
      {
        key: 'aging_display',
        header: <span className="block text-left">AGE</span>,
        cell: (r) => (
          <div className="flex justify-start">
            <span className="text-xs font-medium text-slate-600">{r.aging_display ?? ''}</span>
          </div>
        ),
      },
      actionsColumn({
        render: (r) =>
          r.status === 'generated' ? (
            <ProposalActionsDropdown row={r} activeTab={activeTab} onStatusChanged={refreshCurrentPage} />
          ) : (
            <ViewRecordButton id={r.id} type={activeTab} icon={FaPen} />
          ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, sortBy, sortOrder]
  );

  const goToPage = (p) => fetchFiltered({ search, status: statusFilter, sortBy, sortOrder }, p);
  const pagination = buildPagination(activeData, goToPage);

  const renderProposalCard = (r) => (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-slate-700 truncate mt-0.5">{r.company_name ?? '—'}</p>
          <StatusBadge status={r.status} />
        </div>
        <p className="text-[12px] text-slate-400 font-mono">{r.project_ref}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <IoTimeOutline />
          <span>{r.aging_display}</span>
        </p>
        <p className='text-[11px] mt-1 text-slate-400'>Updated: {r.updated_at}</p>
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        {r.status === 'generated' ? (
          <ProposalActionsDropdown row={r} activeTab={activeTab} onStatusChanged={refreshCurrentPage} />
        ) : (
          <ViewRecordButton id={r.id} type={activeTab} icon={FaPen} dense />
        )}
      </div>
    </div>
  );

  const searchControl = (
    <div className="flex flex-row items-center gap-1 md:gap-1.5 min-w-0 w-full sm:w-auto">
      <SearchControl
        search={search}
        onSearchChange={setSearch}
        sortOrder={sortBy === 'updated_at' ? sortOrder : ''}
        onSortToggle={() => handleSort('updated_at')}
        loading={loading}
        onRefresh={refreshCurrentPage}
      />
      <StatusFilterSelect
        value={statusFilter}
        onChange={handleStatusChange}
        options={[
          { value: 'all', label: 'All Status' },
          { value: 'draft', label: 'Draft' },
          { value: 'generated', label: 'Generated' },
        ]}
      />
    </div>
  );

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle={activeTab === 'sprf' ? 'My SPRF Proposals' : 'My ROI Proposals'}
      columns={columns}
      rows={rows}
      rowKey={(r) => `${activeTab}-${r.proposal_id}`}
      pagination={pagination}
      loading={loading}
      searchControl={searchControl}
      filterControl={<ProjectTypeTabs active={activeTab} onChange={handleTabChange} roiCount={roiCount} sprfCount={sprfCount} roiLabel="ROI Proposals" sprfLabel="SPRF Proposals" />}
      renderCard={renderProposalCard}
    />
  );
}

export default GeneratedProposals;