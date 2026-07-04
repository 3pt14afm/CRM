import { MdClose, MdExpandMore } from 'react-icons/md';

export default function FilterChip({ 
  active, 
  icon, 
  label, 
  value, 
  onClick, 
  onClear, 
  hideLabelOnActive = false 
}) {
  return (
    <div
      className={`h-7 md:h-9 flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2.5 text-[11px] md:text-[13px] border rounded-lg transition-all duration-150 whitespace-nowrap
        ${active
          ? "border-[#4FA34E]/40 bg-[#E9F7E7] text-[#2DA300]"
          : "border-gray-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-gray-300"
        }`}
    >
      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 md:gap-1.5 h-full focus:outline-none"
      >
        <span className={`text-sm md:text-lg ${active ? "text-[#4FA34E]" : "text-slate-400"}`}>
          {icon}
        </span>

        {/* Label Logic: Show if inactive OR if hideLabelOnActive is false */}
        {(!active || !hideLabelOnActive) && (
          <span className={active ? "font-medium" : ""}>
            {label}{active && ':'}
          </span>
        )}

        {/* Value Logic: Show truncated value if active */}
        {active && (
          <span className="font-semibold max-w-[120px] md:max-w-[200px] truncate">
            {value}
          </span>
        )}

        {/* Dropdown Arrow: Only show when inactive to indicate it can be opened */}
        {!active && (
          <MdExpandMore className="text-slate-400 text-sm md:text-base ml-0.5" />
        )}
      </button>

      {/* Clear Button: Rendered separately for clean HTML accessiblity */}
      {active && (
        <button
          type="button"
          onClick={(e) => { 
            e.stopPropagation(); 
            onClear(); 
          }}
          className="ml-1 flex items-center justify-center text-[#2DA300] hover:text-red-500 hover:bg-[#4FA34E]/10 p-0.5 rounded-full transition-colors focus:outline-none"
        >
          <MdClose size={13} />
        </button>
      )}
    </div>
  );
}