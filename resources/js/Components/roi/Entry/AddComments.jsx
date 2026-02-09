import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { FaRegUserCircle } from "react-icons/fa";
import { usePage } from "@inertiajs/react";

function formatDateTime(date) {
  const d = new Date(date);

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
  const { auth } = usePage().props;
  const userId = auth?.user?.id ?? "guest";
  const userName = useMemo(() => auth?.user?.name ?? "John Doe", [auth]);

  // ✅ Stable + scoped storage key (prevents Summary and Succeeding sharing the same data)
  const STORAGE_KEY = useMemo(() => {
    return `roi-comments:${userId}:${scopeKey}`;
  }, [userId, scopeKey]);

  const [open, setOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState([]);

  const modalRef = useRef(null);
  const textareaRef = useRef(null);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  // ✅ Load saved on mount / when key changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setComments([]);
        setCommentDraft("");
        return;
      }

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed?.comments)) setComments(parsed.comments);
      else setComments([]);

      if (typeof parsed?.draft === "string") setCommentDraft(parsed.draft);
      else setCommentDraft("");
    } catch (e) {
      setComments([]);
      setCommentDraft("");
    }
  }, [STORAGE_KEY]);

  // ✅ Save whenever comments/draft changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          comments,
          draft: commentDraft,
        })
      );
    } catch (e) {
      // ignore storage failures (quota, etc)
    }
  }, [comments, commentDraft, STORAGE_KEY]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 0);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const canSubmit = commentDraft.trim().length > 0;

  const handleAddComment = () => {
    if (!canSubmit) return;

    const newComment = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      author: userName,
      createdAt: new Date().toISOString(),
      body: commentDraft.trim(),
    };

    setComments((prev) => [newComment, ...prev]);

    // ✅ Clear draft ONLY after successful add
    setCommentDraft("");

    closeModal();
  };

  return (
    <>
      {/* Trigger + Comments list wrapper */}
      <div className="w-[70%] mx-auto mb-6 px-4">
        {/* Trigger row (NO typing here — just opens modal) */}
        <div
          onClick={openModal}
          className="flex items-center hover:cursor-pointer bg-white border border-gray-200 rounded-2xl py-5 px-6 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
        >
          <div className="flex-grow text-gray-400 text-sm">
            Write your comments here.....
          </div>

          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-2 bg-[#2DA300] hover:bg-[#268a00] text-white px-5 py-3 rounded-full font-semibold text-xs transition-all shadow-[0px_4px_10px_rgba(45,163,0,0.3)] shrink-0"
          >
            <span className="flex items-center justify-center w-3.5 h-3.5 text-[30px] leading-none">
              <IoMdSend />
            </span>
            Add Comments
          </button>
        </div>

        {/* Comments list (below trigger) */}
        <div className="mt-6 space-y-5">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-[0px_2px_10px_rgba(0,0,0,0.10)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FaRegUserCircle className="text-2xl text-gray-400" />
                  <span className="font-semibold text-gray-900">{c.author}</span>
                </div>

                <div className="text-xs text-gray-500 italic whitespace-nowrap">
                  {formatDateTime(c.createdAt)}
                </div>
              </div>

              <p className="mt-3 text-gray-900 text-sm leading-relaxed">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/35" />

          {/* Modal Card */}
          <div
            ref={modalRef}
            className="relative w-[92%] max-w-5xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden"
          >
            <div className="px-10 pt-10 pb-4">
              <h2 className="text-3xl font-extrabold tracking-wide text-black">
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
                    onClick={handleAddComment}
                    disabled={!canSubmit}
                    className={`px-5 py-2 rounded-lg font-semibold ${
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
