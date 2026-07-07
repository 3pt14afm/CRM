import React, { useEffect } from "react";
import PrintLayout from "@/Layouts/PrintLayout";
import ProposalCoverPaper from "../../../Components/proposal/ProposalCoverPaper";
import ProposalTermsPaper from "../../../Components/proposal/ProposalTermsPaper";

function ProposalPrint({ proposal, items, fees, autoprint = false }) {
  useEffect(() => {
    document.documentElement.classList.add("print-mode");
    return () => document.documentElement.classList.remove("print-mode");
  }, []);

  useEffect(() => {
    if (!autoprint) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoprint]);

  const handlePrint = () => window.print();

  const handleClose = () => {
    window.close();
    setTimeout(() => {
      if (!window.closed) window.history.back();
    }, 50);
  };

  return (
    <div className="preview-mode">
      <div className="no-print flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Proposal Print Preview</h1>

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

      <div className="print-root">
        <ProposalCoverPaper proposal={proposal} items={items} />
        <ProposalTermsPaper proposal={proposal} items={items} />
      </div>
    </div>
  );
}

export default ProposalPrint;

// Watermark logic:
// - draft               -> "DRAFT"
// - generated            -> no watermark
// - awarded / closed     -> stamped with their own label
function resolveWatermark(status) {
  switch (status) {
    case "draft":
      return "DRAFT";
    case "awarded":
      return "AWARDED";
    case "closed":
      return "CLOSED";
    default:
      return null; // 'generated' -> no watermark
  }
}

ProposalPrint.layout = (page) => {
  const status = page.props?.proposal?.status;
  const watermarkText = resolveWatermark(status);

  return (
    <PrintLayout
      showDraftWatermark={!!watermarkText}
      watermarkText={watermarkText}
    >
      {page}
    </PrintLayout>
  );
};