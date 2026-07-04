import React from "react";
import PrintablePaper from "./PrintablePaper";

function ProposalTermsPaper({ proposal, items }) {
  const machines = (items || []).filter((i) => i.kind === "machine");
  const consumables = (items || []).filter(
    (i) => i.kind === "consumable" && Number(i.price) > 0
  );
  const allRows = [...machines, ...consumables];

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });

  return (
    <PrintablePaper>
      <div className="mb-10 rounded-lg overflow-hidden border border-slate-200">
        <div className="bg-[#F8FAFC] px-4  border-b border-slate-200">
       {String(proposal.contract_type || proposal.project?.contract_type || "")
            .trim()
            .toLowerCase() === "free use" && (
            <p className="text-[11px] text-slate-600 mt-0.5">
                <span className="font-black not-italic text-slate-700">MPS PROGRAM: </span>
                <b className="ml-1">FREE USE</b> of the printer if you purchase initial <b>four (4)</b>{" "}
                toner cartridges per unit.
            </p>
            )}
        </div>

        <table className="w-full text-[10px] border-collapse">
          <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold">
            <tr>
              <th className="border-r border-slate-200 p-2 text-left">Printer Model</th>
              <th className="border-r border-slate-200 p-2 text-center">Toner Type</th>
              <th className="border-r border-slate-200 p-2 text-center">Toner Yield</th>
              <th className="border-r border-slate-200 p-2 text-center">Unit Price</th>
              <th className="border-r border-slate-200 p-2 text-center">QUANTITY</th>
              <th className="p-3 text">Total</th>
            </tr>
          </thead>

          <tbody className="text-slate-900">
            {allRows.length > 0 ? (
              allRows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-200">
                  <td className="border-r border-slate-200 p-3 font-bold">
                    {row.sku?.toUpperCase() || "—"}
                  </td>
                  <td className="border-r border-slate-200 p-3 text-center">{row.mode || "—"}</td>
                  <td className="border-r border-slate-200 p-3 text-center italic">
                    {row.yields ? `${Number(row.yields).toLocaleString()} pages*` : "—"}
                  </td>
                  <td className="border-r border-slate-200 p-3 text-right">
                    PHP {formatCurrency(row.price)}
                  </td>
                  <td className="border-r border-slate-200 p-3 text-center">
                    {Number(row.qty)} pcs.
                  </td>
                  <td className="p-3 text-right font-black">PHP {formatCurrency(row.total_sell)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-slate-200">
                <td colSpan={6} className="p-3 text-center text-slate-400">
                  No items found.
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td
                colSpan={5}
                className="p-3 text text-[11px] font-black uppercase border-r border-slate-200"
              >
                Total
              </td>
              <td className="p-3 text-right font-black text-[10px] min-w-[120px]">
                PHP{" "}
                {formatCurrency(
                  allRows.reduce((sum, row) => sum + (Number(row.total_sell) || 0), 0)
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="text-[12px] text-slate-700 mt-12">
        <h4 className="font-black uppercase text-slate-900 mb-3 border-b-2 border-slate-900 inline-block">
          TERMS & CONDITIONS
        </h4>

        {(proposal.terms_text || "").trim() ? (
          <div className="space-y-1">
            {proposal.terms_text
              .split("\n")
              .map((line) => line.replace(/^\d+\.\s*/, "").trim())
              .filter(Boolean)
              .map((line, idx) => (
                <div key={idx} dangerouslySetInnerHTML={{ __html: line }} />
              ))}
          </div>
        ) : (
          <p className="text-slate-300 italic">No terms added yet.</p>
        )}
      </div>

      <div className="mt-10 text-[12px] text-slate-700">
        <p className="whitespace-pre-line mb-10 leading-relaxed">
          {proposal.closing_text ||
            `If there is anything more you need to make your laser printers work better, you can reach me on my mobile or email me.\n\nThank you very much and have a nice day.`}
        </p>

        <div className="flex justify-between items-end mt-8">
          <div className="space-y-1">
            {proposal.user_signature && (
              <img src={proposal.user_signature} alt="Signature" className="h-12 object-contain mb-1" />
            )}
            <div className="border-t border-slate-400 pt-1 w-52">
              <p className="font-black text-slate-900 uppercase">{proposal.user?.name || "---"}</p>
              <p className="text-slate-500 text-[10px] uppercase">{proposal.user?.position || "---"}</p>
            </div>
          </div>

          <div className="space-y-1">
            {proposal.conforme_signature && (
              <img src={proposal.conforme_signature} alt="Conforme" className="h-12 object-contain mb-1" />
            )}
            <div className="border-t border-slate-400 pt-1 w-52">
              <p className="font-black text-slate-900 uppercase">
                {proposal.conforme_name || "CONFORME:"}
              </p>
              <p className="text-slate-500 text-[10px] uppercase">
                Signature Over Printed Name / Date
              </p>
            </div>
          </div>
        </div>
      </div>
    </PrintablePaper>
  );
}

export default ProposalTermsPaper;