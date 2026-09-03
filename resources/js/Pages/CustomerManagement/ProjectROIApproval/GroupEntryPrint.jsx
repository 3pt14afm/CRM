import React, { useEffect, useState } from "react";
import PrintLayout from "@/Layouts/PrintLayout";
import OverallSummary from "./EntryRoutes/OverallSummary";
import GroupProjectProvider, { useGroupProjectData } from "@/Context/GroupProjectContext";
import { mapGroupProjectToContext } from "@/utils/roi/mapProjectToContext";

function GroupEntryPrintInner({
  storageKey = null,
  autoprint = false,
  entryProjects = null,
}) {
  const { groupData, hydrateGroup } = useGroupProjectData();
  const [loaded, setLoaded] = useState(false);

  // Server-rendered path: current/archive prints, and entry prints of an
  // already-saved group hit this — same precedence rule as EntryPrint.jsx
  // (server data wins over any snapshot param).
  useEffect(() => {
    if (!entryProjects || entryProjects.length === 0) return;
    try {
      // persist=false — this is a new tab sharing localStorage with the
      // live editor; we must not overwrite the user's in-progress draft.
      hydrateGroup(mapGroupProjectToContext(entryProjects), 0, false);
      setLoaded(true);
    } catch (e) {
      console.error("Group print page: failed to map server entryProjects:", e);
      setLoaded(true);
    }
  }, [entryProjects]);

  // Live-preview path: unsaved edits snapshotted into sessionStorage by
  // usePrintPage's "Overall" branch.
  useEffect(() => {
    if (loaded) return;
    if (entryProjects && entryProjects.length > 0) return;
    try {
      if (!storageKey) {
        setLoaded(true);
        return;
      }
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) {
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw);
      hydrateGroup(parsed, 0, false);
      setLoaded(true);
    } catch (e) {
      console.error("Group print page: failed to load snapshot:", e);
      setLoaded(true);
    }
  }, [storageKey, loaded]);

  useEffect(() => {
    document.documentElement.classList.add("print-mode");
    return () => document.documentElement.classList.remove("print-mode");
  }, []);

  useEffect(() => {
    if (!autoprint || !loaded) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoprint, loaded]);

  const handlePrint = () => window.print();

  const handleClose = () => {
    window.close();
    setTimeout(() => {
      if (!window.closed) window.history.back();
    }, 50);
  };

  const groupStatus = groupData?.metadata?.status ?? "draft";

  const getWatermarkText = (status) => {
    switch (status?.toLowerCase()) {
      case "draft":
        return "DRAFT";
      case "rejected":
        return "DISAPPROVED";
      case "cancelled":
      case "cancel":
        return "CANCELLED";
      default:
        return null;
    }
  };

  const watermark = getWatermarkText(groupStatus);

  return (
    <div className="preview-mode">
      <div className="no-print flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Overall Summary — Print Preview</h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-3xl bg-darkgreen text-white text-sm font-medium"
          >
            Print
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-3xl border border-slate-300 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {loaded && watermark && (
        <div className="print-watermark" aria-hidden="true">
          {watermark}
        </div>
      )}

      <div className="print-root">
        <OverallSummary />
      </div>
    </div>
  );
}

export default function GroupEntryPrint(props) {
  return (
    <GroupProjectProvider>
      <GroupEntryPrintInner {...props} />
    </GroupProjectProvider>
  );
}

GroupEntryPrint.layout = (page) => (
  <PrintLayout showDraftWatermark={page.props.showDraftWatermark}>
    {page}
  </PrintLayout>
);