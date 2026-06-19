import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoIosAddCircle } from "react-icons/io";
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
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(d);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  return `${datePart} ${timePart}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * SprfAddNotes
 *
 * Handles Notes for the SPRF pipeline (levels 1 and 2 only).
 *
 * Authorization matrix:
 *   • Entry context  (route === "entry")  →  preparer only, project must be at level 1
 *   • Current context (route === "current") →  DCE only (director_customer_engagement),
 *                                              project must be at level 2
 *   • Archive context (route === "archive") →  always locked, no notes allowed
 *
 * Props from Inertia page (via usePage):
 *   • initialProject  – set by SprfEntryProjectController::show()
 *   • project         – set by SprfCurrentProjectController::show()
 *   • approverUsers   – { directorCustomerEngagement: { id, name, ... }, ... }
 *   • route           – "entry" | "current" | "archive"
 *   • auth            – { user: { id } }
 */
export default function SprfAddNotes({ scopeKey = "default" }) {
  const { projectData } = useProjectData();
  const page = usePage();

  const {
    auth,
    initialProject,
    project: inertiaProject,
    approverUsers,
    route: pageRoute,
  } = page.props;

  // ── Context flags ──────────────────────────────────────────────────────────
  const isCurrentRoute = pageRoute === "current";
  const isArchiveRoute = pageRoute === "archive";
  const isEntryRoute   = !isCurrentRoute && !isArchiveRoute;

  // Entry controller passes `initialProject`; current controller passes `project`
  const project = initialProject ?? inertiaProject ?? null;

  const projectId   = project?.id ?? projectData?.metadata?.projectId ?? null;
  const userId      = auth?.user?.id ?? auth?.id ?? null;
  const currentLevel = project?.current_level ?? null;

  // ── Authorization ──────────────────────────────────────────────────────────
  //
  // Entry: the person who created the draft (prepared_by_user_id) can add a
  // note only while the project is still at level 1 (not yet submitted).
  const isAssignedPreparer =
    isEntryRoute &&
    !!userId &&
    !!project?.prepared_by_user_id &&
    Number(project.prepared_by_user_id) === Number(userId) &&
    Number(currentLevel) === 1;

  // Current / level 2: the Director – Customer Engagement can add a note.
  // Their ID comes from the `approverUsers` prop (not embedded in the
  // project transform), which is always passed alongside the project.
  const isAssignedDce =
    isCurrentRoute &&
    !!userId &&
    !!approverUsers?.directorCustomerEngagement?.id &&
    Number(approverUsers.directorCustomerEngagement.id) === Number(userId) &&
    Number(currentLevel) === 2;

  const canNote = isAssignedPreparer || isAssignedDce;

  const isPrintPreview =
    projectData?.metadata?.isPrintPreview === true ||
    projectData?.metadata?.readOnly === true;

  const isLocked = !projectId || !canNote || isArchiveRoute || isPrintPreview;

  // ── Draft persistence ──────────────────────────────────────────────────────
  const DRAFT_KEY = useMemo(() => {
    return projectId
      ? `sprf-note-draft:${userId}:${projectId}:${scopeKey}`
      : null;
  }, [userId, projectId, scopeKey]);

  const [open, setOpen]           = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // ── Existing notes ─────────────────────────────────────────────────────────
  //
  // Both controllers pass notes on the project object.
  // SprfEntryProjectController::transformProjectForFrontend() must include
  // `'notes' => $project->notes ?? []` for this to populate in entry context.
  const serverNotes = useMemo(() => {
    const fromProject = project?.notes;
    const rows = Array.isArray(fromProject) && fromProject.length > 0 ? fromProject : [];

    return [...rows].sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [project]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const modalRef    = useRef(null);
  const textareaRef = useRef(null);

  const openModal  = () => { if (!isLocked) setOpen(true); };
  const closeModal = () => setOpen(false);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!DRAFT_KEY) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (typeof raw === "string") setNoteDraft(raw);
    } catch {}
  }, [DRAFT_KEY]);

  useEffect(() => {
    if (!DRAFT_KEY) return;
    try { localStorage.setItem(DRAFT_KEY, noteDraft); } catch {}
  }, [DRAFT_KEY, noteDraft]);

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
  const canSubmit = noteDraft.trim().length > 0 && !!projectId && canNote && !isArchiveRoute;

  const handleAddNote = () => {
    if (!canSubmit) return;

    // Entry notes go to SprfEntryProjectController::storeNote()
    // Current notes go to SprfCurrentProjectController::storeNote()
    const noteRoute = isCurrentRoute
      ? route("sprf.current.notes.store", projectId)
      : route("sprf.entry.projects.notes.store", projectId);

    router.post(
      noteRoute,
      { body: noteDraft.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          setNoteDraft("");
          if (DRAFT_KEY) {
            try { localStorage.removeItem(DRAFT_KEY); } catch {}
          }
          // Reload whichever prop the current context passes the project on
          router.reload({ only: ["initialProject", "project"] });
          closeModal();
        },
        onError: (errs) => {
          const msg = errs?.body ?? errs?.message ?? "Failed to add note.";
          toast.error(msg);
        },
      }
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full mb-6">

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
            Write your notes here...
          </div>

          <button
            type="button"
            onClick={!isLocked ? openModal : (e) => e.stopPropagation()}
            disabled={isLocked}
            className={`flex items-center rounded-full font-semibold text-xs transition-all shrink-0 ${
              !isLocked
                ? "text-[#2DA300] hover:text-[#268a00]  shadow-[0px_4px_10px_rgba(45,163,0,0.3)]"
                : "text-gray-500 cursor-not-allowed"
            }`}
          >
            <span className="flex items-center h-5 w-5 justify-center">
              <IoIosAddCircle size={22} />
            </span>
          </button>
        </div>

        {/* Hint when project has not been saved yet */}
        {!projectId && (
          <div className="my-2 pl-2 text-[10px] italic font-medium text-red-600 print:hidden tracking-wider">
            Note: Save the project as a draft first before adding notes.
          </div>
        )}

        {/* Existing notes list */}
        {serverNotes.length > 0 && (
          <div className="mt-2 print:mt-1">
            <span className="text-[11px] text-gray-400 pl-2">NOTES</span>

            {serverNotes.map((n, idx) => (
              <div
                key={n.id ?? `${n.created_at ?? "note"}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 my-[3px] print:py-3 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
              >
                <div className="flex h-4 items-center justify-between">
                  <div className="items-start flex gap-1 xl:gap-2">
                    <div className="flex items-center">
                      <FaRegUserCircle className="text-gray-400 text-sm shrink-0" />
                    </div>
                    <span className="block text-[11px] font-medium text-gray-900">
                      {n.author?.name ?? "Unknown"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 italic whitespace-nowrap">
                    {formatDateTime(n.created_at)}
                  </div>
                </div>
                <p className="mt-2 print:mt-1 text-gray-900 text-xs leading-relaxed">
                  {n.body}
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
            className="relative w-[50%] xl:w-[40%] max-w-xl bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden"
          >
            <div className="px-6 lg:px-8 xl:px-10 pt-6 lg:pt-8 xl:pt-10 pb-4">
              <h2 className="text-2xl font-extrabold tracking-wide text-black">
                ADD NOTE
              </h2>
            </div>

            <div className="px-6 lg:px-8 xl:px-10 pb-8">
              <div className="relative bg-white rounded-xl border border-black/10 shadow-sm overflow-hidden">
                <div className="relative p-4">
                  <FaRegUserCircle className="absolute left-6 top-6 text-2xl text-gray-400" />
                  <textarea
                    ref={textareaRef}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Write note here..."
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
                    onClick={handleAddNote}
                    disabled={!canSubmit}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      canSubmit
                        ? "bg-[#A7E86B] hover:bg-[#93db57] text-gray-900"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Add note
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