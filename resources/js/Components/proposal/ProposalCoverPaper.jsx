import React from "react";
import PrintablePaper from "./PrintablePaper";

function ProposalCoverPaper({ proposal, items }) {
  return (
    <PrintablePaper>
      <div className="mb-6">
        <img
          src="/images/logo.png"
          alt="Delsan Office Systems Corporation"
          className="h-14 w-auto object-contain"
        />
      </div>

      <div className="flex justify-between text-[11px] mb-8">
        <div className="space-y-1">
          <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">COMPANY NAME</span>
            <span className="font-bold text-slate-900">: {proposal.company_name || ""}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">CONTRACT TYPE</span>
            <span className="font-bold text-slate-900 uppercase">: {proposal.contract_type || ""}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">CONTRACT DURATION</span>
            <span className="font-bold text-slate-900 uppercase">
              : {proposal.contract_years || ""} Years
            </span>
          </div>
          <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">CONTACT PERSON</span>
            <span className="font-bold text-slate-900">: {proposal.attention || ""}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">DESIGNATION</span>
            <span className="font-bold text-slate-900">: {proposal.designation || ""}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">EMAIL</span>
            <span className="font-bold text-slate-900">: {proposal.email || ""}</span>
          </div>
          <div className="flex">
            <span className="text-slate-500 font-bold w-32 uppercase">MOBILE NO.</span>
            <span className="font-bold text-slate-900">: {proposal.mobile || ""}</span>
          </div>
        </div>

        <div className="flex text-right">
          <span className="text-slate-500 font-bold w-16 uppercase">DATE</span>
          <span className="font-bold text-slate-900">
            :{" "}
            {new Date().toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="mb-14 text-[13px] leading-snug text-slate-800">
        <p className="italic mb-3">Dear {proposal.attention || "Ms. Marge"},</p>
        <p className="font-bold italic mb-3 text-[#1f550b]">
          Greetings from Delsan Business Innovations Corporation!
        </p>
        <div className="whitespace-pre-line">
          {proposal.message ||
            `We thank you for the opportunity in allowing us to submit our price proposal for your kind consideration and favorable approval as follows:`}
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-[#C40000] font-black text-[15px] uppercase mb-4 border-b border-slate-100 pb-1">
          {items?.find((i) => i.kind === "machine")?.sku || ""}
        </h3>

<div className="flex gap-12 items-start">
          <div className="flex-1">
            {proposal.specs ? (
              <img
                src={proposal.specs}
                alt="Machine specs"
                className="w-full max-h-[500px] object-contain"
              />
            ) : (
              <div className="py-4 text-center text-slate-300 text-[11px] italic border border-dashed border-slate-100 rounded-lg">
                No specs image added yet.
              </div>
            )}
          </div>

          <div className="w-[200px]">
            <div className="bg-white p-2 mb-4">
              <img
                src={proposal.printer_image || "/images/L5590-(2).jpg"}
                alt="Printer"
                className="w-full h-auto object-contain"
              />
            </div>
            <div className="bg-[#e3ffe3] rounded-lg p-4 text-center border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                UNIT PRICE
              </p>
              <p className="text-sm font-black text-slate-900">
                PHP{" "}
                {Number(proposal.unit_price || 0).toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PrintablePaper>
  );
}

export default ProposalCoverPaper;