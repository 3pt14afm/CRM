import React, { useEffect } from 'react';
import { MdDateRange, MdClose } from 'react-icons/md';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function DatePicker({
  showDatePicker,
  setShowDatePicker,
  datePickerRef,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  hasDateFilter,
  dateLabel,
  handleDateClear,
  onApply,
  tooltipLabel = "Filter by date",
  side = "top"
}) {
  // Close datepicker when clicking outside or pressing Escape
  useEffect(() => {
    if (!showDatePicker) return;

    const handleClickOutside = (event) => {
      if (datePickerRef?.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDatePicker, setShowDatePicker, datePickerRef]);

  return (
    <div className="relative flex-shrink-0" ref={datePickerRef}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowDatePicker((p) => !p)}
              className={`h-7 md:h-8 flex items-center gap-1.5 px-1.5 md:px-2 text-xs md:text-[13px] font-medium border rounded-lg transition-all duration-150 whitespace-nowrap outline-none focus:ring-0 focus:border-[#289800] ${
                hasDateFilter
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
          </TooltipTrigger>
          <TooltipContent side={side}>
            <p>{tooltipLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showDatePicker && (
        <div className="absolute right-0 top-11 z-[9999] w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MdDateRange size={16} className="text-[#4FA34E]" />
            <span className="text-[12px] font-semibold text-slate-700 tracking-wide">Filter by Date</span>
          </div>
          <div className="space-y-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
            />
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
            />
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleDateClear}
              className="flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => { setShowDatePicker(false); onApply?.(); }}
              className="flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}