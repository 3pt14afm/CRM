import { route as ziggyRoute } from "ziggy-js";

export function getRoiAttachmentName(item, index = 0) {
  return item?.original_name || item?.name || `Attachment ${index + 1}`;
}

export function getRoiAttachmentKey(item, index = 0) {
  return (
    item?.id ||
    `${item?.original_name || item?.name || "attachment"}-${item?.size || 0}-${item?.lastModified || index}`
  );
}

export function openRoiAttachment({ item, projectId, pageRoute = "entry" }) {
  if (item?.file instanceof File) {
    const url = URL.createObjectURL(item.file);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  if (!projectId || !item?.id) return;

  let href;

  if (pageRoute === "current") {
    href = ziggyRoute("roi.current.attachments.show", {
      id: projectId,
      attachmentId: item.id,
    });
  } else if (pageRoute === "archive") {
    href = ziggyRoute("roi.archive.attachments.show", {
      id: projectId,
      attachmentId: item.id,
    });
  } else {
    href = ziggyRoute("roi.entry.projects.attachments.show", {
      project: projectId,
      attachmentId: item.id,
    });
  }

  window.open(href, "_blank", "noopener,noreferrer");
}