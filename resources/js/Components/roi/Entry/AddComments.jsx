import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { FaRegUserCircle } from "react-icons/fa";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import { useProjectData } from "@/Context/ProjectContext";

function formatDateTime(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  return `${datePart} - ${timePart}`;
}

export default function AddComments({ scopeKey = "default" }) {
  const { projectData } = useProjectData();
  const {
    auth,
    project: inertiaProject,
    entryProject,
    projectComments: inertiaComments,
  } = usePage().props;

  const project = inertiaProject ?? entryProject ?? null;

  const projectId =
    project?.id ??
    projectData?.metadata?.projectId ??
    null;

  const userId =
    auth?.user?.id ??
    auth?.id ??
    null;

  const isAssignedConfirmer =
    !!userId &&
    !!project?.confirmed_by &&
    Number(project.confirmed_by) === Number(userId);

  const isAssignedApprover =
    !!userId &&
    !!project?.approved_by &&
    Number(project.approved_by) === Number(userId);

  const isPrintPreview =
  projectData?.metadata?.isPrintPreview === true ||
  projectData?.metadata?.readOnly === true;  

  const canComment = isAssignedConfirmer || isAssignedApprover;
  const isLocked = !projectId || !canComment || isPrintPreview;

  const DRAFT_KEY = useMemo(() => {
    return projectId ? `roi-comment-draft:${userId}:${projectId}:${scopeKey}` : null;
  }, [userId, projectId, scopeKey]);

  const [open, setOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  const serverComments = useMemo(() => {
    const fromContext = projectData?.metadata?.comments;
    const fromProject = project?.comments;

    const rows =
      Array.isArray(fromContext) && fromContext.length > 0
        ? fromContext
        : Array.isArray(fromProject) && fromProject.length > 0
        ? fromProject
        : inertiaComments ?? [];

    return Array.isArray(rows) ? rows : [];
  }, [projectData, project, inertiaComments]);

  const modalRef = useRef(null);
  const textareaRef = useRef(null);

  const openModal = () => {
    if (!isLocked) setOpen(true);
  };

  const closeModal = () => setOpen(false);

  useEffect(() => {
    if (!DRAFT_KEY) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (typeof raw === "string") setCommentDraft(raw);
    } catch {}
  }, [DRAFT_KEY]);

  useEffect(() => {
    if (!DRAFT_KEY) return;
    try {
      localStorage.setItem(DRAFT_KEY, commentDraft);
    } catch {}
  }, [DRAFT_KEY, commentDraft]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) closeModal();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const canSubmit = commentDraft.trim().length > 0 && !!projectId && canComment;

  const handleAddComment = () => {
    if (!canSubmit) return;

    router.post(
      route("roi.projects.comments.store", projectId),
      { body: commentDraft.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCommentDraft("");
          if (DRAFT_KEY) {
            try {
              localStorage.removeItem(DRAFT_KEY);
            } catch {}
          }

          router.reload({
            only: ["entryProject", "project", "projectComments"],
          });

          closeModal();
        },
        onError: (errs) => {
          console.error(errs);
          alert("Failed to add comment. Check console/logs.");
        },
      }
    );
  };

  return (
    <>
      <div className="w-full mx-auto mb-6 px-4">

        <div
          onClick={!isLocked ? openModal : undefined}
          className={`flex items-center print:hidden border border-gray-200 rounded-xl py-3 px-6 shadow-[0px_2px_10px_rgba(0,0,0,0.10)] ${
            !isLocked
              ? "bg-white hover:cursor-pointer"
              : "bg-gray-50 cursor-not-allowed opacity-70"
          }`}
        >
          <div className="flex-grow text-gray-400 text-xs print:text-[10px]">
            Write your comments here.....
          </div>

          <button
            type="button"
            onClick={!isLocked ? openModal : (e) => e.stopPropagation()}
            disabled={isLocked}
            className={`flex items-center gap-1 px-3 py-2 rounded-full font-medium text-xs transition-all shrink-0 ${
              !isLocked
                ? "bg-[#2DA300] hover:bg-[#268a00] text-white shadow-[0px_4px_10px_rgba(45,163,0,0.3)]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <span className="flex items-center justify-center w-3.5 h-3.5 text-[30px] leading-none">
              <IoMdSend />
            </span>
            Add Comments
          </button>
        </div>

        {serverComments.length > 0 && (
          <div className="mt-2 print:mt-1">
            <span className="font-medium text-[11px] text-gray-400 pl-2">COMMENTS</span>

            {serverComments.map((c, idx) => (
              <div
                key={c.id ?? `${c.created_at ?? "comment"}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl px-6 py-5 my-2 print:py-3 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <FaRegUserCircle className="text-lg text-gray-400 print:text-base" />
                    <span className="font-semibold text-sm text-gray-900">
                      {c.author?.name ?? "Unknown"}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 italic whitespace-nowrap">
                    {formatDateTime(c.created_at)}
                  </div>
                </div>
                <p className="mt-3 text-gray-900 text-xs leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/35" />

          <div
            ref={modalRef}
            className="relative w-[40%] max-w-xl bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden"
          >
            <div className="px-10 pt-10 pb-4">
              <h2 className="text-2xl font-extrabold tracking-wide text-black">
                ADD COMMENT
              </h2>
            </div>

            <div className="px-10 pb-8">
              <div className="relative bg-white rounded-xl border border-black/10 shadow-sm overflow-hidden">
                <div className="relative p-6">
                  <FaRegUserCircle className="absolute left-6 top-6 text-2xl text-gray-400" />
                  <textarea
                    ref={textareaRef}
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Write comment here..."
                    className="w-full min-h-[330px] pl-12 pr-4 text-gray-700 placeholder-gray-400 text-base resize-none border-none focus:outline-none focus:ring-0"
                  />
                </div>

                <div className=" bg-white px-2 py-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-2 rounded-lg text-sm bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!canSubmit}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      canSubmit
                        ? "bg-[#A7E86B] hover:bg-[#93db57] text-gray-900"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Add comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}