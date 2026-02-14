export const succeedingYears = (projectData) => {
  // CALCULATES THE SUCCEEDING YEARS AFTER 1ST YEAR POTENTIAL


  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const rawMachines = config.machine || [];
  const rawConsumables = config.consumable || [];
  
  // Get BOTH Annual Yields (Mono and Color)
  const annualMonoYields = (Number(projectData?.yield?.monoAmvpYields?.monthly) || 0) * 12;
  const annualColorYields = (Number(projectData?.yield?.colorAmvpYields?.monthly) || 0) * 12;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], grandTotal: 0 };
  
  // 1.5 FILTER OUT ONE-TIME FEES (Recurring years only)
  const companyFees = (addFeesObj.company || []).filter(f => f.category !== "one-time-fee");
  const customerFees = (addFeesObj.customer || []).filter(f => f.category !== "one-time-fee");

  // 2. PROCESS MACHINES --> FOR FREE USE MACHINE
  const processedMachines = rawMachines.map(m => {
    const unitCost = Number(m.cost) || 0;
    const unitSell = Number(m.price) || 0;
    const fixedQty = 1;

    return {
      ...m,
      qty: fixedQty,
      totalCost: fixedQty * unitCost,
      totalSell: fixedQty * unitSell
    };
  });

  // 3. MAP CONSUMABLES WITH MODE-BASED DYNAMIC QTY
    // TO GET THE QTY OF CONSUMABLE --> CONSUMABLE YIELDS / ANNUAL MONO/COLOR AMVP 
  const processedConsumables = rawConsumables.map(c => {
    const itemYields = Number(c.yields) || 1; 
    let dynamicQty = 0;

    // Apply the same Mode logic as Year 1
    switch (c.mode?.toLowerCase()) {
      case 'mono':
        dynamicQty = Math.ceil(annualMonoYields / itemYields);
        break;
      case 'color':
        dynamicQty = Math.ceil(annualColorYields / itemYields);
        break;
      case 'others':
        // Respect manual qty for non-toner items
        dynamicQty = Number(c.qty) || 1;
        break;
      default:
        // Default fallback to Mono
        dynamicQty = Math.ceil(annualMonoYields / itemYields);
    }
    
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
  const totalMachineQty = processedMachines.reduce((sum, item) => sum + item.qty, 0);
  const totalMachineCost = rawMachines.reduce((sum, m) => sum + (m.totalCost || 0), 0);
  const totalMachineSales = processedMachines.reduce((sum, m) => sum + (m.totalSell || 0), 0);

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
    machines: processedMachines,
    consumables: processedConsumables, 
    addFeesObj,
    companyFees,
    customerFees
  };
};