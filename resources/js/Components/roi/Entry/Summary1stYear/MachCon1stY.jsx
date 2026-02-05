import React from 'react'

function MachCon1stY() {
       /* EXAMPLE DATA:
   Even if this list has 10 machines and 20 consumables, 
   the table will adjust automatically.
*/
        const databaseItems = [
        { type: 'machine', name: 'Machine A', cost: 100, yields: 10, cpp: 0.1, price: 150, sellCpp: 0.2, qty: 1, totalCost: 100, grossSales: 150 },
        { type: 'machine', name: 'Machine B', cost: 200, yields: 20, cpp: 0.1, price: 250, sellCpp: 0.2, qty: 2, totalCost: 400, grossSales: 500 },
        { type: 'machine', name: 'Machine C', cost: 300, yields: 30, cpp: 0.1, price: 350, sellCpp: 0.2, qty: 3, totalCost: 900, grossSales: 1050 },
        { type: 'consumable', name: 'Consumable 1', cost: 10, yields: 100, cpp: 0.01, price: 20, sellCpp: 0.02, qty: 5, totalCost: 50, grossSales: 100 },
        { type: 'consumable', name: 'Consumable 2', cost: 20, yields: 200, cpp: 0.01, price: 30, sellCpp: 0.02, qty: 10, totalCost: 200, grossSales: 300 },
         { type: 'consumable', name: 'Consumable 2', cost: 20, yields: 200, cpp: 0.01, price: 30, sellCpp: 0.02, qty: 10, totalCost: 200, grossSales: 300 },
        ];

        const machines = databaseItems.filter(item => item.type === 'machine');
        const consumables = databaseItems.filter(item => item.type === 'consumable');
  return (
    <div class="grid p-4 grid-cols-[70%_30%] gap-4 font-sans uppercase  font-bold  tracking-tight text-gray-800">
                    
                    {/* LEFT TABLE: MACHINE & CONSUMABLES */}
                        <div class="flex-[3] border border-gray-300 rounded-xl overflow-hidden  shadow-sm">
                            <table class="w-full bg-white border-collapse">
                                <thead class="bg-[#E2F4D8] border-b border-gray-300">
                                    <tr>
                                        <th class="px-3 py-3 text-[11px] font-bold  text-left w-1/4">Machine & Consumables</th>
                                        <th class="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Cost</th>
                                        <th class="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Yields</th>
                                        <th class="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Cost CPP</th>
                                        <th class="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Selling Price</th>
                                        <th class="px-2 py-3 text-[11px] font-bold text-center border-l border-gray-300">Sell CPP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Machine Header */}
                                    <tr class="bg-[#E2F4D8]/50">
                                        <td colspan="6" class="px-3 py-1 border-b text-[11px] border-gray-200 text-black">Machine</td>
                                    </tr>
                                    {/* FLEXIBLE MAPPING FOR MACHINES */}
                                    {machines.map((m) => (
                                        <tr key={m.id} class="border-b border-gray-100 last:border-b-0">
                                            <td class="px-6 py-3 text-[11px] text-gray-600 font-medium">{m.name}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.cost}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.yields}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.cpp}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.price}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.sellCpp}</td>
                                        </tr>
                                    ))}

                                    {/* Consumable Header */}
                                    <tr class="bg-[#E2F4D8]/50 text-[11px] border-t border-gray-200">
                                        <td colspan="6" class="px-3 py-1 border-b border-gray-200 text-black">Consumables</td>
                                    </tr>
                                    {/* FLEXIBLE MAPPING FOR CONSUMABLES */}
                                    {consumables.map((c) => (
                                        <tr key={c.id} class="border-b border-gray-100 last:border-b-0">
                                            <td class="px-6 py-3 text-[11px] text-gray-600 font-medium">{c.name}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.cost}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.yields}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.cpp}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.price}</td>
                                            <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.sellCpp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    {/* RIGHT TABLE: 1ST YEAR POTENTIAL */}
                        <div class="flex-1 self-start -mt-8">
                                    {/* TITLE SECTION */}
                                    <div class="text-center mb-1 pr-1">
                                        <span class="text-lg font-bold uppercase tracking-tight text-gray-700">
                                            1st Year Potential
                                        </span>
                                    </div>

                                    {/* THE TABLE */}
                                    <div class="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                                        <table class="w-full bg-white border-collapse">
                                            <thead class="bg-[#E2F4D8] border-b border-gray-300">
                                                <tr>
                                                    <th class="px-2 py-2 text-[11px] text-center font-bold uppercase">Qty</th>
                                                    <th class="px-2 py-2 text-[11px] text-center border-l border-gray-300 uppercase">Total Cost</th>
                                                    <th class="px-2 py-2 text-[11px] text-center border-l border-gray-300 uppercase">Gross Sales</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Spacer row to match "Machine" header on the left */}
                                                <tr class="bg-[#E2F4D8]/50 border-b border-gray-200">
                                                    <td colspan="3" class="py-1">&nbsp;</td>
                                                </tr>
                                                {machines.map((m) => (
                                                    <tr key={`pot-${m.id}`} class="border-b border-gray-100 last:border-b-0">
                                                        <td class="px-2 py-3 text-[11px] text-center">{m.qty}</td>
                                                        <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.totalCost}</td>
                                                        <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{m.grossSales}</td>
                                                    </tr>
                                                ))}

                                                {/* Spacer row to match "Consumables" header on the left */}
                                                <tr class="bg-[#E2F4D8]/50 border-t-2 border-gray-300 border-b">
                                                    <td colspan="3" class="py-1">&nbsp;</td>
                                                </tr>
                                                {consumables.map((c) => (
                                                    <tr key={`pot-${c.id}`} class="border-b border-gray-100 last:border-b-0">
                                                        <td class="px-2 py-3 text-[11px] text-center">{c.qty}</td>
                                                        <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.totalCost}</td>
                                                        <td class="border-l text-[11px] border-gray-100 text-center px-2 py-1">{c.grossSales}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                 </div>
  )
}

export default MachCon1stY