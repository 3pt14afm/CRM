import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { FaRegUserCircle } from "react-icons/fa";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import { useProjectData } from "@/Context/ProjectContext";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * SprfAddComments
 *
 * Handles Comments for the SPRF pipeline (levels 3, 4, 5 only).
 * This component is only rendered in the current-project context.
 * Entry and archive contexts must never render it.
 *
 * Authorization matrix:
 *   • Level 3  →  ESD Director    (approverUsers.esdDirector.id)
 *   • Level 4  →  VP & CCTO       (approverUsers.vpCcto.id)
 *   • Level 5  →  President & CEO (approverUsers.presidentCeo.id)
 *   • Archived projects (status approved / rejected) → always locked
 *
 * Props from Inertia page (via usePage):
 *   • project      – set by SprfCurrentProjectController::show()
 *   • approverUsers – { esdDirector, vpCcto, presidentCeo: { id, name, ... } }
 *   • auth          – { user: { id } }
 *
 * Route used: sprf.current.comments.store
 * Backend: SprfCurrentProjectController::storeComment()
 *          → SprfCurrentWorkflowService::appendMessage() at level 3/4/5
 */
export default function SprfAddComments({ scopeKey = "default" }) {
  const { projectData } = useProjectData();
  const { auth, project: inertiaProject, approverUsers } = usePage().props;

  const project   = inertiaProject ?? null;
  const projectId = project?.id ?? projectData?.metadata?.projectId ?? null;
  const userId    = auth?.user?.id ?? auth?.id ?? null;

  const currentLevel = project?.current_level ?? null;

  // ── Archive guard ──────────────────────────────────────────────────────────
  const isArchived = ["approved", "rejected"].includes( project?.status?.toLowerCase() );

  // ── Authorization ──────────────────────────────────────────────────────────
  //
  // Each approver ID is read from the `approverUsers` prop because
  // SprfCurrentProjectController::transformProjectForFrontend() does not
  // expose raw user IDs on the project object — only names.
  //
  // Level 3 — ESD Director
  const isEsdDirector =
    !isArchived &&
    !!userId &&
    !!approverUsers?.esdDirector?.id &&
    Number(approverUsers.esdDirector.id) === Number(userId) &&
    Number(currentLevel) === 3;

  // Level 4 — VP & CCTO
  const isVpCcto =
    !isArchived &&
    !!userId &&
    !!approverUsers?.vpCcto?.id &&
    Number(approverUsers.vpCcto.id) === Number(userId) &&
    Number(currentLevel) === 4;

  // Level 5 — President & CEO
  const isPresidentCeo =
    !isArchived &&
    !!userId &&
    !!approverUsers?.presidentCeo?.id &&
    Number(approverUsers.presidentCeo.id) === Number(userId) &&
    Number(currentLevel) === 5;

  const canComment = isEsdDirector || isVpCcto || isPresidentCeo;

  const isPrintPreview =
    projectData?.metadata?.isPrintPreview === true ||
    projectData?.metadata?.readOnly === true;

  const isLocked = !projectId || !canComment || isPrintPreview || isArchived;

  // ── Draft persistence ──────────────────────────────────────────────────────
  const DRAFT_KEY = useMemo(() => {
    return projectId
      ? `sprf-comment-draft:${userId}:${projectId}:${scopeKey}`
      : null;
  }, [userId, projectId, scopeKey]);

  const [open, setOpen]               = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  // ── Existing comments ──────────────────────────────────────────────────────
  //
  // SprfCurrentProjectController::transformProjectForFrontend() passes
  // `comments` on the project object — already an array ([] if empty).
  const serverComments = useMemo(() => {
    const fromProject = project?.comments;
    const rows = Array.isArray(fromProject) && fromProject.length > 0 ? fromProject : [];
    return Array.isArray(rows) ? rows : [];
  }, [project]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const modalRef    = useRef(null);
  const textareaRef = useRef(null);

  const openModal = () => {
    if (isArchived) {
      toast.error("Cannot add comments on an archived project.");
      return;
    }
    if (!isLocked) setOpen(true);
  };
  const closeModal = () => setOpen(false);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!DRAFT_KEY) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (typeof raw === "string") setCommentDraft(raw);
    } catch {}
  }, [DRAFT_KEY]);

  useEffect(() => {
    if (!DRAFT_KEY) return;
    try { localStorage.setItem(DRAFT_KEY, commentDraft); } catch {}
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  const canSubmit = commentDraft.trim().length > 0 && !!projectId && canComment;

  const handleAddComment = () => {
    if (!canSubmit) return;

    router.post(
      route("sprf.current.comments.store", projectId),
      { body: commentDraft.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCommentDraft("");
          if (DRAFT_KEY) {
            try { localStorage.removeItem(DRAFT_KEY); } catch {}
          }
          router.reload({ only: ["project"] });
          closeModal();
        },
        onError: (errs) => {
          const msg = errs?.body ?? errs?.message ?? "Failed to add comment.";
          toast.error(msg);
        },
      }
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full mx-auto mb-6">

        {/* Trigger bar */}
        <div
          onClick={!isLocked ? openModal : undefined}
          className={`flex items-center print:hidden border border-gray-200 rounded-xl py-3 px-4 shadow-[0px_2px_10px_rgba(0,0,0,0.10)] ${
            !isLocked
              ? "bg-white hover:cursor-pointer"
              : "bg-gray-50 cursor-not-allowed opacity-70"
          }`}
        >
          <div className="flex-grow text-gray-400 text-xs print:text-[10px]">
            Write your comments here...
          </div>

          <button
            type="button"
            onClick={!isLocked ? openModal : (e) => e.stopPropagation()}
            disabled={isLocked}
            className={`flex items-center rounded-full font-medium transition-all shrink-0 ${
              !isLocked
                ? "hover:text-[#268a00] text-[#2DA300] shadow-[0px_4px_10px_rgba(45,163,0,0.3)]"
                : "text-gray-500 cursor-not-allowed"
            }`}
          >
            <span className="flex items-center h-5 w-5 justify-center">
              <IoMdSend size={22} />
            </span>
          </button>
        </div>

        {/* Existing comments list */}
        {serverComments.length > 0 && (
          <div className="mt-2 print:mt-0">
            <span className="font-medium text-[11px] text-gray-400 pl-2">
              COMMENTS
            </span>

            {serverComments.map((c, idx) => (
              <div
                key={c.id ?? `${c.created_at ?? "comment"}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 my-[3px] print:py-3 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
              >
                <div className="flex h-4 items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <FaRegUserCircle className="text-gray-400 text-sm shrink-0" />
                    </div>
                    <span className="block text-[11px] font-medium text-gray-900">
                      {c.author?.name ?? "Unknown"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 italic whitespace-nowrap">
                    {formatDateTime(c.created_at)}
                  </div>
                </div>
                <p className="mt-2 text-gray-900 text-xs leading-relaxed">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
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

                <div className="bg-white px-2 py-2 flex justify-end gap-2">
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