export const hasValidCompanyInfo = (companyInfo) => {
  const hasBaseFields = Boolean(
    companyInfo?.subCategory?.trim() &&
      companyInfo?.account?.trim() &&
      companyInfo?.accountManager?.trim()
  );

  if (!hasBaseFields) return false;

  const type = companyInfo?.type;

  // Type must be explicitly chosen (0 = Potential, 1 = Existing)
  if (type === null || type === undefined || type === '') return false;

  // Existing (type 1) must have been selected from the dropdown — enforced by
  // requiring a company_sap_code, same as the backend's validateCompanyIntegrity.
  if (Number(type) === 1 && !companyInfo?.companySapCode) return false;

  // Potential (type 0) must NOT carry a stale SAP code
  if (Number(type) === 0 && companyInfo?.companySapCode) return false;

  return true;
};

export const hasValidItems = (items) => {
  return items.some((row) => {
    return (
      row.productCode?.trim() ||
      row.itemDescription?.trim() ||
      Number(row.qty) > 0 ||
      Number(row.costPerUnit) > 0
    );
  });
};

// Same check as hasValidItems but for the grouped/bundled item-table shape
// used by sprfEntry.jsx, where each `items` entry is a group containing a
// `subitems` array rather than a flat row.
export const hasValidItemGroups = (groups) => {
  return groups.some((group) =>
    (group.subitems || []).some((row) => {
      return (
        row.productCode?.trim() ||
        row.itemDescription?.trim() ||
        Number(row.qty) > 0 ||
        Number(row.costPerUnit) > 0
      );
    })
  );
};

export const hasValidExpenses = (expenses) => {
  return expenses.some((row) => {
    return (
      row.itemDescription?.trim() ||
      Number(row.qty) > 0 ||
      Number(row.unitPrice) > 0
    );
  });
};

export const hasValidRemarks = (remarks) => {
  return (
    Array.isArray(remarks) &&
    remarks.some((row) => String(row ?? '').trim() !== '')
  );
};

export const validateDraft = ({ companyInfo }) => {
  if (!hasValidCompanyInfo(companyInfo)) {
    return {
      ok: false,
      message: 'Company Information is required before saving draft.',
    };
  }

  return { ok: true };
};

export const validateSubmit = ({
  sourceProject,
  companyInfo,
  items,
  remarks,
}) => {
  if (!sourceProject?.id) {
    return {
      ok: false,
      message: 'Please save draft first before submitting.',
    };
  }

  if (!hasValidCompanyInfo(companyInfo)) {
    return {
      ok: false,
      message: 'Company Information is required before submitting.',
    };
  }

  if (!hasValidItemGroups(items)) {
    return {
      ok: false,
      message: 'Please add at least one item before submitting.',
    };
  }

  if (!hasValidRemarks(remarks)) {
    return {
      ok: false,
      message: 'Remarks justification is required before submitting.',
    };
  }

  return { ok: true };
};

export const validateAdvance = ({
  isDirectorCustomerEngagementStep,
  hasRebate,
  rebateJustification,
}) => {
  if (
    isDirectorCustomerEngagementStep &&
    hasRebate &&
    rebateJustification.trim() === ''
  ) {
    return {
      ok: false,
      message: 'Rebate justification is required when the Rebate row has a value.',
    };
  }

  return { ok: true };
};