import { useState, useEffect, useRef } from 'react';
import { MdSearch, MdClose, MdLocationOn, MdCheckCircle } from 'react-icons/md';

export default function LocationFilterPopup({ locations = [], selectedId, onApply, open, onClose }) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(selectedId);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setPicked(selectedId); setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open, selectedId]);

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    return (l.name ?? "").toLowerCase().includes(q) || (l.code ?? "").toLowerCase().includes(q);
  });

  const apply = (id) => { onApply(id ?? picked); onClose(); };
  const clear  = ()  => { setPicked(""); onApply(""); onClose(); };

  if (!open) return null;
  return (
    <div className="absolute right-0 top-11 z-50 lg:w-72 w-56 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden flex flex-col"
      style={{ maxHeight: 340 }}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-[#E9F7E7] border border-[#4FA34E]/20">
            <MdLocationOn size={14} className="text-[#4FA34E]" />
          </div>
          <span className="text-[12px] font-semibold text-slate-700 tracking-wide">Filter by Location</span>
        </div>
        <button type="button" onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <MdClose size={13} />
        </button>
      </div>
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full h-8 pl-8 pr-3 text-[13px] bg-slate-50 text-slate-700 border border-gray-200 rounded-lg
              focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
              transition-[border-color,box-shadow] duration-150" />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-2 pb-2">
        {filtered.length === 0 ? (
          <p className="text-center text-[12px] text-slate-400 py-4">No locations found</p>
        ) : filtered.map((l) => {
          const isActive = String(picked) === String(l.id);
          return (
            <button key={l.id} type="button" onClick={() => apply(l.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors duration-100 group
                ${isActive ? "bg-[#E9F7E7]" : "hover:bg-slate-50"}`}>
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold
                ${isActive ? "bg-[#4FA34E] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}>
                {l.code?.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium truncate ${isActive ? "text-[#2DA300]" : "text-slate-700"}`}>{l.name}</p>
                <p className="text-[10px] text-slate-400">{l.code}</p>
              </div>
              {isActive && <MdCheckCircle size={15} className="text-[#4FA34E] flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex-shrink-0">
        <button type="button" onClick={clear}
          className="w-full h-8 text-[12px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors duration-150">
          Clear filter
        </button>
      </div>
    </div>
  );
}