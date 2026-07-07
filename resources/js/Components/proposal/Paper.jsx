import React from "react";
import { toast } from "sonner"; // swap for whatever toast lib you're using
import { Printer } from "lucide-react";
import ProposalCoverPaper from "./ProposalCoverPaper";
import ProposalTermsPaper from "./ProposalTermsPaper";

function Paper({ isSidebarOpen, proposal, items, fees, isOwner }) {
  // Sidebar (edit panel) only makes sense while the proposal is still a
  // draft. Once it's generated/awarded/closed it's locked — nothing left
  // to edit — so the sidebar should never take up screen space here,
  // regardless of what the parent's isSidebarOpen state says.
  const isEditable = proposal?.status === "draft";
  const effectiveSidebarOpen = isEditable ? isSidebarOpen : false;

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
        effectiveSidebarOpen
          ? "pr-0 sm:pr-[85%] md:pr-[55%] lg:pr-[40%]"
          : "pr-0 "
      } min-h-screen font-sans`}
    >
      {isOwner && (
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