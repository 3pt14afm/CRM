import React, { useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function Yields() {
  const { projectData, setProjectData } = useProjectData();

  const monoMonthly = parseFloat(projectData.yield.monoAmvpYields?.monthly) || 0;
  const colorMonthly = parseFloat(projectData.yield.colorAmvpYields?.monthly) || 0;

  const monoAnnual = monoMonthly * 12;
  const colorAnnual = colorMonthly * 12;

  // Proper handleChange that updates context and logs the updated state
  const handleChange = (type, value) => {
    setProjectData(prev => {
      const updated = {
        ...prev,
        yield: {
          ...prev.yield,
          [`${type}AmvpYields`]: { monthly: Number(value) }
        }
      };
      console.log('Updated projectData:', updated); // log here to see latest
      return updated;
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 max-w-md shadow-[0px_6px_10px_3px_rgba(0,_0,_0,_0.1)] w-full bg-white">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-[#F6FDF5]">
            <th className="border-b border-r border-slate-200 p-5 w-1/4"></th>
            <th className="border-b border-r border-slate-200 text-[11px] p-2 font-bold text-slate-800 w-1/3 text-center uppercase tracking-wider">
              Monthly Yields
            </th>
            <th className="border-b border-slate-200 p-2 text-[11px] font-bold text-slate-800 w-1/3 text-center uppercase tracking-wider">
              Annual Yields
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Mono AMVP */}
          <tr className="text-center">
            <td className="bg-[#E9F7E7] text-[11px] px-2 border-b border-r border-slate-200 font-bold text-slate-800">
              Mono AMVP
            </td>
            <td className="border-b border-r border-slate-200 p-1 bg-white">
              <input
                type="number"
                value={monoMonthly}
                onChange={(e) => handleChange('mono', e.target.value)}
                placeholder="0"
                className="w-24 h-7 text-[12px] rounded border border-slate-200 text-center outline-none focus:ring-1 focus:ring-green-400 bg-slate-50/50 mx-auto block"
              />
            </td>
            <td className="border-b border-slate-200 p-1 bg-slate-50/30 text-[12px] text-black">
              {monoAnnual.toLocaleString(undefined)}
            </td>
          </tr>

          {/* Color AMVP */}
          <tr className="text-center">
            <td className="bg-[#E9F7E7] text-[11px] border-r border-slate-200 p-2 font-bold text-slate-800">
              Color AMVP
            </td>
            <td className="border-r border-slate-200 p-1 bg-white">
              <input
                type="number"
                value={colorMonthly}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="0"
                className="w-24 h-7 text-[12px] rounded border border-slate-200 text-center outline-none focus:ring-1 focus:ring-green-400 bg-slate-50/50 mx-auto block"
              />
            </td>
            <td className="p-1 bg-slate-50/30 text-[12px] text-black">
              {colorAnnual.toLocaleString(undefined)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default Yields;
