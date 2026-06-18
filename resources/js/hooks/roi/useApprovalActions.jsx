import { useState } from 'react';
import { router } from '@inertiajs/react';
import { route as ziggyRoute } from 'ziggy-js';
import { toast } from 'sonner';

/**
 * Handles all approver-level workflow actions:
 * reject, send-back, advance, and approve.
 * Also owns the send-back modal state.
 *
 * @param {{
 *   entryProject: object|null,
 *   sendBackType: 'comment' | 'note',
 * }} params
 * @returns {{
 *   showSendBackModal: boolean,
 *   setShowSendBackModal: Function,
 *   sendBackText: string,
 *   setSendBackText: Function,
 *   handleReject: Function,
 *   handleBackToSender: Function,
 *   submitSendBack: Function,
 *   handleAdvance: Function,
 *   handleApprove: Function,
 * }}
 */
export function useApprovalActions({ entryProject, sendBackType }) {
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [sendBackText, setSendBackText] = useState("");

  const handleReject = () => {
    toast.custom((t) => (
      <div className="flex items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xl w-[500px] outline-none ring-0">
        {/* Icon + Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Reject this project?</p>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(t)}
            className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t);
              router.post(ziggyRoute('roi.current.reject', entryProject.id), {}, {
                onStart: () => toast.loading('Rejecting...', { id: 'reject-process' }),
                onSuccess: () => toast.success('Project rejected.', { id: 'reject-process' }),
                onError: () => toast.error('Failed to reject.', { id: 'reject-process' }),
              });
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-95 transition"
          >
            Yes, Reject
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const handleBackToSender = () => {
    setSendBackText("");
    setShowSendBackModal(true);
  };

  const submitSendBack = () => {
    const trimmed = sendBackText.trim();
    const processId = 'sendback-process';

    if (!trimmed) {
      toast.error(
        sendBackType === 'comment'
          ? 'Comment is required before sending back.'
          : 'Note is required before sending back.'
      );
      return;
    }

    router.patch(
      ziggyRoute('roi.current.send-back', entryProject.id),
      {
        body: trimmed,
        type: sendBackType,
      },
      {
        preserveScroll: true,
        onStart: () => toast.loading('Sending back...', { id: processId }),
        onSuccess: () => {
          setSendBackText("");
          toast.success('Project sent back to sender.', { id: processId });
        },
        onError: (errors) => {
          setShowSendBackModal(true);
          const message =
            Object.values(errors ?? {})[0] ||
            `Failed to send back. ${sendBackType === 'comment' ? 'Comment' : 'Note'} is required.`;
          toast.error(message, { id: processId });
        },
      }
    );
  };

  const handleAdvance = (projectId) => {
    if (!projectId) {
      toast.error("Invalid Project ID");
      return;
    }

    toast.custom((t) => (
      <div className="flex items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xl w-[500px] outline-none ring-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="18" fill="#dcfce7"/>
              <path d="M11 18 L25 18 M19 12 L25 18 L19 24"
                stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Advance this project?</p>
            <p className="text-xs text-gray-500 mt-0.5">This will submit it to the next level.</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(t)}
            className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t);
              const processId = `advance-${projectId}`;
              router.post(ziggyRoute('roi.current.advance', projectId), {}, {
                preserveScroll: true,
                onStart: () => toast.loading("Submitting to next level...", { id: processId }),
                onSuccess: () => toast.success("Project advanced successfully!", { id: processId }),
                onError: (errors) => {
                  const message = Object.values(errors)[0] || "Failed to advance project.";
                  toast.error(message, { id: processId });
                },
              });
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-95 transition"
          >
            Yes, Advance
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center', unstyled: true });
  };

  const handleApprove = (projectId) => {
    if (!projectId) {
      toast.error("Invalid Project ID");
      return;
    }

    if (confirm("Approve this project? This will move it to Archive.")) {
      const processId = `approve-${projectId}`;
      toast.loading("Approving...", { id: processId });

      router.post(ziggyRoute('roi.current.approve', projectId), {}, {
        preserveScroll: true,
        onSuccess: () => toast.success("Project approved.", { id: processId }),
        onError: (errors) => {
          const message = Object.values(errors)[0] || "Failed to approve project.";
          toast.error(message, { id: processId });
        },
      });
    }
  };

  return {
    showSendBackModal,
    setShowSendBackModal,
    sendBackText,
    setSendBackText,
    handleReject,
    handleBackToSender,
    submitSendBack,
    handleAdvance,
    handleApprove,
  };
}