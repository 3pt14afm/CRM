import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import Summary1stYear from './Summary1stYear';
import MachineConfigTab from './MachineConfigTab';
import SucceedingYears from './SucceedingYears';
import OverallSummary from './OverallSummary';
import { IoIosArrowBack } from 'react-icons/io';
import { IoAddCircleOutline, IoRemoveCircleOutline, IoPrintSharp } from 'react-icons/io5';
import { LuScanEye } from 'react-icons/lu';
import { MdOutlineCancel, MdVerified } from 'react-icons/md';
import { FaUndo } from 'react-icons/fa';
import { TiArrowBack, TiArrowForward } from 'react-icons/ti';
import { toast } from 'sonner';
import { route as ziggyRoute } from 'ziggy-js';

import GroupProjectProvider, { useGroupProjectData } from '@/Context/GroupProjectContext';
import { useGroupEntryHydration } from '@/hooks/roi/useGroupEntryHydration';
import { useEntryValidation } from '@/hooks/roi/useEntryValidation ';
import { useGroupEntryValidation } from '@/hooks/roi/useGroupEntryValidation';
import { useGroupEntryPayload } from '@/utils/roi/useGroupEntryPayload';
import { useGroupEntryActions } from '@/hooks/roi/useGroupEntryActions';
import { useApprovalActions } from '@/hooks/roi/useApprovalActions';
import { usePrintPage } from '@/hooks/roi/usePrintPage';

/**
 * Multi-entry group version of Entry.jsx. Handles both new-group creation
 * (no entryProjects prop) and editing an existing saved group (entryProjects
 * populated by showGroup()). No approval workflow here — that only applies
 * once a group is submitted and viewed via current/archive routes, which
 * this component does not yet handle.
 *
 * Unlike Entry.jsx, which relies on a globally-mounted <ProjectDataProvider>
 * wrapping the whole app, there is no globally-mounted <GroupProjectProvider>
 * — it's mounted here, scoped to just this page.
 */
function GroupEntryForm({
  activeTab = 'Machine Configuration',
  entryProjects = null,
  reference = null,
  activeEntryIndex: initialActiveEntryIndex = 0,
  readOnly = false,
  route: routeName = '',
  viewerLevel = null,
  signatures = {},
}) {
  const {
    groupData,
    activeEntryIndex,
    switchActiveEntry,
    addEntry,
    removeEntry,
    getCurrentMachineConfig,
  } = useGroupProjectData();

  const projectRef = groupData?.metadata?.reference || reference || '—';

  const { auth, requiredSendBackType } = usePage().props;
  const sendBackType = requiredSendBackType === 'comment' ? 'comment' : 'note';
  const sendBackLabel = sendBackType === 'comment' ? 'comment' : 'note';
  const master = entryProjects?.[0] ?? null;
  const isCurrentRoute = routeName === 'current';
  const isArchiveRoute = routeName === 'archive';
  const isEntryRoute = !isCurrentRoute && !isArchiveRoute;
  
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  // --- Hooks ---

  const {
    tab,
    setTab,
    resetKey,
    setResetKey,
    showCompanyInfoErrors,
  } = useGroupEntryHydration(entryProjects, activeTab, initialActiveEntryIndex);

  // Live per-active-entry highlighting — plain, unmodified single-entry hook.
  // Works here because GroupProjectContext bridges ProjectContext to
  // whichever entry is activeEntryIndex, so this hook has no idea it's
  // inside a group — it just sees "the current entry."
  const {
    showOutrightErrors,
    showModeErrors,
  } = useEntryValidation({ setTab });

  // Submit-time / draft-time gate — validates every entry, not just active.
  const {
    validateAllCompanyInfo,
    validateAllEntries,
  } = useGroupEntryValidation({ setTab });

  const { buildPayload, buildFormDataPayload } = useGroupEntryPayload();

  const {
    buttonClicked,
    handleSaveDraft,
    handleSubmit,
    handleClearAll,
  } = useGroupEntryActions({
    setTab, setResetKey, validateAllCompanyInfo, validateAllEntries, 
    buildPayload, buildFormDataPayload, getCurrentMachineConfig,
  });

  const {
    showSendBackModal, setShowSendBackModal, sendBackText, setSendBackText,
    sendBackTargetId, setSendBackTargetId, sendBackEntryOptions,
    handleReject, handleBackToSender, submitSendBack,
    handleAdvance, handleApprove,
    showWithdrawModal, setShowWithdrawModal, handleWithdraw, submitWithdraw,
    showCancelModal, setShowCancelModal, handleCancel, submitCancel,
  } = useApprovalActions({ entryProject: master, entryProjects, sendBackType });

  const entryCount = groupData.entries.length;
  const isFirstEntry = activeEntryIndex === 0;
  const isLastEntry = activeEntryIndex === entryCount - 1;

  useEffect(() => {
    if (entryCount < 2 && tab === 'Overall') setTab('Summary');
  }, [entryCount, tab, setTab]);

  const isSummaryLikeTab = tab === 'Summary' || tab === 'Succeeding' || tab === 'Overall';
  const isEntryScopedTab = tab === 'Machine' || tab === 'Summary' || tab === 'Succeeding';

  const statusText = String(master?.status ?? 'draft').toLowerCase();
  const terminalStatuses = ['approved', 'rejected', 'archived', 'withdrawn', 'cancelled'];
  const isTerminal = terminalStatuses.includes(statusText);
 
  const isPreparer = isCurrentRoute && (Number(auth?.user?.id) === Number(master?.user_id ?? -1));
  const canWithdraw = isPreparer && !isTerminal && Number(master?.current_level ?? 0) >= 2;
  const canCancel = isPreparer && !isTerminal;
  const showPreparerCurrentActions = isSummaryLikeTab && (canWithdraw || canCancel);
 
  const showDraftWatermark = !isCurrentRoute && statusText === 'draft';
  const showCurrentSummaryApprovalActions = isSummaryLikeTab && isCurrentRoute;
 
  const levelNum = Number(viewerLevel ?? 0);
  const projectLevel = Number(master?.current_level ?? 0);
  const isAssignedApproverLevel = levelNum >= 2 && levelNum <= 6 && levelNum === projectLevel;
  const canApprove = isAssignedApproverLevel && levelNum === 6;
  const showApprovalButtons = showCurrentSummaryApprovalActions && isAssignedApproverLevel;

  const handlePrevEntry = () => {
    if (!isFirstEntry) {
      const targetIndex = activeEntryIndex - 1;
      switchActiveEntry(targetIndex);
      if (reference) {
        router.reload({
          only: ['project', 'entryProject', 'projectNotes', 'projectComments', 'activeEntryIndex'],
          data: { entry: targetIndex },
          preserveScroll: true,
          preserveState: true,
        });
      }
      const contractType = groupData.entries[targetIndex]?.companyInfo?.contractType;
      toast(`Entry ${targetIndex + 1}${contractType ? `: ${contractType}` : ''}`, {
        duration: 2500,
      });
    }
  };

  const handleNextEntry = () => {
    if (!isLastEntry) {
      const targetIndex = activeEntryIndex + 1;
      switchActiveEntry(targetIndex);
      if (reference) {
        router.reload({
          only: ['project', 'entryProject', 'projectNotes', 'projectComments', 'activeEntryIndex'],
          data: { entry: targetIndex },
          preserveScroll: true,
          preserveState: true,
        });
      }
      const contractType = groupData.entries[targetIndex]?.companyInfo?.contractType;
      toast(`Entry ${targetIndex + 1}${contractType ? `: ${contractType}` : ''}`, {
        duration: 2500,
      });
    }
  };

  const handleGoBack = () => {
    if (isCurrentRoute) {
      router.visit(ziggyRoute('roi.current'));
    } else if (isArchiveRoute) {
      router.visit(ziggyRoute('roi.archive'));
    } else {
      router.visit(ziggyRoute('roi.entry.list'));
    }
  };
 
  const { openPrintPage } = usePrintPage({
    tab,
    entryProject: entryProjects?.[activeEntryIndex] ?? master,
    routeName,
    projectRef,
    createdBy: master?.user?.name ?? '—',
    showDraftWatermark,
    groupData,
  });

  return (
    <>
      <Head title="ROI Multiple Entry" />
      <div className="min-h-screen flex flex-col print:min-h-0 print:block">
        <div className="flex-1 pb-24">
          <div className="md:px-2 pt-1 md:pt-6 pb-2 md:pb-3 grid grid-cols-3 items-end justify-between gap-2 mx-4 sm:mx-6 md:mx-10 print:mx-0 print:pt-0">
            <div className="col-span-2 flex items-baseline md:gap-1">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex mr-2 mt-3 md:mt-2 self-center w-7 h-7 md:w-8 md:h-8 items-center justify-center pr-0.5 rounded-full bg-[#B5EBA2]/20 backdrop-blur border border-darkgreen/10 hover:bg-[#B5EBA2]/70 hover:shadow-[0_0_10px_#B5EBA2]/50 transition-all print:hidden"
              >
                <IoIosArrowBack size={20} className="text-darkgreen" />
              </button>
              <div className="flex flex-col md:flex-row md:items-baseline md:gap-1">
                <h1 className="font-semibold mt-3 text-xs sm:text-sm md:text-base">Project ROI Approval</h1>
                <p className="hidden md:block md:mt-3">/</p>
                <p className="text-lg sm:text-xl md:text-3xl font-semibold">
                  {isCurrentRoute ? 'Current' : isArchiveRoute ? 'Archive' : `Entry ${activeEntryIndex + 1}`}
                </p>
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-0.5 md:gap-1 items-end pb-1">
              <h1 className="text-[10px] md:text-xs text-right text-slate-500">{formattedDate}</h1>
              <p className="text-[10px] md:text-xs text-right text-slate-500">
                Reference: {projectRef}
              </p>
            </div>
          </div>

          <div className="mx-5 flex items-end justify-between gap-2">
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

              {entryCount > 1 && (
                <button
                  onClick={() => setTab('Overall')}
                  className={`px-7 text-sm py-1 ${
                    tab === 'Overall'
                      ? 'bg-[#f8f8f8] border border-t-[#2c2c2e]/20 font-semibold border-b-0 border-x-[#2c2c2e]/20 rounded-t-xl'
                      : 'bg-[#B5EBA2]/50 mt-2 pt-2 rounded-t-xl'
                  }`}
                >
                  Overall Summary
                </button>
              )}

              {/* <button
                onClick={() => setTab('Succeeding')}
                className={`px-7 text-sm py-1 ${
                  tab === 'Succeeding'
                    ? 'bg-[#f8f8f8] border border-t-[#2c2c2e]/20 font-semibold border-b-0 border-x-[#2c2c2e]/20 rounded-t-xl'
                    : 'bg-[#B5EBA2]/50 mt-2 pt-2 rounded-t-xl'
                }`}
              >
                Succeeding Years
              </button> */}
            </div>

            {/* Entry navigation: prev arrow, page indicator, next arrow, add, remove.
                Hidden on Overall Summary — that tab shows every entry at once,
                so per-entry navigation doesn't apply. */}
            {isEntryScopedTab && (
              <div className="flex items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={handlePrevEntry}
                  disabled={isFirstEntry}
                  className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                  aria-label="Previous entry"
                >
                  <IoIosArrowBack className="text-base" />
                </button>

                <span className="text-xs md:text-sm font-medium text-gray-700 min-w-[80px] text-center">
                  Entry {activeEntryIndex + 1} of {entryCount}
                </span>

                <button
                  type="button"
                  onClick={handleNextEntry}
                  disabled={isLastEntry}
                  className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 rotate-180"
                  aria-label="Next entry"
                >
                  <IoIosArrowBack className="text-base" />
                </button>

                {!readOnly && (
                  <>
                    <button type="button" onClick={addEntry} className="p-1.5 rounded-lg border border-darkgreen text-darkgreen hover:bg-lightgreen/30" aria-label="Add entry">
                      <IoAddCircleOutline className="text-base" />
                    </button>
                    <button type="button" onClick={() => removeEntry(activeEntryIndex)} disabled={entryCount <= 1} className="p-1.5 rounded-lg bg-red-50 border border-red-400 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-50" aria-label="Remove current entry">
                      <IoRemoveCircleOutline className="text-base" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {tab === 'Machine' ? (
            <MachineConfigTab
              key={`group-machine-${projectRef}-${activeEntryIndex}-${resetKey}`}
              readOnly={readOnly}
              buttonClicked={buttonClicked}
              showCompanyInfoErrors={showCompanyInfoErrors}
              showOutrightErrors={showOutrightErrors}
              showModeErrors={showModeErrors}
            />
          ) : tab === 'Summary' ? (
            <Summary1stYear key={`group-summary-${projectRef}-${activeEntryIndex}-${resetKey}`} signatures={signatures} hideSignatories={entryCount > 1} />
          ) : tab === 'Succeeding' ? (
            <SucceedingYears key={`group-succeeding-${projectRef}-${activeEntryIndex}-${resetKey}`} signatures={signatures} />
          ) : tab === 'Overall' ? (
            // Not entry-scoped — no activeEntryIndex in the key, since it renders
            // every entry in one pass regardless of which one is "active."
            <OverallSummary key={`group-overall-${projectRef}-${resetKey}`} />
          ) : null}
        </div>

        <div className="sticky bottom-9 rounded-full md:rounded-none mx-2 md:mx-0 md:bottom-0 z-40 bg-[#f5f5f701] backdrop-blur-[3px] md:backdrop-blur border md:border-t md:border-x-0 border-black/15 shadow-2xl shadow-white">
          {isEntryRoute && !readOnly ? (
            <div className="px-3 md:px-10 py-1.5 md:py-2 flex items-center justify-between gap-2 relative">
              <button type="button" onClick={handleClearAll} className="w-auto flex items-center justify-center text-xs md:text-sm gap-2 px-2.5 md:px-5 py-1 rounded-xl border border-[#F27373] hover:shadow-innerRed text-red-600 hover:bg-[#F27373]/10 font-semibold disabled:opacity-50">
                Clear All
              </button>
              {isSummaryLikeTab && (
                <div className="static sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-4">
                  <button type="button" onClick={() => openPrintPage(false)} className="group relative flex items-center justify-center md:border md:border-green p-1.5 rounded-xl md:bg-lightgreen/20 hover:shadow-innerGreen text-black transition-all">
                    <LuScanEye className="text-[17px] md:text-xl" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 sm:text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                      Print Preview
                    </span>
                  </button>
                  <button type="button" onClick={() => openPrintPage(true)} className="group relative flex items-center justify-center md:border md:border-green p-1.5 rounded-xl md:bg-lightgreen/20 hover:shadow-innerGreen text-black transition-all">
                    <IoPrintSharp className="text-[17px] md:text-xl" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 sm:text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                      Print
                    </span>
                  </button>
                </div>
              )}
              <div className="flex items-center justify-center sm:justify-end gap-1 md:gap-3">
                <button type="button" onClick={handleSaveDraft} className="flex-1 sm:flex-none flex items-center whitespace-nowrap justify-center text-xs md:text-sm gap-2 px-2.5 md:px-4 py-1 rounded-xl border border-darkgreen text-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800]/10 font-semibold disabled:opacity-50">
                  Save Draft
                </button>
                <button type="button" onClick={handleSubmit} className="flex-1 sm:flex-none flex items-center justify-center text-xs md:text-sm gap-2 px-3 md:px-5 py-1 rounded-xl bg-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-semibold shadow disabled:opacity-50">
                  Submit
                </button>
              </div>
            </div>
          ) : isCurrentRoute && readOnly ? (
            isSummaryLikeTab ? (
              <div className="px-3 md:px-10 py-1.5 md:py-2 flex justify-between gap-2 sm:gap-0 items-center">
                <div className="flex items-center justify-center sm:justify-start flex-wrap gap-4 sm:gap-2">
                  {showApprovalButtons && (
                    <>
                      <button type="button" onClick={handleReject} className="flex items-center text-xs md:text-sm gap-2 px-2 sm:px-3 md:px-4 py-1 rounded-xl border border-[#F27373] hover:bg-[#F27373]/20 text-red-600 bg-[#F27373]/5 font-semibold">
                        Disapprove
                      </button>
                      <button type="button" onClick={handleBackToSender} className="flex items-center text-xs md:text-sm gap-1 px-1 sm:px-2.5 md:px-3 py-0 sm:py-0.5 md:py-1 rounded-xl border border-amber-400 bg-amber-50/50 hover:bg-amber-100 text-amber-600 font-semibold">
                        <TiArrowBack className="text-[25px] sm:text-[21px] md:text-xl"/><span className="hidden sm:inline">Send Back</span>
                      </button>
                    </>
                  )}
                  {showPreparerCurrentActions && canWithdraw && (
                    <button type="button" onClick={handleWithdraw} className="group relative flex items-center gap-1 px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-[#0565D2]/50 text-[#0565D2] text-xs md:text-sm hover:shadow-innerSkyBlue font-semibold bg-blue-400/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-blue-400/20 hover:border-[#0565D2]/70 transition-all duration-200">
                      <FaUndo className="text-xs md:text-md"/> Withdraw
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a4e9c] px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md z-10">Withdraw Proposal</span>
                    </button>
                  )}
                </div>
                {(
                  <div className="flex items-center justify-center flex-wrap gap-4">
                    <button type="button" onClick={() => openPrintPage(false)} className="group relative flex items-center justify-center md:border md:border-green p-1.5 sm:p-2 rounded-lg md:rounded-xl md:bg-lightgreen/20 hover:shadow-innerGreen text-black transition-all">
                      <LuScanEye className="text-[17px] md:text-xl" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">Print Preview</span>
                    </button>
                    <button type="button" onClick={() => openPrintPage(true)} className="group relative flex items-center justify-center md:border md:border-green p-1.5 sm:p-2 rounded-lg md:rounded-xl md:bg-lightgreen/20 hover:shadow-innerGreen text-black transition-all">
                      <IoPrintSharp className="text-[17px] md:text-xl" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">Print</span>
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-center sm:justify-end flex-wrap gap-3">
                  {showPreparerCurrentActions && canCancel && (
                    <button type="button" onClick={handleCancel} className="group relative flex items-center gap-1 px-2 xl:px-3 py-1 md:py-1.5 rounded-xl border border-[#F27373] text-red-600 text-xs md:text-sm hover:shadow-innerRed hover:bg-[#F27373]/10 font-semibold transition-all">
                      <MdOutlineCancel size={16}/> Cancel
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md z-10">Cancel Proposal</span>
                    </button>
                  )}
                  {showApprovalButtons && (
                    !canApprove ? (
                      <button type="button" onClick={() => handleAdvance(master?.id)} className="flex items-center text-xs md:text-sm gap-1.5 md:gap-2 px-1 sm:px-4 md:px-5 py-0 sm:py-1 rounded-xl sm:bg-darkgreen border border-darkgreen sm:border-0 hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-medium sm:font-semibold md:shadow">
                        <span className="hidden sm:inline">Submit to Next Level</span><TiArrowForward className="text-[25px] sm:text-[21px] md:text-xl text-darkgreen hover:text-white sm:text-white"/>
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleApprove(master?.id)} className="flex items-center text-xs md:text-sm gap-1 md:gap-2 px-2.5 sm:px-3 md:px-4 py-1 rounded-xl bg-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-semibold shadow">
                        <MdVerified /><span>Approve</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="px-3 sm:px-10 py-3 flex items-center justify-end" />
            )
          ) : isArchiveRoute && readOnly ? (
            isSummaryLikeTab ? (
              <div className="px-3 sm:px-10 py-1 md:py-2 flex items-center justify-center gap-4">
                <button type="button" onClick={() => openPrintPage(false)} className="group relative flex items-center justify-center md:border md:border-green p-1.5 sm:p-2 rounded-lg md:rounded-xl md:bg-lightgreen/50 hover:shadow-innerGreen text-black transition-all">
                  <LuScanEye className="text-[19px] md:text-xl" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">Print Preview</span>
                </button>
                <button type="button" onClick={() => openPrintPage(true)} className="group relative flex items-center justify-center md:border md:border-green p-1.5 sm:p-2 rounded-lg md:rounded-xl md:bg-lightgreen/50 hover:shadow-innerGreen text-black transition-all">
                  <IoPrintSharp className="text-[19px] md:text-xl" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">Print</span>
                </button>
              </div>
            ) : (
              <div className="px-3 sm:px-10 py-3 flex items-center justify-end" />
            )
          ) : (
            <div className="px-3 sm:px-10 py-3 flex items-center justify-end" />
          )}
        </div>
      </div>

      {showSendBackModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/35" onClick={() => setShowSendBackModal(false)} />
          <div className="relative w-[92%] max-w-xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden">
            <div className="px-8 pt-8 pb-4">
              <h2 className="text-2xl font-extrabold tracking-wide text-black">SEND BACK TO SENDER</h2>
              <p className="mt-2 text-sm text-slate-500">Please add a {sendBackLabel} before continuing.</p>
            </div>
            <div className="px-8 pb-8">
              {sendBackEntryOptions && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Which entry is this for?</label>
                  <div className="flex flex-col gap-2">
                    {sendBackEntryOptions.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="sendBackTargetId"
                          checked={sendBackTargetId === opt.id}
                          onChange={() => setSendBackTargetId(opt.id)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <textarea value={sendBackText} onChange={(e) => setSendBackText(e.target.value)} placeholder={`Write your ${sendBackLabel} here...`} className="w-full min-h-[160px] rounded-xl border border-slate-300 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]" />
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowSendBackModal(false)} className="px-5 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold">Cancel</button>
                <button type="button" onClick={submitSendBack} className="px-5 py-2 rounded-lg bg-[#CD4E00] hover:bg-orange-700 text-white font-semibold">Yes, Send Back</button>
              </div>
            </div>
          </div>
        </div>
      )}
   
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/35" onClick={() => setShowWithdrawModal(false)} />
          <div className="relative w-[92%] max-w-xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden">
            <div className="px-8 pt-8 pb-4">
              <h2 className="text-2xl font-extrabold tracking-wide text-[#0565D2]">WITHDRAW PROJECT</h2>
              <p className="mt-2 text-sm text-slate-500">This will pull the project out of the approval pipeline and return it to your entry list. You can resubmit it after making changes.</p>
            </div>
            <div className="px-8 pb-4">
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800"><span className="font-semibold">Reference:</span> {projectRef}</div>
            </div>
            <div className="px-8 pb-8">
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowWithdrawModal(false)} className="px-5 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold">Go Back</button>
                <button type="button" onClick={submitWithdraw} className="px-5 py-2 rounded-lg bg-[#0565D2] hover:bg-blue-700 text-white font-semibold">Yes, Withdraw</button>
              </div>
            </div>
          </div>
        </div>
      )}
   
      {showCancelModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/35" onClick={() => setShowCancelModal(false)} />
          <div className="relative w-[92%] max-w-xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden">
            <div className="px-8 pt-8 pb-4">
              <h2 className="text-2xl font-extrabold tracking-wide text-red-600">CANCEL PROJECT</h2>
              <p className="mt-2 text-sm text-slate-500">This will permanently archive the project with a <span className="font-semibold text-slate-700">Cancelled</span> status. This action cannot be undone.</p>
            </div>
            <div className="px-8 pb-4">
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"><span className="font-semibold">Reference:</span> {projectRef}</div>
            </div>
            <div className="px-8 pb-8">
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCancelModal(false)} className="px-5 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold">Go Back</button>
                <button type="button" onClick={submitCancel} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold">Yes, Cancel Project</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Page entry point — mounts GroupProjectProvider around the form.
 * There is no globally-mounted GroupProjectProvider (unlike ProjectContext,
 * which Entry.jsx relies on being provided app-wide), so it's scoped here.
 */
export default function GroupEntry(props) {
  return (
    <GroupProjectProvider>
      <GroupEntryForm {...props} />
    </GroupProjectProvider>
  );
}

GroupEntry.layout = (page) => <AuthenticatedLayout children={page} />;