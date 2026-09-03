import React, { useEffect, useState } from "react";
import PrintLayout from "@/Layouts/PrintLayout";
import Summary1stYear from "./EntryRoutes/Summary1stYear";
import SucceedingYears from "./EntryRoutes/SucceedingYears";
import { useProjectData } from "@/Context/ProjectContext";
import { mapProjectToContext } from "@/utils/roi/mapProjectToContext";

export default function EntryPrint({
  tab = "summary",
  storageKey = null,
  autoprint = false,
  entryProject = null,
  project = null,
  hideSignatories = false,
  showDraftWatermark = false,
}) {
  const { setProjectData, projectData } = useProjectData();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = entryProject || project;
    if (!p) return;

    try {
      const mapped = mapProjectToContext(p);

      let uiMetadata = {};
      if (storageKey) {
        try {
          const raw = sessionStorage.getItem(storageKey);
          if (raw) uiMetadata = JSON.parse(raw)?.metadata ?? {};
        } catch (e) {
          console.warn("Print page: failed to read UI snapshot metadata:", e);
        }
      }

      setProjectData({
        ...mapped,
        metadata: { ...(mapped?.metadata ?? {}), ...uiMetadata },
      });
      setLoaded(true);
    } catch (e) {
      console.error("Print page: failed to map server project:", e);
      setLoaded(true);
    }
  }, [entryProject, project, storageKey, setProjectData]);

  useEffect(() => {
    if (loaded) return;
    if (entryProject || project) return;
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
      setProjectData({
        ...parsed,
        metadata: {
          ...(parsed?.metadata ?? {}),
          isPrintPreview: true,
          readOnly: true,
        },
      });
      setLoaded(true);
    } catch (e) {
      console.error("Print page: failed to load snapshot:", e);
      setLoaded(true);
    }
  }, [storageKey, setProjectData, loaded]);

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

  const projectStatus = projectData?.metadata?.status ?? "draft";

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

  const watermark = getWatermarkText(projectStatus);

  const title =
    tab === "succeeding"
      ? "Succeeding Years — Print Preview"
      : "Summary / 1st Year — Print Preview";

  return (
    <PrintLayout showDraftWatermark={showDraftWatermark}>
      <div className="preview-mode">
        <div className="no-print flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">{title}</h1>

          <div className="flex items-center gap-2">
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
          {tab === "succeeding" ? (
            <SucceedingYears readOnly isPrintPreview />
          ) : (
            <Summary1stYear readOnly isPrintPreview hideSignatories={!!hideSignatories} />
          )}
        </div>
      </div>
    </PrintLayout>
  );
}