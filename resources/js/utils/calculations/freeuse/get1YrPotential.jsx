export const get1YrPotential = (projectData) => {
  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const machines = config.machine || [];
  const consumables = config.consumable || [];

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], grandTotal: 0 };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];

  // 2. CALCULATION LOGIC
  const totalMachineQty = machines.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalMachineCost = machines.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
  const totalMachineSales = machines.reduce((sum, m) => sum + (Number(m.totalSell) || 0), 0);

  const totalConsumableQty = consumables.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalConsumableCost = consumables.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);
  const totalConsumableSales = consumables.reduce((sum, c) => sum + (Number(c.totalSell) || 0), 0);

  const totalFeesQty = [...companyFees, ...customerFees].reduce((sum, f) => sum + (Number(f.qty) || 0), 0);
  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);

  const grandtotalCost = totalMachineCost + totalConsumableCost + totalCompanyFeesAmount;
  const grandtotalSell = totalMachineSales + totalConsumableSales + totalCustomerFeesAmount;

  const grossProfit = grandtotalSell - grandtotalCost;
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  // 3. RETURN ALL VALUES
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
    consumables,
    addFeesObj,
    companyFees,
    customerFees

  };
};