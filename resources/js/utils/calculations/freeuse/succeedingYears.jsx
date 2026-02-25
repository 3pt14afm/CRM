export const succeedingYears = (projectData) => {
  // CALCULATES THE SUCCEEDING YEARS AFTER 1ST YEAR POTENTIAL

  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const rawMachines = config.machine || [];
  const rawConsumables = config.consumable || [];

  const contractType = projectData?.companyInfo?.contractType || "";
  const normalizedContractType = String(contractType).trim().toLowerCase();

  const isRentalClick =
    normalizedContractType === "rental + click" ||
    normalizedContractType === "rental+click";
  const isFixClick =
    normalizedContractType === "fix click" ||
    normalizedContractType === "fixed click";

  // ✅ Rental + Click and Fix Click share the same exact-qty behavior
  const usesExactClickQty = isRentalClick || isFixClick;

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
      totalCost: 0 * 0, // this should be zero in succeeding years (NO MACHINE COST DISTRIBUTIONS)
      totalSell: fixedQty * unitSell
    };
  });

  // Helper: Rental + Click / Fix Click use exact qty, others use rounded-up qty
  const getQtyFromYields = (annualYields, itemYields) => {
    const safeItemYields = Number(itemYields) || 1;
    const exactQty = annualYields / safeItemYields;
    return usesExactClickQty ? exactQty : Math.ceil(exactQty);
  };

  // 3. MAP CONSUMABLES WITH MODE-BASED DYNAMIC QTY
  // TO GET THE QTY OF CONSUMABLE --> CONSUMABLE YIELDS / ANNUAL MONO/COLOR AMVP
  const processedConsumables = rawConsumables.map(c => {
    const itemYields = Number(c.yields) || 1;
    let dynamicQty = 0;

    // Apply the same Mode logic as Year 1
    switch (c.mode?.toLowerCase()) {
      case 'mono':
        dynamicQty = getQtyFromYields(annualMonoYields, itemYields);
        break;
      case 'color':
        dynamicQty = getQtyFromYields(annualColorYields, itemYields);
        break;
      case 'others':
        // Respect manual qty for non-toner items
        dynamicQty = Number(c.qty) || 1;
        break;
      default:
        // Default fallback to Mono
        dynamicQty = getQtyFromYields(annualMonoYields, itemYields);
    }

    const unitCost = Number(c.cost) || 0;
    const unitSell = Number(c.price) || 0;

    return {
      ...c,
      qty: dynamicQty, // exact for Rental + Click / Fix Click
      totalCost: dynamicQty * unitCost,
      totalSell: dynamicQty * unitSell
    };
  });

  // 4. CALCULATION LOGIC
  const totalMachineQty = processedMachines.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalMachineCost = processedMachines.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
  const totalMachineSales = processedMachines.reduce((sum, m) => sum + (Number(m.totalSell) || 0), 0);

  const totalConsumableQty = processedConsumables.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalConsumableCost = processedConsumables.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);
  const totalConsumableSales = processedConsumables.reduce((sum, c) => sum + (Number(c.totalSell) || 0), 0);

  const totalFeesQty = [...companyFees, ...customerFees].reduce((sum, f) => sum + (Number(f.qty) || 0), 0);
  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + (Number(f.total) || 0), 0);

  const grandtotalCost = totalMachineCost + totalConsumableCost + totalCompanyFeesAmount;
  const grandtotalSell = totalMachineSales + totalConsumableSales + totalCustomerFeesAmount;

  const grossProfit = grandtotalSell - grandtotalCost;
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  const succeedingYearsTotalCost = totalMachineCost + totalConsumableCost;
  const succeedingYearsTotalSales = totalMachineSales + totalConsumableSales;

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
    succeedingYearsTotalCost,
    succeedingYearsTotalSales
  };
};