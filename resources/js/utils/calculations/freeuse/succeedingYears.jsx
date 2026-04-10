export const succeedingYears = (projectData) => {
  // CALCULATES THE SUCCEEDING YEARS AFTER 1ST YEAR POTENTIAL

  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const rawMachines = config.machine || [];
  const rawConsumables = config.consumable || [];

  const contractType = projectData?.companyInfo?.contractType || "";
  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  const normalizedContractType = String(contractType).trim().toLowerCase();

  const isRentalClick = normalizedContractType === "rental + click charge";
  const isFixClick = normalizedContractType === "free use + click charge";
  const isOutrightClick = normalizedContractType === "outright + click charge";
  const usesExactClickQty = isRentalClick || isFixClick || isOutrightClick;

  const annualMonoYields = (Number(projectData?.yield?.monoAmvpYields?.monthly) || 0) * 12;
  const annualColorYields = (Number(projectData?.yield?.colorAmvpYields?.monthly) || 0) * 12;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], grandTotal: 0 };
  const companyFees = (addFeesObj.company || []).filter(f => f.category !== "one-time-fee");
  const customerFees = (addFeesObj.customer || []).filter(f => f.category !== "one-time-fee");

  // EARLY RETURN — no succeeding years when contract is only 1 year
  if (succeedingYearCount === 0) {
    return {
      totalMachineQty: 0,
      totalMachineCost: 0,
      totalMachineSales: 0,
      totalConsumableQty: 0,
      totalConsumableCost: 0,
      totalConsumableSales: 0,
      totalFeesQty: 0,
      totalCompanyFeesAmount: 0,
      totalCustomerFeesAmount: 0,
      grandtotalCost: 0,
      grandtotalSell: 0,
      grossProfit: 0,
      roiPercentage: 0,
      config,
      machines: [],
      consumables: [],
      addFeesObj,
      companyFees: [],
      customerFees: [],
      succeedingYearsTotalCost: 0,
      succeedingYearsTotalSales: 0,
    };
  }

  // 2. PROCESS MACHINES
  const processedMachines = rawMachines.map(m => {
    const unitSell = 0;
    const fixedQty = 1;

    return {
      ...m,
      qty: fixedQty,
      price: unitSell,
      totalCost: 0,
      totalSell: fixedQty * unitSell
    };
  });

  // Helper: Rental + Click / Fix Click use exact qty, others use rounded-up qty
  const getQtyFromYields = (annualYields, itemYields) => {
    const safeItemYields = Number(itemYields) || 1;
    const exactQty = annualYields / safeItemYields;
     return usesExactClickQty 
    ? Math.round(exactQty * 100) / 100  // Returns a number with max 2 decimals
    : Math.ceil(exactQty);
  };

  // 3. MAP CONSUMABLES WITH MODE-BASED DYNAMIC QTY
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
    const unitSell = Number(c.price) || 0;

    return {
      ...c,
      qty: dynamicQty,
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

  const grandtotalCost = Number(totalMachineCost) + Number(totalConsumableCost) + Number(totalCompanyFeesAmount);
  const grandtotalSell = Number(totalMachineSales) + Number(totalConsumableSales) + Number(totalCustomerFeesAmount);

  const grossProfit = Number(grandtotalSell) - Number(grandtotalCost);
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  const succeedingYearsTotalCost = Number(totalMachineCost) + Number(totalConsumableCost);
  const succeedingYearsTotalSales = Number(totalMachineSales) + Number(totalConsumableSales);

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
    grandtotalCost: Number(grandtotalCost) || 0,
    grandtotalSell: Number(grandtotalSell) || 0,
    grossProfit: Number(grossProfit) || 0,
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