export function interest(projectData) {
  const annualInterest = 12 ;
  
  const contractYears =
    parseFloat(projectData?.companyInfo?.contractYears) || 0;

  const hasValidYears = contractYears > 0;
  
  const percentMargin = annualInterest * contractYears;

 
  const monthlyInterest = annualInterest / 12;

  const monthlyMarginForContract = hasValidYears
    ? percentMargin / (12 * contractYears)
    : 0;

  const annualMargin = hasValidYears
    ? percentMargin / contractYears
    : 0;

  return {
    monthlyInterest,
    monthlyMarginForContract,
    annualMargin,
    hasValidYears,
    percentMargin
  };
}
