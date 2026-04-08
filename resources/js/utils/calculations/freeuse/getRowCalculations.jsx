export const getRowCalculations = (row, projectData) => {
    const rawCost = Number(row?.cost) || 0;
    const qty = Number(row?.qty) || 0;
    const yields = Number(row?.yields) || 0;
    const price = Number(row?.price) || 0;

    const annualInterestRate = (Number(projectData?.interest?.annualInterest) || 0) / 100;
    const annualInterest = Number(projectData?.interest?.annualInterest);
    const contractYears = Number(projectData?.companyInfo?.contractYears) || 1;
    const percentMargin = (annualInterest * contractYears) / 100;

    let finalComputedCost = rawCost;
    let basePerYear = 0;
    let machineMargin = 0;
    let machineMarginTotal = 0;

    const isMachine = row?.type === 'machine';
    const isModeOthers = row?.mode?.toLowerCase() === 'others' || row?.mode?.toLowerCase() === 'other';

    // 1. Logic for Financed Machines (NOT 'others')
    if (isMachine && !isModeOthers) {
        basePerYear = rawCost / contractYears;
        const interestAmount = basePerYear * annualInterestRate;
        finalComputedCost = (basePerYear + interestAmount) * contractYears;
        machineMargin = basePerYear * percentMargin;
        machineMarginTotal = rawCost * percentMargin;
    } 
    // 2. Logic for 'others' (Flat cost, no margin)
    else if (isMachine && isModeOthers) {
        finalComputedCost = rawCost; // Cost stays exactly the same
        basePerYear = rawCost;       // In year 1, the full cost is recognized
        machineMargin = 0;           // No margin
        machineMarginTotal = 0;      // No margin total
    }

    return {
        inputtedCost: rawCost,
        computedCost: finalComputedCost,
        basePerYear,
        // Since margins are 0 for 'others', totalCost will correctly equal rawCost
        totalCost: (finalComputedCost + machineMarginTotal),
        costCpp: yields > 0 ? rawCost / yields : 0,
        totalSell: price * qty,
        sellCpp: yields > 0 ? price / yields : 0,
        machineMargin,
        machineMarginTotal
    };
};