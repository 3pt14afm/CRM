
export default function SortHeader({ label, sortKey, sortBy, sortDirection, onSort, align = 'left' }) {
  const active = sortBy === sortKey;
  const indicator = active ? (sortDirection === 'desc' ? '▼' : '▲') : '⇅';
  const justifyClass = align === 'center' ? 'justify-center text-center' : 'justify-start text-left';

  return (
    <button
      type="button"
      title={`Sort by ${label}`}
      onClick={() => onSort(sortKey)}
      className={`group inline-flex w-full items-center gap-1 font-bold tracking-wide ${justifyClass}`}
    >
      <span>{label}</span>
      <span className={`text-[11px] leading-none ${
        active ? 'text-[#289800]' : 'text-slate-400 transition-colors group-hover:text-slate-500'
      }`}>{indicator}</span>
    </button>
  );
}