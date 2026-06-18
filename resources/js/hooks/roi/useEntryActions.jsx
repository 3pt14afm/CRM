import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useProjectData } from '@/Context/ProjectContext';
import { route as ziggyRoute } from 'ziggy-js';
import { toast } from 'sonner';
import { IoAlertCircle } from 'react-icons/io5';

/**
 * Handles draft save, submit, and clear actions for the entry author.
 *
 * @param {{
 *   entryProject: object|null,
 *   setTab: Function,
 *   setShowCompanyInfoErrors: Function,
 *   setShowOutrightErrors: Function,
 *   setResetKey: Function,
 *   isCompanyInfoValid: Function,
 *   validateBusinessLogic: Function,
 *   validateEntryRemarks: Function,
 *   buildPayload: Function,
 *   buildFormDataPayload: Function,
 * }} params
 * @returns {{
 *   buttonClicked: boolean,
 *   handleSaveDraft: Function,
 *   handleSubmit: Function,
 *   handleClearAll: Function,
 * }}
 */
export function useEntryActions({
  entryProject,
  setTab,
  setShowCompanyInfoErrors,
  setShowOutrightErrors,
  setResetKey,
  isCompanyInfoValid,
  validateBusinessLogic,
  validateEntryRemarks,
  buildPayload,
  buildFormDataPayload,
}) {
  const { projectData, resetProject, saveDraft } = useProjectData();

  const [buttonClicked, setButtonClicked] = useState(false);

  const triggerBlink = () => {
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 100);
  };

  const handleSaveDraft = () => {
    setShowCompanyInfoErrors(true);

    // 1. Validate Required Company/Project Fields
    if (!isCompanyInfoValid()) {
      toast.error("Please fill in all required project fields.");
      setTab("Machine");
      return;
    }

    // 2. STRICT Business Logic Gate (Unit Cost, Yields, Selling Price)
    if (!validateBusinessLogic()) {
      return;
    }

    // 3. Threshold Remarks & Attachments check
    if (!validateEntryRemarks()) {
      return;
    }

    const payload = buildPayload();
    saveDraft(payload);
    const formData = buildFormDataPayload();

    router.post(ziggyRoute("roi.entry.draft.save"), formData, {
      preserveScroll: true,
      forceFormData: true,
      onStart: () => toast.loading("Saving Draft...", { id: "saveDraft" }),
      onSuccess: () => {
        triggerBlink();
        toast.success("Draft saved!", { id: "saveDraft" });
        setShowCompanyInfoErrors(false);
        setShowOutrightErrors(false);
      },
      onError: (errors) => {
        const message = Object.values(errors ?? {})[0] || "Failed to save draft.";
        toast.error(message, { id: "saveDraft" });
      },
    });
  };

  const handleSubmit = () => {
    const projectId = entryProject?.id ?? projectData?.metadata?.projectId;

    if (!projectId) {
      toast((t) => (
        <div className="flex items-center gap-2 text-sm">
          <IoAlertCircle className="text-red-500 text-lg shrink-0" />
          <span>Please <b>Save Draft</b> first before submitting.</span>
        </div>
      ), { duration: 2000 });
      return;
    }

    // Machine configuration check
    const machines = projectData?.machineConfiguration?.machine || [];
    const consumables = projectData?.machineConfiguration?.consumable || [];

    if (machines.length === 0 && consumables.length === 0) {
      toast.error("At least one machine or consumable is required before submitting.");
      setTab("Machine");
      return;
    }

    if (machines.length === 0) {
      toast.error("At least one machine is required before submitting.");
      setTab("Machine");
      return;
    }

    // 1. STRICT Business Logic Gate
    if (!validateBusinessLogic()) {
      return;
    }

    // 2. Entry Remarks validation
    if (!validateEntryRemarks()) {
      return;
    }

    const formData = buildFormDataPayload();
    formData.append("_method", "patch");

    // Force the query parameter explicitly into the destination URI
    const submissionUrl = `${ziggyRoute("roi.entry.projects.submit", projectId)}?_method=PATCH`;

    router.post(submissionUrl, formData, {
      preserveScroll: true,
      forceFormData: true,
      onStart: () => toast.loading("Submitting project...", { id: "submitProject" }),
      onSuccess: () => {
        toast.success("Project submitted successfully!", { id: "submitProject" });
        setShowOutrightErrors(false);
      },
      onError: (errors) => {
        const message = Object.values(errors)[0] || "Failed to submit.";
        toast.error(message, { id: "submitProject" });
      },
    });
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all data? This will wipe your draft.")) {
      setShowCompanyInfoErrors(false);
      resetProject();
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