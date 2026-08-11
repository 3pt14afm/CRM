import React, { useMemo, useRef, useState, useEffect } from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { FiX, FiPaperclip } from "react-icons/fi";
import { FaFileCirclePlus } from "react-icons/fa6";
import { usePage } from "@inertiajs/react";
import {
  getRoiAttachmentKey,
  getRoiAttachmentName,
  openRoiAttachment,
} from "@/utils/openRoiAttachment";

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/* ──────────────────────────────────────────────────────────────
 * Module-level File store
 *
 * File objects cannot survive JSON serialization. When projectData
 * is persisted (sessionStorage, Inertia, etc.), every `item.file`
 * becomes `{}`. The metadata (name, size, lastModified) survives,
 * so the UI still shows the attachment chip — but the actual binary
 * File is gone. SaveDraft then sends nothing, and the server rejects.
 *
 * This Map lives in JS heap (never serialized). We key File objects
 * by a generated `id` and store only that id + metadata in context.
 * SaveDraft retrieves the real File via getAttachmentFileObject().
 * ────────────────────────────────────────────────────────────── */
const fileObjectStore = new Map();

let fileSeq = 0;
const generateFileId = () => `att-${Date.now()}-${++fileSeq}`;

/** Look up a stored File by attachment id. */
export const getAttachmentFile = (id) => fileObjectStore.get(id);

/**
 * Retrieve the File for an attachment, handling three cases:
 *  1. Fresh File still in context state (not yet serialized)
 *  2. File recovered from the module-level store (serialized context)
 *  3. Previously uploaded file from server (no local File — returns null)
 *
 * SaveDraft should use THIS instead of `attachment.file`.
 */
export const getAttachmentFileObject = (attachment) => {
  if (!attachment) return null;
  // Case 1: File survived in context state
  if (attachment.file instanceof File) return attachment.file;
  // Case 2: File was stored in module-level store
  if (attachment.id && fileObjectStore.has(attachment.id)) {
    return fileObjectStore.get(attachment.id);
  }
  // Case 3: server-side file, no local File to send
  return null;
};

/** Call after a successful SaveDraft to free memory. */
export const clearAttachmentFileStore = () => fileObjectStore.clear();

export default function EntryRemarks({ readOnly = false }) {
  const { projectData, setProjectData } = useProjectData();
  const fileInputRef = useRef(null);
  const [showAttachHint, setShowAttachHint] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  const monoMonthly = Number(
    projectData?.yield?.monoAmvpYields?.monthly || 0
  );
  const colorMonthly = Number(
    projectData?.yield?.colorAmvpYields?.monthly || 0
  );

  const { url } = usePage();

  const projectId =
    projectData?.metadata?.projectId ?? projectData?.id ?? null;

  const pageRoute = url.includes("/archive/")
    ? "archive"
    : url.includes("/current/")
    ? "current"
    : "entry";

  const requiresRemarks = monoMonthly > 4000 || colorMonthly > 2000;

  const entryRemarks = projectData?.entryRemarks ?? {
    remarks: "",
    attachments: [],
  };

  const attachments = Array.isArray(entryRemarks.attachments)
    ? entryRemarks.attachments
    : [];

  const hasRemarks = String(entryRemarks.remarks || "").trim().length > 0;

  // ── Check for *real* attachments, not just metadata ghosts ──
  // After serialization, attachment.file becomes {} but name/size
  // survive. We must verify an actual File exists somewhere.
  const hasAttachments = useMemo(() => {
    return attachments.some((att) => {
      // Fresh File still in context state
      if (att?.file instanceof File) return true;
      // File backed by module-level store
      if (att?.id && fileObjectStore.has(att.id)) return true;
      // Previously uploaded to server (has a path/url)
      if (att?.path || att?.url || att?.original_name) return true;
      return false;
    });
  }, [attachments]);

  const remarksErrorMessage = useMemo(() => {
    if (!requiresRemarks) return "";
    if (!hasRemarks) return "Remarks required for this yield level.";
    return "";
  }, [requiresRemarks, hasRemarks]);

  const attachmentRequiredMessage = useMemo(() => {
    if (!requiresRemarks) return "";
    if (!hasAttachments) return "Add at least one attachment.";
    return "";
  }, [requiresRemarks, hasAttachments]);

  // ── Sync: back up any File objects still in context to the store ──
  // Handles re-mount after wizard step switch where context still
  // holds real File objects but the store doesn't have them yet.
  useEffect(() => {
    attachments.forEach((att) => {
      if (
        att?.file instanceof File &&
        att?.id &&
        !fileObjectStore.has(att.id)
      ) {
        fileObjectStore.set(att.id, att.file);
      }
    });
  }, [attachments]);

  const updateRemarks = (patch) => {
    setProjectData((prev) => ({
      ...prev,
      entryRemarks: {
        remarks: prev?.entryRemarks?.remarks || "",
        attachments: Array.isArray(prev?.entryRemarks?.attachments)
          ? prev.entryRemarks.attachments
          : [],
        ...patch,
      },
    }));
  };

  const handleRemarksChange = (e) => {
    updateRemarks({ remarks: e.target.value });
  };

  const handleOpenFilePicker = () => {
    if (!readOnly && attachments.length < MAX_ATTACHMENTS) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    setAttachmentError("");

    const existingAttachments = attachments;
    const existingKeys = new Set(
      existingAttachments.map(
        (item) =>
          `${item?.original_name || item?.name}-${item?.size}-${
            item?.lastModified || item?.id || 0
          }`
      )
    );

    const nextAttachments = [...existingAttachments];

    for (const file of selectedFiles) {
      const fileKey = `${file.name}-${file.size}-${file.lastModified || 0}`;

      if (existingKeys.has(fileKey)) {
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setAttachmentError(
          `Each attachment must not exceed ${MAX_FILE_SIZE_MB} MB.`
        );
        continue;
      }

      if (nextAttachments.length >= MAX_ATTACHMENTS) {
        setAttachmentError(
          `You may attach up to ${MAX_ATTACHMENTS} files only.`
        );
        break;
      }

      // ── Generate unique id and store File in module-level Map ──
      const fileId = generateFileId();
      fileObjectStore.set(fileId, file);

      nextAttachments.push({
        id: fileId,
        file, // kept for backward compat, but may become {} after serialization
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      });
      existingKeys.add(fileKey);
    }

    updateRemarks({ attachments: nextAttachments });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    const removed = attachments[indexToRemove];

    // ── Clean up module-level store ──
    if (removed?.id) {
      fileObjectStore.delete(removed.id);
    }

    const nextAttachments = attachments.filter(
      (_, index) => index !== indexToRemove
    );
    updateRemarks({ attachments: nextAttachments });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (nextAttachments.length < MAX_ATTACHMENTS) {
      setAttachmentError("");
    }
  };

  const hasAnyError = Boolean(
    remarksErrorMessage || attachmentRequiredMessage || attachmentError
  );

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      <div className="w-full flex-1 ">
        <div
          className={`flex-1 h-full flex flex-col overflow-hidden rounded-xl shadow-md border border-[#2c2c2e30] border-b-[#2c2c2e]/30 bg-white transition ${
            hasAnyError
              ? "border-red-400"
              : "border-slate-200 focus-within:border-[#2DA300]"
          } ${readOnly ? "bg-slate-100" : ""}`}
        >
          <label className="text-[10px] font-bold text-slate-800 p-4 py-2 bg-lightgreen/25 border-b border-slate-300">
            REMARKS
          </label>
          <textarea
            value={entryRemarks.remarks || ""}
            onChange={handleRemarksChange}
            disabled={readOnly}
            rows={1}
            placeholder={remarksErrorMessage || "Enter remarks..."}
            className={`w-full h-full flex-1 px-4 py-2 pb-1 text-[12px] resize-none bg-transparent border-0 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 shadow-none appearance-none ${
              remarksErrorMessage
                ? "text-red-700 placeholder:text-red-300"
                : "text-slate-800"
            } ${readOnly ? "cursor-not-allowed" : ""}`}
          />

          <div className="px-3 pb-1 flex items-center gap-2 flex-wrap bg-white/80">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={readOnly}
              multiple
              className="hidden"
            />

            <div className="relative">
              <button
                type="button"
                onClick={handleOpenFilePicker}
                onMouseEnter={() => setShowAttachHint(true)}
                onMouseLeave={() => setShowAttachHint(false)}
                disabled={readOnly || attachments.length >= MAX_ATTACHMENTS}
                className={`rounded-lg text-sm pt-2 font-semibold text-[#2DA300] hover:brightness-95 transition disabled:text-gray-400`}
                aria-label="Attach file"
                title="Attach file"
              >
                <FaFileCirclePlus size={19} />
              </button>

              {!attachments.length && showAttachHint && !readOnly && (
                <div className="absolute left-10 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 shadow">
                  Attach file
                </div>
              )}
            </div>

            {attachments.map((item, index) => (
              <div
                key={getRoiAttachmentKey(item, index)}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-[2px] text-[10px] text-slate-700"
              >
                <FiPaperclip className="shrink-0 text-[12px]" />

                <button
                  type="button"
                  onClick={() =>
                    openRoiAttachment({
                      item,
                      index,
                      projectId,
                      pageRoute,
                    })
                  }
                  className="max-w-[120px] truncate text-left"
                  title={getRoiAttachmentName(item, index)}
                >
                  {getRoiAttachmentName(item, index)}
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${getRoiAttachmentName(item, index)}`}
                    title="Remove attached file"
                  >
                    <FiX className="text-[13px]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {remarksErrorMessage ? (
        <p className="mt-1 px-1 text-[11px] text-red-600 font-medium">
          {remarksErrorMessage}
        </p>
      ) : null}

      {attachmentError ? (
        <p className="mt-1 px-1 text-[11px] text-red-600 font-medium">
          {attachmentError}
        </p>
      ) : attachmentRequiredMessage ? (
        <p className="mt-1 px-1 text-[11px] text-red-600 font-medium">
          {attachmentRequiredMessage}
        </p>
      ) : null}
    </div>
  );
}