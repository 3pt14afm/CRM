import { MdClose } from 'react-icons/md';

export default function FilterToolbar({ children, hasActiveFilters, onClearAll }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm ">
      {children}
      {hasActiveFilters && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={onClearAll}
            className="flex-shrink-0 flex items-center gap-1 text-[12px] font-medium text-[#4FA34E] hover:text-red-400 transition-colors duration-150"
          >
            <MdClose size={13} />
            <span>Clear all</span>
          </button>
        </>
      )}
    </div>
  );
}