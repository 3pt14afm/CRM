export const getRowCalculations = (row, projectData) => {

  //CALCULATES THE INPUT VALUE FROM MACHINE CONFIGURATION TABLE 

  // Use optional chaining and default to 0/1 to prevent NaN or crashes

            // USER INPUT FROM MACHINE CONFIGURATION
            const rawCost = Number(row?.cost) || 0; 
            const qty = Number(row?.qty) || 0;     
            const yields = Number(row?.yields) || 0; 
            const price = Number(row?.price) || 0;  


            // Safely extract global settings with fallbacks
            // EXTRACT DATA FROM PROJECT DATA CONTEXT
            const annualInterestRate = (Number(projectData?.interest?.annualInterest) || 0) / 100; 
            const contractYears = Number(projectData?.companyInfo?.contractYears) || 1; 
            const percentMargin = (Number(projectData?.interest?.percentMargin) || 0) / 100;

            let finalComputedCost = rawCost; 
            let basePerYear = 0;
            let machineMargin = 0;
            let machineMarginTotal = 0;

            //  CONDITION FOR THE FREE USE CONTRACT TYPE, AND CALCULATION FOR MACHINE MARGIN AND MACHINE MARGIN TOTAL
            if (row?.type === 'machine') {
                basePerYear = rawCost / contractYears; 
                const interestAmount = basePerYear * annualInterestRate;
                finalComputedCost = basePerYear + interestAmount;
                machineMargin = basePerYear * percentMargin;
                machineMarginTotal = rawCost * percentMargin;

            }
            // THIS IS FOR THE DEBUGGING PURPOSES
            console.log({
                type: row?.type,
                machineMargin: machineMargin,
                marginPercent: percentMargin,
                machineMarginTotal: machineMarginTotal
                });
            


           // RETURN CALCULATED VALUES
            return {
                inputtedCost: rawCost,
                computedCost: finalComputedCost,
                basePerYear,
                totalCost: (finalComputedCost + machineMargin),
                costCpp: yields > 0 ? rawCost / yields : 0,
                totalSell: price * qty,
                sellCpp: yields > 0 ? price / yields : 0,
                machineMargin,
                machineMarginTotal

            };

};