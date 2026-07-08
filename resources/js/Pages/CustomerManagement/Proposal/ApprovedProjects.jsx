import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import FilterChip from '@/Components/roi/filters/FilterChip';
import LocationFilterPopup from '@/Components/roi/filters/LocationFilterPopup';
import TextFilterPopup from '@/Components/roi/filters/TextFilterPopup';
import { FaFolderOpen, FaRegClock } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import { MdVerifiedUser } from 'react-icons/md';
import { route as ziggyRoute } from 'ziggy-js';
import SearchControl from '@/Components/roi/filters/SearchControl';
import ListFilterToolbar from '@/Components/roi/filters/ListFilterToolBar';
import ProjectTypeTabs from '@/Components/proposal/ProjectTypeTabs';
import StatusBadge from '@/Components/proposal/StatusBadge';
import ViewRecordButton from '@/Components/proposal/ViewRecordButton';
import { sortableColumn, actionsColumn, statusColumn } from '@/Components/proposal/columns';
import { createStorage } from '@/hooks/proposal/useNamespacedStorage';
import { buildPagination } from '@/utils/proposal/buildPagination';
import { formatDateLabel } from '@/utils/proposal/dateFormat';

const LS = createStorage('approve_filter');

function ApproveProjects({
  roiProjects: initialRoiProjects,
  sprfProjects: initialSprfProjects,
  stats: initialStats,
  filters,
  locations = [],
}) {
  const [activeTab, setActiveTab] = useState(() => LS.get('active_tab', 'roi'));

  const [localRoiProjects, setLocalRoiProjects] = useState(initialRoiProjects);
  const [localSprfProjects, setLocalSprfProjects] = useState(initialSprfProjects);
  const [localStats, setLocalStats] = useState(initialStats);

  const [search, setSearch] = useState(() => LS.get('search', filters?.search ?? ''));
  const [typeFilter, setTypeFilter] = useState(() => LS.get('type', filters?.type ?? ''));
  const [perPage, setPerPage] = useState(() => {
    const stored = LS.get('per_page', '');
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : filters?.per_page ?? 10;
  });
  const [dateFrom, setDateFrom] = useState(() => LS.get('date_from', filters?.date_from ?? ''));
  const [dateTo, setDateTo] = useState(() => LS.get('date_to', filters?.date_to ?? ''));
  const [decidedBy, setDecidedBy] = useState(() => LS.get('decided_by', filters?.decided_by ?? ''));
  const [locationId, setLocationId] = useState(() => LS.get('location_id', filters?.location_id ?? ''));
  const [currentPage, setCurrentPage] = useState(() => {
    const stored = LS.get('page', '');
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPerPagePicker, setShowPerPagePicker] = useState(false);
  const [showDecidedBy, setShowDecidedBy] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  const [perPageInput, setPerPageInput] = useState(() => {
    const stored = LS.get('per_page', '');
    const parsed = parseInt(stored, 10);
    return !isNaN(parsed) && parsed > 0 ? String(parsed) : String(filters?.per_page ?? 10);
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const datePickerRef = useRef(null);
  const perPagePickerRef = useRef(null);
  const decidedByRef = useRef(null);
  const locationRef = useRef(null);

  const [sortBy, setSortBy] = useState(() => LS.get('sort_by', filters?.sort_by ?? ''));
  const [sortOrder, setSortOrder] = useState(() => LS.get('sort_order', filters?.sort_order ?? ''));

  // Persist filters (incl. active tab) to localStorage whenever they change
  useEffect(() => {
    LS.set('search', search);
    LS.set('type', String(typeFilter));
    LS.set('date_from', dateFrom);
    LS.set('date_to', dateTo);
    LS.set('decided_by', decidedBy);
    LS.set('location_id', String(locationId));
    LS.set('per_page', String(perPage));
    LS.set('page', String(currentPage));
    LS.set('sort_by', sortBy);
    LS.set('sort_order', sortOrder);
    LS.set('active_tab', activeTab);
  }, [search, typeFilter, dateFrom, dateTo, decidedBy, locationId, perPage, currentPage, sortBy, sortOrder, activeTab]);

  useEffect(() => {
    setLocalRoiProjects(initialRoiProjects);
    setLocalSprfProjects(initialSprfProjects);
    setLocalStats(initialStats);
  }, [initialRoiProjects, initialSprfProjects, initialStats]);

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) setShowDatePicker(false);
      if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target)) setShowPerPagePicker(false);
      if (decidedByRef.current && !decidedByRef.current.contains(e.target)) setShowDecidedBy(false);
      if (locationRef.current && !locationRef.current.contains(e.target)) setShowLocation(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchApproveDataRef = useRef(null);
  useEffect(() => {
    fetchApproveDataRef.current = fetchApproveData;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      fetchApproveDataRef.current?.({ silent: true });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Switching tabs resets to page 1 for whichever list becomes active
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(key);
    setSortOrder(newOrder);
    LS.set('sort_by', key);
    LS.set('sort_order', newOrder);
    fetchApproveData({ currentSortBy: key, currentSortOrder: newOrder });
  };

  const selectedLocationName = useMemo(
    () => (locationId ? locations.find((l) => String(l.id) === String(locationId))?.name ?? '' : ''),
    [locationId, locations]
  );

  const hasActiveFilters = !!(
    search ||
    typeFilter !== '' ||
    dateFrom ||
    dateTo ||
    decidedBy ||
    locationId ||
    perPage !== 10 ||
    sortBy !== '' ||
    sortOrder !== ''
  );

  const roiCount = localStats?.totalRoiProjects ?? localRoiProjects?.total ?? 0;
  const sprfCount = localStats?.totalSprfProjects ?? localSprfProjects?.total ?? 0;

  const tiles = useMemo(() => {
    const totalArchiveProjects = activeTab === 'sprf' ? sprfCount : roiCount;
    const recentlyArchivedToday = localStats?.recentlyArchivedToday ?? '—';
    return [
      { label: 'Total Archives', value: totalArchiveProjects, icon: <FaFolderOpen />, variant: 'normal' },
      { label: 'Recently Archived', value: recentlyArchivedToday, icon: <IoTimeOutline />, variant: 'normal' },
    ];
  }, [localStats, activeTab, roiCount, sprfCount]);

  // ─── ROI columns (unchanged) ─────────────────────────────────
  const roiColumns = useMemo(
    () => [
      sortableColumn({
        key: 'company_sap_code', label: 'SAP CODE',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => (
          <div className="flex justify-start items-center w-full h-full">
            <span className="font-mono text-sm text-left  hover:whitespace-normal cursor-pointer transition-all duration-200">
              {r.company_sap_code ?? ''}
            </span>
          </div>
        ),
      }),
      sortableColumn({
        key: 'reference', label: 'REFERENCE',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="font-semibold flex justify-start items-center">{r.reference ?? '—'}</span>,
      }),
      sortableColumn({
        key: 'company_name', label: 'COMPANY NAME',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => (
          <div className="flex justify-start items-center w-full h-full">
            <span className="font-medium text-left block truncate max-w-[150px] hover:max-w-max hover:whitespace-normal cursor-pointer transition-all duration-200">
              {r.company_name ?? '—'}
            </span>
          </div>
        ),
      }),
      sortableColumn({
        key: 'contract_years', label: 'CONTRACT TERM',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => (
          <span className="font-medium flex justify-start items-center">
            {r.contract_years != null ? `${r.contract_years} Years` : '—'}
          </span>
        ),
      }),
      sortableColumn({
        key: 'type', label: 'TYPE',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => (
          <span className={`font-medium flex justify-start items-center ${r.type === 1 ? 'text-[#289800]' : 'text-gray-500'}`}>
            {r.type === 1 ? 'Existing' : 'Potential'}
          </span>
        ),
      }),
      sortableColumn({
        key: 'approved_by_name', sortKey: 'decided_at', label: 'APPROVED BY',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="text-slate-800 flex justify-start items-center">{r.decided_by_name ?? '—'}</span>,
      }),
      sortableColumn({
        key: 'decided_at', label: <IoTimeOutline size={14} />,
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="text-slate-600 flex justify-start items-center text-xs">{r.decided_at_display ?? '—'}</span>,
      }),
      actionsColumn({
        headerLabel: <div className="text-center w-full">ACTIONS</div>,
        cellClassName: 'flex justify-center items-center',
        render: (r) => <ViewRecordButton id={r.id} type="roi" size="15px" />,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortOrder]
  );

  // ─── SPRF columns ─────────────────────────────────────────────
  // NOTE: SprfArchiveProject doesn't have company_name or contract_years —
  // using sprf_no as the reference and company_sap_code in place of company name.
  const sprfColumns = useMemo(
    () => [
      sortableColumn({
        key: 'company_sap_code', label: 'COMPANY (SAP CODE)',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => (
          <div className="flex justify-start items-center w-full h-full">
            <span className="font-medium text-left block truncate max-w-[150px] hover:max-w-max hover:whitespace-normal cursor-pointer transition-all duration-200">
              {r.company_sap_code ?? ''}
            </span>
          </div>
        ),
      }),
      sortableColumn({
        key: 'sprf_no', label: 'SPRF NO.',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="font-semibold flex justify-start items-center">{r.sprf_no ?? '—'}</span>,
      }),
      sortableColumn({
        key: 'account', label: 'ACCOUNT',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="font-medium flex justify-start items-center">{r.account ?? '—'}</span>,
      }),
      statusColumn({
        getStatus: (r) => r.status ?? 'approved',
        // NOTE: non-sortable here, matching the original — this column had
        // no SortHeader/onClick at all, unlike the other columns.
      }),
      sortableColumn({
        key: 'approved_by_name', sortKey: 'decided_at', label: 'APPROVED BY',
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="text-slate-800 flex justify-start items-center">{r.decided_by_name ?? '—'}</span>,
      }),
      sortableColumn({
        key: 'decided_at', label: <IoTimeOutline size={14} />,
        sortBy, sortOrder, onSort: handleSort,
        cell: (r) => <span className="text-slate-600 flex justify-start items-center text-xs">{r.decided_at_display ?? '—'}</span>,
      }),
      actionsColumn({
        headerLabel: <div className="text-center w-full">ACTIONS</div>,
        cellClassName: 'flex justify-center items-center',
        render: (r) => <ViewRecordButton id={r.id} type="sprf" size="15px" />,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortOrder]
  );

  /* ── Fetch (both lists come back from the same endpoint every time) ── */
  const fetchApproveData = async ({
    silent = false,
    targetPage = currentPage,
    currentSearch = search,
    currentType = typeFilter,
    currentPerPage = perPage,
    currentDateFrom = dateFrom,
    currentDateTo = dateTo,
    currentDecidedBy = decidedBy,
    currentLocationId = locationId,
    currentSortBy = sortBy,
    currentSortOrder = sortOrder,
  } = {}) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const response = await axios.get(ziggyRoute('proposals.index'), {
        params: {
          page: targetPage,
          search: currentSearch || undefined,
          per_page: currentPerPage,
          date_from: currentDateFrom || undefined,
          date_to: currentDateTo || undefined,
          decided_by: currentDecidedBy || undefined,
          location_id: currentLocationId || undefined,
          sort_by: currentSortBy || undefined,
          sort_order: currentSortOrder || undefined,
          type: currentType !== '' ? currentType : undefined,
        },
        headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      });

      const props = response.data?.props ?? response.data;
      const roiPayload = props?.roiProjects ?? null;
      const sprfPayload = props?.sprfProjects ?? null;

      if (roiPayload) setLocalRoiProjects(roiPayload);
      if (sprfPayload) setLocalSprfProjects(sprfPayload);
      setCurrentPage(targetPage);

      const statsPayload = props?.stats ?? null;
      if (statsPayload) setLocalStats(statsPayload);
    } catch (error) {
      console.error('Failed to query approved records:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchApproveData({ targetPage: 1 }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleTypeChange = (val) => {
    setTypeFilter(val);
    fetchApproveData({ currentType: val, targetPage: 1 });
  };
  const handleDecidedByApply = (val) => {
    setDecidedBy(val);
    fetchApproveData({ currentDecidedBy: val, targetPage: 1 });
  };
  const handleLocationApply = (val) => {
    setLocationId(val);
    fetchApproveData({ currentLocationId: val, targetPage: 1 });
  };
  const handleDateApply = () => {
    setShowDatePicker(false);
    fetchApproveData({ targetPage: 1 });
  };
  const handleDateClear = () => {
    setDateFrom('');
    setDateTo('');
    setShowDatePicker(false);
    fetchApproveData({ currentDateFrom: undefined, currentDateTo: undefined, targetPage: 1 });
  };
  const handlePerPageInputApply = () => {
    const raw = parseInt(perPageInput, 10);
    const num = !isNaN(raw) && raw > 0 ? Math.min(raw, 500) : perPage;
    setPerPage(num);
    setPerPageInput(String(num));
    setShowPerPagePicker(false);
    fetchApproveData({ currentPerPage: num, targetPage: 1 });
  };

  const handleClearAllFilters = () => {
    setSearch('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setDecidedBy('');
    setLocationId('');
    setPerPage(10);
    setPerPageInput('10');
    setSortBy('');
    setSortOrder('');
    setShowDatePicker(false);
    setShowDecidedBy(false);
    setShowLocation(false);
    LS.clearAll();
    LS.set('per_page', '10');
    LS.set('sort_by', '');
    LS.set('sort_order', '');
    LS.set('active_tab', activeTab);

    fetchApproveData({
      currentSearch: '',
      currentType: '',
      currentDateFrom: undefined,
      currentDateTo: undefined,
      currentDecidedBy: '',
      currentLocationId: '',
      currentSortBy: '',
      currentSortOrder: '',
      targetPage: 1,
    });
  };

  const goToPage = (p) => fetchApproveData({ targetPage: p });

  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo) return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  // ─── Active list resolution ───────────────────────────────────
  const activeProjects = activeTab === 'sprf' ? localSprfProjects : localRoiProjects;
  const rows = activeProjects?.data ?? [];
  const pagination = buildPagination(activeProjects, goToPage, perPage);
  const activeColumns = activeTab === 'sprf' ? sprfColumns : roiColumns;

  const searchControl = (
    <SearchControl
      search={search}
      onSearchChange={setSearch}
      sortOrder={sortOrder}
      onSortToggle={() => handleSort(sortBy || 'decided_at')}
      loading={loading || isRefreshing}
      onRefresh={() => fetchApproveData({ targetPage: activeProjects?.current_page ?? 1 })}
    />
  );

  const decidedBySlot = (
    <div className="relative flex-shrink-0" ref={decidedByRef}>
      <FilterChip
        active={!!decidedBy}
        icon={<MdVerifiedUser size={15} />}
        label="Decided By"
        value={decidedBy}
        onClick={() => setShowDecidedBy((p) => !p)}
        onClear={() => handleDecidedByApply('')}
      />
      <TextFilterPopup
        open={showDecidedBy}
        label="Decided By"
        placeholder="e.g. Juan dela Cruz"
        icon={<MdVerifiedUser size={14} className="text-[#4FA34E]" />}
        value={decidedBy}
        onChange={setDecidedBy}
        onApply={handleDecidedByApply}
        onClose={() => setShowDecidedBy(false)}
      />
    </div>
  );

  const filterToolbar = (
    <>
      <ListFilterToolbar
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAllFilters}
        typeOptions={[
          { value: '', label: 'All Types' },
          { value: 1, label: 'Existing' },
          { value: 0, label: 'Potential' },
        ]}
        typeFilter={typeFilter}
        onTypeChange={handleTypeChange}
        perPage={perPage}
        perPageInput={perPageInput}
        onPerPageInputChange={setPerPageInput}
        onPerPageApply={handlePerPageInputApply}
        extraFilters={decidedBySlot}
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
      <ProjectTypeTabs
        active={activeTab}
        onChange={handleTabChange}
        roiCount={roiCount}
        sprfCount={sprfCount}
        roiLabel="ROI Projects"
        sprfLabel="SPRF Projects"
        wrapperClassName="flex items-center ml-3 -mb-2 pt-5 gap-1 px-1"
      />
    </>
  );

  // --- Mobile card layout (below md) ---
  const renderRoiCard = (r) => (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-mono">{r.reference ?? '—'}</p>
          <StatusBadge status={r.status ?? 'approved'} />
        </div>
        <p className="text-sm text-slate-600 truncate mt-0.5">{r.company_name ?? '—'}</p>
        <p className="text-[11px] text-slate-400 font-mono">{r.company_sap_code ?? ''}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {r.contract_years != null ? `${r.contract_years} Years` : '—'} · {r.type === 1 ? 'Existing' : 'Potential'}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Prepared by <span className="font-medium text-slate-700">{r.user?.name ?? '—'}</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Approved by <span className="font-medium text-slate-700">{r.decided_by_name ?? '—'}</span>
        </p>
      </div>

      {/* Right column with aligned Date and Action Button */}
      <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
        <span className="font-mono text-[11px] text-slate-600">
          {r.decided_at_display ?? '—'}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <ViewRecordButton id={r.id} type="roi" size="15px" />
        </div>
      </div>
    </div>
  );

const renderSprfCard = (r) => (
  <div className="flex flex-col gap-2">
    {/* Top Section: SPRF No and Decided At */}
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-semibold">{r.sprf_no ?? '—'}</p>
      <span className="font-mono text-[11px] text-slate-500">
        {r.decided_at_display ?? '—'}
      </span>
    </div>

    {/* Middle Section: Status, Account, SAP Code, and Prepared By */}
    <div>
      <StatusBadge status={r.status ?? 'approved'} />
      <p className="mt-2 text-[11px] text-slate-500">{r.account ?? '—'}</p>
      <p className="text-[11px] text-slate-400 font-mono">{r.company_sap_code ?? ''}</p>
      <p className="mt-1 text-[11px] text-slate-500">
        Prepared by <span className="font-medium text-slate-700">{r.preparer?.name ?? '—'}</span>
      </p>
    </div>

    {/* Bottom Section: Approved By and Action Button aligned */}
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] text-slate-500">
        Approved by <span className="font-medium text-slate-700">{r.decided_by_name ?? '—'}</span>
      </p>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <ViewRecordButton id={r.id} type="sprf" size="15px" />
      </div>
    </div>
  </div>
);

  return (
    <ProjectListSection
      tiles={tiles}
      tableTitle={activeTab === 'sprf' ? 'Approved SPRF Projects' : 'Approved ROI Projects'}
      columns={activeColumns}
      rows={rows}
      rowKey={(r) => `${activeTab}-${r.id}`}
      pagination={pagination}
      searchControl={searchControl}
      filterControl={filterToolbar}
      loading={loading || isRefreshing}
      emptyText="No matching records found."
      renderCard={activeTab === 'sprf' ? renderSprfCard : renderRoiCard}
    />
  );
}

export default ApproveProjects;