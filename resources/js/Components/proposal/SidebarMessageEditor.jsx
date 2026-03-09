import React from 'react';
import { FileText } from 'lucide-react';

export default function SidebarMessageEditor({ value, onChange }) {
  // Your specific template
  const defaultTemplate = `Dear Maam Jhane:

We thank you for the opportunity in allowing us to submit our price proposal for your kind consideration and favorable approval as follows:`;

  // Use the existing value from props, or the default template if empty
  const currentValue = value !== undefined && value !== null ? value : defaultTemplate;

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="text-emerald-500" size={18} />
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Proposal Introduction
        </h3>
      </div>
      
      <textarea
        className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none leading-relaxed"
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter the proposal message..."
      />
      
      <div className="mt-2 flex justify-between items-center">
        <p className="text-[10px] text-slate-400 italic">
          Line breaks will be preserved in the document.
        </p>
        <span className="text-[10px] font-bold text-slate-300">
          {currentValue.length} characters
        </span>
      </div>
    </div>
  );
}