import { useGroupProjectData } from '@/Context/GroupProjectContext';
import { getAttachmentFileObject } from '@/Components/roi/Entry/EntryRemarks';

/**
 * Group equivalent of useEntryPayload. Builds {companyInfo, entries: [...]}
 * matching StoreRoiGroupDraftRequest's shape, instead of the flat single-entry shape.
 */
export function useGroupEntryPayload() {
  const { groupData } = useGroupProjectData();

  // overrides.entries is keyed by entry index, e.g. { 0: { machineConfiguration } }
  // — mirrors single-entry's override pattern for the getCurrentMachineConfig() race fix.
  const buildPayload = (overrides = {}) => {
    const entryOverridesByIndex = overrides.entries ?? {};

    return {
      companyInfo: {
        reference: groupData.metadata?.reference ?? "",
        companyName: groupData.companyInfo?.companyName ?? "",
        companySapCode: groupData.companyInfo?.companySapCode ?? "",
        type: groupData.companyInfo?.type ?? 0,
      },
      entries: groupData.entries.map((entry, index) => {
        const entryOverrides = entryOverridesByIndex[index] ?? {};
        return {
          projectUid: entry.projectUid ?? "",
          companyInfo: {
            contractYears: entry.companyInfo?.contractYears ?? 0,
            contractType: entry.companyInfo?.contractType ?? "",
            purpose: entry.companyInfo?.purpose ?? "",
            bundledStdInk: entry.companyInfo?.bundledStdInk ?? false,
          },
          interest: entry.interest,
          yield: entry.yield,
          entryRemarks: {
            remarks: entry.entryRemarks?.remarks ?? "",
            attachments: Array.isArray(entry.entryRemarks?.attachments)
              ? entry.entryRemarks.attachments
              : [],
          },
          machineConfiguration: entryOverrides.machineConfiguration ?? entry.machineConfiguration,
          additionalFees: entry.additionalFees,
          totalProjectCost: entry.totalProjectCost,
          yearlyBreakdown: entry.yearlyBreakdown,
        };
      }),
    };
  };

  const appendToFormData = (formData, value, key) => {
    if (value === undefined || value === null) {
      formData.append(key, "");
      return;
    }
    if (value instanceof File) {
      formData.append(key, value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => appendToFormData(formData, item, `${key}[${index}]`));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) =>
        appendToFormData(formData, childValue, `${key}[${childKey}]`)
      );
      return;
    }
    formData.append(key, value);
  };

  const buildFormDataPayload = (overrides = {}) => {
    const payload = buildPayload(overrides);
    const formData = new FormData();

    // Strip real File objects out of the JSON body per entry — same
    // clean-metadata-vs-real-file split as single-entry's buildFormDataPayload.
    const payloadForForm = {
      ...payload,
      entries: payload.entries.map((entry) => {
        const attachments = Array.isArray(entry.entryRemarks?.attachments)
          ? entry.entryRemarks.attachments
          : [];
        const cleanMeta = attachments.map((item) => {
          const realFile = getAttachmentFileObject(item);
          if (realFile) {
            return { id: item?.id ?? "", name: item?.name ?? "", size: item?.size ?? 0 };
          }
          return {
            id: item?.id ?? "",
            original_name: item?.original_name ?? item?.name ?? "",
            stored_name: item?.stored_name ?? "",
            path: item?.path ?? "",
            size: item?.size ?? 0,
          };
        });
        return { ...entry, entryRemarks: { ...entry.entryRemarks, attachments: cleanMeta } };
      }),
    };

    Object.entries(payloadForForm).forEach(([key, value]) => appendToFormData(formData, value, key));

    // Real File objects go in per-entry-indexed keys, matching the backend
    // contract: entries[{index}][entry_remarks_attachments][]
    payload.entries.forEach((entry, index) => {
      const attachments = Array.isArray(entry.entryRemarks?.attachments)
        ? entry.entryRemarks.attachments
        : [];
      attachments.forEach((item) => {
        const file = getAttachmentFileObject(item);
        if (file) {
          formData.append(`entries[${index}][entry_remarks_attachments][]`, file);
        }
      });
    });

    return formData;
  };

  return { buildPayload, buildFormDataPayload };
}