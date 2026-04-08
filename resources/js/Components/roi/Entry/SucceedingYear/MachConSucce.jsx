import React from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function MachConSucce() {
  const { projectData } = useProjectData();

  const { machine = [], consumable = [] } = projectData.machineConfiguration || {};

  // Only include rows with SKU
  const filteredMachine = machine.filter((m) => m.sku && m.sku.trim() !== '');
  const filteredConsumable = consumable.filter((c) => c.sku && c.sku.trim() !== '');

  // Separate machines: Normal vs Others
  const normalMachines = filteredMachine.filter((m) => 
    m.mode !== 'others' && m.type !== 'others'
  );

  const othersMachines = filteredMachine.filter((m) => 
    m.mode === 'others' || m.type === 'others'
  );

  const formatNum = (val, decimals = 2) =>
    (Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <div className="gap-4 font-sans tracking-tight">
      <div className="flex-[3] border border-gray-300 rounded-md overflow-hidden shadow-sm">
        <table className="w-full bg-white border-collapse table-fixed">
          <colgroup>
            <col className="w-[77%]" />
            <col className="w-[23%]" />
          </colgroup>

          <thead className="bg-[#E2F4D8] border-b border-gray-300">
            <tr>
              <th className="px-3 py-2.5 text-[13px] font-medium text-center print:font-semibold border-r border-gray-300">
                MACHINE & CONSUMABLES
              </th>
              <th className="px-3 py-2.5 text-[13px] font-medium text-center print:font-semibold">
                COST
              </th>
            </tr>
          </thead>

          <tbody>
            {/* ==================== MACHINE SECTION ==================== */}
            <tr className="bg-[#E2F4D8]/40 border-b border-gray-200">
              <td className="px-4 py-1 font-semibold text-[12px] print:font-semibold border-r border-gray-300">
                MACHINE
              </td>
              <td className="px-4 py-1"></td>
            </tr>

            {normalMachines.length > 0 ? (
              normalMachines.map((m, index) => (
                <tr key={m.id || `m-${index}`} className="border-b py-5 border-gray-100 last:border-b-0 print:py-2">
                  <td className="px-7 text-[12px] break-words uppercase border-r border-gray-300 print:py-2">
                    {m.sku}
                  </td>
                  <td className="px-3 py-5 text-[12px] text-center print:py-2">
                    <p>{formatNum(0)}</p>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100 last:border-b-0 print:py-2">
                <td className="px-7 py-3 text-[12px] border-r border-gray-300 print:py-2">—</td>
                <td className="px-3 py-3 text-[12px] text-center print:py-2">{formatNum(0)}</td>
              </tr>
            )}

            {/* ==================== CONSUMABLES + OTHERS SECTION ==================== */}
            <tr className="bg-[#E2F4D8]/40 border-b border-gray-200">
              <td className="px-4 py-1 font-semibold text-[12px] print:font-semibold border-r border-gray-300">
                CONSUMABLES
              </td>
              <td className="px-4 py-1"></td>
            </tr>

            {/* Regular Consumables */}
            {filteredConsumable.length > 0 &&
              filteredConsumable.map((c, index) => (
                <tr key={c.id || `c-${index}`} className="border-b border-gray-100 last:border-b-0 print:py-2">
                  <td className="px-7 py-3 text-[12px] break-words border-r border-gray-300 print:py-2">
                    {c.sku}
                  </td>
                  <td className="px-3 py-3 text-[12px] text-center print:py-2">
                    {formatNum(c.cost)}
                  </td>
                </tr>
              ))}

            {/* OTHERS Section - Under Consumables */}
            {othersMachines.length > 0 && (
              <>
                <tr className="bg-[#E2F4D8]/30 border-t border-gray-200">
                  <td className="px-4 py-1 font-semibold text-[12px] print:font-semibold border-r border-gray-300">
                    OTHERS
                  </td>
                  <td className="px-4 py-1"></td>
                </tr>

                {othersMachines.map((m, index) => (
                  <tr key={m.id || `o-${index}`} className="border-b border-gray-100 last:border-b-0 print:py-2">
                    <td className="px-7 py-3 text-[12px] break-words uppercase border-r border-gray-300 print:py-2">
                      {m.sku}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-center print:py-2">
                      {formatNum(0)}
                    </td>
                  </tr>
                ))}
              </>
            )}

            {/* Empty row if no consumables and no others */}
            {filteredConsumable.length === 0 && othersMachines.length === 0 && (
              <tr className="border-b border-gray-100 last:border-b-0 print:py-2">
                <td className="px-7 py-3 text-[12px] border-r border-gray-300 print:py-2">—</td>
                <td className="px-3 py-3 text-[12px] text-center print:py-2">{formatNum(0)}</td>
              </tr>
            )}
          </tbody>

          {/* Blank total row */}
          <tfoot className="bg-[#E2F4D8]/70 border-t">
            <tr>
              <td className="px-4 py-5 text-[12px] font-semibold text-left border-r border-gray-300">
                {/* intentionally blank */}
              </td>
              <td className="px-3 py-3 text-[12px] text-center">
                {/* intentionally blank */}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default MachConSucce;