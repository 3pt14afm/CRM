import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Building2, Plus, Trash2, ImagePlus, FileText, Save } from 'lucide-react';
import SidebarMessageEditor from './SidebarMessageEditor';
import SidebarTermsEditor from './SidebarTermsEditor';
import SignatureUpload from './SignatureUpload';
export default function ProposalSideBar({ 
    isOpen, 
    setIsOpen, 
    proposal, 
    onUpdate,
    onSaveDraft, 
    onGenerate, 
    processing, 
    isLocked,
}) {
  const specs = proposal.specs || [];
  const terms = proposal.terms || [];
  const fileInputRef = useRef(null);

  const addSpec = () => {
    onUpdate('specs', [...specs, { label: '', value: '' }]);
  };

  const updateSpec = (idx, field, val) => {
    const updated = specs.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    onUpdate('specs', updated);
  };

  const removeSpec = (idx) => {
    onUpdate('specs', specs.filter((_, i) => i !== idx));
  };

  const addTerm = () => {
    onUpdate('terms', [...terms, '']);
  };

  const updateTerm = (idx, val) => {
    onUpdate('terms', terms.map((t, i) => i === idx ? val : t));
  };

  const removeTerm = (idx) => {
    onUpdate('terms', terms.filter((_, i) => i !== idx));
  };

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onUpdate('printer_image', e.target.result);
    reader.readAsDataURL(file);
  };

  const handleImagePaste = (e) => {
    const file = Array.from(e.clipboardData.items)
      .find(item => item.type.startsWith('image/'))
      ?.getAsFile();
    if (file) handleImageFile(file);
  };

  return (
    <>
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
            {/* Company Name */}
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

            {/* Reference & Attention */}
           {/* Contact Person */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Person</label>
                <input
                  type="text"
                  value={proposal.attention || ''}
                  onChange={(e) => onUpdate('attention', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="e.g. Ms. Marge"
                />
              </div>

              {/* Designation */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</label>
                <input
                  type="text"
                  value={proposal.designation || ''}
                  onChange={(e) => onUpdate('designation', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="e.g. Purchasing Manager"
                />
              </div>

              {/* Email & Mobile */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={proposal.email || ''}
                    onChange={(e) => onUpdate('email', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    placeholder="e.g. juan@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile No.</label>
                  <input
                    type="text"
                    value={proposal.mobile || ''}
                    onChange={(e) => onUpdate('mobile', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    placeholder="e.g. 09XX XXX XXXX"
                  />
                </div>
              </div>

            {/* Contract Specifications */}
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

             
          <SidebarMessageEditor
            value={proposal.message} 
            onChange={(newValue) => onUpdate('message', newValue)} 
          />


            {/* Printer Image Upload */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Printer Image</label>
              <div
                onPaste={handleImagePaste}
                tabIndex={0}
                className="relative w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                onClick={() => fileInputRef.current?.click()}
              >
                {proposal.printer_image ? (
                  <div className="relative group">
                    <img
                      src={proposal.printer_image}
                      alt="Printer preview"
                      className="w-full h-40 object-contain rounded-xl p-2"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <p className="text-white text-[11px] font-bold">Click or paste to replace</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <ImagePlus size={24} className="text-slate-300" />
                    <p className="text-[11px] font-semibold text-slate-400">Click to browse or paste image</p>
                    <p className="text-[10px] text-slate-300">PNG, JPG, WEBP supported</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">PHP</span>
                <input
                  type="number"
                  value={proposal.unit_price || ''}
                  onChange={(e) => onUpdate('unit_price', e.target.value)}
                  className="w-full pl-14 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Machine Specs Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine Specs</label>
                <button
                  onClick={addSpec}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all"
                >
                  <Plus size={12} />
                  Add Spec
                </button>
              </div>

              {specs.length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No specs yet. Click "Add Spec" to begin.
                </p>
              )}

              <div className="space-y-2">
                {specs.map((spec, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={spec.label}
                      onChange={(e) => updateSpec(idx, 'label', e.target.value)}
                      placeholder="Label (e.g. Speed)"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                      placeholder="Value (e.g. 29 ppm)"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                    <button
                      onClick={() => removeSpec(idx)}
                      className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

    
          </div>


                 {/* Terms & Conditions Editor */}
        <SidebarTermsEditor
          value={proposal.terms_text}
          onChange={(newValue) => onUpdate('terms_text', newValue)}
        />

        {/* Closing & Signatures */}
      <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="text-emerald-500" size={18} />
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Closing & Signatures
          </h3>
        </div>

        {/* Closing Message */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Closing Message</label>
          <textarea
            value={proposal.closing_text || ''}
            onChange={(e) => onUpdate('closing_text', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none leading-relaxed"
            placeholder="If there is anything more you need, you can reach me on my mobile or email me.&#10;&#10;Thank you very much and have a nice day."
          />
        </div>

        {/* Your Signature */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Signature</label>
          <SignatureUpload
            image={proposal.user_signature}
            onUpload={(val) => onUpdate('user_signature', val)}
          />
        </div>

        {/* Conforme Name */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conforme Name</label>
          <input
            type="text"
            value={proposal.conforme_name || ''}
            onChange={(e) => onUpdate('conforme_name', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            placeholder="e.g. John Doe, CEO"
          />
        </div>

        {/* Conforme Signature */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conforme Signature</label>
          <SignatureUpload
            image={proposal.conforme_signature}
            onUpload={(val) => onUpdate('conforme_signature', val)}
          />
        </div>
      </div>

       {/* --- ACTION BUTTONS --- */}
       <div className="grid grid-cols-2 gap-3 mt-5 p-4 border-t">
                <button
                    onClick={onSaveDraft}
                    disabled={processing || isLocked}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-all"
                >
                    {processing ? 'Saving...' : 'Save as Draft'}
                </button>

             <button
            onClick={onGenerate}
            disabled={processing || isLocked}
            // Changed bg-blue-600 to bg-emerald-500 and hover:bg-blue-700 to hover:bg-emerald-600
            className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-all"
        >
            {processing ? 'Generating...' : 'Generate Proposal'}
        </button>
                
                
            </div>
            {isLocked && (
                    <p className="text-xs text-red-500 italic text-center">
                        This proposal is locked (Generated).
                    </p>
                )}
        </div>


      </aside>
    </>
  );
}