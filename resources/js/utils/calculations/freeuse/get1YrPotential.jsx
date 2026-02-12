export const get1YrPotential = (projectData) => {
  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const rawMachines = config.machine || [];
  const rawConsumables = config.consumable || [];
  
  // Get Annual Mono Yields from projectData
  const annualMonoYields = Number(projectData?.yield?.monoAmvpYields?.monthly) * 12 || 0;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], total: 0 };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];

  // 2. PROCESS MACHINES (Force Qty to 1)
  const processedMachines = rawMachines.map(m => {
    const unitCost = Number(m.cost) || 0;
    const unitSell = Number(m.price) || 0;
    const fixedQty = 1;

    return {
      ...m,
      qty: fixedQty,
      totalCost: fixedQty * unitCost, // Now reflects cost of exactly 1
      totalSell: fixedQty * unitSell   // Now reflects sale of exactly 1
    };
  });

  // 3. MAP CONSUMABLES WITH DYNAMIC QTY
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

  // 4. CALCULATION LOGIC
  // Use the processedMachines for totals
  const totalMachineQty = processedMachines.reduce((sum, m) => sum + m.qty, 0);
  const totalMachineCost = processedMachines.reduce((sum, m) => sum + (m.totalCost || 0), 0);
  const totalMachineSales = processedMachines.reduce((sum, m) => sum + (m.totalSell || 0), 0);

  // Use the processedConsumables for totals
  const totalConsumableQty = processedConsumables.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalConsumableCost = processedConsumables.reduce((sum, c) => sum + (c.totalCost || 0), 0);
  const totalConsumableSales = processedConsumables.reduce((sum, c) => sum + (c.totalSell || 0), 0);

  const totalFeesQty = [...companyFees, ...customerFees].reduce((sum, f) => sum + (Number(f.qty) || 0), 0);
  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);

  const grandtotalCost = totalMachineCost + totalConsumableCost + totalCompanyFeesAmount;
  const grandtotalSell = totalMachineSales + totalConsumableSales + totalCustomerFeesAmount;

  const grossProfit = grandtotalSell - grandtotalCost;
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  // 5. RETURN ALL VALUES
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
    machines: processedMachines, // Return updated machine list
    consumables: processedConsumables,
    addFeesObj,
    companyFees,
    customerFees
  };
};