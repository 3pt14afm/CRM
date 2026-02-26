import React, { useEffect, useState } from "react";
import PrintLayout from "@/Layouts/PrintLayout";
import Summary1stYear from "./EntryRoutes/Summary1stYear";
import SucceedingYears from "./EntryRoutes/SucceedingYears";
import { useProjectData } from "@/Context/ProjectContext";

function mapProjectToContext(p) {
  const items = p?.items ?? [];
  const fees = p?.fees ?? [];

  const mapItem = (r) => ({
    id: r.client_row_id || String(r.id),
    type: r.kind === "machine" ? "machine" : "consumable",
    sku: r.sku ?? "",
    qty: Number(r.qty ?? 0),
    yields: Number(r.yields ?? 0),
    mode: r.mode ?? "",
    remarks: r.remarks ?? "",
    inputtedCost: Number(r.inputted_cost ?? 0),
    cost: Number(r.cost ?? 0),
    price: Number(r.price ?? 0),
    basePerYear: Number(r.base_per_year ?? 0),
    totalCost: Number(r.total_cost ?? 0),
    costCpp: Number(r.cost_cpp ?? 0),
    totalSell: Number(r.total_sell ?? 0),
    sellCpp: Number(r.sell_cpp ?? 0),
    machineMargin: Number(r.machine_margin ?? 0),
    machineMarginTotal: Number(r.machine_margin_total ?? 0),
  });

  const machine = items.filter((r) => r.kind === "machine").map(mapItem);
  const consumable = items.filter((r) => r.kind === "consumable").map(mapItem);

  const mapFee = (f) => ({
    id: f.client_row_id || String(f.id),
    label: f.label ?? "",
    category: f.category ?? "",
    remarks: f.remarks ?? "",
    cost: Number(f.cost ?? 0),
    qty: Number(f.qty ?? 0),
    total: Number(f.total ?? 0),
    isMachine: Boolean(f.is_machine),
  });

  const companyFees = fees.filter((f) => f.payer === "company").map(mapFee);
  const customerFees = fees.filter((f) => f.payer === "customer").map(mapFee);

  const feesTotal =
    companyFees.reduce((s, r) => s + (r.total || 0), 0) +
    customerFees.reduce((s, r) => s + (r.total || 0), 0);

  return {
    metadata: {
      projectId: p?.id ?? null,
      lastSaved: p?.last_saved_at ?? null,
      version: p?.version ?? 1,
      status: p?.status ?? "draft",
      // keep any server-provided signatories if you later pass them
      signatories: p?.signatories ?? undefined,
    },

    companyInfo: {
      companyName: p?.company_name ?? "",
      contractYears: Number(p?.contract_years ?? 0),
      contractType: p?.contract_type ?? "",
      reference: p?.reference ?? "",
      purpose: p?.purpose ?? "",
      bundledStdInk: Boolean(p?.bundled_std_ink ?? false),
    },

    interest: {
      annualInterest: Number(p?.annual_interest ?? 0),
      percentMargin: Number(p?.percent_margin ?? 0),
    },

    yield: {
      monoAmvpYields: {
        monthly: Number(p?.mono_yield_monthly ?? 0),
        annual: Number(p?.mono_yield_annual ?? 0),
      },
      colorAmvpYields: {
        monthly: Number(p?.color_yield_monthly ?? 0),
        annual: Number(p?.color_yield_annual ?? 0),
      },
    },

    machineConfiguration: {
      machine,
      consumable,
      totals: {
        unitCost: Number(p?.mc_unit_cost ?? 0),
        qty: Number(p?.mc_qty ?? 0),
        totalCost: Number(p?.mc_total_cost ?? 0),
        yields: Number(p?.mc_yields ?? 0),
        costCpp: Number(p?.mc_cost_cpp ?? 0),
        sellingPrice: Number(p?.mc_selling_price ?? 0),
        totalSell: Number(p?.mc_total_sell ?? 0),
        sellCpp: Number(p?.mc_sell_cpp ?? 0),
        totalBundledPrice: Number(p?.mc_total_bundled_price ?? 0),
      },
    },

    additionalFees: {
      company: companyFees,
      customer: customerFees,
      total: Number(p?.fees_total ?? feesTotal),
    },

    yearlyBreakdown: p?.yearly_breakdown ?? {},

    totalProjectCost: {
      grandTotalCost: Number(p?.grand_total_cost ?? 0),
      grandTotalRevenue: Number(p?.grand_total_revenue ?? 0),
      grandROI: Number(p?.grand_roi ?? 0),
      grandROIPercentage: Number(p?.grand_roi_percentage ?? 0),
    },

    contractDetails: {
      machine: [],
      consumable: [],
      totalInitial: 0,
    },
  };
}

export default function EntryPrint({
  tab = "summary",
  storageKey = null,
  autoprint = false,
  entryProject = null,
  project = null,
}) {
  const { setProjectData, projectData } = useProjectData();
  const [loaded, setLoaded] = useState(false);

  // 1) Prefer server-provided project data (no size limit)
  useEffect(() => {
    const p = entryProject || project;
    if (!p) return;

    try {
      setProjectData(mapProjectToContext(p));
      setLoaded(true);
    } catch (e) {
      console.error("Print page: failed to map server project:", e);
      setLoaded(true);
    }
  }, [entryProject, project, setProjectData]);

  // 2) Fallback: Load snapshot from sessionStorage (old behavior)
  useEffect(() => {
    if (loaded) return; // already loaded from server
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

  const isDraft = (projectData?.metadata?.status ?? "draft") === "draft";

  const title =
    tab === "succeeding"
      ? "Succeeding Years — Print Preview"
      : "Summary / 1st Year — Print Preview";

  return (
    <div className="preview-mode">
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

      {loaded && isDraft && (
        <div className="print-watermark" aria-hidden="true">
          DRAFT
        </div>
      )}

      <div className="print-root">
        {tab === "succeeding" ? <SucceedingYears /> : <Summary1stYear />}
      </div>
    </div>
  );
}

EntryPrint.layout = (page) => (
  <PrintLayout showDraftWatermark={page.props.showDraftWatermark}>
    {page}
  </PrintLayout>
);