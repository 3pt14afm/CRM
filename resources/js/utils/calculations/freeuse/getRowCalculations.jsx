export const getRowCalculations = (row, projectData) => {

  // Use optional chaining and default to 0/1 to prevent NaN or crashes

            const rawCost = Number(row?.cost) || 0;
            const qty = Number(row?.qty) || 0;
            const yields = Number(row?.yields) || 0;
            const price = Number(row?.price) || 0;



            // Safely extract global settings with fallbacks
            const annualInterestRate = (Number(projectData?.interest?.annualInterest) || 0) / 100;
            const contractYears = Number(projectData?.companyInfo?.contractYears) || 1; // Default to 1 to avoid division by zero
            const percentMargin = (Number(projectData?.interest?.percentMargin) || 0) / 100;

            let finalComputedCost = rawCost;
            let basePerYear = 0;
            let machineMargin = 0;
            let machineMarginTotal = 0;

            if (row?.type === 'machine') {
                basePerYear = rawCost / contractYears;
                const interestAmount = basePerYear * annualInterestRate;
                finalComputedCost = basePerYear + interestAmount;
                machineMargin = basePerYear * percentMargin;
                machineMarginTotal = rawCost * percentMargin;

            }

            console.log({
                type: row?.type,
                base: basePerYear,
                marginPercent: percentMargin,
                machineMarginTotal: machineMarginTotal
                });
            



            return {
                inputtedCost: rawCost,
                computedCost: finalComputedCost,
                basePerYear,
                totalCost: (finalComputedCost + machineMargin) * qty,
                costCpp: yields > 0 ? (finalComputedCost + machineMargin) / yields : 0,
                totalSell: price * qty,
                sellCpp: yields > 0 ? price / yields : 0,
                machineMargin,
                machineMarginTotal

            };

};