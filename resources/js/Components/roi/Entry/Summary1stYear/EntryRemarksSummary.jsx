import React from "react";
import { useProjectData } from "@/Context/ProjectContext";
import { usePage } from "@inertiajs/react";
import { FiPaperclip } from "react-icons/fi";
import {
  getRoiAttachmentKey,
  getRoiAttachmentName,
  openRoiAttachment,
} from "@/utils/openRoiAttachment";

export default function EntryRemarksSummary() {
  const { projectData } = useProjectData();
  const { url } = usePage();

  const remarks = String(projectData?.entryRemarks?.remarks ?? "").trim();
  const attachments = Array.isArray(projectData?.entryRemarks?.attachments)
    ? projectData.entryRemarks.attachments
    : [];

  const projectId =
    projectData?.metadata?.projectId ??
    projectData?.id ??
    null;

  const pageRoute = url.includes("/archive/")
    ? "archive"
    : url.includes("/current/")
    ? "current"
    : "entry";

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm font-sans max-w-full my-6">
      <div className="bg-[#E2F4D8] py-2 text-center border-b border-gray-300">
        <h2 className="text-xs font-bold tracking-widest text-gray-800 uppercase">
            Remarks
        </h2>
      </div>

      <div className="p-4 space-y-4 bg-white min-h-[100px]">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Remarks
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap break-words min-h-[63px]">
            {remarks || "—"}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Attachments
          </div>

          {attachments.length ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((item, index) => (
                <button
                  key={getRoiAttachmentKey(item, index)}
                  type="button"
                  onClick={() =>
                    openRoiAttachment({
                      item,
                      index,
                      projectId,
                      pageRoute,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                  title={getRoiAttachmentName(item, index)}
                >
                  <FiPaperclip className="shrink-0" />
                  <span className="truncate max-w-[180px]">
                    {getRoiAttachmentName(item, index)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No attachments</p>
          )}
        </div>
      </div>
    </div>
  );
}