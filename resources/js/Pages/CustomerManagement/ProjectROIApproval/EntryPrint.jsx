import React, { useEffect, useState } from "react";
import PrintLayout from "@/Layouts/PrintLayout";
import Summary1stYear from "./EntryRoutes/Summary1stYear";
import SucceedingYears from "./EntryRoutes/SucceedingYears";
import { useProjectData } from "@/Context/ProjectContext";

export default function EntryPrint({ tab = "summary", storageKey = null, autoprint = false }) {
  const { setProjectData } = useProjectData();
  const [loaded, setLoaded] = useState(false);

  // Load snapshot from sessionStorage
  useEffect(() => {
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

      setProjectData(JSON.parse(raw));
      setLoaded(true);
    } catch (e) {
      console.error("Print page: failed to load snapshot:", e);
      setLoaded(true);
    }
  }, [storageKey, setProjectData]);

  // Enable print-mode so preview uses the same styling as print
  useEffect(() => {
    document.documentElement.classList.add("print-mode");
    return () => document.documentElement.classList.remove("print-mode");
  }, []);

  // Auto-print (optional)
  useEffect(() => {
    if (!autoprint || !loaded) return;

    // Ensure print-mode is applied before printing
    document.documentElement.classList.add("print-mode");

    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoprint, loaded]);

  const handlePrint = () => {
    document.documentElement.classList.add("print-mode");
    window.print();
  };

  const handleClose = () => {
    // window.close() only works reliably for windows opened by script
    window.close();
    setTimeout(() => {
      if (!window.closed) window.history.back();
    }, 50);
  };

  const title =
    tab === "succeeding"
      ? "Succeeding Years — Print Preview"
      : "Summary / 1st Year — Print Preview";

  return (
    <div className="preview-mode">
      {/* Not printed (and not shown in preview print-mode if your CSS hides .no-print) */}
      <div className="no-print flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">{title}</h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-md bg-darkgreen text-white text-sm font-medium"
          >
            Print
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* Printable content only */}
      <div className="print-root">
        {tab === "succeeding" ? <SucceedingYears /> : <Summary1stYear />}
      </div>
    </div>
  );
}

EntryPrint.layout = (page) => <PrintLayout>{page}</PrintLayout>;
