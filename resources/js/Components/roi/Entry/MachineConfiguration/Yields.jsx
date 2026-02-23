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

  // responsive input width: full on xs, fixed on sm+
  const numberInputClass =
    "w-full sm:w-28 h-7 text-[12px] rounded-sm border border-slate-200 text-center outline-none focus:ring-1 focus:ring-green-400 bg-white mx-auto block" +
    " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="w-full">
      {/* stretches to parent; stays readable on big screens */}
      <div className="w-full sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto overflow-hidden rounded-md border border-slate-300 shadow-md bg-white">
        <table className="w-full border-separate border-spacing-0 table-fixed">
          {/* responsive column widths */}
          <colgroup>
            <col className="w-[10%] sm:w-[25%] min-w-28" />
            <col className="w-[45%] sm:w-[37.5%] min-w-36" />
            <col className="w-[45%] sm:w-[37.5%] min-w-36" />
          </colgroup>

          <thead>
            <tr className="bg-[#F6FDF5]">
              <th className="border-b border-r border-slate-200 p-3 sm:p-5" />
              <th className="border-b border-r border-slate-200 text-[10px] sm:text-[11px] p-2 font-bold text-slate-800 text-center uppercase tracking-wider">
                Monthly Yields
              </th>
              <th className="border-b border-slate-200 p-2 text-[10px] sm:text-[11px] font-bold text-slate-800 text-center uppercase tracking-wider">
                Annual Yields
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Mono AMVP */}
            <tr className="text-center">
              <td className="bg-[#E9F7E7] text-[10px] sm:text-[11px] px-2 border-b border-r border-slate-200 font-bold text-slate-800">
                Mono AMVP
              </td>

              <td className="border-b border-r border-slate-200 p-2 sm:p-1 bg-lightgreen/2">
                <input
                  type="number"
                  placeholder="0"
                  value={monoRaw === 0 ? "" : monoRaw}
                  onChange={(e) => handleChange("mono", e.target.value)}
                  className={numberInputClass}
                />
              </td>

              <td className="border-b border-slate-200 p-2 sm:p-1 bg-lightgreen/2 text-[12px] text-black">
                {monoAnnual.toLocaleString(undefined)}
              </td>
            </tr>

            {/* Color AMVP */}
            <tr className="text-center">
              <td className="bg-[#E9F7E7] text-[10px] sm:text-[11px] px-2 border-r border-slate-200 font-bold text-slate-800">
                Color AMVP
              </td>

              <td className="border-r border-slate-200 p-2 sm:p-1 bg-lightgreen/2">
                <input
                  type="number"
                  placeholder="0"
                  value={colorRaw === 0 ? "" : colorRaw}
                  onChange={(e) => handleChange("color", e.target.value)}
                  className={numberInputClass}
                />
              </td>

              <td className="p-2 sm:p-1 bg-lightgreen/2 text-[12px] text-black">
                {colorAnnual.toLocaleString(undefined)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Yields;
