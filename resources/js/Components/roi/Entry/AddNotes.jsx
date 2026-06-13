import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoIosAddCircle } from "react-icons/io";
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

export default function AddNotes({ scopeKey = "default" }) {
  const { projectData } = useProjectData();
  const page = usePage();

  const {
    auth,
    entryProject,
    project: inertiaProject,
    projectNotes,
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

  const isCurrentRoute = pageRoute === "current";
  const isArchiveRoute = pageRoute === "archive";
  const isEntryRoute = !isCurrentRoute && !isArchiveRoute;

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

// 👇 Define the entry owner check here
const isEntryOwner = 
  !!userId && 
  !!project?.created_by && 
  Number(project.created_by) === Number(userId);

const canNote = isCurrentRoute
  ? (isAssignedReviewer || isAssignedChecker || isAssignedEndorser)
  : (isEntryOwner || isAssignedReviewer || isAssignedChecker || isAssignedEndorser);

  const isPrintPreview =
  projectData?.metadata?.isPrintPreview === true ||
  projectData?.metadata?.readOnly === true;

  const isLocked = !projectId || !canNote || isArchiveRoute || isPrintPreview;

  const DRAFT_KEY = useMemo(() => {
    return projectId ? `roi-note-draft:${userId}:${projectId}:${scopeKey}` : null;
  }, [userId, projectId, scopeKey]);

  const [open, setOpen] = useState(false);
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
      if (typeof raw === "string") setNoteDraft(raw);
    } catch {}
  }, [DRAFT_KEY]);

  useEffect(() => {
    if (!DRAFT_KEY) return;
    try {
      localStorage.setItem(DRAFT_KEY, noteDraft);
    } catch {}
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

  const canSubmit = noteDraft.trim().length > 0 && !!projectId && canNote && !isArchiveRoute;

  const handleAddNote = () => {
    if (!canSubmit) return;

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
          if (DRAFT_KEY) {
            try {
              localStorage.removeItem(DRAFT_KEY);
            } catch {}
          }

          router.reload({
            only: ["entryProject", "project", "projectNotes"],
          });

          closeModal();
        },
        onError: (errs) => {
          console.error(errs);
          alert("Failed to add note. Check console/logs.");
        },
      }
    );
  };

  return (
    <>
      <div className="w-full mb-6 px-4">

        <div
          onClick={!isLocked ? openModal : undefined}
          className={`flex items-center print:hidden border border-gray-200 rounded-xl py-3 px-6 shadow-[0px_2px_10px_rgba(0,0,0,0.10)] ${
            !isLocked
              ? "bg-white hover:cursor-pointer"
              : "bg-gray-50 cursor-not-allowed opacity-70"
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

        {!projectId && (
          <div className="my-2 pl-2 text-[10px] italic font-medium text-red-600 print:hidden tracking-wider">
            Note: Save the project as a draft first before adding notes.
          </div>
        )}

        {serverNotes.length > 0 && (
          <div className="mt-2 print:mt-1">
            <span className="text-[11px] text-gray-400 pl-2">NOTES</span>

            {serverNotes.map((n, idx) => (
              <div
                key={n.id ?? `${n.created_at ?? "note"}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 my-[3px] print:py-3 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
              >
                <div className="flex h-4 items-center justify-between">
                  <div className="items-start flex gap-2">
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
                <p className="mt-3 print:mt-1 text-gray-900 text-xs leading-relaxed">{n.body}</p>
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
                ADD NOTE
              </h2>
            </div>

            <div className="px-10 pb-8">
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