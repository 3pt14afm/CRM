export const get1YrPotential = (projectData) => {
  // 1. DATA DESTRUCTURING with defaults
  const config = projectData?.machineConfiguration || {};
  const rawMachines = config.machine || [];
  const rawConsumables = config.consumable || [];

  const contractType = projectData?.companyInfo?.contractType || "";
  const normalizedContractType = String(contractType).trim().toLowerCase();

  const isOutright = normalizedContractType.includes("outright");
  const isMonthlyRental = normalizedContractType === "fixed monthly only";
  const isPerCartridge = normalizedContractType.includes("per cartridge");
  const isOutrightOnly = normalizedContractType.includes("outright") && normalizedContractType.includes("only");
  const shouldEnforcePrinterQty = !isMonthlyRental && !isOutrightOnly;

  // --- INTEREST / MARGIN CONSTANTS ---
  const annualInterest = Number(projectData?.interest?.annualInterest) || 0;
  const contractYears = Number(projectData?.companyInfo?.contractYears) || 1;
  const percentMargin = (annualInterest * contractYears) / 100;

  const isBundleChecked = projectData?.companyInfo?.bundledStdInk === true;
  const bundleDeduction = (isMonthlyRental && isBundleChecked)
    ? (Number(config.totals?.totalBundledPrice) || 0)
    : 0;

  const annualMonoYields = (Number(projectData?.yield?.monoAmvpYields?.monthly) || 0) * 12;
  const annualColorYields = (Number(projectData?.yield?.colorAmvpYields?.monthly) || 0) * 12;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [] };
  const companyFees = addFeesObj.company || [];
  const customerFees = addFeesObj.customer || [];

  const to2Decimals = (num) => {
    const parsed = Number(num);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
  };

  const getQtyFromYields = (annualYields, itemYields) => {
    const safeItemYields = Number(itemYields);
    if (!safeItemYields || safeItemYields <= 0) return 0;
    return to2Decimals(annualYields / safeItemYields);
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

  // Only the mandatory printer row drives this total — any other
  // printer-type row a user added just mirrors the mandatory row's qty
  // (see useMachineRows.js) and must not be counted a second time.
  const printerMachineQty = rawMachines
    .filter(m => (m.mode?.toLowerCase() || '') !== 'others' && m.isMandatory)
    .reduce((sum, m) => sum + getSafeNumber(m.qty, 0), 0);

  // 2. PROCESS MACHINES
  const processedMachines = rawMachines.map(m => {
    const mode = m.mode?.toLowerCase();
    const machineYields = Number(m.yields);
    const isModeOthers = mode === 'others' || mode === 'other';

    let machineQty = getSafeNumber(m.qty, 0);

    if (isModeOthers) {
      if (isOutrightOnly) {
        // Outright Only: Respect user-entered qty for "Others" machine rows
        machineQty = getSafeNumber(m.qty, 1);
      } else if (shouldEnforcePrinterQty) {
        const baseQty = getSafeNumber(m.qty, 1);
        machineQty = to2Decimals(baseQty * (printerMachineQty || 1));
      } else {
        if (hasValidYield(machineYields)) {
          const baseYields = annualMonoYields > 0 ? annualMonoYields : annualColorYields;
          machineQty = baseYields > 0 ? getQtyFromYields(baseYields, machineYields) : getSafeNumber(m.qty, 1);
        } else {
          machineQty = getSafeNumber(m.qty, 1);
        }
      }
    } else if (!machineQty || machineQty <= 0) {
      if (hasValidYield(machineYields)) {
        const baseYields = annualMonoYields > 0 ? annualMonoYields : annualColorYields;
        machineQty = baseYields > 0 ? getQtyFromYields(baseYields, machineYields) : 1;
      } else {
        machineQty = 1;
      }
    }

    const unitCost = Number(m.inputtedCost || m.cost) || 0; 
    const mType = (m.type || "").toLowerCase();
    const isMachineRow = mType === "machine";

    let unitMargin = 0;
    if (!isOutright && isMachineRow && !isModeOthers) {
      unitMargin = unitCost * percentMargin; 
    }

    const unitSell = isOutright ? (Number(m.price) || 0) : 0;

    const baseCost = machineQty * unitCost; 
    const rowTotalMargin = machineQty * unitMargin; 
    const rowTotalCost = baseCost + rowTotalMargin; 

    return {
      ...m,
      mode,
      qty: to2Decimals(machineQty),
      price: unitSell,
      machineMarginTotal: to2Decimals(unitMargin),
      totalMachineMargin: to2Decimals(rowTotalMargin),
      totalCost: to2Decimals(rowTotalCost),
      totalSell: to2Decimals(machineQty * unitSell)
    };
  });

  // 3. PROCESS CONSUMABLES
  const processedConsumables = rawConsumables.map(c => {
    const mode = c.mode?.toLowerCase();
    const itemYields = Number(c.yields);
    const isModeOthers = mode === 'others' || mode === 'other';
    
    let qty = getSafeNumber(c.qty, 0);

    if (isMonthlyRental) {
      const unitCost = getSafeNumber(c.cost);
      const monthlyQty = getSafeNumber(c.qty, 0);
      return {
        ...c,
        qty: monthlyQty,
        yields: 0,
        price: 0,
        totalCost: to2Decimals(monthlyQty * unitCost),
        totalSell: 0,
      };
    }

    if (isOutrightOnly && (mode === 'mono' || mode === 'color' || isModeOthers)) {
      qty = getSafeNumber(c.qty, 1);
    } else if (mode === 'mono' || mode === 'color' || isModeOthers) {
      if (hasValidYield(itemYields)) {
        let baseYields = mode === 'color' ? annualColorYields : annualMonoYields;
        if (isModeOthers) {
          baseYields = annualMonoYields > 0 ? annualMonoYields : annualColorYields;
        }
        qty = baseYields > 0 ? getQtyFromYields(baseYields, itemYields) : getSafeNumber(c.qty, 1);
      } else {
        qty = getSafeNumber(c.qty, 1);
      }

      if (shouldEnforcePrinterQty || (mode === 'mono' || mode === 'color')) {
        qty = to2Decimals(qty * (printerMachineQty || 1));
      }
    } else {
      qty = getSafeNumber(c.qty, 1);
    }

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

  // 4. CALCULATION LOGIC
  const totalMachineQty = processedMachines.reduce((sum, m) => sum + getSafeNumber(m.qty, 0), 0);
  const totalMachineCost = processedMachines.reduce((sum, m) => sum + getSafeNumber(m.totalCost, 0), 0);
  const totalMachineSales = processedMachines.reduce((sum, m) => sum + getSafeNumber(m.totalSell, 0), 0);
  const totalMachineMargin = processedMachines.reduce((sum, m) => sum + getSafeNumber(m.totalMachineMargin, 0), 0);
  
  const totalConsumableQty = processedConsumables.reduce((sum, item) => sum + getSafeNumber(item.qty, 0), 0);
  const totalConsumableCost = processedConsumables.reduce((sum, c) => sum + getSafeNumber(c.totalCost, 0), 0);
  const totalConsumableSales = processedConsumables.reduce((sum, c) => sum + getSafeNumber(c.totalSell, 0), 0);

  const totalCompanyFeesAmount = companyFees.reduce((sum, f) => sum + getSafeNumber(f.total, 0), 0);
  const totalCustomerFeesAmount = customerFees.reduce((sum, f) => sum + getSafeNumber(f.total, 0), 0);

  const grandtotalCost = (totalMachineCost + totalConsumableCost + totalCompanyFeesAmount) - getSafeNumber(bundleDeduction, 0);
  const grandtotalSell = totalMachineSales + totalConsumableSales + totalCustomerFeesAmount;

  const grossProfit = grandtotalSell - grandtotalCost;
  const roiPercentage = grandtotalCost > 0 ? (grossProfit / grandtotalCost) * 100 : 0;

  return {
    totalMachineQty: to2Decimals(totalMachineQty),
    totalMachineCost: to2Decimals(totalMachineCost),
    totalMachineSales: to2Decimals(totalMachineSales),
    totalMachineMargin: to2Decimals(totalMachineMargin),
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