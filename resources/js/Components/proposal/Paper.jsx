import React from "react";
import { toast } from "sonner"; // swap for whatever toast lib you're using
import { Printer } from "lucide-react";
import ProposalCoverPaper from "./ProposalCoverPaper";
import ProposalTermsPaper from "./ProposalTermsPaper";

function Paper({ isSidebarOpen, proposal, items, fees, isOwner }) {
  
  const handleOpenPrint = () => {
 
    if (!proposal.proposal_id) {
      toast.error("Please save as draft first before printing.");
      return;
    }

    window.open(route("proposals.print", proposal.proposal_id), "_blank");
  };
  
  return (
    <div
      className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] py-14 lg:py-20 ${
        // On mobile the sidebar is a full-width overlay, so content shouldn't
        // be pushed aside there — only reserve space once the sidebar actually
        // shares the screen with the content (sm and up), matching the
        // sidebar's own responsive widths.
        isSidebarOpen
          ? "pr-0 sm:pr-[85%] md:pr-[55%] lg:pr-[40%]"
          : "pr-0 "
      } min-h-screen font-sans`}
    >
      {isOwner && (
        // In normal flow (not absolute) so it always reserves its own space
        // above the paper instead of floating on top of it — on mobile the
        // paper's own top margin shrinks with the zoom-to-fit scale, so an
        // absolutely positioned button would otherwise end up overlapping it.
      <div className="absolute top-10 z-50 lg:top-0 right-0 p-4 sm:p-6 md:p-8 lg:p-10">
        <button
          type="button"
          onClick={handleOpenPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-darkgreen text-white text-xs sm:text-sm font-medium whitespace-nowrap"
        >
          <Printer size={16} />
          Print Preview
        </button>
      </div>
      )}

      <ProposalCoverPaper proposal={proposal} items={items} />
      <ProposalTermsPaper proposal={proposal} items={items} />
    </div>
  );
}

export default Paper;