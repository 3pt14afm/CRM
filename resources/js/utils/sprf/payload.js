export const serializeRemarksRows = (rows) => {
  if (!Array.isArray(rows)) return '';

  return rows
    .map((row) => String(row ?? '').trim())
    .filter((row) => row !== '')
    .join('\n');
};

export const buildSprfPayload = ({
  sourceProject,
  sprfNo,
  companyInfo,
  remarks,
  rebateJustification,
  items,
  otherExpenses,
  summary,
}) => ({
  project_id: sourceProject?.id ?? null,
  sprf_no: sprfNo,
  company_info: companyInfo,
  remarks: serializeRemarksRows(remarks),
  rebate_justification: rebateJustification,
  items,
  other_expenses: otherExpenses,
  summary,
});