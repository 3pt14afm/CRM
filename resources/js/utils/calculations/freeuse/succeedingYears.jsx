export const succeedingYears = (projectData) => {
  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const machines = config.machine || [];
  const rawConsumables = config.consumable || [];
  
  // NEW: Get Annual Mono Yields (Same as Year 1 logic)
  const annualMonoYields = Number(projectData?.yield?.monoAmvpYields?.monthly) * 12 || 0;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], grandTotal: 0 };
  
  // 1.5 FILTER OUT ONE-TIME FEES
  const companyFees = (addFeesObj.company || []).filter(f => f.category !== "one-time-fee");
  const customerFees = (addFeesObj.customer || []).filter(f => f.category !== "one-time-fee");

  // 2. NEW: MAP CONSUMABLES WITH DYNAMIC QTY (Logic from get1YrPotential)
  const processedConsumables = rawConsumables.map(c => {
    const itemYields = Number(c.yields) || 1; 
    const dynamicQty = Math.ceil(annualMonoYields / itemYields); 
    
    const unitCost = Number(c.cost) || 0;
    const unitSell = Number(c.price) || 0;

    return {
      ...c,
      qty: dynamicQty,
      totalCost: dynamicQty * unitCost,
      totalSell: dynamicQty * unitSell
    };
  });

  // 3. CALCULATION LOGIC
  const totalMachineQty = machines.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalMachineCost = machines.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
  const totalMachineSales = machines.reduce((sum, m) => sum + (Number(m.totalSell) || 0), 0);

  // Use the NEW processedConsumables for totals
  const totalConsumableQty = processedConsumables.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalConsumableCost = processedConsumables.reduce((sum, c) => sum + (c.totalCost || 0), 0);
  const totalConsumableSales = processedConsumables.reduce((sum, c) => sum + (c.totalSell || 0), 0);

  const totalFeesQty = [...companyFees, ...customerFees].reduce((sum, f) => sum + (Number(f.qty) || 0), 0);
  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);

  // Note: Machine costs are usually 0 in succeeding years if they are one-time buys, 
  // but we keep the logic here in case you have recurring lease/maintenance costs.
  const grandtotalCost = totalMachineCost + totalConsumableCost + totalCompanyFeesAmount;
  const grandtotalSell = totalMachineSales + totalConsumableSales + totalCustomerFeesAmount;

  const grossProfit = grandtotalSell - grandtotalCost;
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  // 4. RETURN ALL VALUES
  return {
    totalMachineQty,
    totalMachineCost,
    totalMachineSales,
    totalConsumableQty,
    totalConsumableCost,
    totalConsumableSales,
    totalFeesQty,
    totalCompanyFeesAmount,
    totalCustomerFeesAmount,
    grandtotalCost,
    grandtotalSell,
    grossProfit,
    roiPercentage,
    config,
    machines,
    consumables: processedConsumables, // Returning the calculated version
    addFeesObj,
    companyFees,
    customerFees
  };
};