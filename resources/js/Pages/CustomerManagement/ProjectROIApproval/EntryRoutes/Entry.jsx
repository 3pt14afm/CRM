import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { useRef } from 'react';
import Summary1stYear from './Summary1stYear';
import MachineConfigTab from './MachineConfigTab';
import SucceedingYears from './SucceedingYears';
import { FaRegFloppyDisk } from "react-icons/fa6";
import { IoPrintSharp, IoSend, IoTrashSharp } from "react-icons/io5";
import { LuScanEye } from "react-icons/lu";
import { MdDisabledByDefault } from "react-icons/md";
import { FaArrowLeft, FaArrowRight, FaAngleLeft  } from 'react-icons/fa';
import { useProjectData } from '@/Context/ProjectContext';
import { Toaster } from 'sonner';

import { useEntryHydration } from '@/hooks/roi/useEntryHydration';
import { useEntryValidation } from '@/hooks/roi/useEntryValidation ';
import { useEntryPayload } from '@/utils/roi/useEntryPayload';
import { useEntryActions } from '@/hooks/roi/useEntryActions';
import { useApprovalActions } from '@/hooks/roi/useApprovalActions';
import { usePrintPage } from '@/hooks/roi/usePrintPage';

export default function Entry({
  activeTab = 'Machine Configuration',
  entryProject = null,
  readOnly = false,
  route: routeName = '',
  role = '',
  viewerLevel = null,
   signatures = {},
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

  const { projectData } = useProjectData();

  const projectRef =
    entryProject?.reference ||
    projectData?.companyInfo?.reference ||
    '—';

  // --- Hooks ---

  const {
    tab,
    setTab,
    resetKey,
    setResetKey,
    showCompanyInfoErrors,
    setShowCompanyInfoErrors,
  } = useEntryHydration(entryProject, activeTab);

  const {
    showOutrightErrors,
    setShowOutrightErrors,
    isCompanyInfoValid,
    validateBusinessLogic,
    validateEntryRemarks,
  } = useEntryValidation({ setTab });

  const { buildPayload, buildFormDataPayload } = useEntryPayload({
    entryProject,
    formattedDate,
  });

  const {
    buttonClicked,
    handleSaveDraft,
    handleSubmit,
    handleClearAll,
  } = useEntryActions({
    entryProject,
    setTab,
    setShowCompanyInfoErrors,
    setShowOutrightErrors,
    setResetKey,
    isCompanyInfoValid,
    validateBusinessLogic,
    validateEntryRemarks,
    buildPayload,
    buildFormDataPayload,
  });

  const {
    showSendBackModal,
    setShowSendBackModal,
    sendBackText,
    setSendBackText,
    handleReject,
    handleBackToSender,
    submitSendBack,
    handleAdvance,
    handleApprove,
  } = useApprovalActions({ entryProject, sendBackType });

  // --- Derived UI flags ---

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

  const { openPrintPage } = usePrintPage({
    tab,
    entryProject,
    routeName,
    projectRef,
    createdBy,
    showDraftWatermark,
  });

  // --- Approver level ---

  const levelNum = Number(viewerLevel ?? 0);
  const projectLevel = Number(
    projectData?.metadata?.current_level ?? entryProject?.current_level ?? 0
  );

const isAssignedApproverLevel = levelNum >= 2 && levelNum <= 6 && levelNum === projectLevel;

  const canApprove = isAssignedApproverLevel && levelNum === 6;

  const showApprovalButtons = showCurrentSummaryApprovalActions && isAssignedApproverLevel;
  const showPrintOnly = showPrintFooter && !showEntrySummaryDraftActions && !showApprovalButtons;

  // --- Tab refs (used by child components) ---

  const summaryRef = useRef(null);
  const succeedingRef = useRef(null);

  const getCurrentTabRef = () => {
    if (tab === 'Summary') return summaryRef;
    if (tab === 'Succeeding') return succeedingRef;
    return null;
  };

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
        <div className=" pt-8 pb-3 flex justify-between px-5">
          <div className="flex gap-1  items-center">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mr-2 mt-3 self-center w-8 h-8 flex items-center justify-center rounded-full bg-[#B5EBA2]/40 backdrop-blur border border-[#B5EBA2]/60 hover:bg-[#B5EBA2]/70 hover:shadow-[0_0_10px_#B5EBA2]/50 transition-all"
            >
              <FaAngleLeft size={20} className="text-[#195C00]" />
            </button>
            <h1 className="font-semibold mt-3">Project ROI Approval</h1>
            <p className="mt-3">/</p>
            <p className="text-2xl mt-3 font-semibold">
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
              className={`px-7 text-sm py-1 ${
                tab === 'Machine'
                  ? 'bg-[#f8f8f8] border border-t-[#2c2c2e]/20 font-semibold border-b-0 border-x-[#2c2c2e]/20 rounded-t-xl'
                  : 'bg-[#B5EBA2]/50 mt-2 pt-2 rounded-t-xl'
              }`}
            >
              Machine Configuration
            </button>

            <button
              onClick={() => setTab('Summary')}
              className={`px-7 text-sm py-1 ${
                tab === 'Summary'
                  ? 'bg-[#f8f8f8] border border-t-[#2c2c2e]/20 font-semibold border-b-0 border-x-[#2c2c2e]/20 rounded-t-xl'
                  : 'bg-[#B5EBA2]/50 mt-2 pt-2 rounded-t-xl'
              }`}
            >
              Summary
            </button>
          </div>
        </div>

        {tab === 'Machine' ? (
          <MachineConfigTab
            key={`machine-${entryProject?.id ?? 'new'}-${resetKey}`}
            readOnly={readOnly}
            buttonClicked={buttonClicked}
            showCompanyInfoErrors={showCompanyInfoErrors}
            showOutrightErrors={showOutrightErrors}
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
            signatures={signatures}
          />
        ) : null}
      </div>

      <div className="sticky bottom-0 z-40 bg-[#f5f5f701] backdrop-blur border-t border-black/10">
        <div className="px-10 py-2 flex items-center justify-between relative">
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

          {/* Approval actions — only visible to assigned approvers */}
          {showApprovalButtons && (
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

          {/* Print-only footer — visible to all non-draft, non-approver viewers */}
          {showPrintOnly && (
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