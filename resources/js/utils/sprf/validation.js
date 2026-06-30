export const hasValidCompanyInfo = (companyInfo) => {
  return Boolean(
    companyInfo?.subCategory?.trim() &&
      companyInfo?.account?.trim() &&
      companyInfo?.accountManager?.trim()
  );
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