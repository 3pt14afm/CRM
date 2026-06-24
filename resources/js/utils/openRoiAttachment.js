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

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "attachment";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function openRoiAttachment({
  item,
  index,
  projectId,
  pageRoute = "entry",
}) {
  const filename = item?.original_name || item?.name || `Attachment ${index + 1}`;

  if (item?.file instanceof File) {
    const url = URL.createObjectURL(item.file);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }

  if (projectId == null || index == null) return;

  let href;

  if (pageRoute === "current") {
    href = ziggyRoute("roi.current.attachments.show", {
      id: projectId,
      attachmentIndex: index,
      filename,
    });
  } else if (pageRoute === "archive") {
    href = ziggyRoute("roi.archive.attachments.show", {
      id: projectId,
      attachmentIndex: index,
      filename,
    });
  } else {
    href = ziggyRoute("roi.entry.projects.attachments.show", {
      project: projectId,
      attachmentIndex: index,
      filename,
    });
  }

  triggerDownload(href, filename);
}