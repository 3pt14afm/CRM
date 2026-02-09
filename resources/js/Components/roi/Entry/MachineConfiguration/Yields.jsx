import React from "react";
import { useProjectData } from "@/Context/ProjectContext";

function Yields() {
  const { projectData, setProjectData } = useProjectData();

  // keep raw values (can be "" or number/string)
  const monoRaw = projectData?.yield?.monoAmvpYields?.monthly ?? "";
  const colorRaw = projectData?.yield?.colorAmvpYields?.monthly ?? "";

  // compute numbers safely for annual display
  const monoMonthlyNum = Number(monoRaw || 0);
  const colorMonthlyNum = Number(colorRaw || 0);

  const monoAnnual = monoMonthlyNum * 12;
  const colorAnnual = colorMonthlyNum * 12;

  const handleChange = (type, value) => {
    setProjectData((prev) => ({
      ...prev,
      yield: {
        ...prev.yield,
        [`${type}AmvpYields`]: {
          monthly: value === "" ? "" : Number(value),
        },
      },
    }));
  };

  const numberInputClass =
    "w-24 h-7 text-[12px] rounded border border-slate-200 text-center outline-none focus:ring-1 focus:ring-green-400 bg-slate-50/50 mx-auto block" +
    " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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
                placeholder="0"
                value={monoRaw === 0 ? "" : monoRaw}
                onChange={(e) => handleChange("mono", e.target.value)}
                className={numberInputClass}
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
                placeholder="0"
                value={colorRaw === 0 ? "" : colorRaw}
                onChange={(e) => handleChange("color", e.target.value)}
                className={numberInputClass}
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
