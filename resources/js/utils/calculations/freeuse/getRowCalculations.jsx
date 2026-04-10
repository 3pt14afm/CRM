export const getRowCalculations = (row, projectData) => {
    const rawCost = Number(row?.cost) || 0;
    const qty = Number(row?.qty) || 0;
    const yields = Number(row?.yields) || 0;
    const rawPrice = Number(row?.price) || 0;

    const annualInterestRate = (Number(projectData?.interest?.annualInterest) || 0) / 100;
    const annualInterest = Number(projectData?.interest?.annualInterest);
    const contractYears = Number(projectData?.companyInfo?.contractYears) || 1;
    const percentMargin = (annualInterest * contractYears) / 100;

    const isMachine = row?.type === 'machine';
    const isModeOthers = row?.mode?.toLowerCase() === 'others' || row?.mode?.toLowerCase() === 'other';

    const contractType = projectData?.companyInfo?.contractType || projectData?.contractType || ""; 
    const isOutright = contractType.toLowerCase().includes("outright");

    // --- SELLING PRICE LOGIC ---
    // Only affects the "Sell" side. 0 if Machine + Not Outright.
    const price = (isMachine && !isOutright) ? 0 : rawPrice;

    let finalComputedCost = rawCost;
    let basePerYear = 0;
    let machineMargin = 0;
    let machineMarginTotal = 0;

    // --- MACHINE MARGIN LOGIC (Independent of Selling Price) ---
    if (isMachine && !isModeOthers) {
        // Even if selling price is 0, we still calculate the financing margin
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
        costCpp: yields > 0 ? rawCost / yields : 0,
        // SELLING SIDE
        price: price, 
        totalSell: price * qty,
        sellCpp: yields > 0 ? price / yields : 0,
        // MARGIN SIDE (Remains active for Rental/Free Use)
        machineMargin,
        machineMarginTotal
    };
};