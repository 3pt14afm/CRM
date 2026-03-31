import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Summary1stYear from './Summary1stYear';
import MachineConfigTab from './MachineConfigTab';
import SucceedingYears from './SucceedingYears';
import { FaRegFloppyDisk } from "react-icons/fa6";
import { IoPrintSharp, IoSend, IoTrashSharp } from "react-icons/io5";
import { LuScanEye } from "react-icons/lu";
import { MdDisabledByDefault } from "react-icons/md";
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { useProjectData } from '@/Context/ProjectContext';
import { route as ziggyRoute } from "ziggy-js";
import toast, { Toaster } from 'react-hot-toast';
import { IoAlertCircle } from "react-icons/io5";

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
      contractYears: Number(entryProject.contract_years ?? 0),
      contractType: entryProject.contract_type ?? "",
      reference: entryProject.reference ?? "",
      purpose: entryProject.purpose ?? "",
      bundledStdInk: Boolean(entryProject.bundled_std_ink ?? false),
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

export default function Entry({
  activeTab = 'Machine Configuration',
  entryProject = null,
  readOnly = false,
  route: routeName = '',
  role = '',
  viewerLevel = null,
}) {
  const { auth, requiredSendBackType } = usePage().props;
  const createdBy = auth?.user?.name ?? null;

  const sendBackType = requiredSendBackType === 'comment' ? 'comment' : 'note';
  const sendBackLabel = sendBackType === 'comment' ? 'comment' : 'note';

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const { setProjectData, projectData, resetProject, saveDraft } = useProjectData();

  const projectRef =
    entryProject?.reference ||
    projectData?.companyInfo?.reference ||
    '—';

  const [tab, setTab] = useState("Machine");
  const [buttonClicked, setButtonClicked] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [showCompanyInfoErrors, setShowCompanyInfoErrors] = useState(false);

  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [sendBackText, setSendBackText] = useState("");

  const isCompanyInfoValid = () => {
    const ci = projectData?.companyInfo ?? {};
    const nameOk = String(ci.companyName ?? "").trim().length > 0;
    const typeOk = String(ci.contractType ?? "").trim().length > 0;

    const years = Number(ci.contractYears);
    const yearsOk = Number.isFinite(years) && years > 0;

    return nameOk && typeOk && yearsOk;
  };

  const hydratedEntryIdRef = useRef(null);

  const summaryRef = useRef(null);
  const succeedingRef = useRef(null);

  const getCurrentTabRef = () => {
    if (tab === 'Summary') return summaryRef;
    if (tab === 'Succeeding') return succeedingRef;
    return null;
  };

  const handleReject = () => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium text-sm">Reject this project?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 text-sm rounded border border-slate-300 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              router.post(ziggyRoute('roi.current.reject', entryProject.id), {}, {
                onStart: () => toast.loading('Rejecting...', { id: 'reject' }),
                onSuccess: () => toast.success('Project rejected.', { id: 'reject' }),
                onError: () => toast.error('Failed to reject.', { id: 'reject' }),
              });
            }}
            className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700"
          >
            Yes, Reject
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleBackToSender = () => {
    setSendBackText("");
    setShowSendBackModal(true);
  };

  const submitSendBack = () => {
    const trimmed = sendBackText.trim();

    if (!trimmed) {
      toast.error(
        sendBackType === 'comment'
          ? 'Comment is required before sending back.'
          : 'Note is required before sending back.'
      );
      return;
    }

    router.patch(
      ziggyRoute('roi.current.send-back', entryProject.id),
      {
        body: trimmed,
        type: sendBackType,
      },
      {
        preserveScroll: true,
    
        onSuccess: () => {
          setSendBackText("");
          toast.success('Project sent back to sender.', { id: 'sendBack' });
        },
        onError: (errors) => {
          setShowSendBackModal(true);
          const message =
            Object.values(errors ?? {})[0] ||
            `Failed to send back. ${sendBackType === 'comment' ? 'Comment' : 'Note'} is required.`;
          toast.error(message, { id: 'sendBack' });
        },
      }
    );
  };

  const handleAdvance = (projectId) => {
    if (!projectId) {
      toast.error("Invalid Project ID");
      return;
    }

    if (confirm("Are you sure you want to submit this project to the next level?")) {
      const toastId = toast.loading("Submitting to next level...");

      router.post(ziggyRoute('roi.current.advance', projectId), {}, {
        preserveScroll: true,
        onSuccess: () => toast.success("Project advanced successfully!", { id: toastId }),
        onError: (errors) => {
          const message = Object.values(errors)[0] || "Failed to advance project.";
          toast.error(message, { id: toastId });
        },
        onFinish: () => setTimeout(() => toast.dismiss(toastId), 3000),
      });
    }
  };

  const handleApprove = (projectId) => {
    if (!projectId) {
      toast.error("Invalid Project ID");
      return;
    }

    if (confirm("Approve this project? This will move it to Archive.")) {
      const toastId = toast.loading("Approving...");

      router.post(ziggyRoute('roi.current.approve', projectId), {}, {
        preserveScroll: true,
        onSuccess: () => toast.success("Project approved.", { id: toastId }),
        onError: (errors) => {
          const message = Object.values(errors)[0] || "Failed to approve project.";
          toast.error(message, { id: toastId });
        },
        onFinish: () => setTimeout(() => toast.dismiss(toastId), 3000),
      });
    }
  };

  useEffect(() => {
    const next =
      activeTab === 'Summary' ? 'Summary' :
      activeTab === 'Succeeding' ? 'Succeeding' :
      'Machine';
    setTab(next);
  }, [activeTab]);

  useEffect(() => {
    if (entryProject) return;

    hydratedEntryIdRef.current = null;
    setShowCompanyInfoErrors(false);
    resetProject();
    setResetKey((k) => k + 1);
    setTab('Machine');
  }, [entryProject, resetProject]);

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

  const buildPayload = () => ({
    ...projectData,
    metadata: {
      ...projectData?.metadata,
      projectId: entryProject?.id ?? projectData?.metadata?.projectId ?? null,
      lastSaved: formattedDate,
      status:
        projectData?.metadata?.status ??
        entryProject?.status ??
        "draft",
    },
    companyInfo: {
      ...projectData?.companyInfo,
      projectUid:
        entryProject?.project_uid ??
        projectData?.companyInfo?.projectUid ??
        "",
      reference:
        entryProject?.reference ??
        projectData?.companyInfo?.reference ??
        "",
    },
  });

  const triggerBlink = () => {
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 100);
  };

  const handleSaveDraft = () => {
    setShowCompanyInfoErrors(true);

    if (!isCompanyInfoValid()) {
      toast.error("Please fill in all required fields.");
      setTab("Machine");
      return;
    }

    const payload = buildPayload();
    saveDraft(payload);

    router.post(ziggyRoute("roi.entry.draft.save"), payload, {
      preserveScroll: true,
      onStart: () => {
        toast.loading("Saving Draft...", { id: "saveDraft" });
      },
      onSuccess: () => {
        triggerBlink();
        toast.success("Draft saved!", { id: "saveDraft" });
        setShowCompanyInfoErrors(false);
      },
      onError: () => {
        toast.error("Cannot save draft. All marked fields are required.", { id: "saveDraft" });
      },
    });
  };

  const handleSubmit = () => {
    const projectId = entryProject?.id ?? projectData?.metadata?.projectId;

    if (!projectId) {
      toast((t) => (
        <div className="flex items-center gap-2 text-sm">
          <IoAlertCircle className="text-red-500 text-lg shrink-0" />
          <span>
            Please <b className="text-darkgreen/70">Save Draft</b> first before submitting.
          </span>
        </div>
      ), { duration: 1000 });
      return;
    }

    const payload = buildPayload();
    const toastId = toast.loading("Submitting...");

    router.patch(ziggyRoute("roi.entry.projects.submit", projectId), payload, {
      preserveScroll: true,
      onSuccess: (page) => {
        const flashError = page?.props?.flash?.error;
        const flashSuccess = page?.props?.flash?.success;

        if (flashError) {
          toast.error(flashError, { id: toastId });
          return;
        }

        toast.success(flashSuccess || "Project submitted!", { id: toastId });
      },
      onError: (errors) => {
        const message = Object.values(errors)[0] || "Failed to submit.";
        toast.error(message, { id: toastId });
      },
      // onFinish: () => setTimeout(() => toast.dismiss(toastId), 3000),
    });
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all data? This will wipe your draft.")) {
      setShowCompanyInfoErrors(false);
      resetProject();
      setResetKey((k) => k + 1);
      setTab('Machine');
    }
  };

  const isCurrentRecord = routeName === 'current';
  const isSummaryLikeTab = tab === 'Summary' || tab === 'Succeeding';

  const statusText = String(
    projectData?.metadata?.status ?? entryProject?.status ?? "draft"
  ).toLowerCase();

  const showDraftWatermark = !isCurrentRecord && statusText === "draft";
  const showMachineDraftActions = tab === 'Machine' && !readOnly && !isCurrentRecord;
  const showEntrySummaryDraftActions = isSummaryLikeTab && !readOnly && !isCurrentRecord;
  const showCurrentSummaryApprovalActions = isSummaryLikeTab && isCurrentRecord;
  const showPrintFooter = isSummaryLikeTab;

  const buildSignatoriesForPrint = (preparedByName) => ({
    preparedBy: preparedByName ?? entryProject?.user?.name ?? null,
    reviewedBy: entryProject?.reviewed_by ?? null,
    checkedBy: entryProject?.checked_by ?? null,
    endorsedBy: entryProject?.endorsed_by ?? null,
    confirmedBy: entryProject?.confirmed_by ?? null,
    approvedBy: entryProject?.approved_by_name ?? entryProject?.approved_by ?? null,
  });

  const openPrintPage = (autoPrint = false) => {
    if (!(tab === "Summary" || tab === "Succeeding")) return;

    const projectId = entryProject?.id ?? projectData?.metadata?.projectId;

    if (!projectId) {
      toast((t) => (
        <div className="flex items-center gap-2 rounded-md text-sm">
          <IoAlertCircle className="text-red-500 text-lg shrink-0" />
          <span>
            Please <b className="text-darkgreen/70">Save Draft</b> first before printing.
          </span>
        </div>
      ), { duration: 1500 });

      return;
    }

    const tabParam = tab === "Succeeding" ? "succeeding" : "summary";
    let storageKey = null;

    try {
      storageKey = `roi-print:${projectRef}:${Date.now()}`;

      const snapshot = {
        ...projectData,
        metadata: {
          ...(projectData?.metadata ?? {}),
          signatories: buildSignatoriesForPrint(createdBy),
        },
        projectNotes: entryProject?.notes ?? projectData?.projectNotes ?? [],
        projectComments: entryProject?.comments ?? projectData?.projectComments ?? [],
      };

      sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch (e) {
      console.warn("Print snapshot too large; continuing without sessionStorage snapshot.", e);
      storageKey = null;
    }

    let printPath = "";

    if (routeName === "current") {
      printPath = ziggyRoute("roi.current.print", projectId);
    } else if (routeName === "archive") {
      printPath = ziggyRoute("roi.archive.print", projectId);
    } else {
      printPath = ziggyRoute("roi.entry.projects.print", projectId);
    }

    const params = new URLSearchParams();
    params.set("tab", tabParam);
    params.set("autoprint", autoPrint ? "1" : "0");
    params.set("draftWatermark", showDraftWatermark ? "1" : "0");

    if (storageKey) params.set("storageKey", storageKey);

    const href = `${printPath}?${params.toString()}`;

    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const levelNum = Number(viewerLevel ?? 0);
  const projectLevel = Number(entryProject?.current_level ?? 0);
  const isAssignedApproverLevel =
    levelNum >= 2 && levelNum <= 6 && levelNum === projectLevel;

  const canApprove = isAssignedApproverLevel && levelNum === 6;

  return (
    <>
      <Head
        title={
          routeName === 'current' || routeName === 'archive'
            ? `${entryProject?.company_name ?? 'Project'}`
            : 'ROI Entry'
        }
      />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project ROI Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">
                {routeName === 'current' || routeName === 'archive'
                  ? `${entryProject?.company_name}`
                  : 'Entry'}
              </p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
              <p className="text-base font-semibold text-right">Reference: {projectRef}</p>
            </div>
          </div>

          <div className="mx-5">
            <div className="flex gap-[2px]">
              <button
                onClick={() => setTab('Machine')}
                className={`px-7 text-sm py-2 ${
                  tab === 'Machine'
                    ? 'bg-white border border-t-[#2c2c2e]/20 font-semibold border-b-0 border-x-[#2c2c2e]/20 rounded-t-xl'
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
                Summary
              </button>
            </div>
            <Toaster />
          </div>

          {tab === 'Machine' ? (
            <MachineConfigTab
              key={`machine-${entryProject?.id ?? 'new'}-${resetKey}`}
              readOnly={readOnly}
              buttonClicked={buttonClicked}
              showCompanyInfoErrors={showCompanyInfoErrors}
            />
          ) : tab === 'Summary' ? (
            <Summary1stYear
              key={`summary-${entryProject?.id ?? 'new'}-${resetKey}`}
              ref={summaryRef}
            />
          ) : tab === 'Succeeding' ? (
            <SucceedingYears
              key={`succeeding-${entryProject?.id ?? 'new'}-${resetKey}`}
              ref={succeedingRef}
            />
          ) : null}
        </div>

        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-between relative">
            {showMachineDraftActions && (
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

            {showEntrySummaryDraftActions && (
              <>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-5 py-1 rounded-xl border border-[#F27373] hover:shadow-innerRed text-red-600 hover:bg-[#F27373]/10 font-semibold"
                >
                  <IoTrashSharp /> Clear All
                </button>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
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

            {showCurrentSummaryApprovalActions && isAssignedApproverLevel && (
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

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
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

                <div className="flex items-center gap-3">
                  {!canApprove ? (
                    <button
                      type="button"
                      onClick={() => handleAdvance(entryProject?.id)}
                      className="flex items-center gap-2 px-5 py-1 rounded-xl border text-white bg-[#0565D2] hover:shadow-innerBlue font-medium"
                    >
                      Submit to Next Level <FaArrowRight />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApprove(entryProject?.id)}
                      className="flex items-center gap-2 px-5 py-1 rounded-xl bg-[#289800] text-white font-medium hover:shadow-innerDarkgreen shadow"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </>
            )}

            {showPrintFooter && !showEntrySummaryDraftActions && !showCurrentSummaryApprovalActions && (
              <div className="ml-auto flex items-center gap-2">
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
            )}
          </div>
        </div>
      </div>

      {showSendBackModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setShowSendBackModal(false)}
          />

          <div className="relative w-[92%] max-w-xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden">
            <div className="px-8 pt-8 pb-4">
              <h2 className="text-2xl font-extrabold tracking-wide text-black">
                SEND BACK TO SENDER
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Please add a {sendBackLabel} before continuing.
              </p>
            </div>

            <div className="px-8 pb-8">
              <textarea
                value={sendBackText}
                onChange={(e) => setSendBackText(e.target.value)}
                placeholder={`Write your ${sendBackLabel} here...`}
                className="w-full min-h-[160px] rounded-xl border border-slate-300 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
              />

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSendBackModal(false)}
                  className="px-5 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitSendBack}
                  className="px-5 py-2 rounded-lg bg-[#CD4E00] hover:bg-orange-700 text-white font-semibold"
                >
                  Yes, Send Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

Entry.layout = (page) => <AuthenticatedLayout children={page} />;