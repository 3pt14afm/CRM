export const succeedingYears = (projectData) => {
  // 1. DATA DESTRUCTURING
  const config = projectData?.machineConfiguration || {};
  const rawMachines = config.machine || [];
  const rawConsumables = config.consumable || [];

  const contractType = projectData?.companyInfo?.contractType || "";
  const contractYears = parseInt(projectData?.companyInfo?.contractYears, 10) || 0;
  const succeedingYearCount = Math.max(contractYears - 1, 0);

  const normalizedContractType = String(contractType).trim().toLowerCase();
  const isMonthlyRental = normalizedContractType === "fixed monthly only";
  const isPerCartridge = normalizedContractType.includes("per cartridge");
  const isOutright = normalizedContractType.includes("outright");
  const isOutrightOnly = normalizedContractType.includes("outright") && normalizedContractType.includes("only");
  const shouldEnforcePrinterQty = !isMonthlyRental && !isOutrightOnly;

  const annualInterest = Number(projectData?.interest?.annualInterest) || 0;
  const percentMargin = (annualInterest * contractYears) / 100;

  const annualMonoYields = (Number(projectData?.yield?.monoAmvpYields?.monthly) || 0) * 12;
  const annualColorYields = (Number(projectData?.yield?.colorAmvpYields?.monthly) || 0) * 12;

  const addFeesObj = projectData?.additionalFees || { company: [], customer: [], total: 0 };
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

  if (succeedingYearCount === 0) {
    return {
      totalMachineQty: 0, totalMachineCost: 0, totalMachineSales: 0, totalMachineMargin: 0,
      totalConsumableQty: 0, totalConsumableCost: 0, totalConsumableSales: 0,
      totalFeesQty: 0, totalCompanyFeesAmount: 0, totalCustomerFeesAmount: 0,
      grandtotalCost: 0, grandtotalSell: 0, grossProfit: 0, roiPercentage: 0,
      config, machines: [], consumables: [], addFeesObj, companyFees: [], customerFees: [],
      succeedingYearsTotalCost: 0, succeedingYearsTotalSales: 0,
    };
  }

  // Make printerMachineQty robust by checking ID or isMandatory
  const printerMachineQty = rawMachines
    .filter(m => (m.mode?.toLowerCase() || '') !== 'others' && (m.id === '__mandatory_printer__' || m.isMandatory))
    .reduce((sum, m) => sum + (Number(m.qty) || 0), 0);

  // 2. PROCESS MACHINES
  const processedMachines = rawMachines.map(m => {
    const unitSell = 0;

    const mType = (m.type || "").toLowerCase();
    const isMachineRow = mType === "machine";
    const mode = (m.mode || "").toLowerCase();
    const isModeOthers = mode === "others" || mode === "other";

    let machineQty = isModeOthers ? 1 : (Number(m.qty) || 1);

    if (isModeOthers) {
      // Only Outright Only allows a user-entered "Others" qty to stand as-
      // is; every other contract derives it from printer qty regardless of
      // whatever raw qty happens to be stored (it's locked to 1 by
      // useMachineRows.js for those contracts anyway, so checking qty > 0
      // here would always be true and would permanently bypass the printer
      // multiplier). Mirrors RoiCalculator.php.
      if (isOutrightOnly && Number(m.qty) > 0) {
        machineQty = Number(m.qty);
      } else if (isMonthlyRental && Number(m.qty) > 0) {
        // Fixed Monthly Only: "others" machine qty is user-entered/editable
        // (mirrors the Outright Only branch above and useMachineRows.js's
        // enforceRowQty, which explicitly preserves it), so it must carry
        // through to succeeding years instead of collapsing to the
        // isModeOthers ? 1 default set above.
        machineQty = Number(m.qty);
      } else if (shouldEnforcePrinterQty) {
        machineQty = Math.round(1 * (printerMachineQty || 1) * 100) / 100;
      }
    }

    let unitMargin = 0;
    if (!isOutright && isMachineRow && !isModeOthers) {
      const rawCost = Number(m.inputtedCost || m.cost) || 0;
      unitMargin = rawCost * percentMargin;
    }

    return {
      ...m,
      qty: machineQty,
      price: unitSell,
      machineMarginTotal: unitMargin,
      totalMachineMargin: 0,
      totalCost: 0, // Machines already paid for in Year 1
      totalSell: machineQty * unitSell
    };
  });

  const getQtyFromYields = (annualYields, itemYields) => {
    const safeItemYields = Number(itemYields);
    if (!safeItemYields || safeItemYields <= 0) return 0;
    return Math.round((annualYields / safeItemYields) * 100) / 100; 
  };
  const getSafeNumber = (val, fallback = 0) => isNaN(Number(val)) ? fallback : Number(val);
  const hasValidYield = (y) => !isNaN(Number(y)) && Number(y) > 0;
  const applyPerCartridgeRounding = (qty) => isPerCartridge ? Math.ceil(qty) : qty;

  // 3. PROCESS CONSUMABLES
  const processedConsumables = rawConsumables.map(c => {
    const mode = c.mode?.toLowerCase();
    const isModeOthers = mode === 'others' || mode === 'other';
    const itemYields = Number(c.yields);
    let qty = 0;

    if (isMonthlyRental) {
      qty = getSafeNumber(c.qty, 0);
      const unitCost = getSafeNumber(c.cost);
      return { ...c, qty, yields: 0, price: 0, totalCost: qty * unitCost, totalSell: 0 };
    }

    if (isOutrightOnly && (mode === 'mono' || mode === 'color' || isModeOthers)) {
      // Outright Only: Respect user-entered qty for consumables
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
        qty = Math.round(qty * (printerMachineQty || 1) * 100) / 100;
      }
    } else {
      qty = getSafeNumber(c.qty, 1);
    }

    qty = applyPerCartridgeRounding(qty);
    const unitCost = getSafeNumber(c.cost);
    const unitSell = getSafeNumber(c.price);

    return { ...c, qty, totalCost: qty * unitCost, totalSell: qty * unitSell };
  });

  // 4. TOTALS
  const totalMachineQty = processedMachines.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalMachineCost = processedMachines.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
  const totalMachineSales = processedMachines.reduce((sum, m) => sum + (Number(m.totalSell) || 0), 0);
  const totalMachineMargin = processedMachines.reduce((sum, m) => sum + (Number(m.totalMachineMargin) || 0), 0);

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

  return {
    totalMachineQty, totalMachineCost, totalMachineSales, totalMachineMargin,
    totalConsumableQty, totalConsumableCost, totalConsumableSales,
    totalFeesQty, totalCompanyFeesAmount, totalCustomerFeesAmount,
    grandtotalCost: Number(grandtotalCost) || 0, grandtotalSell: Number(grandtotalSell) || 0,
    grossProfit: Number(grossProfit) || 0, roiPercentage,
    config, machines: processedMachines, consumables: processedConsumables,
    addFeesObj, companyFees, customerFees,
    succeedingYearsTotalCost: Number(totalMachineCost) + Number(totalConsumableCost),
    succeedingYearsTotalSales: Number(totalMachineSales) + Number(totalConsumableSales)
  };
};