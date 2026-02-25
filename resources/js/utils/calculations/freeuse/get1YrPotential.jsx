export const get1YrPotential = (projectData) => {
  // CALCULATES THE 1ST YEAR POTENTIAL

  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const rawMachines = config.machine || [];
  const rawConsumables = config.consumable || [];

  const contractType = projectData?.companyInfo?.contractType || "";
  const isMonthlyRental = contractType === "Monthly Rental";
  const isRentalClick = contractType === "Rental + Click";

  const isBundleChecked = projectData?.companyInfo?.bundledStdInk === true;
  const bundleDeduction = (isMonthlyRental && isBundleChecked)
    ? (Number(config.totals?.totalBundledPrice) || 0)
    : 0;

  // Get BOTH Annual Yields FROM PROJECT DATA CONTEXT
  const annualMonoYields = (Number(projectData?.yield?.monoAmvpYields?.monthly) || 0) * 12;
  const annualColorYields = (Number(projectData?.yield?.colorAmvpYields?.monthly) || 0) * 12;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], total: 0 };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];

  // 2. PROCESS MACHINES (Force Qty to 1) --> FOR FREE USE MACHINE
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

  // Helper: for Rental + Click use exact qty, otherwise round up
  const getQtyFromYields = (annualYields, itemYields) => {
    const exactQty = annualYields / itemYields;
    return isRentalClick ? exactQty : Math.ceil(exactQty);
  };

  // 3. MAP CONSUMABLES WITH MODE-BASED DYNAMIC QTY
  // TO GET THE QTY OF CONSUMABLE --> CONSUMABLE YIELDS / ANNUAL MONO/COLOR AMVP
  const processedConsumables = rawConsumables.map(c => {
    const itemYields = Number(c.yields) || 1;
    let dynamicQty = 0;

    // Logic based on the new 'mode' selection
    switch (c.mode?.toLowerCase()) {
      case 'mono':
        dynamicQty = getQtyFromYields(annualMonoYields, itemYields);
        break;
      case 'color':
        dynamicQty = getQtyFromYields(annualColorYields, itemYields);
        break;
      case 'others':
        // For 'others', keep the manually entered qty
        dynamicQty = Number(c.qty) || 1;
        break;
      default:
        // Fallback to mono if no mode is selected
        dynamicQty = getQtyFromYields(annualMonoYields, itemYields);
    }

    const unitCost = Number(c.cost) || 0;
    const unitSell = Number(c.price) || 0;

    return {
      ...c,
      qty: dynamicQty, // exact value for Rental + Click (no round up)
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

  const totalFeesQty = [...companyFees, ...customerFees].reduce((sum, f) => sum + (Number(f.qty) || 0), 0);
  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);

  const grandtotalCost = (totalMachineCost + totalConsumableCost + totalCompanyFeesAmount) - bundleDeduction;
  const grandtotalSell = totalMachineSales + totalConsumableSales + totalCustomerFeesAmount;

  const grossProfit = grandtotalSell - grandtotalCost;
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  const firstYearTotalCost = totalMachineCost + totalConsumableCost;
  const fistYearTotalSell = totalMachineSales + totalConsumableSales;

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
    customerFees,
    bundleDeduction,
    firstYearTotalCost,
    fistYearTotalSell
  };
};