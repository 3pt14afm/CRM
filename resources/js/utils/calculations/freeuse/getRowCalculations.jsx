export const getRowCalculations = (row, projectData) => {
    // 1. RAW INPUTS
    const rawCost = Number(row?.cost) || 0;
    const qty = Number(row?.qty) || 0;
    const rawYields = Number(row?.yields) || 0;
    const rawPrice = Number(row?.price) || 0;

    // 2. PROJECT CONSTANTS
    const annualInterestRate = (Number(projectData?.interest?.annualInterest) || 0) / 100;
    const annualInterest = Number(projectData?.interest?.annualInterest);
    const contractYears = Number(projectData?.companyInfo?.contractYears) || 1;
    const percentMargin = (annualInterest * contractYears) / 100;

    // 3. IDENTIFIERS
    const type = row?.type?.toLowerCase() || ""; // machine, mono, color, rental, etc.
    const isMachine = type === 'machine';
    const isConsumable = type === 'mono' || type === 'color';
    const isModeOthers = row?.mode?.toLowerCase() === 'others' || row?.mode?.toLowerCase() === 'other';

    const contractType = (projectData?.companyInfo?.contractType || projectData?.contractType || "").toLowerCase();
    
    // Model Categories
    const isOutright = contractType.includes("outright");
    const isRentalClick = contractType.includes("rental + click");
    const isFreeUseClick = contractType.includes("free use + click");
    const isNonOutright = contractType === "non-outright";

    // --- LOGIC CONTROLLER: FORCE ZEROS BY PROHIBITION RULES ---

    /** * RULE: Machine/Printer Rule 
     * Yields are NEVER allowed for hardware.
     */
    let yields = isMachine ? 0 : rawYields;

    /** * RULE: Rental/Free Use + Click PROHIBITION
     * Mono/Color items are PROHIBITED from having a Selling Price in Click models.
     */
    let price = rawPrice;
    if ((isRentalClick || isFreeUseClick) && isConsumable) {
        price = 0;
    }

    /** * RULE: Non-Outright PROHIBITION
     * Machines are PROHIBITED from having a Selling Price.
     */
    if (isNonOutright && isMachine) {
        price = 0;
    }

    /** * RULE: General Service Focus Logic
     * If it's NOT an Outright model, Machines generally don't have a Selling Price 
     * (unless specifically defined otherwise in your business rules).
     */
    if (!isOutright && isMachine) {
        price = 0;
    }

    // --- COST CALCULATIONS ---
    let finalComputedCost = rawCost;
    let basePerYear = 0;
    let machineMargin = 0;
    let machineMarginTotal = 0;

    if (isMachine && !isModeOthers) {
        basePerYear = rawCost / contractYears;
        const interestAmount = basePerYear * annualInterestRate;
        finalComputedCost = (basePerYear + interestAmount) * contractYears;
        machineMargin = basePerYear * percentMargin;
        machineMarginTotal = rawCost * percentMargin;
    } else if (isMachine && isModeOthers) {
        finalComputedCost = rawCost;
        basePerYear = rawCost;
        machineMargin = 0;
        machineMarginTotal = 0;
    }

    return {
        inputtedCost: rawCost,
        computedCost: finalComputedCost,
        basePerYear,
        totalCost: Number(finalComputedCost) + Number(machineMarginTotal),

        // CPP Logic based on validated yields
        yields: yields,
        costCpp: yields > 0 ? rawCost / yields : 0,

        // SELLING SIDE (Validated via Logic Controller)
        price: price, 
        totalSell: price * qty,
        sellCpp: yields > 0 ? price / yields : 0,

        // MARGIN SIDE
        machineMargin,
        machineMarginTotal
    };
};