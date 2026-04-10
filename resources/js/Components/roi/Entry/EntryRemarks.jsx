import React, { useMemo, useRef, useState } from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { FiX, FiPaperclip } from "react-icons/fi";
import { FaFileCirclePlus } from "react-icons/fa6";

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function EntryRemarks({ readOnly = false }) {
  const { projectData, setProjectData } = useProjectData();
  const fileInputRef = useRef(null);
  const [showAttachHint, setShowAttachHint] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  const monoMonthly = Number(projectData?.yield?.monoAmvpYields?.monthly || 0);
  const colorMonthly = Number(projectData?.yield?.colorAmvpYields?.monthly || 0);

  const requiresRemarks = monoMonthly >= 5000 || colorMonthly >= 2500;

  const entryRemarks = projectData?.entryRemarks ?? {
    remarks: "",
    attachments: [],
  };

  const attachments = Array.isArray(entryRemarks.attachments)
    ? entryRemarks.attachments
    : [];

  const hasRemarks = String(entryRemarks.remarks || "").trim().length > 0;

  const remarksErrorMessage = useMemo(() => {
    if (!requiresRemarks) return "";
    if (!hasRemarks) return "Remarks required for this yield level.";
    return "";
  }, [requiresRemarks, hasRemarks]);

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
        (item) => `${item.name}-${item.size}-${item.lastModified || 0}`
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
        setAttachmentError(`You may attach up to ${MAX_ATTACHMENTS} files only.`);
        break;
      }

      nextAttachments.push({
        file,
        name: file.name,
        size: file.size,
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
    const nextAttachments = attachments.filter((_, index) => index !== indexToRemove);
    updateRemarks({ attachments: nextAttachments });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (nextAttachments.length < MAX_ATTACHMENTS) {
      setAttachmentError("");
    }
  };

  const hasAnyError = Boolean(remarksErrorMessage || attachmentError);

  return (
    <div className="w-full min-w-0 h-full flex flex-col">
      <div className="w-full flex-1">
        <div
          className={`flex-1 h-full flex flex-col overflow-hidden rounded-xl shadow-md bg-white transition border ${
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
                key={`${item.name}-${item.size}-${item.lastModified || index}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-[2px] text-[10px] text-slate-700"
              >
                <FiPaperclip className="shrink-0 text-[12px]" />
                <span className="max-w-[70px] truncate sm:max-w-[60px]">
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  disabled={readOnly}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${item.name}`}
                  title="Remove attached file"
                >
                  <FiX className="text-[13px]" />
                </button>
              </div>
            ))}

            {/* {requiresRemarks && !remarksErrorMessage ? (
              <span className="ml-auto text-[11px] text-slate-500">
                Required based on yield threshold
              </span>
            ) : null} */}
          </div>
        </div>


        
      </div>

      {!remarksErrorMessage && attachmentError ? (
          <p className="mt-1 px-1 text-[11px] text-red-600 font-medium">
            {attachmentError}
          </p>
        ) : null}

    </div>
  );
}