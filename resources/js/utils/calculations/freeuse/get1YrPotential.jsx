export const get1YrPotential = (projectData) => {
  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const rawMachines = config.machine || [];
  const rawConsumables = config.consumable || [];

  const contractType = projectData?.companyInfo?.contractType || "";
  const normalizedContractType = String(contractType).trim().toLowerCase();

  // Rule: Only Outright contracts allow a Machine selling price
  const isOutright = normalizedContractType.includes("outright");

  const isMonthlyRental = normalizedContractType === "fixed monthly only";
  const isRentalClick = normalizedContractType.includes("rental + click");
  const isFixClick = normalizedContractType.includes("free use + click");

  const usesExactClickQty = isRentalClick || isFixClick;

  const isBundleChecked = projectData?.companyInfo?.bundledStdInk === true;
  const bundleDeduction = (isMonthlyRental && isBundleChecked)
    ? (Number(config.totals?.totalBundledPrice) || 0)
    : 0;

  const annualMonoYields = (Number(projectData?.yield?.monoAmvpYields?.monthly) || 0) * 12;
  const annualColorYields = (Number(projectData?.yield?.colorAmvpYields?.monthly) || 0) * 12;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [] };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];

  // 2. PROCESS MACHINES
  const processedMachines = rawMachines.map(m => {
    const unitCost = Number(m.cost) || 0;
    
    /** * SELLING PRICE LOGIC FOR MACHINES:
     * If contract is NOT outright, force unitSell to 0.
     */
    const unitSell = isOutright ? (Number(m.price) || 0) : 0;
    const fixedQty = 1;

    return {
      ...m,
      qty: fixedQty,
      price: unitSell, // Added to keep track of individual price
      totalCost: fixedQty * unitCost,
      totalSell: fixedQty * unitSell
    };
  });

  const getQtyFromYields = (annualYields, itemYields) => {
    const safeItemYields = Number(itemYields) || 1;
    const exactQty = annualYields / safeItemYields;
    return usesExactClickQty ? exactQty : Math.ceil(exactQty);
  };

  // 3. MAP CONSUMABLES
  const processedConsumables = rawConsumables.map(c => {
    const itemYields = Number(c.yields) || 1;
    let dynamicQty = 0;

    switch (c.mode?.toLowerCase()) {
      case 'mono':
        dynamicQty = getQtyFromYields(annualMonoYields, itemYields);
        break;
      case 'color':
        dynamicQty = getQtyFromYields(annualColorYields, itemYields);
        break;
      case 'others':
        dynamicQty = Number(c.qty) || 1;
        break;
      default:
        dynamicQty = getQtyFromYields(annualMonoYields, itemYields);
    }

    const unitCost = Number(c.cost) || 0;
    const unitSell = Number(c.price) || 0; // Consumables keep their price

    return {
      ...c,
      qty: dynamicQty,
      totalCost: dynamicQty * unitCost,
      totalSell: dynamicQty * unitSell
    };
  });

  // 4. CALCULATION LOGIC
  const totalMachineQty = processedMachines.reduce((sum, m) => sum + (Number(m.qty) || 0), 0);
  const totalMachineCost = rawMachines.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
  const totalMachineSales = processedMachines.reduce((sum, m) => sum + (Number(m.totalSell) || 0), 0);
  
  const totalConsumableQty = processedConsumables.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalConsumableCost = processedConsumables.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);
  const totalConsumableSales = processedConsumables.reduce((sum, c) => sum + (Number(c.totalSell) || 0), 0);

  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);

  const grandtotalCost = (totalMachineCost + totalConsumableCost + totalCompanyFeesAmount) - bundleDeduction;
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
    totalCompanyFeesAmount,
    totalCustomerFeesAmount,
    grandtotalCost: Number(grandtotalCost || 0),
    grandtotalSell: Number(grandtotalSell || 0),
    grossProfit: grossProfit || 0,
    roiPercentage,
    machines: processedMachines,
    consumables: processedConsumables,
    companyFees, // Explicitly return as array for .map() in Totals.jsx
    customerFees, // Explicitly return as array for .map() in Totals.jsx
    bundleDeduction,
    firstYearTotalCost: totalMachineCost + totalConsumableCost,
    fistYearTotalSell: totalMachineSales + totalConsumableSales
  };
};