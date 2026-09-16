import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { useGroupProjectData } from '@/Context/GroupProjectContext';
import { route as ziggyRoute } from 'ziggy-js';
import { toast } from 'sonner';
import { clearAttachmentFileStore } from '@/Components/roi/Entry/EntryRemarks';

/**
 * Handles draft save, submit, and clear actions for the group entry author.
 * Group equivalent of useEntryActions.
 *
 * NOTE: route names below (`roi.entry.group.draft.save`, `roi.entry.group.submit`)
 * are placeholders pending confirmation against the actual backend routes.
 */
export function useGroupEntryActions({
  setTab,
  setResetKey,
  validateAllCompanyInfo,
  validateAllEntries,
  buildPayload,
  buildFormDataPayload,
  getCurrentMachineConfig,
}) {
  const { groupData, activeEntryIndex, resetGroup } = useGroupProjectData();
  const [buttonClicked, setButtonClicked] = useState(false);
  const activeToastIdRef = useRef(null);

  useEffect(() => {
    return router.on('invalid', (event) => {
      if (event.detail.response?.status !== 413) return;
      const message = event.detail.response.data?.message
        || "The files you uploaded are too large. Please try again.";
      toast.error(message, { id: activeToastIdRef.current ?? undefined });
      event.preventDefault();
    });
  }, []);

  const triggerBlink = () => {
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 100);
  };

  // The active entry's machineConfiguration in groupData can lag behind
  // live useMachineRows state (same race single-entry's getCurrentMachineConfig
  // guards against) — build the override the same way useEntryActions does.
  const getActiveEntryOverrides = () => {
    const machineConfiguration = getCurrentMachineConfig?.() ?? undefined;
    return machineConfiguration
      ? { entries: { [activeEntryIndex]: { machineConfiguration } } }
      : {};
  };

  const handleSaveDraft = () => {
    if (!validateAllCompanyInfo()) return;

    const overrides = getActiveEntryOverrides();
    const formData = buildFormDataPayload(overrides);

    activeToastIdRef.current = "saveGroupDraft";
    router.post(ziggyRoute("roi.entry.group.draft.save"), formData, {
      preserveScroll: true,
      forceFormData: true,
      onStart: () => toast.loading("Saving Draft...", { id: "saveGroupDraft" }),
      onSuccess: () => {
        triggerBlink();
        toast.success("Draft saved!", { id: "saveGroupDraft" });
      },
      onError: (errors) => {
        const message = Object.values(errors ?? {})[0] || "Failed to save draft.";
        toast.error(message, { id: "saveGroupDraft" });
      },
    });
  };

const handleSubmit = () => {
  if (!groupData?.metadata?.reference) {
    toast.error("Please Save Draft first before submitting.");
    return;
  }

  if (!validateAllEntries()) return;

  const overrides = getActiveEntryOverrides();
  const formData = buildFormDataPayload(overrides);
  formData.append("_method", "patch");

  const submissionUrl = `${ziggyRoute("roi.entry.group.submit", groupData.metadata.reference)}?_method=PATCH`;

  activeToastIdRef.current = "submitGroup";
  router.post(submissionUrl, formData, {
    preserveScroll: true,
    forceFormData: true,
    onStart: () => toast.loading("Submitting group...", { id: "submitGroup" }),
    onSuccess: (page) => {
        const flashError = page?.props?.flash?.error;

        if (flashError) {
            toast.error(flashError, { id: "submitGroup" });
            return;
        }

        clearAttachmentFileStore();
        toast.success("Group submitted successfully!", { id: "submitGroup" });
        },
        onError: (errors) => {
            const message = Object.values(errors ?? {})[0] || "Failed to submit.";
            toast.error(message, { id: "submitGroup" });
        },
  });
};

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all entries? This will wipe your group draft.")) {
      clearAttachmentFileStore();
      resetGroup();
      setResetKey((k) => k + 1);
      setTab('Machine');
    }
  };

  return {
    buttonClicked,
    handleSaveDraft,
    handleSubmit,
    handleClearAll,
  };
}