import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Summary1stYear from './EntryRoutes/Summary1stYear';
import MachineConfigTab from './EntryRoutes/MachineConfigTab';
import SucceedingYears from './EntryRoutes/SucceedingYears';
import { FaRegFloppyDisk } from "react-icons/fa6";
import { IoPrintSharp, IoSend, IoTrashSharp } from "react-icons/io5";
import { MdDisabledByDefault } from "react-icons/md";
import { FaArrowLeft, FaArrowRight, FaCheckSquare } from 'react-icons/fa';
import { LuScanEye } from "react-icons/lu";
import { useProjectData } from '@/Context/ProjectContext';
import { route } from "ziggy-js";

function mapEntryProjectToContext(entryProject) {
  const items = entryProject?.items ?? [];
  const fees = entryProject?.fees ?? [];

  const mapItem = (r) => ({
    id: r.client_row_id || String(r.id),
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
    },

    companyInfo: {
      companyName: entryProject.company_name ?? "",
      contractYears: Number(entryProject.contract_years ?? 0),
      contractType: entryProject.contract_type ?? "",
      reference: entryProject.reference ?? "",
      purpose: "",
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

export default function Entry({ activeTab = 'Machine Configuration', entryProject = null }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const { setProjectData, projectData, resetProject, saveDraft } = useProjectData();

  // stable generated ref only once per page load
  const [generatedRef] = useState(() =>
    `PRJ-${Math.random().toString(36).slice(2, 9).toUpperCase()}`
  );

  // ✅ reference: DB when editing, generated when creating
  const projectRef = entryProject?.reference || generatedRef;

  // ✅ tab state: init safely, then sync with activeTab prop
  const [tab, setTab] = useState("Machine");
  const [buttonClicked, setButtonClicked] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // ✅ keep tab in sync with server prop (works for edit + create)
  useEffect(() => {
    const next =
      activeTab === 'Summary' ? 'Summary' :
      activeTab === 'Succeeding' ? 'Succeeding' :
      'Machine';
    setTab(next);
  }, [activeTab]);

  // ✅ When opening /entry/create (no entryProject), ensure fresh form
  useEffect(() => {
    if (entryProject) return;

    resetProject();               // wipe any previous draft data from context
    setResetKey((k) => k + 1);    // force tab content remount
    setTab('Machine');            // show Machine tab by default
  }, [entryProject]);

  // ✅ hydrate context when opening /entry/projects/{id}
  useEffect(() => {
    if (!entryProject) return;

    // avoid re-hydrating if already on same project
    if (projectData?.metadata?.projectId === entryProject.id) return;

    const mapped = mapEntryProjectToContext(entryProject);

    setProjectData(mapped);
    saveDraft(mapped);
  }, [entryProject?.id]); // keep dependency tight

  const buildPayload = () => ({
    ...projectData,
    metadata: {
      ...projectData.metadata,
      projectId: entryProject?.id ?? projectData?.metadata?.projectId ?? null,
      lastSaved: formattedDate,
    },
    companyInfo: {
      ...projectData.companyInfo,
      reference: projectRef,
    },
  });

  const triggerBlink = () => {
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 100);
  };

  const handleSaveDraft = () => {
    const payload = buildPayload();
    saveDraft(payload);

    router.post(route("roi.entry.draft.save"), payload, {
      onSuccess: () => triggerBlink(),
      onError: (errors) => {
        console.log("Save draft failed:", errors);
        alert("Save draft failed. Check required fields / console.");
      },
    });
  };

  const handleSubmit = () => {
    const projectId = entryProject?.id ?? projectData?.metadata?.projectId;

    if (!projectId) {
      alert("Please click Save Draft first to create the project.");
      return;
    }

    router.patch(route("roi.entry.projects.submit", projectId), {}, {
      preserveScroll: true,
    });
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all data? This will wipe your draft.")) {
      resetProject();
      setResetKey((k) => k + 1);
      setTab('Machine');
    }
  };

  const summaryRef = useRef(null);
  const succeedingRef = useRef(null);

  const currentTabRef = useMemo(() => {
    if (tab === 'Summary') return summaryRef;
    if (tab === 'Succeeding') return succeedingRef;
    return null;
  }, [tab]);

  const handleReject = () => currentTabRef?.current?.reject?.();
  const handleBackToSender = () => currentTabRef?.current?.backToSender?.();
  const handleSubmitToNextLevel = () => currentTabRef?.current?.submitToNextLevel?.();
  const handleApprove = () => currentTabRef?.current?.approve?.();

  const showApprovalFooter = tab === 'Summary' || tab === 'Succeeding';

  const openPrintPage = (autoPrint = false) => {
    if (!(tab === "Summary" || tab === "Succeeding")) return;

    const tabParam = tab === "Succeeding" ? "succeeding" : "summary";
    const storageKey = `roi-print:${projectRef}:${Date.now()}`;

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(projectData));
    } catch (e) {
      console.error("Failed to save print snapshot:", e);
      alert("Print failed: snapshot too large.");
      return;
    }

    const current = window.location.pathname.replace(/\/$/, "");
    const printPath = `${current}/print`;

    const href =
      `${printPath}` +
      `?tab=${encodeURIComponent(tabParam)}` +
      `&storageKey=${encodeURIComponent(storageKey)}` +
      `&autoprint=${autoPrint ? 1 : 0}`;

    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <Head title="ROI Entry" />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project ROI Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Entry</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
              <p className="text-base font-semibold text-right">Reference: {projectRef}</p>
            </div>
          </div>

          {/* TABS */}
          <div className="mx-10">
            <div className="flex gap-[2px]">
              <button
                onClick={() => setTab('Machine')}
                className={`px-7 text-sm py-2 ${
                  tab === 'Machine'
                    ? 'bg-[#B5EBA2]/10 border border-t-[#B5EBA2]/80 font-medium border-b-0 border-x-[#B5EBA2]/80 rounded-t-xl'
                    : 'bg-[#B5EBA2]/80 rounded-t-xl'
                }`}
              >
                Machine Configuration
              </button>

              <button
                onClick={() => setTab('Summary')}
                className={`px-7 text-sm py-2 ${
                  tab === 'Summary'
                    ? 'bg-[#B5EBA2]/10 font-medium border border-t-[#B5EBA2] border-b-0 border-x-[#B5EBA2] rounded-t-xl'
                    : 'bg-[#B5EBA2]/80 rounded-t-xl'
                }`}
              >
                Summary/1st Year
              </button>

              <button
                onClick={() => setTab('Succeeding')}
                className={`px-7 text-sm py-2 ${
                  tab === 'Succeeding'
                    ? 'bg-[#B5EBA2]/10 font-medium border border-t-[#B5EBA2] border-b-0 border-x-[#B5EBA2] rounded-t-xl'
                    : 'bg-[#B5EBA2]/80 rounded-t-xl'
                }`}
              >
                Succeeding Years
              </button>
            </div>
          </div>

          {/* CONTENT */}
          {tab === 'Machine' ? (
            <MachineConfigTab key={`machine-${resetKey}`} buttonClicked={buttonClicked} />
          ) : tab === 'Summary' ? (
            <Summary1stYear key={`summary-${resetKey}`} ref={summaryRef} />
          ) : tab === 'Succeeding' ? (
            <SucceedingYears key={`succeeding-${resetKey}`} ref={succeedingRef} />
          ) : null}
        </div>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-between">
            {tab === 'Machine' && (
              <>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-5 py-1 rounded-xl border border-[#F27373] hover:shadow-innerRed text-red-600 hover:bg-[#F27373]/10 font-semibold"
                >
                  <IoTrashSharp /> Clear All
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="flex items-center gap-2 px-5 pl-4 py-1 rounded-xl border border-darkgreen text-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800]/10 font-semibold"
                  >
                    <FaRegFloppyDisk /> Save Draft
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-5 py-1 rounded-xl bg-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-semibold shadow"
                  >
                    Submit <IoSend />
                  </button>
                </div>
              </>
            )}

            {/* FOOTER FOR SUMMARY + SUCCEEDING */}
            {showApprovalFooter && (
              <>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReject}
                    className="px-5 py-1 gap-2 items-center flex rounded-xl border border-[#F27373] text-red-600 hover:shadow-innerRed hover:bg-[#F27373]/10 font-medium"
                  >
                    <MdDisabledByDefault /> Disapprove/Reject
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToSender}
                    className="px-5 py-1 gap-2 items-center flex rounded-xl border bg-[#CD4E00] text-white hover:shadow-innerOrange font-medium"
                  >
                    <FaArrowLeft /> Back to Sender
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPrintPage(false)}
                    className="flex items-center gap-2 px-4 pl-3 py-1 rounded-lg text-sm bg-lightgreen/80 hover:shadow-innerGreen text-black font-medium shadow"
                  >
                    <LuScanEye /> Print Preview
                  </button>

                  <button
                    type="button"
                    onClick={() => openPrintPage(true)}
                    className="flex items-center gap-2 px-4 py-1 pl-3 rounded-lg text-sm bg-lightgreen/80 hover:shadow-innerGreen text-black font-medium shadow"
                  >
                    <IoPrintSharp /> Print
                  </button>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSubmitToNextLevel}
                      className="flex items-center gap-2 px-5 py-1 rounded-xl border text-white bg-[#0565D2] hover:shadow-innerBlue font-medium"
                    >
                      Submit to Next Level <FaArrowRight />
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      className="flex items-center gap-2 px-5 py-1 rounded-xl bg-[#289800] text-white font-medium hover:shadow-innerDarkgreen shadow"
                    >
                      <FaCheckSquare /> Approve
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

Entry.layout = (page) => <AuthenticatedLayout children={page} />;
