export const getRowCalculations = (row, projectData) => {
    // 1. RAW INPUTS
    const rawCost = Number(row?.cost) || 0;
    const qty = Number(row?.qty) || 0;
    const rawYields = Number(row?.yields) || 0;
    const rawPrice = Number(row?.price) || 0;

    // 2. PROJECT CONSTANTS
    const annualInterestRate =
        (Number(projectData?.interest?.annualInterest) || 0) / 100;

    const annualInterest = Number(projectData?.interest?.annualInterest) || 0;

    const contractYears =
        Number(projectData?.companyInfo?.contractYears) || 1;

    const percentMargin =
        (annualInterest * contractYears) / 100;

    // 3. IDENTIFIERS
    const type = row?.type?.toLowerCase() || "";
    const isMachine = type === "machine";

    const mode = row?.mode?.toLowerCase() || "";
    const isConsumable = mode === "mono" || mode === "color";
    const isModeOthers =
        mode === "others" || mode === "other";

    const contractType =
        (
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

    if (isMachine) {
        yields = isModeOthers ? rawYields : 0;
    }

    if (isMonthlyRental && isConsumable) {
        yields = 0;
    }

    let price = rawPrice;

    if ((isRentalClick || isFreeUseClick) && isConsumable) {
        price = 0;
    }

    if (isNonOutright && isMachine) {
        price = 0;
    }

    if (!isOutright && isMachine) {
        price = 0;
    }

    if (isMonthlyRental && isConsumable) {
        price = 0;
        yields = 0;
    }

    // =========================
    // COST CALCULATION FIX
    // =========================

    let finalComputedCost = rawCost;
    let basePerYear = 0;

    let machineMargin = 0;
    let machineMarginTotal = 0;

    const isInterestModel =
        isMachine &&
        !isOutright; // 🚨 ONLY non-outright gets interest/margin

    if (isInterestModel && !isModeOthers) {
        basePerYear = rawCost / contractYears;

        const interestAmount = basePerYear * annualInterestRate;

        finalComputedCost =
            (basePerYear + interestAmount) * contractYears;

        machineMargin = basePerYear * percentMargin;
        machineMarginTotal = rawCost * percentMargin;
    } else {
        // OUTRIGHT OR MODE OTHERS
        finalComputedCost = rawCost;
        basePerYear = rawCost;
        machineMargin = 0;
        machineMarginTotal = 0;
    }

    return {
        inputtedCost: rawCost,
        computedCost: finalComputedCost,
        basePerYear,

        totalCost: isMachine
            ? (isOutright ? finalComputedCost : finalComputedCost + machineMarginTotal)
            : rawCost * qty,

        yields,

        costCpp: yields > 0 ? rawCost / yields : 0,

        price,
        totalSell: price * qty,
        sellCpp: yields > 0 ? price / yields : 0,

        machineMargin,
        machineMarginTotal,
    };
};