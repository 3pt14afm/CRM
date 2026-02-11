  import ProjectDataProvider from "@/Context/ProjectContext";
  
  export const machineMargin = (row) => {
     const rawCost = Number(row.cost) || 0;
    const qty = parseFloat(row.qty) || 0;
    const yields = parseFloat(row.yields) || 0;
    const price = parseFloat(row.price) || 0;

    const annualInterestRate = (Number(projectData.interest?.annualInterest) || 0) / 100;
    const contractYears = Number(projectData.companyInfo?.contractYears) || 1;

       let finalComputedCost = rawCost;
    let basePerYear = 0; // Initialize basePerYear

    if (row.type === 'machine') {
      // Calculate the raw depreciation/base per year
      basePerYear = rawCost / (contractYears || 1);
      const interestAmount = basePerYear * annualInterestRate;
      finalComputedCost = basePerYear + interestAmount;
    }

    
     const percentMargin = projectData?.interest?.percentMargin/100;
     const machineMargin = basePerYear * percentMargin;

   return {
      inputtedCost: rawCost,
      computedCost: finalComputedCost,
      basePerYear: basePerYear, // Returning this so it can be stored
      totalCost: rawCost * qty,
      costCpp: yields > 0 ? finalComputedCost / yields : 0,
      totalSell: price * qty,
      sellCpp: yields > 0 ? price / yields : 0,
      machineMargin: machineMargin
    };
  };