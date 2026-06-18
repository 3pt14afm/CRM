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
  
  const isMonthlyRental = normalizedContractType === "fixed monthly only";
  const isRentalClick = normalizedContractType === "rental + click charge";
  const isFixClick = normalizedContractType === "free use + click charge";
  const isOutrightClick = normalizedContractType === "outright + click charge";
  const usesExactClickQty = isRentalClick || isFixClick || isOutrightClick;

  const annualMonoYields = (Number(projectData?.yield?.monoAmvpYields?.monthly) || 0) * 12;
  const annualColorYields = (Number(projectData?.yield?.colorAmvpYields?.monthly) || 0) * 12;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], total: 0 };
    
    // --- REPLACE YOUR OLD FILTER LINES WITH THIS ---
    const companyFees = (addFeesObj.company || []).map(f => ({
        ...f,
        total: f.category === "one-time-fee" ? 0 : Number(f.total || 0),
        qty: f.category === "one-time-fee" ? 0 : Number(f.qty || 0)
    }));

    const customerFees = (addFeesObj.customer || []).map(f => ({
        ...f,
        total: f.category === "one-time-fee" ? 0 : Number(f.total || 0),
        qty: f.category === "one-time-fee" ? 0 : Number(f.qty || 0)
    }));

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

 const getQtyFromYields = (annualYields, itemYields) => {
  const safeItemYields = Number(itemYields);

  // 🚫 Prevent division by 0 or invalid yields
  if (!safeItemYields || safeItemYields <= 0) {
    return 0;
  }

  const exactQty = annualYields / safeItemYields;

  // Capped at max 2 decimal points
  return Math.round(exactQty * 100) / 100; 
};

const getSafeNumber = (val, fallback = 0) => {
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

const hasValidYield = (y) => {
  const num = Number(y);
  return !isNaN(num) && num > 0;
};

const processedConsumables = rawConsumables.map(c => {
  const mode = c.mode?.toLowerCase();
  const itemYields = Number(c.yields);

  let qty = 0;

    if (isMonthlyRental) {
    qty = 0;
    const unitCost = 0;
    return {
      ...c,
      qty,
      yields: 0,
      price: 0,
      totalCost: qty * unitCost,
      totalSell: 0,
    };
  }

  // ✅ CASE 1: OTHERS → calculated based on Mono (default) or Color
  if (mode === 'others') {
    if (hasValidYield(itemYields)) {
      const baseYields = annualMonoYields > 0 ? annualMonoYields : annualColorYields;
      if (baseYields > 0) {
        qty = getQtyFromYields(baseYields, itemYields);
      } else {
        qty = getSafeNumber(c.qty, 1);
      }
    } else {
      qty = getSafeNumber(c.qty, 1);
    }
  }

  // ✅ CASE 2: MONO / COLOR with valid yields → computed
  else if ((mode === 'mono' || mode === 'color') && hasValidYield(itemYields)) {
    const baseYields = mode === 'mono' ? annualMonoYields : annualColorYields;
    qty = getQtyFromYields(baseYields, itemYields);
  }

  // 🚫 CASE 3: MONO / COLOR but ZERO/INVALID yields → FORCE 0
  else if (mode === 'mono' || mode === 'color') {
    qty = 0;
  }

  // ✅ CASE 4: UNKNOWN mode → safe fallback
  else {
    qty = getSafeNumber(c.qty, 1);
  }

  const unitCost = getSafeNumber(c.cost);
  const unitSell = getSafeNumber(c.price);

  return {
    ...c,
    qty,
    totalCost: qty * unitCost,
    totalSell: qty * unitSell
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