import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import {toast} from 'sonner';
import { IoEyeOutline } from 'react-icons/io5';
import { FaTrophy, FaRegFileArchive } from 'react-icons/fa';
import { route as ziggyRoute } from "ziggy-js";

function ProposalActionsDropdown({ row, activeTab, onStatusChanged }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const handleView = () => {
    setOpen(false);
    router.visit(ziggyRoute("proposals.show", { id: row.id, type: activeTab }));
  };

  const confirmStatusChange = (status) => {
    setOpen(false);

    const labels = {
      awarded: { title: "Mark as Awarded?", desc: "This proposal will move to your Archived list.", cta: "Yes, Mark Awarded", color: "green" },
      closed:  { title: "Close this proposal?", desc: "This proposal will move to your Archived list.", cta: "Yes, Close", color: "slate" },
    }[status];

    toast.custom((t) => (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-xl w-[calc(100vw-2rem)] max-w-[500px] sm:w-[500px] outline-none ring-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#E9F7E7] shrink-0">
            {status === 'awarded'
              ? <FaTrophy className="text-[#289800] text-[16px]" />
              : <FaRegFileArchive className="text-slate-500 text-[16px]" />}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{labels.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{labels.desc}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end w-full sm:w-auto">
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t);
              setTimeout(() => {
                const processId = `status-${row.proposal_id}`;
                router.patch(ziggyRoute("proposals.status", row.proposal_id), { status }, {
                  preserveScroll: true,
                  preserveState: true,
                  onStart:   () => toast.loading(status === 'awarded' ? "Marking as awarded..." : "Closing proposal...", { id: processId }),
                  onSuccess: () => {
                    toast.success(`Proposal marked as ${status}.`, { id: processId });
                    onStatusChanged?.();
                  },
                  onError:   (errors) => {
                    const message = Object.values(errors)[0] || "Failed to update status.";
                    toast.error(message, { id: processId });
                  },
                });
              }, 50);
            }}
            className={`flex-1 sm:flex-none text-white px-4 py-2 text-sm font-medium rounded-lg ${
              status === 'awarded' ? "bg-[#289800] hover:bg-[#238a00]" : "bg-slate-600 hover:bg-slate-500"
            }`}
          >
            {labels.cta}
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: "top-center" });
  };

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 150;
      let left = rect.right - menuWidth;
      if (left < 8) left = rect.left;

      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: left + window.scrollX,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <div className="relative flex justify-center items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className="px-1.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <span className="flex flex-col gap-[3px] items-center justify-center">
          <span className="w-[3px] h-[3px] rounded-full bg-current" />
          <span className="w-[3px] h-[3px] rounded-full bg-current" />
          <span className="w-[3px] h-[3px] rounded-full bg-current" />
        </span>
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div
            className="fixed z-[9999] flex flex-col gap-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 min-w-[150px]"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#289800] bg-[#B5EBA2]/20 hover:bg-[#B5EBA2]/40 text-xs font-semibold"
              onClick={handleView}
            >
              <IoEyeOutline className="text-[15px]" />
              <span>View</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#289800] bg-[#E9F7E7] hover:bg-[#d5f0d0] text-xs font-semibold"
              onClick={() => confirmStatusChange('awarded')}
            >
              <FaTrophy className="text-[13px]" />
              <span>Awarded</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
              onClick={() => confirmStatusChange('closed')}
            >
              <FaRegFileArchive className="text-[13px]" />
              <span>Close</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default ProposalActionsDropdown;