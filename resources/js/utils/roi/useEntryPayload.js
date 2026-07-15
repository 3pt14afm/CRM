import { useProjectData } from '@/Context/ProjectContext';

/**
 * Builds the plain-object payload and the FormData payload
 * needed for draft save and project submit requests.
 *
 * @param {{ entryProject: object|null, formattedDate: string }} params
 * @returns {{ buildPayload: Function, buildFormDataPayload: Function }}
 */
export function useEntryPayload({ entryProject, formattedDate }) {
  const { projectData } = useProjectData();

  const buildPayload = () => ({
    ...projectData,
    metadata: {
      ...projectData?.metadata,
      projectId: entryProject?.id ?? projectData?.metadata?.projectId ?? null,
      lastSaved: formattedDate,
      status:
        projectData?.metadata?.status ??
        entryProject?.status ??
        "draft",
    },
    companyInfo: {
      ...projectData?.companyInfo,
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

  const buildFormDataPayload = () => {
    const payload = buildPayload();
    const formData = new FormData();

    const attachments = Array.isArray(payload.entryRemarks?.attachments)
      ? payload.entryRemarks.attachments
      : [];

    const existingAttachmentMeta = attachments
      .filter((item) => !(item?.file instanceof File))
      .map((item) => ({
        id: item?.id ?? "",
        original_name: item?.original_name ?? item?.name ?? "",
        stored_name: item?.stored_name ?? "",
        path: item?.path ?? "",
        size: item?.size ?? 0,
      }));

    const payloadForForm = {
      ...payload,
      entryRemarks: {
        ...payload.entryRemarks,
        attachments: existingAttachmentMeta,
      },
    };

    Object.entries(payloadForForm).forEach(([key, value]) => {
      appendToFormData(formData, value, key);
    });

    attachments.forEach((item) => {
      if (item instanceof File) {
        formData.append("entry_remarks_attachments[]", item);
        return;
      }

      if (item?.file instanceof File) {
        formData.append("entry_remarks_attachments[]", item.file);
        return;
      }

      if (item?.originFileObj instanceof File) {
        formData.append("entry_remarks_attachments[]", item.originFileObj);
        return;
      }

      if (item?.raw instanceof File) {
        formData.append("entry_remarks_attachments[]", item.raw);
      }
    });

    return formData;
  };

  return {
    buildPayload,
    buildFormDataPayload,
  };
}