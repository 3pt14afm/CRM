import { useProjectData } from '@/Context/ProjectContext';
import { getAttachmentFileObject } from '@/Components/roi/Entry/EntryRemarks'; // Adjust path if needed

/**
 * Builds the plain-object payload and the FormData payload
 * needed for draft save and project submit requests.
 *
 * @param {{ entryProject: object|null, formattedDate: string }} params
 * @returns {{ buildPayload: Function, buildFormDataPayload: Function }}
 */
export function useEntryPayload({ entryProject, formattedDate }) {
  const { projectData } = useProjectData();

  const buildPayload = (overrides = {}) => ({
    ...projectData,
    ...overrides,
    metadata: {
      ...projectData?.metadata,
      ...overrides?.metadata,
      projectId: entryProject?.id ?? projectData?.metadata?.projectId ?? null,
      lastSaved: formattedDate,
      status:
        projectData?.metadata?.status ??
        entryProject?.status ??
        "draft",
    },
    companyInfo: {
      ...projectData?.companyInfo,
      ...overrides?.companyInfo,
      projectUid:
        entryProject?.project_uid ??
        projectData?.companyInfo?.projectUid ??
        "",
      reference:
        entryProject?.reference ??
        projectData?.companyInfo?.reference ??
        "",
    },
    entryRemarks: {
      remarks: projectData?.entryRemarks?.remarks ?? "",
      attachments: Array.isArray(projectData?.entryRemarks?.attachments)
        ? projectData.entryRemarks.attachments
        : [],
    },
  });

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
      value.forEach((item, index) => {
        appendToFormData(formData, item, `${key}[${index}]`);
      });
      return;
    }

    if (typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) => {
        appendToFormData(formData, childValue, `${key}[${childKey}]`);
      });
      return;
    }

    formData.append(key, value);
  };

  const buildFormDataPayload = (overrides = {}) => {
    const payload = buildPayload(overrides);
    const formData = new FormData();

    const attachments = Array.isArray(payload.entryRemarks?.attachments)
      ? payload.entryRemarks.attachments
      : [];

    // 1. Clean up the metadata to remove the broken `file: {}` object
    const existingAttachmentMeta = attachments.map((item) => {
      // If it's a newly attached local file, strip out the File object entirely
      const realFile = getAttachmentFileObject(item);
      if (realFile) {
        return {
          id: item?.id ?? "",
          name: item?.name ?? "",
          size: item?.size ?? 0,
        };
      }
      
      // If it's an existing file from the server, keep its server metadata
      return {
        id: item?.id ?? "",
        original_name: item?.original_name ?? item?.name ?? "",
        stored_name: item?.stored_name ?? "",
        path: item?.path ?? "",
        size: item?.size ?? 0,
      };
    });

    const payloadForForm = {
      ...payload,
      entryRemarks: {
        ...payload.entryRemarks,
        attachments: existingAttachmentMeta, // Send clean metadata
      },
    };

    // Append the clean JSON payload to FormData
    Object.entries(payloadForForm).forEach(([key, value]) => {
      appendToFormData(formData, value, key);
    });

    // 2. Append the REAL File objects from our secure Map
    attachments.forEach((item) => {
      const file = getAttachmentFileObject(item);
      if (file) {
        formData.append("entry_remarks_attachments[]", file);
      }
    });

    return formData;
  };

  return {
    buildPayload,
    buildFormDataPayload,
  };
}