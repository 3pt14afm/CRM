import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { FaFileInvoice, FaFolderOpen, FaTrophy } from 'react-icons/fa';
import { route as ziggyRoute } from 'ziggy-js';
import ProjectTypeTabs from '@/Components/proposal/ProjectTypeTabs';
import SearchControl from '@/Components/roi/filters/SearchControl';
import StatusFilterSelect from '@/Components/proposal/StatusFilterSelect';
import StatusBadge from '@/Components/proposal/StatusBadge';
import ViewRecordButton from '@/Components/proposal/ViewRecordButton';
import { sortableColumn, actionsColumn, statusColumn } from '@/Components/proposal/columns';
import { createStorage } from '@/hooks/proposal/useNamespacedStorage';
import { useTableSort } from '@/hooks/proposal/useTableSort';
import { buildPagination } from '@/utils/proposal/buildPagination';
import { formatArchivedAt } from '@/utils/proposal/dateFormat';

const LS = createStorage('archived_proposals');

function ArchivedProposals({ archivedRoiProposals, archivedSprfProposals, stats }) {
  const [activeTab, setActiveTab] = useState(() => LS.get('active_tab', 'roi'));
  const [search, setSearch] = useState(() => LS.get('arch_search', ''));
  const [statusFilter, setStatusFilter] = useState(() => LS.get('arch_status', 'all'));
  const [loading, setLoading] = useState(false);

  const [roiData, setRoiData] = useState(archivedRoiProposals);
  const [sprfData, setSprfData] = useState(archivedSprfProposals);
  const [liveStats, setLiveStats] = useState(stats);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    LS.set('active_tab', tab);
  };

  const fetchFiltered = async ({ search: s, status: st, sortBy: sb, sortOrder: so }, page) => {
    setLoading(true);
    const pageParam =
      activeTab === 'sprf' ? { archived_sprf_page: page ?? 1 } : { archived_roi_page: page ?? 1 };

    try {
      const response = await axios.get(ziggyRoute('proposals.index'), {
        params: {
          ...pageParam,
          arch_search: s || undefined,
          arch_status: st !== 'all' ? st : undefined,
          arch_sort_by: sb || undefined,
          arch_sort_order: so || undefined,
        },
        headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      });

      const data = response.data ?? {};
      if (data.archivedRoiProposals) setRoiData(data.archivedRoiProposals);
      if (data.archivedSprfProposals) setSprfData(data.archivedSprfProposals);
      if (data.stats) setLiveStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch archived proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  const { sortBy, sortOrder, handleSort } = useTableSort({
    initialSortBy: LS.get('arch_sort_by', 'archived_at'),
    initialSortOrder: LS.get('arch_sort_order', 'desc'),
    onChange: (sb, so) => {
      LS.set('arch_sort_by', sb);
      LS.set('arch_sort_order', so);
      fetchFiltered({ search, status: statusFilter, sortBy: sb, sortOrder: so });
    },
  });

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

  const roiCount = liveStats?.archivedRoiCount ?? roiData?.total ?? 0;
  const sprfCount = liveStats?.archivedSprfCount ?? sprfData?.total ?? 0;

  const activeData = activeTab === 'sprf' ? sprfData : roiData;
  const rows = activeData?.data ?? [];

  const tiles = useMemo(
    () => [
      { label: 'Archived Proposals', value: activeTab === 'sprf' ? sprfCount : roiCount, icon: <FaFolderOpen />, variant: 'normal' },
      { label: 'Awarded', value: rows.filter((r) => r.status === 'awarded').length, icon: <FaTrophy />, variant: 'normal' },
    ],
    [activeTab, roiCount, sprfCount, rows]
  );

  const columns = useMemo(
    () => [
      sortableColumn({
        key: 'company_name',
        label: 'CLIENT / COMPANY',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="font-medium text-left block truncate max-w-[180px] hover:max-w-max hover:whitespace-normal cursor-pointer transition-all duration-200">{r.company_name ?? '—'}</span>,
      }),
      sortableColumn({
        key: 'project_ref',
        label: activeTab === 'sprf' ? 'SPRF NO.' : 'ARCHIVE REF',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="text-xs text-slate-400 flex justify-start">{r.project_ref}</span>,
      }),
      statusColumn({ sortable: true, sortBy, sortOrder, onSort: handleSort }),
      sortableColumn({
        key: 'archived_at',
        label: 'ARCHIVED AT',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => (
          <div className="flex justify-start">
            <span className="text-xs font-mono text-slate-600">{formatArchivedAt(r.archived_at)}</span>
          </div>
        ),
      }),
      actionsColumn({ render: (r) => <ViewRecordButton id={r.id} type={activeTab} /> }),
    ],
    [activeTab, sortBy, sortOrder, handleSort]
  );

  const goToPage = (p) => fetchFiltered({ search, status: statusFilter, sortBy, sortOrder }, p);
  const pagination = buildPagination(activeData, goToPage);

  const renderProposalCard = (r) => (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-slate-700 truncate max-w-[200px] mt-0.5">{r.company_name ?? '—'}</p>
          <StatusBadge status={r.status} />
        </div>
        <p className="text-[11px] text-slate-400 font-mono">{r.project_ref}</p>
        <p className="mt-1 text-[10px] text-slate-500">
          <span className="font-normal text-slate-700">{r.aging_display ?? ''}</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          <span className="font-medium text-slate-700 font-mono">{formatArchivedAt(r.archived_at)}</span>
        </p>
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <ViewRecordButton id={r.id} type={activeTab} dense />
      </div>
    </div>
  );

  const searchControl = (
    <div className="flex flex-row items-center gap-1 md:gap-1.5 min-w-0 w-full sm:w-auto">
      <SearchControl
        search={search}
        onSearchChange={setSearch}
        sortOrder={sortBy === 'archived_at' ? sortOrder : ''}
        onSortToggle={() => handleSort('archived_at')}
        loading={loading}
        onRefresh={() => fetchFiltered({ search, status: statusFilter, sortBy, sortOrder }, activeData?.current_page)}
      />
      <StatusFilterSelect
        value={statusFilter}
        onChange={handleStatusChange}
        options={[
          { value: 'all', label: 'All Status' },
          { value: 'awarded', label: 'Awarded' },
          { value: 'closed', label: 'Closed' },
        ]}
      />
    </div>
  );

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle={activeTab === 'sprf' ? 'Archived SPRF Proposals' : 'Archived ROI Proposals'}
      columns={columns}
      rows={rows}
      rowKey={(r) => `${activeTab}-${r.proposal_id}`}
      pagination={pagination}
      loading={loading}
      emptyText="No archived proposals yet."
      searchControl={searchControl}
      filterControl={<ProjectTypeTabs active={activeTab} onChange={handleTabChange} roiCount={roiCount} sprfCount={sprfCount} />}
      renderCard={renderProposalCard}
    />
  );
}

export default ArchivedProposals;