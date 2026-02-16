export const calculateProjectPotentials = (yearlyBreakdown) => {
   //CALCULATES THE TOTAL ROI, REVENUE, COST AND ROI PERCENTAGE
 
 
  // Convert object values into an array of year data
  const years = Object.values(yearlyBreakdown || {});

  // 1. Sum up the cumulative totals
  const totalCost = years.reduce((sum, year) => sum + (year.grandtotalCost || 0), 0);
  const totalRevenue = years.reduce((sum, year) => sum + (year.grandtotalSell || 0), 0);
  const totalGrossProfit = years.reduce((sum, year) => sum + (year.grossProfit || 0), 0);

  // 2. Aggregate specific segments (optional but helpful for summaries)
  const totalMachineCost = years.reduce((sum, year) => sum + (year.totalMachineCost || 0), 0); // pure machine cost
  const totalConsumableCost = years.reduce((sum, year) => sum + (year.totalConsumableCost || 0), 0);
  const totalFeesCost = years.reduce((sum, year) => sum + (year.totalCompanyFeesAmount || 0), 0);

  // 3. Calculate Overall Lifetime ROI Percentage
  // Formula: ((Total Sales - Total Cost) / Total Cost) * 100
  const totalRoiPercentage = totalCost > 0 ? (totalGrossProfit / totalCost) * 100 : 0;

  return {
    totalCost,
    totalRevenue,
    totalGrossProfit,
    totalRoiPercentage,
    breakdown: {
      machine: totalMachineCost,
      consumables: totalConsumableCost,
      fees: totalFeesCost
    }
  };
};