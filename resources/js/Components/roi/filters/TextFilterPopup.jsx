import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';

export default function TextFilterPopup({ icon, label, placeholder, value, onChange, onApply, open, onClose }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value, open]);

  const apply = () => { onChange(draft); onApply(draft); onClose(); };
  const clear  = () => { setDraft(""); onChange(""); onApply(""); onClose(); };

  if (!open) return null;
  return (
    <div className="absolute left-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-[#E9F7E7] border border-[#4FA34E]/20">{icon}</div>
          <span className="text-[12px] font-semibold text-slate-700 tracking-wide">{label}</span>
        </div>
        <button type="button" onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <MdClose size={13} />
        </button>
      </div>
      <div className="px-3 py-3">
        <input autoFocus type="text" value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="w-full h-9 px-3 text-[13px] bg-white text-slate-700 border border-gray-200 rounded-lg outline-none focus:ring-0 focus:border-[#4FA34E] transition-[border-color,box-shadow] duration-150" />
      </div>
      <div className="px-3 pb-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <button type="button" onClick={clear}
          className="flex-1 h-8 text-[12px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors duration-150">
          Clear
        </button>
        <button type="button" onClick={apply}
          className="flex-1 h-8 text-[12px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c] transition-colors duration-150">
          Apply
        </button>
      </div>
    </div>
  );
}