import { useProjectData } from '@/Context/ProjectContext';
import { route as ziggyRoute } from 'ziggy-js';
import { toast } from 'sonner';
import { IoAlertCircle } from 'react-icons/io5';

/**
 * Handles building print signatories and opening the print preview/print page
 * in a new tab, with an optional session-storage snapshot of current project data.
 *
 * @param {{
 *   tab: string,
 *   entryProject: object|null,
 *   routeName: string,
 *   projectRef: string,
 *   createdBy: string|null,
 *   showDraftWatermark: boolean,
 * }} params
 * @returns {{ openPrintPage: Function }}
 */
export function usePrintPage({
  tab,
  entryProject,
  routeName,
  projectRef,
  createdBy,
  showDraftWatermark,
}) {
  const { projectData } = useProjectData();

  const buildSignatoriesForPrint = (preparedByName) => ({
    preparedBy: preparedByName ?? entryProject?.user?.name ?? null,
    reviewedBy: entryProject?.reviewed_by ?? null,
    checkedBy: entryProject?.checked_by ?? null,
    endorsedBy: entryProject?.endorsed_by ?? null,
    confirmedBy: entryProject?.confirmed_by ?? null,
    approvedBy: entryProject?.approved_by_name ?? entryProject?.approved_by ?? null,
  });

  const openPrintPage = (autoPrint = false) => {
    if (!(tab === "Summary" || tab === "Succeeding")) return;

    const projectId = entryProject?.id ?? projectData?.metadata?.projectId;

    if (!projectId) {
      toast((t) => (
        <div className="flex items-center gap-2 rounded-md text-sm">
          <IoAlertCircle className="text-red-500 text-lg shrink-0" />
          <span>
            Please <b className="text-darkgreen/70">Save Draft</b> first before printing.
          </span>
        </div>
      ), { duration: 1500 });

      return;
    }

    const tabParam = tab === "Succeeding" ? "succeeding" : "summary";
    let storageKey = null;

    try {
      storageKey = `roi-print:${projectRef}:${Date.now()}`;

      const snapshot = {
        ...projectData,
        metadata: {
          ...(projectData?.metadata ?? {}),
          signatories: buildSignatoriesForPrint(createdBy),
        },
        projectNotes: entryProject?.notes ?? projectData?.projectNotes ?? [],
        projectComments: entryProject?.comments ?? projectData?.projectComments ?? [],
      };

      sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch (e) {
      console.warn("Print snapshot too large; continuing without sessionStorage snapshot.", e);
      storageKey = null;
    }

    let printPath = "";

    if (routeName === "current") {
      printPath = ziggyRoute("roi.current.print", projectId);
    } else if (routeName === "archive") {
      printPath = ziggyRoute("roi.archive.print", projectId);
    } else {
      printPath = ziggyRoute("roi.entry.projects.print", projectId);
    }

    const params = new URLSearchParams();
    params.set("tab", tabParam);
    params.set("autoprint", autoPrint ? "1" : "0");
    params.set("draftWatermark", showDraftWatermark ? "1" : "0");

    if (storageKey) params.set("storageKey", storageKey);

    const href = `${printPath}?${params.toString()}`;

    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return { openPrintPage };
}