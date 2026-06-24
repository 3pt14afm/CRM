import React, { useRef, useState } from 'react';
import FilterChip from '@/Components/roi/filters/FilterChip';
import FilterToolbar from '@/Components/roi/filters/FilterToolbar';
import TextFilterPopup from '@/Components/roi/filters/TextFilterPopup';
import LocationFilterPopup from '@/Components/roi/filters/LocationFilterPopup';
import {
  MdOutlineFilterAlt, MdDateRange, MdExpandMore,
  MdPerson, MdLocationOn,
} from 'react-icons/md';
import { TbLayoutRows } from 'react-icons/tb';

function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric',
  });
}

/**
 * ListFilterToolbar
 *
 * Required props:
 *   hasActiveFilters  {boolean}
 *   onClearAll        {fn}
 *
 *   statusOptions     {Array<{ value: string, label: string }>}
 *   statusFilter      {string}
 *   onStatusChange    {fn(value)}
 *   statusIcon        {ReactNode} (optional) — icon shown left of the select
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
 *   locationId        {string}
 *   selectedLocationName {string}
 *   locations         {Array<{ id, name }>}
 *   onLocationApply   {fn(string)}
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
 */
export default function ListFilterToolbar({
  // toolbar wrapper
  hasActiveFilters,
  onClearAll,

  // status
  statusOptions = [],
  statusFilter,
  onStatusChange,
  statusIcon,

  // per page
  perPage,
  perPageInput,
  onPerPageInputChange,
  onPerPageApply,

  // prepared by
  preparedBy,
  onPreparedByChange,
  onPreparedByApply,

  // location
  locationId,
  selectedLocationName,
  locations = [],
  onLocationApply,

  // date range
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onDateApply,
  onDateClear,

  // slot for extra filter chips (e.g. "Decided By" in Archive)
  extraFilters,
}) {
  const [showPerPagePicker, setShowPerPagePicker] = useState(false);
  const [showPreparedBy,    setShowPreparedBy]    = useState(false);
  const [showLocation,      setShowLocation]      = useState(false);
  const [showDatePicker,    setShowDatePicker]    = useState(false);

  const perPagePickerRef = useRef(null);
  const preparedByRef    = useRef(null);
  const locationRef      = useRef(null);
  const datePickerRef    = useRef(null);

  // Close all popups when clicking outside
  React.useEffect(() => {
    const handler = (e) => {
      if (perPagePickerRef.current && !perPagePickerRef.current.contains(e.target)) setShowPerPagePicker(false);
      if (preparedByRef.current    && !preparedByRef.current.contains(e.target))    setShowPreparedBy(false);
      if (locationRef.current      && !locationRef.current.contains(e.target))      setShowLocation(false);
      if (datePickerRef.current    && !datePickerRef.current.contains(e.target))    setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeOthers = ({ keepPreparedBy, keepLocation, keepDate } = {}) => {
    if (!keepPreparedBy) setShowPreparedBy(false);
    if (!keepLocation)   setShowLocation(false);
    if (!keepDate)       setShowDatePicker(false);
  };

  const hasDateFilter = dateFrom || dateTo;
  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo)   return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  return (
    <FilterToolbar hasActiveFilters={hasActiveFilters} onClearAll={onClearAll}>

      {/* Status */}
      <div className="relative h-9 flex items-center flex-shrink-0">
        {statusIcon
          ? <span className="absolute left-2.5 text-sm pointer-events-none z-10">{statusIcon}</span>
          : <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
        }
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-9 w-28 sm:w-36 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer
            focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
            transition-[border-color,box-shadow] duration-150 text-slate-700"
        >
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Per Page */}
      <div className="relative h-9 flex items-center flex-shrink-0" ref={perPagePickerRef}>
        <button
          type="button"
          onClick={() => setShowPerPagePicker((p) => !p)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-[13px] text-slate-600 flex items-center gap-1.5 bg-white hover:bg-slate-50 transition-colors"
        >
          <TbLayoutRows size={15} className="text-slate-400" />
          <span>Rows: {perPage}</span>
          <MdExpandMore size={14} className="text-slate-400" />
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
                className="w-16 h-8 px-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
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

      {/* Extra filters slot (e.g. Decided By in ArchiveList) */}
      {extraFilters}

      {/* Prepared By */}
      <div className="relative flex-shrink-0" ref={preparedByRef}>
        <FilterChip
          active={!!preparedBy}
          icon={<MdPerson size={15} />}
          label="Prepared By"
          value={preparedBy}
          onClick={() => { setShowPreparedBy((p) => !p); closeOthers({ keepPreparedBy: true }); }}
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

      {/* Location */}
      <div className="relative flex-shrink-0" ref={locationRef}>
        <FilterChip
          active={!!locationId}
          icon={<MdLocationOn size={15} />}
          label="Location"
          value={selectedLocationName}
          onClick={() => { setShowLocation((p) => !p); closeOthers({ keepLocation: true }); }}
          onClear={() => onLocationApply("")}
        />
        <LocationFilterPopup
          open={showLocation}
          locations={locations}
          selectedId={locationId}
          onApply={onLocationApply}
          onClose={() => setShowLocation(false)}
        />
      </div>

      {/* Date Range */}
      <div className="relative flex-shrink-0" ref={datePickerRef}>
        <FilterChip
          active={!!hasDateFilter}
          icon={<MdDateRange size={15} />}
          label="Date Range"
          value={dateLabel}
          onClick={() => { setShowDatePicker((p) => !p); closeOthers({ keepDate: true }); }}
          onClear={onDateClear}
        />
        {showDatePicker && (
          <div className="absolute left-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MdDateRange size={16} className="text-[#4FA34E]" />
              <span className="text-[12px] font-semibold text-slate-700 tracking-wide">Filter by Date</span>
            </div>
            <div className="space-y-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
              />
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onDateClear}
                className="flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => { onDateApply(); setShowDatePicker(false); }}
                className="flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

    </FilterToolbar>
  );
}