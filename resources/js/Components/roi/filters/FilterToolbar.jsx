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
            className="flex items-center gap-0.5 md:gap-1 text-[11px] md:text-xs font-medium bg-[#B5EBA2]/50 text-emerald-900 hover:bg-red-100 hover:text-red-400 hover:shadow-inner shadow p-1 px-2 rounded-lg transition-colors duration-150"
          >
            <MdClose size={13} />
            <span>Clear</span>
          </button>
        </>
      )}
    </div>
  );
}