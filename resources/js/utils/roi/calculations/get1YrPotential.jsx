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
  const isPerCartridge = normalizedContractType.includes("per cartridge");
  // There are three outright variants — "Outright + Click Charge",
  // "Outright + Per Cartridge", and "Outright Only (1 year)" — and only the
  // last one makes consumable qty user-entered / machine optional. Match on
  // "outright" + "only" together, since that combination is unique to it.
  const isOutrightOnly = normalizedContractType.includes("outright") && normalizedContractType.includes("only");


  const isBundleChecked = projectData?.companyInfo?.bundledStdInk === true;
  const bundleDeduction = (isMonthlyRental && isBundleChecked)
    ? (Number(config.totals?.totalBundledPrice) || 0)
    : 0;

  const annualMonoYields = (Number(projectData?.yield?.monoAmvpYields?.monthly) || 0) * 12;
  const annualColorYields = (Number(projectData?.yield?.colorAmvpYields?.monthly) || 0) * 12;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [] };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];

  // Helper to ensure clean 2 decimal points everywhere
  const to2Decimals = (num) => {
    const parsed = Number(num);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
  };

  // --- HELPER FUNCTIONS ---
  const getQtyFromYields = (annualYields, itemYields) => {
    const safeItemYields = Number(itemYields);
    if (!safeItemYields || safeItemYields <= 0) {
      return 0;
    }
    const exactQty = annualYields / safeItemYields;
    return to2Decimals(exactQty);
  };

  const getSafeNumber = (val, fallback = 0) => {
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  const hasValidYield = (y) => {
    const num = Number(y);
    return !isNaN(num) && num > 0;
  };

    const applyPerCartridgeRounding = (qty) => {
    return isPerCartridge ? Math.ceil(qty) : qty;
  };


  // 2. PROCESS MACHINES (processed first — consumables now depend on printer machine qty)
  const processedMachines = rawMachines.map(m => {
    const mode = m.mode?.toLowerCase();
    const machineYields = Number(m.yields);

    // ✅ SANITIZED: Instantly catch NaN strings
    let machineQty = getSafeNumber(m.qty, 0);

    if (mode === 'others') {
      if (hasValidYield(machineYields)) {
        const baseYields = annualMonoYields > 0 ? annualMonoYields : annualColorYields;
        if (baseYields > 0) {
          machineQty = getQtyFromYields(baseYields, machineYields);
        } else {
          machineQty = getSafeNumber(m.qty, 1);
        }
      } else {
        machineQty = getSafeNumber(m.qty, 1);
      }
    }
    else if (!machineQty || machineQty <= 0) {
      if (hasValidYield(machineYields)) {
        const baseYields = annualMonoYields > 0 ? annualMonoYields : annualColorYields;
        machineQty = baseYields > 0 ? getQtyFromYields(baseYields, machineYields) : 1;
      } else {
        machineQty = 1;
      }
    }

    const unitCost = Number(m.cost) || 0;
    const unitMargin = Number(m.machineMarginTotal) || 0;

    const loadedCost = unitCost + unitMargin;
    const unitSell = isOutright ? (Number(m.price) || 0) : 0;


    return {
      ...m,
      mode,
      qty: to2Decimals(machineQty),
      price: unitSell,
      totalCost: to2Decimals(machineQty * loadedCost),
      totalSell: to2Decimals(machineQty * unitSell)
    };
  });

  // Printer machine qty — any machine row that isn't 'others' mode (this is
  // the same "printer row" definition used in useMachineRows.js: MACHINE
  // type, mode !== 'others'). Includes the mandatory row, whose mode is
  // always '' rather than 'mono'/'color' — filtering on mode === 'mono' ||
  // 'color' would silently drop it and undercount the printer total.
  const printerMachineQty = processedMachines
    .filter(m => m.mode !== 'others')
    .reduce((sum, m) => sum + getSafeNumber(m.qty, 0), 0);

  // 3. PROCESS CONSUMABLES
  const processedConsumables = rawConsumables.map(c => {
    const mode = c.mode?.toLowerCase();
    const itemYields = Number(c.yields);
    
    // ✅ SANITIZED: Immediately clean quantities against NaN strings
    let qty = getSafeNumber(c.qty, 0);

    if (isMonthlyRental) {
      // Exception — untouched: monthly rental consumable qty stays user-entered.
      const unitCost = getSafeNumber(c.cost);
      const qty = getSafeNumber(c.qty, 0);
      return {
        ...c,
        qty,
        yields: 0,
        price: 0,
        totalCost: to2Decimals(qty * unitCost),
        totalSell: 0,
      };
    }

    // Only three exceptions are untouched (no printer-qty multiplication):
    //   1. isMonthlyRental — handled above via early return.
    //   2. isOutrightOnly mono/color — handled explicitly below.
    //   3. mode === 'others' — handled explicitly below.
    // Only the mono/color yield-based case gets multiplied by printerMachineQty.
    if (isOutrightOnly && (mode === 'mono' || mode === 'color')) {
      // Exception — untouched: Outright Only (1yr) consumable qty is user-entered.
      qty = getSafeNumber(c.qty, 1);
    } else if (mode === 'others') {
      // Exception — untouched: yield-derived or user-entered, no printer multiplier.
      if (hasValidYield(itemYields)) {
        const baseYields = annualMonoYields > 0 ? annualMonoYields : annualColorYields;
        qty = baseYields > 0 ? getQtyFromYields(baseYields, itemYields) : getSafeNumber(c.qty, 1);
      } else {
        qty = getSafeNumber(c.qty, 1);
      }
    } else if (mode === 'mono' || mode === 'color') {
      if (hasValidYield(itemYields)) {
        const baseYields = mode === 'mono' ? annualMonoYields : annualColorYields;
        qty = getQtyFromYields(baseYields, itemYields);
      } else {
        qty = 0;
      }

      // Multiply by printer machine qty — only the mono/color yield-based
      // branch gets this; 'others' and any other mode are untouched.
      qty = to2Decimals(qty * printerMachineQty);
    } else {
      // Any other mode — untouched, not part of the new rule.
      qty = getSafeNumber(c.qty, 1);
    }

    // Apply ceil rounding for "per cartridge" contract types
    qty = applyPerCartridgeRounding(qty); 

    const unitCost = getSafeNumber(c.cost);
    const unitSell = getSafeNumber(c.price);

    return {
      ...c,
      qty: to2Decimals(qty),
      totalCost: to2Decimals(qty * unitCost),
      totalSell: to2Decimals(qty * unitSell)
    };
  });

  // 4. CALCULATION LOGIC WITH REAL-TIME NaN INTERCEPTION
  const totalMachineQty = processedMachines.reduce((sum, m) => sum + (getSafeNumber(m.qty, 0)), 0);
  const totalMachineCost = processedMachines.reduce((sum, m) => sum + (getSafeNumber(m.totalCost, 0)), 0);
  const totalMachineSales = processedMachines.reduce((sum, m) => sum + (getSafeNumber(m.totalSell, 0)), 0);
  
  const totalConsumableQty = processedConsumables.reduce((sum, item) => sum + (getSafeNumber(item.qty, 0)), 0);
  const totalConsumableCost = processedConsumables.reduce((sum, c) => sum + (getSafeNumber(c.totalCost, 0)), 0);
  const totalConsumableSales = processedConsumables.reduce((sum, c) => sum + (getSafeNumber(c.totalSell, 0)), 0);

  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + (getSafeNumber(f.total, 0)), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + (getSafeNumber(f.total, 0)), 0);

  const grandtotalCost = (totalMachineCost + totalConsumableCost + totalCompanyFeesAmount) - getSafeNumber(bundleDeduction, 0);
  const grandtotalSell = totalMachineSales + totalConsumableSales + totalCustomerFeesAmount;

  const grossProfit = grandtotalSell - grandtotalCost;
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  // 5. RETURN ALL VALUES
  return {
    totalMachineQty: to2Decimals(totalMachineQty),
    totalMachineCost: to2Decimals(totalMachineCost),
    totalMachineSales: to2Decimals(totalMachineSales),
    totalConsumableQty: to2Decimals(totalConsumableQty),
    totalConsumableCost: to2Decimals(totalConsumableCost),
    totalConsumableSales: to2Decimals(totalConsumableSales),
    totalCompanyFeesAmount: to2Decimals(totalCompanyFeesAmount),
    totalCustomerFeesAmount: to2Decimals(totalCustomerFeesAmount),
    grandtotalCost: to2Decimals(grandtotalCost),
    grandtotalSell: to2Decimals(grandtotalSell),
    grossProfit: to2Decimals(grossProfit),
    roiPercentage: to2Decimals(roiPercentage),
    machines: processedMachines,
    consumables: processedConsumables,
    companyFees, 
    customerFees, 
    bundleDeduction: to2Decimals(bundleDeduction),
    firstYearTotalCost: to2Decimals(totalMachineCost + totalConsumableCost),
    firstYearTotalSell: to2Decimals(totalMachineSales + totalConsumableSales)
  };
};