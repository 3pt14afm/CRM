import { useProjectData } from '@/Context/ProjectContext'
import React, { useEffect } from 'react'

function ContractDetails() {
  const { projectData, setContractDetails } = useProjectData();
  
  // Destructure machine and consumable directly from machineConfiguration
  const { machine, consumable } = projectData?.machineConfiguration || { machine: [], consumable: [] };

  const formatCurrency = (val) => 
    new Intl.NumberFormat('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(val || 0);

  // 1. Filter consumables with a selling price
  const contractToners = (consumable || []).filter(item => Number(item.price) > 0);

  // 2. Calculate total based on consumable qty * price
  // Hardware is excluded from total (as per your "PHP 0.00" logic)
  const totalInitial = contractToners.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    return sum + (qty * price);
  }, 0);

useEffect(() => {
  setContractDetails({
    machine: machine, // Hardware units
    consumable: contractToners, // Consumables with calculated qty
    totalInitial: totalInitial // The sum of consumables only
  });
}, [machine, contractToners, totalInitial, setContractDetails]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm font-sans max-w-full mx-2 ml-5 mb-6">
      <div className="bg-[#E2F4D8] py-2 text-center border-b border-gray-300">
        <h2 className="text-xs font-extrabold tracking-widest text-gray-800 uppercase">Contract Details</h2>
      </div>

      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="text-[10px] font-bold border-b uppercase text-gray-700 bg-[#E2F4D8]/10">
            <th className="px-4 py-2 border-r border-gray-300 w-1/3 text-left">Particulars</th>
            <th className="px-4 py-2 border-r border-gray-300 text-center w-16">Qty</th>
            <th className="px-4 py-2 border-r border-gray-300 text-center">Unit Price</th>
            <th className="px-4 py-2 border-r border-gray-300 text-center">Amount</th>
            <th className="px-4 py-2 text-left">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {/* HARDWARE SECTION */}
          <tr className="bg-gray-50/50">
            <td colSpan="5" className="px-4 py-1 text-left text-[9px] font-bold uppercase text-gray-500">Hardware</td>
          </tr>
          {machine.map((item, idx) => (
            <tr key={`m-${idx}`} className="h-10 bg-white">
              <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-700 text-xs font-semibold">{item.sku?.toUpperCase()}</td>
              <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-600 text-xs">
                {item.qty} {/* Qty based on machine configuration */}
              </td>
              <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono">PHP 0.00</td>
              <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono">-</td>
              <td className="px-4 py-2 text-gray-600 text-[10px] italic text-left uppercase">FREE USE PRINTER</td>
            </tr>
          ))}

          {/* CONSUMABLES SECTION */}
          <tr className="bg-gray-50/50">
            <td colSpan="5" className="px-4 py-1 text-left text-[9px] font-bold uppercase text-gray-500">Consumables</td>
          </tr>
          {contractToners.map((item, idx) => {
            const qty = Number(item.qty) || 0;
            const price = Number(item.price) || 0;
            const amount = qty * price;

            return (
              <tr key={`c-${idx}`} className="h-10 bg-white">
                <td className="px-4 py-2 border-r border-gray-300 text-left text-gray-600 text-xs uppercase">{item.sku.toUpperCase()}</td>
                <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-600 text-xs">
                  {qty} {/* Qty based on consumable configuration */}
                </td>
                <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono">{formatCurrency(price)}</td>
                <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-600 text-xs font-mono">{formatCurrency(amount)}</td>
                <td className="px-4 py-2 text-gray-600 text-[10px] text-left">
                  {idx === 0 ? "Initial toner requirement (OEM)" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#E2F4D8]/20 border-t border-gray-300 font-bold">
            <td colSpan="3" className="px-4 py-2 text-right text-[12px] uppercase border-r border-gray-300">Total Initial</td>
            <td className="px-4 py-2 border-r border-gray-300 text-right text-xs font-mono">{formatCurrency(totalInitial)}</td>
            <td className="px-4 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default ContractDetails