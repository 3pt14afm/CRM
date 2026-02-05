import React from 'react'

function Totals() {
    // 1. BASE DATA
    const databaseItems = [
        { id: 1, type: 'machine', name: 'Machine A', cost: 100, yields: 10, cpp: 0.1, price: 150, sellCpp: 0.2, qty: 1 },
        { id: 2, type: 'machine', name: 'Machine B', cost: 200, yields: 20, cpp: 0.1, price: 250, sellCpp: 0.2, qty: 2 },
        { id: 4, type: 'consumable', name: 'Consumable 1', cost: 10, yields: 100, cpp: 0.01, price: 20, sellCpp: 0.02, qty: 5 },
        { id: 5, type: 'consumable', name: 'Consumable 2', cost: 20, yields: 200, cpp: 0.01, price: 30, sellCpp: 0.02, qty: 10 },
    ];

    const otherExpenses = [
        { id: 101, name: 'Maintenance Fee', amount: 500 },
        { id: 102, name: 'Electricity/Power', amount: 1200.50 },
        { id: 103, name: 'Operator Salary', amount: 15000 },
    ];

    // 2. CALCULATIONS
    const f = (num) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(num);

    const machines = databaseItems.filter(i => i.type === 'machine');
    const consumables = databaseItems.filter(i => i.type === 'consumable');

    const totalItemsCost = databaseItems.reduce((sum, item) => sum + (item.cost * item.qty), 0);
    const totalGrossSales = databaseItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalOtherAmount = otherExpenses.reduce((sum, item) => sum + item.amount, 0);

    const finalTotalCost = totalItemsCost + totalOtherAmount;
    const finalTotalROI = totalGrossSales - finalTotalCost;
    const roiPercentage = finalTotalCost !== 0 ? (finalTotalROI / finalTotalCost) * 100 : 0;

    return (
        <div className="p-6  space-y-8 font-sans uppercase font-bold tracking-tight text-gray-800 text-[10px]">
            
  
            {/* BOTTOM SECTION: THREE-COLUMN LAYOUT */}
            <div className="grid grid-cols-2  items-start text-[11px]">
                <div className='flex  gap-1'>
                    {/* 1. OTHERS TABLE (LEFT) */}
                    <div className="flex-none w-full min-w-[90px] max-w-[50%]"> {/* Added max-width here to prevent long rows */}
                        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full bg-white table-fixed"> {/* table-fixed keeps column widths consistent */}
                                <thead className="bg-[#E2F4D8] border-b border-gray-300 text-[11px]">
                                    <tr>
                                        <th className="px-3 py-3 text-center w-[60%]">Others</th>
                                        <th className="px-3 py-3 text-center border-l border-gray-300 w-[40%]">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {otherExpenses.map(exp => (
                                        <tr key={exp.id} className="border-b border-gray-100 last:border-b-0">
                                            <td className="px-4 py-2 text-gray-600 truncate">{exp.name}</td>
                                            <td className="text-right pr-4 font-medium">{f(exp.amount)}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-[#E2F4D8] border-t-2 border-gray-300 font-bold">
                                        <td className="px-3 py-2">Total Others</td>
                                        <td className="text-right pr-4">{f(totalOtherAmount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                        {/* 2. THE MIDDLE ROI BOX (CENTER) */}
                        <div className="flex justify-center mt-24  w-full">
                            <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm w-[400px]">
                                <table className="w-full text-[11px]">
                                    <tbody>
                                        <tr className="border-b border-gray-100">
                                            <td className="px-4 py-3 font-bold bg-[#E2F4D8]/20 text-[11px]  text-gray-500">Total Cost</td>
                                            <td className="px-4 py-3 bg-white  text-right border-l border-gray-100">{f(finalTotalCost)}</td>
                                        </tr>
                                        <tr className="bg-[#E2F4D8] font-bold">
                                            <td className="px-4 py-3">Total ROI</td>
                                            <td className="px-4 py-3 text-right border-l border-gray-300">{f(finalTotalROI)}</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="px-4 py-3 text-[11px] "></td>
                                            <td className="px-4 py-3 bg-white text-right border-l border-gray-100">{roiPercentage.toFixed(2)}%</td>
                                        </tr>
                                        <tr className="font-bold">
                                            <td className="px-4 py-3 text-[11px]  text-gray-500">Total Revenue</td>
                                            <td className="px-4 py-3 bg-white text-right border-l border-gray-100">{f(totalGrossSales)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                 </div>
                {/* 3. ROI BREAKDOWN BOXES (RIGHT) */}
                <div className="flex flex-col items-end gap-6">
                    {/* Upper Breakdown Box */}
                    <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm w-[57%]">
                        <table className="w-full text-center">
                            <tbody>
                                <tr className="border-b bg-white border-gray-100">
                                    <td className="py-2 border-r border-gray-100">XX</td>
                                    <td className="py-2 border-r border-gray-100">{f(totalItemsCost)}</td>
                                    <td className="py-2">{f(totalGrossSales)}</td>
                                </tr>
                                <tr className="bg-[#E2F4D8] font-bold">
                                    <td className="py-2 border-r border-gray-300"></td>
                                    <td className="py-2 border-r border-gray-300">{f(totalItemsCost)}</td>
                                    <td className="py-2">{f(totalGrossSales)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Lower ROI % Box */}
                    <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm w-[47%]">
                        <table className="w-full text-center">
                            <tbody>
                                <tr className="border-b bg-white border-gray-100">
                                    <td className="py-2 border-r border-gray-100">{f(finalTotalCost)}</td>
                                    <td className="py-2">{f(totalGrossSales)}</td>
                                </tr>
                                <tr className="bg-[#E2F4D8] font-bold">
                                    <td className="py-2 border-r border-gray-300 uppercase">ROI</td>
                                    <td className="py-2">{f(finalTotalROI)}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 bg-white border-r border-gray-100"></td>
                                    <td className="py-2 bg-white">{roiPercentage.toFixed(2)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Totals