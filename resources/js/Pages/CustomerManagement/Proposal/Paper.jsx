import React from 'react'
import PrintablePaper from './PrintablePaper'

function Paper({ isSidebarOpen, proposal, items, fees }) {
  const item = items && items.length > 0 ? items[0] : {};

  return (
    <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
      isSidebarOpen ? 'pr-[40%] bg-slate-100/50' : 'pr-0 bg-slate-50'
    } min-h-screen py-12 font-sans`}>
      
  <PrintablePaper>
       {/* HEADER SECTION */}
        <div className="flex justify-between text-[11px] mb-8">
          <div className="space-y-1">
            <div className="flex">
              <span className="text-slate-500 font-bold w-32 uppercase">COMPANY NAME</span>
              <span className="font-bold text-slate-900">: {proposal.company_name || ''}</span>
            </div>
               <div className="flex">
              <span className="text-slate-500 font-bold w-32 uppercase">CONTRACT TYPE</span>
              <span className="font-bold text-slate-900 uppercase">: {proposal.contract_type || ''}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 font-bold w-32 uppercase">CONTRACT DURATION</span>
              <span className="font-bold text-slate-900 uppercase">: {proposal.contract_years || ''} Years</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 font-bold w-32 uppercase">CONTACT PERSON</span>
              <span className="font-bold text-slate-900">: {proposal.attention || ''}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 font-bold w-32 uppercase">DESIGNATION</span>
              <span className="font-bold text-slate-900">: {proposal.designation || ''}</span>
            </div>
           <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">EMAIL</span>
            <span className="font-bold text-slate-900">: {proposal.email || ''}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">MOBILE NO.</span>
            <span className="font-bold text-slate-900">: {proposal.mobile || ''}</span>
          </div>
         
          </div>
          <div className="flex text-right">
            <span className="text-slate-500 font-bold w-16 uppercase">DATE</span>
            <span className="font-bold text-slate-900">
              : {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* SALUTATION & MESSAGE */}
        <div className="mb-14 text-[13px] leading-snug text-slate-800">
          <p className="italic mb-3">Dear {proposal.attention || 'Ms. Marge'},</p>
          <p className="font-bold italic mb-3 text-[#1f550b]">Greetings from Delsan Business Innovations Corporation!</p>
          <div className="whitespace-pre-line">
            {proposal.message || `We thank you for the opportunity in allowing us to submit our price proposal for your kind consideration and favorable approval as follows:`}
          </div>
        </div>

        {/* SINGLE MACHINE SHOWCASE */}
        <div className="mb-10">
          <h3 className="text-[#C40000] font-black text-[15px] uppercase mb-4 border-b border-slate-100 pb-1">
            {items?.find(i => i.kind === 'machine')?.sku || ''}
          </h3>
          
          <div className="flex gap-12 items-start">
            {/* LEFT: SPECS LIST */}
            <div className="flex-1">
              <table className="w-full text-[12px] border-collapse">
                <tbody>
                  {(proposal.specs || []).length > 0 ? (
                    (proposal.specs || []).map((spec, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="py-2 text-slate-600">{spec.label}</td>
                        <td className="py-2 text-right font-semibold text-[11px]">{spec.value}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-slate-50">
                      <td colSpan={2} className="py-4 text-center text-slate-300 text-[11px] italic">
                        No specs added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* RIGHT: IMAGE & PRICE BADGE */}
            <div className="w-[200px]">
              <div className="bg-white p-2 mb-4">
                <img
                  src={proposal.printer_image || '/images/L5590-(2).jpg'}
                  alt="Printer"
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="bg-[#e3ffe3] rounded-lg p-4 text-center border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">UNIT PRICE</p>
                <p className="text-sm font-black text-slate-900">
                  PHP {Number(proposal.unit_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

</PrintablePaper>


<PrintablePaper>
        {/* MPS PROGRAM OFFER TABLE */}
        {(() => {
          const machines = (items || []).filter(i => i.kind === 'machine');
          const consumables = (items || []).filter(i => i.kind === 'consumable' && Number(i.price) > 0);
          const allRows = [...machines, ...consumables];

          const formatCurrency = (val) =>
            Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

          return (
            <div className="mb-10 rounded-lg overflow-hidden border border-slate-200">
              <div className="bg-[#F8FAFC] px-4 py-2 border-b border-slate-200">
                {String(proposal.contract_type || '').trim().toLowerCase() === 'free use' && (
                  <p className="text-[11px] text-slate-600 mt-0.5 ">
                    <span className="font-black not-italic text-slate-700">MPS PROGRAM: </span>  <b className='ml-1'>FREE USE</b> of the printer if you purchase initial <b>four (4)</b> toner cartridges per unit.
                  </p>
                )}
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold">
                  <tr>
                    <th className="border-r border-slate-200 p-2 text-left">Printer Model</th>
                    <th className="border-r border-slate-200 p-2 text-center">Toner Type</th>
                    <th className="border-r border-slate-200 p-2 text-center">Toner Yield</th>
                    <th className="border-r border-slate-200 p-2 text-center">Unit Price</th>
                    <th className="border-r border-slate-200 p-2 text-center">QUANTITY</th>
                    <th className="p-3 text">Total</th>
                  </tr>
                </thead>
               <tbody className="text-slate-900">
            {allRows.length > 0 ? allRows.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-200">
                <td className="border-r border-slate-200 p-3 font-bold">{row.sku?.toUpperCase() || '—'}</td>
                <td className="border-r border-slate-200 p-3 text-center">{row.mode || '—'}</td>
                <td className="border-r border-slate-200 p-3 text-center italic">
                  {row.yields ? `${Number(row.yields).toLocaleString()} pages*` : '—'}
                </td>
                <td className="border-r border-slate-200 p-3 text-right">PHP {formatCurrency(row.price)}</td>
                <td className="border-r border-slate-200 p-3 text-center">{Number(row.qty)} pcs.</td>
                <td className="p-3 text-right font-black">PHP {formatCurrency(row.total_sell)}</td>
              </tr>
            )) : (
              <tr className="border-t border-slate-200">
                <td colSpan={6} className="p-3 text-center text-slate-400">No items found.</td>
              </tr>
            )}
          </tbody>
                  <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50">
            <td colSpan={5} className="p-3 text text-[11px] font-black uppercase border-r border-slate-200">
              Total
            </td>
            <td className="p-3 text-right font-black text-[10px] min-w-[120px]">
              PHP {formatCurrency(allRows.reduce((sum, row) => sum + (Number(row.total_sell) || 0), 0))}
            </td>
          </tr>
        </tfoot>
              </table>
            </div>
          );
        })()}

        {/* TERMS & CONDITIONS */}

      <div className="text-[12px] text-slate-700 mt-12">
        <h4 className="font-black uppercase text-slate-900 mb-3 border-b-2 border-slate-900 inline-block">
          TERMS & CONDITIONS
        </h4>
        {(proposal.terms_text || '').trim() ? (
          <ol className="list-decimal ml-4 space-y-1">
            {proposal.terms_text
              .split('\n')
              .map(line => line.replace(/^\d+\.\s*/, '').trim())
              .filter(Boolean)
              .map((line, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: line }} />
              ))}
          </ol>
        ) : (
          <p className="text-slate-300 italic">No terms added yet.</p>
        )}
      </div>

      {/* CLOSING & SIGNATURES */}
      <div className="mt-10 text-[12px] text-slate-700">
        <p className="whitespace-pre-line mb-10 leading-relaxed">
          {proposal.closing_text ||
            `If there is anything more you need to make your laser printers work better, you can reach me on my mobile or email me.\n\nThank you very much and have a nice day.`}
        </p>

        <div className="flex justify-between items-end mt-8">
          {/* Sales Rep */}
          <div className="space-y-1">
            {proposal.user_signature && (
              <img src={proposal.user_signature} alt="Signature" className="h-12 object-contain mb-1" />
            )}
            <div className="border-t border-slate-400 pt-1 w-52">
              <p className="font-black text-slate-900 uppercase">{proposal.user?.name || '---'}</p>
              <p className="text-slate-500 text-[10px] uppercase">{proposal.user?.role || '---'}</p>
            </div>
          </div>

          {/* Conforme */}
          <div className="space-y-1">
            {proposal.conforme_signature && (
              <img src={proposal.conforme_signature} alt="Conforme" className="h-12 object-contain mb-1" />
            )}
            <div className="border-t border-slate-400 pt-1 w-52">
              <p className="font-black text-slate-900 uppercase">{proposal.conforme_name || 'CONFORME:'}</p>
              <p className="text-slate-500 text-[10px] uppercase">Signature Over Printed Name / Date</p>
            </div>
          </div>
        </div>
      </div>


      </PrintablePaper>
    </div>
  )
}

export default Paper