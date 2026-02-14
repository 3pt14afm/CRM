import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
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


export default function Entry({ activeTab = 'Machine Configuration' }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  const { setProjectData, projectData, resetProject } = useProjectData();
  const [projectRef] = useState(() =>
    `PRJ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  );

  // Set initial tab based on prop (optional, but keeps prop useful)
  const initialTab =
    activeTab === 'Summary' ? 'Summary' :
    activeTab === 'Succeeding' ? 'Succeeding' :
    'Machine';

  const [tab, setTab] = useState(initialTab);
  const [buttonClicked, setButtonClicked] = useState(false);

  const triggerSync = () => {
    setProjectData(prev => ({
      ...prev,
      companyInfo: {
        ...prev.companyInfo,
        reference: projectRef,
      },
      metadata: {
        ...prev.metadata,
        lastSaved: formattedDate
      }
    }));

    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 100);
  };

  const handleSaveAll = () => {
    triggerSync();
    console.log("Submitting Project Data:", projectData);
  };

  const handleSaveDraft = () => {
    triggerSync();
    alert("Draft saved successfully to local storage.");
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all data? This will wipe your draft.")) {
      resetProject();
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

  // Currently on: /customer-management/roi/entry
  // So print is: /customer-management/roi/entry/print
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
            <MachineConfigTab buttonClicked={buttonClicked} />
          ) : tab === 'Summary' ? (
             <Summary1stYear ref={summaryRef} />
          ) : tab === 'Succeeding' ? (
            <SucceedingYears ref={succeedingRef} />
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
                    onClick={handleSaveAll}
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

Entry.layout = page => <AuthenticatedLayout children={page} />;
