import React from 'react';
import { ChevronLeft, ChevronRight, Building2, Printer, Plus, Trash2, FileText, User } from 'lucide-react';
import SidebarMessageEditor from './SidebarMessageEditor';

export default function ProposalSideBar({ 
    isOpen, 
    setIsOpen, 
    proposal, 
    onUpdate 
}) {
  return (
    <>
      {/* 1. Transparent Backdrop Overlay */}
      <div 
        className={`fixed inset-0 z-[60] ${isOpen ? 'visible' : 'invisible'}`}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`
        fixed top-0 bottom-0 right-0 z-[70]
        w-[40%] min-w-[450px] bg-white 
        shadow-[-15px_0px_40px_rgba(0,0,0,0.08)]
        border-l border-slate-200
        transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        
        {/* Toggle Handle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute top-1/2 -left-8 -translate-y-1/2 w-8 h-16 
                     bg-white border-y border-l border-slate-200
                     flex items-center justify-center rounded-l-md
                     shadow-[-4px_0px_10px_rgba(0,0,0,0.05)]
                     hover:bg-slate-50 group transition-all"
        >
          {isOpen ? (
            <ChevronRight size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
          ) : (
            <ChevronLeft size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
          )}
        </button>

        <div className="h-full overflow-y-auto px-10 py-12">
          <div className="flex items-center gap-2 mb-8">
            <Building2 className="text-emerald-500" size={20} />
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-800">
              Company & Client Info
            </h3>
          </div>

          <div className="space-y-6">
            {/* Company Name Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
              <input 
                type="text"
                value={proposal.company_name || ''}
                onChange={(e) => onUpdate('company_name', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                placeholder="Enter company name..."
              />
            </div>

            {/* Reference & Attention Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reference No.</label>
                <input 
                  type="text"
                  value={proposal.reference || ''}
                  onChange={(e) => onUpdate('reference', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attention To</label>
                <input 
                  type="text"
                  value={proposal.attention || ''}
                  onChange={(e) => onUpdate('attention', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="e.g. Ms. Marge"
                />
              </div>
            </div>

            {/* Contract Details */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4">
              <h4 className="text-[10px] font-bold text-emerald-700 uppercase">Contract Specifications</h4>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[9px] font-bold text-emerald-600/60 uppercase">Term (Years)</label>
                    <p className="text-sm font-bold text-emerald-900">{proposal.contract_years} Years</p>
                 </div>
                 <div>
                    <label className="text-[9px] font-bold text-emerald-600/60 uppercase">Type</label>
                    <p className="text-sm font-bold text-emerald-900">{proposal.contract_type}</p>
                 </div>
              </div>
            </div>
          </div>

          <SidebarMessageEditor 
            value={proposal.message} 
            onChange={(newValue) => onUpdate('message', newValue)} 
            />

  
        </div>
      </aside>
    </>
  );
}