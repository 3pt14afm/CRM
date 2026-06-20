import { MdClose } from 'react-icons/md';

export default function FilterChip({ active, icon, label, value, onClick, onClear }) {
  return (
    <button type="button" onClick={onClick}
      className={`h-9 flex items-center gap-1.5 px-2.5 text-[13px] font-medium border rounded-lg transition-all duration-150 whitespace-nowrap
        ${active
          ? "border-[#4FA34E]/40 bg-[#E9F7E7] text-[#2DA300]"
          : "border-gray-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-gray-300"
        }`}
    >
      <span className={active ? "text-[#4FA34E]" : "text-slate-400"}>{icon}</span>
      {active
        ? <span className="text-[12px] max-w-[120px] truncate">{value}</span>
        : <span className="text-[12px]">{label}</span>
      }
      {active && (
        <span
          className="ml-0.5 flex items-center text-[#2DA300] hover:text-red-400 transition-colors"
          onMouseDown={(e) => { e.stopPropagation(); onClear(); }}
        >
          <MdClose size={13} />
        </span>
      )}
    </button>
  );
}