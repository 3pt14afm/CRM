import { MdClose } from 'react-icons/md';

export default function FilterToolbar({ children, hasActiveFilters, onClearAll }) {
  return (
    <div className="flex flex-wrap items-center gap-1 md:gap-2 rounded-xl border border-gray-200 bg-white p-1 md:p-2 shadow-sm ">
      {children}
      {hasActiveFilters && (
        <>
          <div className="w-px h-5 bg-gray-200" />
          <button
            type="button"
            onClick={onClearAll}
            className="flex-shrink-0 flex items-center gap-0.5 md:gap-1 text-[11px] md:text-xs font-medium text-[#4FA34E] hover:text-red-400 transition-colors duration-150"
          >
            <MdClose size={13} />
            <span>Clear</span>
          </button>
        </>
      )}
    </div>
  );
}