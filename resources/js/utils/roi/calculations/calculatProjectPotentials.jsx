export const calculateProjectPotentials = (yearlyBreakdown) => {
  const years = Object.values(yearlyBreakdown || {});

  // Force everything to Number to prevent string concatenation
  const totalCost = years.reduce((sum, year) => {
    return sum + Number(year.grandtotalCost || 0);
  }, 0);

  const totalRevenue = years.reduce((sum, year) => {
    return sum + Number(year.grandtotalSell || 0);
  }, 0);

  const totalGrossProfit = years.reduce((sum, year) => {
    return sum + Number(year.grossProfit || 0);
  }, 0);

  const totalMachineCost = years.reduce((sum, year) => {
    return sum + Number(year.totalMachineCost || 0);
  }, 0);

  const totalConsumableCost = years.reduce((sum, year) => {
    return sum + Number(year.totalConsumableCost || 0);
  }, 0);

  const totalFeesCost = years.reduce((sum, year) => {
    return sum + Number(year.totalCompanyFeesAmount || 0);
  }, 0);

  // ROI Percentage
  const totalRoiPercentage = totalCost > 0 
    ? (totalGrossProfit / totalCost) * 100 
    : 0;

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