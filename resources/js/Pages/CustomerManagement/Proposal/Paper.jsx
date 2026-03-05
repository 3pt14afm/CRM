import React from 'react'
import PrintablePaper from './PrintablePaper'

function Paper({ isSidebarOpen, proposal, items, fees }) {
  // Target the first machine only
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
              <span className="font-bold text-slate-900">: {proposal.company_name || '---'}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 font-bold w-32 uppercase">CONTACT PERSON</span>
              <span className="font-bold text-slate-900">: {proposal.attention || '---'}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 font-bold w-32 uppercase">DESIGNATION</span>
              <span className="font-bold text-slate-900">: {proposal.designation || '---'}</span>
            </div>
          </div>
          <div className="flex text-right">
            <span className="text-slate-500 font-bold w-24 uppercase">PROPOSAL ID</span>
            <span className="font-bold text-slate-900">: #{proposal.reference || '---'}</span>
          </div>
        </div>

        {/* SALUTATION & MESSAGE */}
        <div className="mb-8 text-[13px] leading-snug text-slate-800">
          <p className="italic mb-3">Dear {proposal.attention || 'Ms. Marge'},</p>
          <p className="font-bold italic mb-3 text-[#1f550b]">Greetings from Delsan Business Innovations Corporation!</p>
          <div className="whitespace-pre-line">
            {proposal.message || `We thank you for the opportunity in allowing us to submit our price proposal for your kind consideration and favorable approval as follows:`}
          </div>
        </div>

        {/* SINGLE MACHINE SHOWCASE */}
        <div className="mb-10">
          <h3 className="text-[#C40000] font-black text-[15px] uppercase mb-4 border-b border-slate-100 pb-1">
            CANON MF275DW PRINTER
          </h3>
          
          <div className="flex gap-12 items-start">
            {/* LEFT: SPECS LIST */}
            <div className="flex-1">
              <table className="w-full text-[12px] border-collapse">
                <tbody>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">A4 Speed (ppm)</td>
                    <td className="py-2 text-right font-semibold">{item.speed || '29'}</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Print Resolution</td>
                    <td className="py-2 text-right font-semibold">600 x 600dpi</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">First Printout Time</td>
                    <td className="py-2 text-right font-semibold">Approx. 5.4 secs</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Display</td>
                    <td className="py-2 text-right font-semibold">6-LINE LCD Touchscreen</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Connectivity</td>
                    <td className="py-2 text-right font-semibold">USB, Ethernet, WIFI</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Monthly Duty Cycle</td>
                    <td className="py-2 text-right font-semibold">20,000 pages</td>
                  </tr>
                   <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Monthly Duty Cycle</td>
                    <td className="py-2 text-right font-semibold">20,000 pages</td>
                  </tr>
                       <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Monthly Duty Cycle</td>
                    <td className="py-2 text-right font-semibold">20,000 pages</td>
                  </tr>
                       <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Monthly Duty Cycle</td>
                    <td className="py-2 text-right font-semibold">20,000 pages</td>
                  </tr>
                       <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Monthly Duty Cycle</td>
                    <td className="py-2 text-right font-semibold">20,000 pages</td>
                  </tr>
                       <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Monthly Duty Cycle</td>
                    <td className="py-2 text-right font-semibold">20,000 pages</td>
                  </tr>
                       <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-600">Monthly Duty Cycle</td>
                    <td className="py-2 text-right font-semibold">20,000 pages</td>
                  </tr>
                  
                </tbody>
              </table>
            </div>

            {/* RIGHT: IMAGE & PRICE BADGE */}
            <div className="w-[250px]">
              <div className="bg-white p-2 mb-4">
                <img 
                  src= "/images/L5590-(2).jpg"
                  alt="Printer"
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="bg-[#e3ffe3] rounded-lg p-4 text-center border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">UNIT PRICE</p>
                <p className="text-sm font-black text-slate-900">
                  PHP {Number(item.mc_total_sell || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MPS PROGRAM OFFER TABLE */}
        <div className="mb-10 rounded-lg overflow-hidden border border-slate-200">
           <div className="bg-[#F8FAFC] px-4 py-2 border-b border-slate-200">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">MPS PROGRAM OFFER</h4>
           </div>
           <table className="w-full text-[11px] border-collapse">
              <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="border-r border-slate-200 p-3 text-left">Printer Model</th>
                  <th className="border-r border-slate-200 p-3 text-center">Toner Code</th>
                  <th className="border-r border-slate-200 p-3 text-center">Yield</th>
                  <th className="border-r border-slate-200 p-3 text-right">Unit Price</th>
                  <th className="border-r border-slate-200 p-3 text-center">Initial Order</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                <tr className="border-t border-slate-200">
                  <td className="border-r border-slate-200 p-3 font-bold">CANON MF275DW PRINTER</td>
                  <td className="border-r border-slate-200 p-3 text-center">EP-071H</td>
                  <td className="border-r border-slate-200 p-3 text-center italic">2,500 pages*</td>
                  <td className="border-r border-slate-200 p-3 text-right">PHP {Number(item.mc_total_sell || 0).toLocaleString()}</td>
                  <td className="border-r border-slate-200 p-3 text-center">{item.qty} pcs.</td>
                  <td className="p-3 text-right font-black">
                     PHP {Number(item.mc_total_sell * item.qty).toLocaleString()}
                  </td>
                </tr>
              </tbody>
           </table>
        </div>

        {/* TERMS & CONDITIONS */}
        <div className="text-[11px] text-slate-700 mt-12">
          <h4 className="font-black uppercase text-slate-900 mb-3 border-b-2 border-slate-900 inline-block">TERMS & CONDITIONS</h4>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Delivery within 7-10 working days upon receipt of PO.</li>
            <li>Payment: Net 30 days upon delivery and acceptance.</li>
            <li>Price valid for 30 days from date of proposal.</li>
            <li>Warranty: 1 year on parts and service under standard operating conditions.</li>
          </ol>
          <p className="mt-8 text-[9px] text-emerald-600 italic">
            *Page Yield based on ISO 19752 – A4 5% print coverage.
          </p>
        </div>
      </PrintablePaper>
    </div>
  )
}

export default Paper