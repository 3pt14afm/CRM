import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoIosAddCircle } from "react-icons/io";
import { IoMdSend } from "react-icons/io";
import { FaRegUserCircle } from "react-icons/fa";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import { useProjectData } from "@/Context/ProjectContext";
import { toast } from "sonner";

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

export default function NotesAndComments({ scopeKey = "default" }) {
  const { projectData } = useProjectData();
  const page = usePage();

  const {
    auth,
    entryProject,
    project: inertiaProject,
    projectNotes,
    projectComments: inertiaComments,
    route: pageRoute,
  } = page.props;

  const project = entryProject ?? inertiaProject ?? null;

  const projectId =
    project?.id ??
    projectData?.metadata?.projectId ??
    null;

  const userId =
    auth?.user?.id ??
    auth?.id ??
    null;

  const isPrintPreview =
    projectData?.metadata?.isPrintPreview === true ||
    projectData?.metadata?.readOnly === true;

  /* ------------------------------------------------------------------ */
  /* NOTES logic                                                        */
  /* ------------------------------------------------------------------ */

  const isCurrentRoute = pageRoute === "current";
  const isArchiveRoute = pageRoute === "archive";

  const currentLevel = project?.current_level ?? null;

  const isAssignedReviewer =
    !!userId &&
    !!project?.reviewed_by &&
    Number(project.reviewed_by) === Number(userId) &&
    Number(currentLevel) === 2;

  const isAssignedChecker =
    !!userId &&
    !!project?.checked_by &&
    Number(project.checked_by) === Number(userId) &&
    Number(currentLevel) === 3;

  const isAssignedEndorser =
    !!userId &&
    !!project?.endorsed_by &&
    Number(project.endorsed_by) === Number(userId) &&
    Number(currentLevel) === 4;

  const isEntryOwner =
    !!userId &&
    !!project?.created_by &&
    Number(project.created_by) === Number(userId);

  const canNote = isCurrentRoute
    ? (isAssignedReviewer || isAssignedChecker || isAssignedEndorser)
    : (isEntryOwner || isAssignedReviewer || isAssignedChecker || isAssignedEndorser);

  const isNoteLocked = !projectId || !canNote || isArchiveRoute || isPrintPreview;

  const NOTE_DRAFT_KEY = useMemo(() => {
    return projectId ? `roi-note-draft:${userId}:${projectId}:${scopeKey}` : null;
  }, [userId, projectId, scopeKey]);

  const [noteOpen, setNoteOpen] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const serverNotes = useMemo(() => {
    const fromProject = project?.notes;

    const rows =
      Array.isArray(fromProject) && fromProject.length > 0
        ? fromProject
        : projectNotes ?? [];

    if (!Array.isArray(rows)) return [];

    return [...rows].sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [project, projectNotes]);

  const noteModalRef = useRef(null);
  const noteTextareaRef = useRef(null);

  const openNoteModal = () => {
    if (!isNoteLocked) setNoteOpen(true);
  };
  const closeNoteModal = () => setNoteOpen(false);

  useEffect(() => {
    if (!NOTE_DRAFT_KEY) return;
    try {
      const raw = localStorage.getItem(NOTE_DRAFT_KEY);
      if (typeof raw === "string") setNoteDraft(raw);
    } catch {}
  }, [NOTE_DRAFT_KEY]);

  useEffect(() => {
    if (!NOTE_DRAFT_KEY) return;
    try {
      localStorage.setItem(NOTE_DRAFT_KEY, noteDraft);
    } catch {}
  }, [NOTE_DRAFT_KEY, noteDraft]);

  useEffect(() => {
    if (noteOpen) setTimeout(() => noteTextareaRef.current?.focus(), 0);
  }, [noteOpen]);

  useEffect(() => {
    if (!noteOpen) return;
    const onKeyDown = (e) => e.key === "Escape" && closeNoteModal();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [noteOpen]);

  useEffect(() => {
    if (!noteOpen) return;
    const onMouseDown = (e) => {
      if (noteModalRef.current && !noteModalRef.current.contains(e.target)) closeNoteModal();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [noteOpen]);

  const canSubmitNote = noteDraft.trim().length > 0 && !!projectId && canNote && !isArchiveRoute && !isSubmittingNote;

  const handleAddNote = () => {
    if (!canSubmitNote) return;
    setIsSubmittingNote(true);

    const noteRoute = isCurrentRoute
      ? route("roi.current.notes.store", projectId)
      : route("roi.entry.projects.notes.store", projectId);

    router.post(
      noteRoute,
      { body: noteDraft.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          setNoteDraft("");
          if (NOTE_DRAFT_KEY) {
            try {
              localStorage.removeItem(NOTE_DRAFT_KEY);
            } catch {}
          }

          router.reload({
            only: ["entryProject", "project", "projectNotes"],
          });

          setIsSubmittingNote(false);
          closeNoteModal();
        },
        onError: (errs) => {
          console.error(errs);
          alert("Failed to add note. Check console/logs.");
          setIsSubmittingNote(false);
        },
      }
    );
  };

  /* ------------------------------------------------------------------ */
  /* COMMENTS logic                                                     */
  /* ------------------------------------------------------------------ */

  const isArchived = ["approved", "rejected"].includes(project?.status?.toLowerCase());

  const isAssignedConfirmer =
    !!userId &&
    !!project?.confirmed_by &&
    Number(project.confirmed_by) === Number(userId) &&
    !isArchived;

  const isAssignedApprover =
    !!userId &&
    !!project?.approved_by &&
    Number(project.approved_by) === Number(userId) &&
    !isArchived;

  const canComment =
    !!userId &&
    !!project &&
    !isArchived &&
    (() => {
      const level = Number(project.current_level ?? 0);
      if (level === 5) return Number(project.confirmed_by) === Number(userId);
      if (level === 6) return Number(project.approved_by) === Number(userId);
      return false;
    })();

  const isCommentLocked = !projectId || !canComment || isPrintPreview || isArchived;

  const COMMENT_DRAFT_KEY = useMemo(() => {
    return projectId ? `roi-comment-draft:${userId}:${projectId}:${scopeKey}` : null;
  }, [userId, projectId, scopeKey]);

  const [commentOpen, setCommentOpen] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
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

  const commentModalRef = useRef(null);
  const commentTextareaRef = useRef(null);

  const openCommentModal = () => {
    if (isArchived) {
      toast.error("Cannot add comments on an archived project.");
      return;
    }
    if (!isCommentLocked) setCommentOpen(true);
  };
  const closeCommentModal = () => setCommentOpen(false);

  useEffect(() => {
    if (!COMMENT_DRAFT_KEY) return;
    try {
      const raw = localStorage.getItem(COMMENT_DRAFT_KEY);
      if (typeof raw === "string") setCommentDraft(raw);
    } catch {}
  }, [COMMENT_DRAFT_KEY]);

  useEffect(() => {
    if (!COMMENT_DRAFT_KEY) return;
    try {
      localStorage.setItem(COMMENT_DRAFT_KEY, commentDraft);
    } catch {}
  }, [COMMENT_DRAFT_KEY, commentDraft]);

  useEffect(() => {
    if (commentOpen) setTimeout(() => commentTextareaRef.current?.focus(), 0);
  }, [commentOpen]);

  useEffect(() => {
    if (!commentOpen) return;
    const onKeyDown = (e) => e.key === "Escape" && closeCommentModal();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commentOpen]);

  useEffect(() => {
    if (!commentOpen) return;
    const onMouseDown = (e) => {
      if (commentModalRef.current && !commentModalRef.current.contains(e.target)) closeCommentModal();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [commentOpen]);

  const canSubmitComment = commentDraft.trim().length > 0 && !!projectId && canComment && !isSubmittingComment;

  const handleAddComment = () => {
    if (!canSubmitComment) return;
    setIsSubmittingComment(true);

    router.post(
      route("roi.projects.comments.store", projectId),
      { body: commentDraft.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCommentDraft("");
          if (COMMENT_DRAFT_KEY) {
            try {
              localStorage.removeItem(COMMENT_DRAFT_KEY);
            } catch {}
          }

          router.reload({
            only: ["entryProject", "project", "projectComments"],
          });

          setIsSubmittingComment(false);
          closeCommentModal();
        },
        onError: (errs) => {
          const msg = errs?.message ?? "Failed to add comment.";
          toast.error(msg);
          setIsSubmittingComment(false);
        },
      }
    );
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <>
      <div className="w-full mb-6">
        {/* ---------- Trigger row: DESKTOP (unchanged) ---------- */}
        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-4 px-4">
          <div
            onClick={!isNoteLocked ? openNoteModal : undefined}
            className={`flex items-center print:hidden border border-gray-200 rounded-xl py-3 px-6 shadow-[0px_2px_10px_rgba(0,0,0,0.10)] ${
              !isNoteLocked
                ? "bg-white hover:cursor-pointer"
                : "bg-gray-50 cursor-not-allowed opacity-70"
            }`}
          >
            <div className="flex-grow text-gray-400 text-xs print:text-[10px]">
              Write your notes here.....
            </div>

            <button
              type="button"
              onClick={!isNoteLocked ? openNoteModal : (e) => e.stopPropagation()}
              disabled={isNoteLocked}
              className={`flex items-center gap-1 px-3 py-2 rounded-full font-semibold text-xs transition-all shrink-0 ${
                !isNoteLocked
                  ? "bg-[#2DA300] hover:bg-[#268a00] text-white shadow-[0px_4px_10px_rgba(45,163,0,0.3)]"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <span className="flex items-center justify-center w-3.5 h-3.5 text-[30px] leading-none">
                <IoIosAddCircle />
              </span>
              Add Notes
            </button>
          </div>

          <div
            onClick={!isCommentLocked ? openCommentModal : undefined}
            className={`flex items-center print:hidden border border-gray-200 rounded-xl py-3 px-6 shadow-[0px_2px_10px_rgba(0,0,0,0.10)] ${
              !isCommentLocked
                ? "bg-white hover:cursor-pointer"
                : "bg-gray-50 cursor-not-allowed opacity-70"
            }`}
          >
            <div className="flex-grow text-gray-400 text-xs print:text-[10px]">
              Write your comments here.....
            </div>

            <button
              type="button"
              onClick={!isCommentLocked ? openCommentModal : (e) => e.stopPropagation()}
              disabled={isCommentLocked}
              className={`flex items-center gap-1 px-3 py-2 rounded-full font-medium text-xs transition-all shrink-0 ${
                !isCommentLocked
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
        </div>

        {/* ---------- Trigger row: MOBILE (compact pills) ---------- */}
        <div className="grid grid-cols-2 gap-2 sm:hidden px-3">
          <div
            onClick={!isNoteLocked ? openNoteModal : undefined}
            className={`flex items-center justify-between gap-2 print:hidden rounded-full border border-gray-200 px-3 py-2 shadow-sm ${
              !isNoteLocked
                ? "bg-white hover:cursor-pointer"
                : "bg-gray-50 cursor-not-allowed opacity-70"
            }`}
          >
            <span className="min-w-0 truncate text-[10px] text-gray-400">
              Write your notes here...
            </span>

            <button
              type="button"
              onClick={!isNoteLocked ? openNoteModal : (e) => e.stopPropagation()}
              disabled={isNoteLocked}
              aria-label="Add Notes"
              className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs shrink-0 transition-all ${
                !isNoteLocked
                  ? "bg-gray-800 hover:bg-gray-900 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              +
            </button>
          </div>

          <div
            onClick={!isCommentLocked ? openCommentModal : undefined}
            className={`flex items-center justify-between gap-2 print:hidden rounded-full border border-gray-200 px-3 py-2 shadow-sm ${
              !isCommentLocked
                ? "bg-white hover:cursor-pointer"
                : "bg-gray-50 cursor-not-allowed opacity-70"
            }`}
          >
            <span className="min-w-0 truncate text-[10px] text-gray-400">
              Write your comments here...
            </span>

            <button
              type="button"
              onClick={!isCommentLocked ? openCommentModal : (e) => e.stopPropagation()}
              disabled={isCommentLocked}
              aria-label="Add Comments"
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs shrink-0 transition-all border ${
                !isCommentLocked
                  ? "bg-white border-gray-300 text-gray-500 hover:bg-gray-100"
                  : "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
            >
              <IoMdSend className="text-[11px]" />
            </button>
          </div>
        </div>

        {!projectId && (
          <div className="my-2 pl-2 text-[10px] italic font-medium text-red-600 print:hidden tracking-wider px-3 sm:px-4">
            Note: Save the project as a draft first before adding notes.
          </div>
        )}

        {/* ---------- Lists: two columns on every breakpoint ---------- */}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-4 px-3 sm:px-4 print:mt-1">
          <div>
            {serverNotes.length > 0 && (
              <span className="text-[11px] text-gray-400 pl-2">NOTES</span>
            )}

            {serverNotes.map((n, idx) => (
              <div
                key={n.id ?? `${n.created_at ?? "note"}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-3 my-[3px] print:py-3 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="items-start flex gap-2 min-w-0">
                    <div className="flex items-center">
                      <FaRegUserCircle className="text-gray-400 text-sm shrink-0" />
                    </div>
                    <span className="block text-[11px] font-medium text-gray-900 truncate">
                      {n.author?.name ?? "Unknown"}
                    </span>
                  </div>

                  <div className="text-[10px] text-gray-500 italic whitespace-nowrap">
                    {formatDateTime(n.created_at)}
                  </div>
                </div>
                <p className="mt-2 print:mt-1 text-gray-900 text-xs leading-relaxed">{n.body}</p>
              </div>
            ))}
          </div>

          <div>
            {serverComments.length > 0 && (
              <span className="font-medium text-[11px] text-gray-400 pl-2">COMMENTS</span>
            )}

            {serverComments.map((c, idx) => (
              <div
                key={c.id ?? `${c.created_at ?? "comment"}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-3 my-[3px] print:py-3 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center">
                      <FaRegUserCircle className="text-gray-400 text-sm shrink-0" />
                    </div>
                    <span className="block text-[11px] font-medium text-gray-900 truncate">
                      {c.author?.name ?? "Unknown"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 italic whitespace-nowrap">
                    {formatDateTime(c.created_at)}
                  </div>
                </div>
                <p className="mt-2 text-gray-900 text-xs leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Add Note modal ---------- */}
      {noteOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 sm:px-0">
          <div className="absolute inset-0 bg-black/35" />

          <div
            ref={noteModalRef}
            className="relative w-full sm:w-[40%] max-w-xl bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="px-5 sm:px-10 pt-6 sm:pt-10 pb-4">
              <h2 className="text-lg sm:text-2xl font-extrabold tracking-wide text-black">
                ADD NOTE
              </h2>
            </div>

            <div className="px-5 sm:px-10 pb-6 sm:pb-8">
              <div className="relative bg-white rounded-xl border border-black/10 shadow-sm overflow-hidden">
                <div className="relative p-4">
                  <FaRegUserCircle className="absolute left-6 top-6 text-2xl text-gray-400" />
                  <textarea
                    ref={noteTextareaRef}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Write note here..."
                    className="w-full min-h-[200px] sm:min-h-[330px] pl-12 pr-4 text-gray-700 placeholder-gray-400 text-base resize-none border-none focus:outline-none focus:ring-0"
                  />
                </div>

                <div className=" bg-white px-2 py-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeNoteModal}
                    className="px-3 py-2 rounded-lg text-sm bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!canSubmitNote}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      canSubmitNote
                        ? "bg-[#A7E86B] hover:bg-[#93db57] text-gray-900"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isSubmittingNote ? "Adding..." : "Add note"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Add Comment modal ---------- */}
      {commentOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 sm:px-0">
          <div className="absolute inset-0 bg-black/35" />

          <div
            ref={commentModalRef}
            className="relative w-full sm:w-[40%] max-w-xl bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="px-5 sm:px-10 pt-6 sm:pt-10 pb-4">
              <h2 className="text-lg sm:text-2xl font-extrabold tracking-wide text-black">
                ADD COMMENT
              </h2>
            </div>

            <div className="px-5 sm:px-10 pb-6 sm:pb-8">
              <div className="relative bg-white rounded-xl border border-black/10 shadow-sm overflow-hidden">
                <div className="relative p-4 sm:p-6">
                  <FaRegUserCircle className="absolute left-6 top-6 text-2xl text-gray-400" />
                  <textarea
                    ref={commentTextareaRef}
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Write comment here..."
                    className="w-full min-h-[200px] sm:min-h-[330px] pl-12 pr-4 text-gray-700 placeholder-gray-400 text-base resize-none border-none focus:outline-none focus:ring-0"
                  />
                </div>

                <div className=" bg-white px-2 py-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeCommentModal}
                    className="px-3 py-2 rounded-lg text-sm bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!canSubmitComment}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      canSubmitComment
                        ? "bg-[#A7E86B] hover:bg-[#93db57] text-gray-900"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isSubmittingComment ? "Adding..." : "Add comment"}
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