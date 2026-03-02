import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoIosAddCircle } from "react-icons/io";
import { FaRegUserCircle } from "react-icons/fa";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";

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

export default function AddNotes({ scopeKey = "default" }) {
  const { auth, entryProject, projectNotes } = usePage().props;
  const project = entryProject;

  // ── derived identifiers ────────────────────────────────────────────────────
  const projectId  = project?.id;
  const userId     = auth?.user?.id ?? "guest";
  const role       = auth?.user?.role;
  const isPreparer = role === 'preparer';

  // ── lock logic ─────────────────────────────────────────────────────────────
  const isSubmitted    = project?.status === 'submitted';
  const isForReview    = project?.status === 'For Review';
  const isReturned     = project?.status === 'returned';
  const isStatusLocked = isSubmitted || isForReview;

  // input is only usable by preparers when status is not locked
  const isLocked = !projectId || !isPreparer || isStatusLocked;

  // ── draft key ──────────────────────────────────────────────────────────────
  const DRAFT_KEY = useMemo(() => {
    return projectId ? `roi-note-draft:${userId}:${projectId}:${scopeKey}` : null;
  }, [userId, projectId, scopeKey]);

  const [open, setOpen]           = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // ── notes: prefer project.notes if non-empty, else fall back to projectNotes prop ──
  const serverNotes = useMemo(() => {
    const fromProject = project?.notes;
    const rows = (Array.isArray(fromProject) && fromProject.length > 0)
      ? fromProject
      : (projectNotes ?? []);
    return Array.isArray(rows) ? rows : [];
  }, [project, projectNotes]);

  const modalRef    = useRef(null);
  const textareaRef = useRef(null);

  const openModal  = () => { if (!isLocked) setOpen(true); };
  const closeModal = () => setOpen(false);

  // ── persist draft ──────────────────────────────────────────────────────────
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

  // ── modal UX ───────────────────────────────────────────────────────────────
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

  // ── submit ─────────────────────────────────────────────────────────────────
  const canSubmit = noteDraft.trim().length > 0 && !!projectId && !isLocked;

  const handleAddNote = () => {
    if (!canSubmit) return;

    router.post(
      route("roi.entry.projects.notes.store", projectId),
      { body: noteDraft.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          setNoteDraft("");
          if (DRAFT_KEY) { try { localStorage.removeItem(DRAFT_KEY); } catch {} }
          router.reload({ only: ["entryProject", "projectNotes"] });
          closeModal();
        },
        onError: (errs) => {
          console.error(errs);
          alert("Failed to add note. Check console/logs.");
        },
      }
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full mb-6 px-4">

        {/* Warning: no project saved yet — only relevant to preparers */}
        {!projectId && isPreparer && (
          <div className="mb-2 pl-2 text-[12px] font-bold text-red-600 print:hidden uppercase tracking-wider">
            Note: Save the project as a draft first before adding notes.
          </div>
        )}

     
        {/* Input bar — only shown to preparers when status is not locked */}
        { !isStatusLocked && (
          <div
            onClick={!isLocked ? openModal : undefined}
            className={`flex items-center print:hidden border border-gray-200 rounded-xl py-3 px-6 shadow-[0px_2px_10px_rgba(0,0,0,0.10)] ${
              !isLocked ? "bg-white hover:cursor-pointer" : "bg-gray-50 cursor-not-allowed opacity-70"
            }`}
          >
            <div className="flex-grow text-gray-400 text-xs print:text-[10px]">
              Write your notes here.....
            </div>

            <button
              type="button"
              onClick={!isLocked ? openModal : (e) => e.stopPropagation()}
              disabled={isLocked}
              className={`flex items-center gap-1 px-3 py-2 rounded-full font-semibold text-xs transition-all shrink-0 ${
                !isLocked
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
        )}

        {/* Notes list — hidden if empty, visible to ALL roles */}
        {serverNotes.length > 0 && (
          <div className="mt-2 print:mt-1">
            <span className="font-medium text-[11px] text-gray-400 pl-2">NOTES</span>

            {serverNotes.map((n, idx) => (
              <div
                key={n.id ?? `${n.created_at ?? "note"}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl px-6 py-5 my-2 print:py-3 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <FaRegUserCircle className="text-lg text-gray-400" />
                    <span className="font-semibold text-sm text-gray-900">
                      {n.author?.name ?? "Unknown"}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 italic whitespace-nowrap">
                    {formatDateTime(n.created_at)}
                  </div>
                </div>
                <p className="mt-3 text-gray-900 text-xs leading-relaxed">{n.body}</p>
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
            className="relative w-[92%] max-w-5xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden"
          >
            <div className="px-10 pt-10 pb-4">
              <h2 className="text-3xl font-extrabold tracking-wide text-black">
                ADD NOTE
              </h2>
            </div>

            <div className="px-10 pb-8">
              <div className="relative bg-white rounded-xl border border-black/10 shadow-sm overflow-hidden">
                <div className="relative p-6">
                  <FaRegUserCircle className="absolute left-6 top-6 text-2xl text-gray-400" />
                  <textarea
                    ref={textareaRef}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Write note here..."
                    className="w-full min-h-[330px] pl-12 pr-4 text-gray-700 placeholder-gray-400 text-base resize-none border-none focus:outline-none focus:ring-0"
                  />
                </div>

                <div className="border-t border-black/10 bg-white px-6 py-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!canSubmit}
                    className={`px-5 py-2 rounded-lg font-semibold ${
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