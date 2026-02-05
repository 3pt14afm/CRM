import React from 'react'

function ContractDetails() {
  return (
    /* Changed max-w-5xl to max-w-7xl for a wider layout */
    <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm font-sans max-w-dull mx-auto mb-6">
      <div className="bg-[#E2F4D8] py-2 text-center border-b border-gray-300">
        <h2 className="text-xs font-extrabold tracking-widest text-gray-800 uppercase">Contract Details</h2>
      </div>

      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="text-[10px] font-bold uppercase text-gray-700 bg-[#E2F4D8]/10">
            <th className="px-4 py-2 border-r border-gray-300 w-1/3">Particulars</th>
            <th className="px-4 py-2 border-r border-gray-300 text-center w-16">Qty</th>
            <th className="px-4 py-2 border-r border-gray-300 text-center">Unit Price</th>
            <th className="px-4 py-2 border-r border-gray-300 text-center">Amount</th>
            <th className="px-4 py-2">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          <tr className="h-10 bg-white">
            <td className="px-4 py-2 border-r border-gray-300 text-gray-600 text-xs">XXXXXXXXXXX</td>
            <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-600 text-xs">XXX</td>
            <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono text-[11px]">XXX,XXX.XX</td>
            <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono text-[11px]">XXX,XXX.XX</td>
            <td className="px-4 py-2 text-gray-600 text-xs"></td>
          </tr>
          <tr className="h-10 bg-white">
            <td className="px-4 py-2 border-r border-gray-300 text-gray-600 text-xs">XXXXXXXXXXX</td>
            <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-600 text-xs">XXX</td>
            <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono text-[11px]">XXX,XXX.XX</td>
            <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono text-[11px]">XXX,XXX.XX</td>
            <td className="px-4 py-2 text-gray-600 text-xs"></td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-[#E2F4D8]/20 border-t border-gray-300">
            <td colSpan="3" className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider border-r border-gray-300">
              Total Initial
            </td>
            <td className="px-4 py-2 border-r border-gray-300"></td>
            <td className="px-4 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default ContractDetails