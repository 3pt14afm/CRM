import React from "react";
import { toast } from "sonner"; // swap for whatever toast lib you're using
import ProposalCoverPaper from "./ProposalCoverPaper";
import ProposalTermsPaper from "./ProposalTermsPaper";

function Paper({ isSidebarOpen, proposal, items, fees, isOwner }) {
  
  const handleOpenPrint = () => {
    if (proposal.status !== "draft") {
      toast.error("This proposal is not in draft status.");
      return;
    }

    if (!proposal.proposal_id) {
      toast.error("Please save as draft first before printing.");
      return;
    }

    window.open(route("proposals.print", proposal.proposal_id), "_blank");
  };
  
  return (
    <div
      className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] my-12 ${
        isSidebarOpen ? "pr-[40%] bg-slate-100" : "pr-0 bg-slate-50"
      } min-h-screen  font-sans`}
    >
      <div className="absolute right-20">
        <button
          type="button"
          onClick={handleOpenPrint}
          className="px-4 py-2 rounded-md bg-darkgreen text-white text-sm font-medium"
        >
          Open Print Preview
        </button>
      </div>

      <ProposalCoverPaper proposal={proposal} items={items} />
      <ProposalTermsPaper proposal={proposal} items={items} />
    </div>
  );
}

export default Paper;