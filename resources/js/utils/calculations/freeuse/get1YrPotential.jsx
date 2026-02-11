export const get1YrPotential = (projectData) => {
  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const machines = config.machine || [];
  const rawConsumables = config.consumable || [];
  
  // Get Annual Mono Yields from projectData
  const annualMonoYields = Number(projectData?.yield?.monoAmvpYields?.monthly)*12 || 0;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], total: 0 };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];

  // 2. MAP CONSUMABLES WITH DYNAMIC QTY
  // Formula: Qty = Annual Mono Yields / Consumable Yields
  const processedConsumables = rawConsumables.map(c => {
    const itemYields = Number(c.yields) || 1; // Avoid division by zero
    const dynamicQty = Math.ceil(annualMonoYields / itemYields); // Use Math.ceil for realistic ordering
    
    // Recalculate costs/sales based on new dynamic quantity
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
    consumables: processedConsumables, // Return the ones with calculated qty
    addFeesObj,
    companyFees,
    customerFees
  };
};