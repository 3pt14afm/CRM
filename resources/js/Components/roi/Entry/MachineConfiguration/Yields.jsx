import React, { useState } from 'react'

function Yields() {
  // State to manage the monthly values for both rows
  const [yields, setYields] = useState({
    mono: '',
    color: ''
  });

  const handleChange = (key, value) => {
    // Only allow numbers and decimals
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setYields(prev => ({ ...prev, [key]: value }));
    }
  };

  // Helper to calculate and format the annual value
  const calculateAnnual = (val) => {
    const num = parseFloat(val);
    if (!num) return '0';
    return (num * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 max-w-md shadow-[0px_6px_10px_3px_rgba(0,_0,_0,_0.1)] w-full bg-white">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-[#F6FDF5]">
            <th className="border-b border-r border-slate-200 p-2 w-1/4"></th>
            <th className="border-b border-r border-slate-200 text-[10px] p-2 font-bold text-slate-800 w-1/3 text-center uppercase tracking-wider">
              Monthly Yields
            </th>
            <th className="border-b border-slate-200 p-2 text-[10px] font-bold text-slate-800 w-1/3 text-center uppercase tracking-wider">
              Annual Yields
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: Mono AMVP */}
          <tr className="text-center">
            <td className="bg-[#E9F7E7] text-[10px] px-2 border-b border-r border-slate-200 font-bold text-slate-800">
              Mono AMVP
            </td>
            <td className="border-b border-r border-slate-200 p-1 bg-white">
              <input 
                type="text" 
                value={yields.mono}
                onChange={(e) => handleChange('mono', e.target.value)}
                placeholder="0"
                className="w-24 h-7 text-[11px] rounded border border-slate-200 text-center outline-none focus:ring-1 focus:ring-green-400 bg-slate-50/50 mx-auto block" 
              />
            </td>
            <td className="border-b border-slate-200 p-1 bg-slate-50/30 text-[11px] font-medium text-slate-600">
              {calculateAnnual(yields.mono)}
            </td>
          </tr>

          {/* Row 2: Color AMVP */}
          <tr className="text-center">
            <td className="bg-[#E9F7E7] text-[10px] border-r border-slate-200 p-2 font-bold text-slate-800">
              Color AMVP
            </td>
            <td className="border-r border-slate-200 p-1 bg-white">
              <input 
                type="text" 
                value={yields.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="0"
                className="w-24 h-7 text-[11px] rounded border border-slate-200 text-center outline-none focus:ring-1 focus:ring-green-400 bg-slate-50/50 mx-auto block" 
              />
            </td>
            <td className="p-1 bg-slate-50/30 text-[11px] font-medium text-slate-600">
              {calculateAnnual(yields.color)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default Yields