import { useEffect, useRef, useState } from 'react';
import { useProjectData } from '@/Context/ProjectContext';

function mapEntryProjectToContext(entryProject) {
  const items = entryProject?.items ?? [];
  const fees = entryProject?.fees ?? [];

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
      projectId: entryProject.id,
      lastSaved: entryProject.last_saved_at ?? null,
      version: entryProject.version ?? 1,
      status: entryProject.status ?? "draft",
    },

    companyInfo: {
      projectUid: entryProject.project_uid ?? "",
      companyName: entryProject.company_name ?? "",
      companySapCode: entryProject.company_sap_code ?? "",  // ← add
      type: Number(entryProject.type ?? 0),  // ← must exist
      contractYears: Number(entryProject.contract_years ?? 0),
      contractType: entryProject.contract_type ?? "",
      reference: entryProject.reference ?? "",
      purpose: entryProject.purpose ?? "",
      bundledStdInk: Boolean(entryProject.bundled_std_ink ?? false),
      type: Number(entryProject.type ?? 0), 
    },

    interest: {
      annualInterest: Number(entryProject.annual_interest ?? 0),
      percentMargin: Number(entryProject.percent_margin ?? 0),
    },

    yield: {
      monoAmvpYields: {
        monthly: Number(entryProject.mono_yield_monthly ?? 0),
        annual: Number(entryProject.mono_yield_annual ?? 0),
      },
      colorAmvpYields: {
        monthly: Number(entryProject.color_yield_monthly ?? 0),
        annual: Number(entryProject.color_yield_annual ?? 0),
      },
    },

    entryRemarks: {
      remarks: entryProject.entry_remarks ?? "",
      attachments: Array.isArray(entryProject.entry_remarks_attachments)
        ? entryProject.entry_remarks_attachments
        : [],
    },

    machineConfiguration: {
      machine,
      consumable,
      totals: {
        unitCost: Number(entryProject.mc_unit_cost ?? 0),
        qty: Number(entryProject.mc_qty ?? 0),
        totalCost: Number(entryProject.mc_total_cost ?? 0),
        yields: Number(entryProject.mc_yields ?? 0),
        costCpp: Number(entryProject.mc_cost_cpp ?? 0),
        sellingPrice: Number(entryProject.mc_selling_price ?? 0),
        totalSell: Number(entryProject.mc_total_sell ?? 0),
        sellCpp: Number(entryProject.mc_sell_cpp ?? 0),
        totalBundledPrice: Number(entryProject.mc_total_bundled_price ?? 0),
      },
    },

    additionalFees: {
      company: companyFees,
      customer: customerFees,
      total: Number(entryProject.fees_total ?? feesTotal),
    },

    yearlyBreakdown: entryProject.yearly_breakdown ?? {},

    totalProjectCost: {
      grandTotalCost: Number(entryProject.grand_total_cost ?? 0),
      grandTotalRevenue: Number(entryProject.grand_total_revenue ?? 0),
      grandROI: Number(entryProject.grand_roi ?? 0),
      grandROIPercentage: Number(entryProject.grand_roi_percentage ?? 0),
    },

    contractDetails: {
      machine: [],
      consumable: [],
      totalInitial: 0,
    },
  };
}

/**
 * Handles syncing the entryProject prop into ProjectContext,
 * resetting state when there is no project, and tracking the active tab.
 *
 * @param {object|null} entryProject - The server-side project record
 * @param {string} activeTab - The tab name passed in as a prop
 * @returns {{ tab, setTab, resetKey, setShowCompanyInfoErrors }}
 */
export function useEntryHydration(entryProject, activeTab) {
  const { setProjectData, resetProject, saveDraft } = useProjectData();

  const [tab, setTab] = useState('Machine');
  const [resetKey, setResetKey] = useState(0);
  const [showCompanyInfoErrors, setShowCompanyInfoErrors] = useState(false);

  const hydratedEntryIdRef = useRef(null);

  // Sync activeTab prop → internal tab state
  useEffect(() => {
    const next =
      activeTab === 'Summary' ? 'Summary' :
      activeTab === 'Succeeding' ? 'Succeeding' :
      'Machine';
    setTab(next);
  }, [activeTab]);

  // Reset everything when there is no entryProject (new entry mode)
  useEffect(() => {
    if (entryProject) return;

    hydratedEntryIdRef.current = null;
    setShowCompanyInfoErrors(false);
    resetProject();
    setResetKey((k) => k + 1);
    setTab('Machine');
  }, [entryProject, resetProject]);

  // Hydrate context from entryProject when it changes
  useEffect(() => {
    if (!entryProject?.id) return;
    if (hydratedEntryIdRef.current === entryProject.id) return;

    const mapped = mapEntryProjectToContext(entryProject);

    setShowCompanyInfoErrors(false);
    setProjectData(mapped);
    saveDraft(mapped);

    hydratedEntryIdRef.current = entryProject.id;
    setResetKey((k) => k + 1);
  }, [entryProject, setProjectData, saveDraft]);

  return {
    tab,
    setTab,
    resetKey,
    setResetKey,
    showCompanyInfoErrors,
    setShowCompanyInfoErrors,
  };
}