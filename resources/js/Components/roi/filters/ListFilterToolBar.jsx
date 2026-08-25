import React, { useRef, useState } from 'react';
import FilterChip from '@/Components/roi/filters/FilterChip';
import FilterToolbar from '@/Components/roi/filters/FilterToolbar';
import TextFilterPopup from '@/Components/roi/filters/TextFilterPopup';
import ScrollableMultiSelect from '@/Components/ScrollableMultiSelect';
import DatePicker from '@/Components/DatePicker';
import { MdPerson, MdExpandMore, MdOutlineFilterAlt, MdVerifiedUser } from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';

function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric',
  });
}

// Converts the old {value,label} select-option shape into ScrollableMultiSelect's
// {id,name} shape, dropping the "All ..." placeholder entry (empty selection
// already means "all" for a multiselect).
function toMultiSelectOptions(options = []) {
  return options
    .filter((opt) => opt.value !== '' && opt.value !== null && opt.value !== undefined)
    .map((opt) => ({ id: opt.value, name: opt.label }));
}

/**
 * ListFilterToolbar
 *
 * Required props:
 *   hasActiveFilters  {boolean}
 *   onClearAll        {fn}
 *
 *   statusOptions     {Array<{ value: string, label: string }>}
 *   statusFilter      {Array<string>}
 *   onStatusChange    {fn(Array<string>)}
 *
 *   typeOptions       {Array<{ value: string, label: string }>}
 *   typeFilter        {Array<string>}
 *   onTypeChange      {fn(Array<string>)}
 *
 *   perPage           {number}
 *   perPageInput      {string}
 *   onPerPageInputChange {fn(string)}
 *   onPerPageApply    {fn}
 *
 *   preparedBy        {string}
 *   onPreparedByChange {fn(string)}
 *   onPreparedByApply {fn(string)}
 *
 *   locationId        {Array<string>}
 *   locations         {Array<{ id, name }>}
 *   onLocationApply   {fn(Array<string>)}
 *
 *   dateFrom          {string}
 *   dateTo            {string}
 *   onDateFromChange  {fn(string)}
 *   onDateToChange    {fn(string)}
 *   onDateApply       {fn}
 *   onDateClear       {fn}
 *
 * Optional props:
 *   extraFilters      {ReactNode} — rendered between per-page and prepared-by
 *                                  (use this for Archive's "Decided By" chip)
 *   extraFiltersEnd   {ReactNode} — rendered between Type and Date Range
 *                                  (use this for filters that should appear
 *                                  after Type, e.g. Archive's "Prepared By")
 */
export default function ListFilterToolbar({
  // toolbar wrapper
  hasActiveFilters,
  onClearAll,

  // status (multiselect)
  statusOptions = [],
  statusFilter = [],
  onStatusChange,

  // type (multiselect)
  typeOptions = [],
  typeFilter = [],
  onTypeChange,

  // per page
  perPage,
  perPageInput,
  onPerPageInputChange,
  onPerPageApply,

  // prepared by (unchanged — single text filter)
  preparedBy,
  onPreparedByChange,
  onPreparedByApply,

  // decided by (unchanged — single text filter)
  decidedBy,
  onDecidedByChange,
  onDecidedByApply,

  // location (multiselect)
  locationId = [],
  locations = [],
  onLocationApply,

  // level (multiselect)
  levelOptions = [],
  levelFilter = [],
  onLevelChange,

  // date range
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onDateApply,
  onDateClear,

  // slot for extra filter chips (e.g. "Decided By" in Archive)
  // rendered after Rows, before the Status multiselect
  extraFilters,

  // slot for extra filter chips rendered after Type, before Date Range
  // (e.g. Archive's custom "Prepared By" chip)
  extraFiltersEnd,
}) {
  const [showPerPagePicker, setShowPerPagePicker] = useState(false);
  const [showPreparedBy,    setShowPreparedBy]    = useState(false);
  const [showDecidedBy, setShowDecidedBy] = useState(false);
  const [showDatePicker,    setShowDatePicker]    = useState(false);

  const perPagePickerRef = useRef(null);
  const preparedByRef    = useRef(null);
  const decidedByRef = useRef(null);
  const levelMultiOptions = toMultiSelectOptions(levelOptions);
  const datePickerRef    = useRef(null);

  // Close all popups when clicking outside
  React.useEffect(() => {
    const handler = (e) => {
      if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target)) setShowPerPagePicker(false);
      if (preparedByRef.current    && !preparedByRef.current.contains(e.target))    setShowPreparedBy(false);
      if (decidedByRef.current    && !decidedByRef.current.contains(e.target))    setShowDecidedBy(false);
      if (datePickerRef.current    && !datePickerRef.current.contains(e.target))    setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasDateFilter = !!(dateFrom || dateTo);
  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo)   return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  const statusMultiOptions = toMultiSelectOptions(statusOptions);
  const typeMultiOptions   = toMultiSelectOptions(typeOptions);

  return (
    <FilterToolbar hasActiveFilters={hasActiveFilters} onClearAll={onClearAll}>

      {/* Status (multiselect) */}
      {statusMultiOptions.length > 0 && (
        <div className="relative w-[110px] md:w-28 flex-shrink-0">
          <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
          <ScrollableMultiSelect
            values={statusFilter}
            onChange={onStatusChange}
            options={statusMultiOptions}
            placeholder="Status"
            pluralLabel="statuses"
            isSearchable={false}
            className="pl-5 md:pl-8"
          />
        </div>
      )}

      {/* Extra filters slot (e.g. Decided By in ArchiveList) */}
      {extraFilters}
      
      {/* Type (multiselect, placed before Date Range) */}
      {typeMultiOptions.length > 0 && (
        <div className="relative w-[100px] md:w-28 flex-shrink-0">
          <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
          <ScrollableMultiSelect
            values={typeFilter}
            onChange={onTypeChange}
            options={typeMultiOptions}
            placeholder="Types"
            pluralLabel="types"
            isSearchable={false}
            className="pl-5 md:pl-8"
          />
        </div>
      )}

      {/* Prepared By — kept as-is. Rendered only when the parent actually wired
          it up (ApprovedProjects.jsx uses "Decided By" via extraFilters instead
          and doesn't pass these props). */}
      {onPreparedByApply && (
        <div className="relative flex-shrink-0" ref={preparedByRef}>
          <FilterChip
            active={!!preparedBy}
            icon={<MdPerson size={15} />}
            label="Prepared By"
            value={preparedBy}
            onClick={() => setShowPreparedBy((p) => !p)}
            onClear={() => onPreparedByApply("")}
          />
          <TextFilterPopup
            open={showPreparedBy}
            label="Prepared By"
            placeholder="e.g. Maria Santos"
            icon={<MdPerson size={14} className="text-[#4FA34E]" />}
            value={preparedBy}
            onChange={onPreparedByChange}
            onApply={onPreparedByApply}
            onClose={() => setShowPreparedBy(false)}
          />
        </div>
      )}

      {/* Decided By */}
      {onDecidedByApply && (
        <div className="relative flex-shrink-0" ref={decidedByRef}>
          <FilterChip
            active={!!decidedBy}
            icon={<MdVerifiedUser size={15} />}
            label="Decided By"
            value={decidedBy}
            onClick={() => setShowDecidedBy((p) => !p)}
            onClear={() => onDecidedByApply("")}
          />
          <TextFilterPopup
            open={showDecidedBy}
            label="Decided By"
            placeholder="e.g. Juan dela Cruz"
            icon={<MdVerifiedUser size={14} className="text-[#4FA34E]" />}
            value={decidedBy}
            onChange={onDecidedByChange}
            onApply={onDecidedByApply}
            onClose={() => setShowDecidedBy(false)}
          />
        </div>
      )}

      {/* Location (multiselect) */}
      {locations?.length > 0 && (
        <div className="relative w-32 md:w-32 flex-shrink-0">
          <MdOutlineFilterAlt className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
          <ScrollableMultiSelect
            values={locationId}
            onChange={onLocationApply}
            options={locations}
            placeholder="Locations"
            pluralLabel="locations"
            isSearchable
            searchInDropdown
            className="pl-5 md:pl-8"
          />
        </div>
      )}

      {/* Levels (multiselect) */}
      {levelMultiOptions.length > 0 && (
        <div className="relative w-[110px] md:w-28 flex-shrink-0">
          <MdVerifiedUser className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
          <ScrollableMultiSelect
            values={levelFilter}
            onChange={onLevelChange}
            options={levelMultiOptions}
            placeholder="Levels"
            pluralLabel="levels"
            isSearchable={false}
            className="pl-5 md:pl-8"
          />
        </div>
      )}

      {/* Extra filters slot rendered after Type (e.g. Archive's Prepared By) */}
      {extraFiltersEnd}

      
      {/* Per Page */}
      <div className="relative h-7 md:h-9 flex items-center flex-shrink-0" ref={perPagePickerRef}>
        <button
          type="button"
          onClick={() => setShowPerPagePicker((p) => !p)}
          className="h-7 md:h-9 px-1 md:px-3 pl-[21px] md:pl-8 border border-gray-200 rounded-lg text-[11px] md:text-[13px] text-slate-600 flex items-center md:gap-1.5 bg-white hover:bg-slate-50 transition-colors"
        >
          <TbLayoutRows className="absolute left-1.5 md:left-2.5 text-slate-400 text-sm pointer-events-none" />
          <span className="flex-1 text-left pt-0.5 truncate"><span className="hidden sm:inline">Rows: </span>{perPage}</span>
          <MdExpandMore size={14} className="text-slate-400 flex-shrink-0" />
        </button>
        {showPerPagePicker && (
          <div className="absolute left-0 top-11 z-50 w-40 bg-white border border-gray-200 rounded-2xl shadow-lg p-3">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Rows per page
            </span>
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="number"
                value={perPageInput}
                onChange={(e) => onPerPageInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onPerPageApply()}
                className="w-16 h-8 px-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:ring-0 focus:border-[#4FA34E]"
              />
              <button
                type="button"
                onClick={onPerPageApply}
                className="h-8 flex-1 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Date Range — using shared DatePicker component */}
      <DatePicker
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        datePickerRef={datePickerRef}
        dateFrom={dateFrom}
        setDateFrom={onDateFromChange}
        dateTo={dateTo}
        setDateTo={onDateToChange}
        hasDateFilter={hasDateFilter}
        dateLabel={dateLabel}
        handleDateClear={() => { onDateClear(); setShowDatePicker(false); }}
        onApply={onDateApply}
        tooltipLabel="Filter by date"
        align="left"
      />

    </FilterToolbar>
  );
}