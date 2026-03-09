import React, { useRef } from 'react';
import { FileText } from 'lucide-react';

export default function SidebarTermsEditor({ value, onChange }) {
  const textareaRef = useRef(null);
  const currentValue = value !== undefined && value !== null ? value : '';

  const applyFormat = (tag) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end) return; // nothing selected

    const selected = currentValue.slice(start, end);
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);
    const wrapped = `<${tag}>${selected}</${tag}>`;

    onChange(before + wrapped + after);

    setTimeout(() => {
      el.focus();
      const newCursor = start + wrapped.length;
      el.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="text-emerald-500" size={18} />
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Terms & Conditions
        </h3>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-t-lg">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('b'); }}
          className="w-7 h-7 rounded flex items-center justify-center font-black text-[12px] text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('i'); }}
          className="w-7 h-7 rounded flex items-center justify-center font-bold italic text-[12px] text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all"
          title="Italic"
        >
          I
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <span className="text-[10px] text-slate-400 italic">Select text then B or I</span>
      </div>

      <textarea
        ref={textareaRef}
        className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 border-t-0 rounded-b-lg text-[11px] font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none leading-relaxed"
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`1. Delivery within 7-10 working days upon receipt of PO.\n2. Payment: Net 30 days upon delivery and acceptance.\n3. Price valid for 30 days from date of proposal.`}
      />

      <div className="mt-2 flex justify-between items-center">
        <p className="text-[10px] text-slate-400 italic">
          Each numbered line is one term. Select text then click B or I to format.
        </p>
        <span className="text-[10px] font-bold text-slate-300">
          {currentValue.length} chars
        </span>
      </div>
    </div>
  );
}