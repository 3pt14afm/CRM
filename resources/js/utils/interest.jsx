export function interest(projectData) {
  const annualInterest =
    parseFloat(projectData?.interest?.annualInterest) || 0;

  const percentMargin =
    parseFloat(projectData?.interest?.percentMargin) || 0;

  const contractYears =
    parseFloat(projectData?.companyInfo?.contractYears) || 0;

  const hasValidYears = contractYears > 0;

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
    hasValidYears
  };
}
