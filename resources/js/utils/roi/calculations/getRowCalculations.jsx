export const getRowCalculations = (row, projectData) => {
    // 1. RAW INPUTS
    const rawCost = Number(row?.cost) || 0;
    const qty = Number(row?.qty) || 0;
    const rawYields = Number(row?.yields) || 0;
    const rawPrice = Number(row?.price) || 0;

    // 2. PROJECT CONSTANTS
    const annualInterest = Number(projectData?.interest?.annualInterest) || 0;
    const annualInterestRate = annualInterest / 100;
    const contractYears = Number(projectData?.companyInfo?.contractYears) || 1;

    // Margin rate scales with rate x years
    const percentMargin = (annualInterest * contractYears) / 100;

    // 3. IDENTIFIERS
    const type = row?.type?.toLowerCase() || "";
    const isMachine = type === "machine";

    const mode = row?.mode?.toLowerCase() || "";
    const isConsumable = mode === "mono" || mode === "color";
    const isModeOthers = mode === "others" || mode === "other";

    const contractType = (
        projectData?.companyInfo?.contractType ||
        projectData?.contractType ||
        ""
    ).toLowerCase();

    const isOutright = contractType.includes("outright");
    const isRentalClick = contractType.includes("rental + click");
    const isFreeUseClick = contractType.includes("free use + click");
    const isNonOutright = contractType === "non-outright";
    const isMonthlyRental = contractType === "fixed monthly only";

    // --- LOGIC CONTROLLER ---

    let yields = rawYields;
    if (isMachine) yields = isModeOthers ? rawYields : 0;
    if (isMonthlyRental && isConsumable) yields = 0;

    let price = rawPrice;
    if ((isRentalClick || isFreeUseClick) && isConsumable) price = 0;
    if (isNonOutright && isMachine) price = 0;
    if (!isOutright && isMachine) price = 0;
    if (isMonthlyRental && isConsumable) { price = 0; yields = 0; }

    // =========================
    // COST CALCULATION
    // =========================
    let finalComputedCost = rawCost;
    let basePerYear = 0;
    let machineMarginTotal = 0;

    const isInterestModel = isMachine && !isOutright;

    if (isInterestModel && !isModeOthers) {
        basePerYear = rawCost / contractYears;
        const interestAmount = basePerYear * annualInterestRate;
        finalComputedCost = (basePerYear + interestAmount) * contractYears; // = rawCost * (1 + rate)
        machineMarginTotal = rawCost * percentMargin; // reported separately, NOT folded into totalCost
    } else {
        finalComputedCost = rawCost;
        basePerYear = rawCost;
        machineMarginTotal = 0;
    }

    return {
        inputtedCost: rawCost,
        computedCost: finalComputedCost,
        basePerYear,

        // FIX 1: qty now multiplies machine cost (previously ignored for machines)
        // FIX 2: margin no longer folded into totalCost — it's a separate line item
        totalCost: isMachine
            ? finalComputedCost * qty
            : rawCost * qty,

        yields,
        costCpp: yields > 0 ? rawCost / yields : 0,

        price,
        totalSell: price * qty,
        sellCpp: yields > 0 ? price / yields : 0,

        machineMarginTotal, // reported alongside totalCost, not merged in
    };
};