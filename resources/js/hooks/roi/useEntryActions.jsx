import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useProjectData } from '@/Context/ProjectContext';
import { route as ziggyRoute } from 'ziggy-js';
import { toast } from 'sonner';
import { IoAlertCircle } from 'react-icons/io5';

// Import the helpers from EntryRemarks
import { 
  getAttachmentFileObject, 
  clearAttachmentFileStore 
} from '@/Components/roi/Entry/EntryRemarks';

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

  /**
   * Helper: Re-injects real File objects into FormData.
   * buildFormDataPayload only sees serialized state, where File objects 
   * have become {}. This step removes the ghosts and appends the real Files.
   */
  /**
   * Helper: Re-injects real File objects into FormData.
   * Strips empty {} file objects from JSON strings so backend validation passes.
   */
  /**
   * Helper: Re-injects real File objects into FormData.
   */
  const fixAttachmentsInFormData = (formData) => {
    const currentAttachments = projectData?.entryRemarks?.attachments || [];
    
    // 1. Clean up any JSON string payload (if buildFormDataPayload stringifies the data)
    const formDataEntries = Array.from(formData.entries());
    for (const [key, value] of formDataEntries) {
      if (typeof value === 'string' && value.includes('"file":{}')) {
        try {
          const parsed = JSON.parse(value);
          // Deep clean function to remove 'file: {}'
          const cleanObject = (obj) => {
            if (Array.isArray(obj)) return obj.map(cleanObject);
            if (obj && typeof obj === 'object') {
              const newObj = {};
              for (const k in obj) {
                // Skip the broken file object
                if (k === 'file' && obj[k] && Object.keys(obj[k]).length === 0) continue;
                newObj[k] = cleanObject(obj[k]);
              }
              return newObj;
            }
            return obj;
          };
          formData.set(key, JSON.stringify(cleanObject(parsed)));
        } catch (e) {}
      }
    }

    // 2. Remove ghost files appended as multipart
    formData.delete('attachments[]');
    formData.delete('entryRemarks[attachments][]');
    formData.delete('entryRemarks[attachments][0][file]');
    
    // 3. Append real files with multiple possible keys to ensure backend validation passes
    currentAttachments.forEach((att, index) => {
      const file = getAttachmentFileObject(att);
      if (file) {
        // Append under every possible key format Laravel might expect
        formData.append(`attachments[]`, file);
        formData.append(`attachments[${index}]`, file);
        formData.append(`entryRemarks[attachments][${index}][file]`, file);
      }
    });

    return formData;
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
    
    let formData = buildFormDataPayload();
    
    // --- FIX: Inject real File objects before sending ---
    formData = fixAttachmentsInFormData(formData);

    router.post(ziggyRoute("roi.entry.draft.save"), formData, {
      preserveScroll: true,
      forceFormData: true,
      onStart: () => toast.loading("Saving Draft...", { id: "saveDraft" }),
      onSuccess: () => {
        clearAttachmentFileStore(); // Free memory
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

    let formData = buildFormDataPayload();
    formData.append("_method", "patch");

    // --- FIX: Inject real File objects before sending ---
    formData = fixAttachmentsInFormData(formData);

    // Force the query parameter explicitly into the destination URI
    const submissionUrl = `${ziggyRoute("roi.entry.projects.submit", projectId)}?_method=PATCH`;

    router.post(submissionUrl, formData, {
      preserveScroll: true,
      forceFormData: true,
      onStart: () => toast.loading("Submitting project...", { id: "submitProject" }),
      onSuccess: () => {
        clearAttachmentFileStore(); // Free memory
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
      clearAttachmentFileStore(); // Prevent memory leaks from abandoned Files
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