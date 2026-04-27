import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { route as ziggyRoute } from 'ziggy-js';

import { toast } from 'sonner';

import CompanyInfoBlock from '@/Components/sprf/CompanyInfoBlock';
import RemarksBlock from '@/Components/sprf/RemarksBlock';
import SprfMetaBlock from '@/Components/sprf/SprfMetaBlock';
import SummaryBlock from '@/Components/sprf/SummaryBlock';
import SprfItemsTable from '@/Components/sprf/SprfItemsTable';
import SprfOtherExpenseTable from '@/Components/sprf/SprfOtherExpenseTable';
import Conditions from '@/Components/sprf/Conditions';
import NamesBlock from '@/Components/sprf/NamesBlock';
import { APPROVAL_LEVEL, buildSigner, buildSprfPayload, computeExpense, computeItem, computeItemTotals, computeRebateTotal, computeSummary, createSprfFormState, finalApprovalLevelNumber, formatDateTime, resolveApprovalLevel, serializeRemarksRows, sprfFormReducer, validateAdvance, validateDraft, validateSubmit, } from '@/utils/sprf';

function Entry({
  approverUsers = {},
  initialProject = null,
  project = null,
  readOnly = false,
  route: pageRoute = 'entry',
  createdBy = '—',
  canActOnCurrentProject = false,
}) {
  const { auth } = usePage().props;

  const sourceProject = initialProject ?? project;

  const now = new Date();

  const formattedHeaderDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(now);

  const liveDateTime = `${now.toLocaleDateString('en-US')} ${now.toLocaleTimeString('en-US', {
    hour12: false,
  })}`;

  const pageLabel = pageRoute === 'current' ? 'Current' : pageRoute === 'archive' ? 'Archive' : 'Entry';

  const pageTitle = pageRoute === 'entry' ? 'Project SPRF' : 'Project SPRF Approval';

  const displayDateTime = useMemo(() => {
    if (pageRoute === 'archive') {
      return (
        formatDateTime(
          sourceProject?.approved_at ??
          sourceProject?.rejected_at ??
          sourceProject?.submitted_at ??
          sourceProject?.last_saved_at
        ) || liveDateTime
      );
    }

    if (pageRoute === 'current') {
      return (
        formatDateTime(
          sourceProject?.submitted_at ??
          sourceProject?.last_saved_at
        ) || liveDateTime
      );
    }

    return liveDateTime;
  }, [
    pageRoute,
    sourceProject?.approved_at,
    sourceProject?.rejected_at,
    sourceProject?.submitted_at,
    sourceProject?.last_saved_at,
    liveDateTime,
  ]);

  const lastSavedDisplay = useMemo(() => {
    if (!sourceProject?.last_saved_at) {
      return '—';
    }

    return formatDateTime(sourceProject.last_saved_at);
  }, [sourceProject?.last_saved_at]);

  const [form, dispatch] = useReducer(sprfFormReducer, null, () => createSprfFormState(sourceProject) );
  const { sprfNo, companyInfo, remarks, rebateJustification, items, otherExpenses, } = form;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const hydratedProjectIdRef = useRef(null);
      useEffect(() => {
        const currentProjectId = sourceProject?.id ?? null;

        if (hydratedProjectIdRef.current === currentProjectId) {
          return;
        }

        hydratedProjectIdRef.current = currentProjectId;

        dispatch({
          type: 'HYDRATE_PROJECT',
          sourceProject,
        });
      }, [sourceProject?.id]);

  const computedItems = useMemo(() => items.map(computeItem), [items]);
  const computedExpenses = useMemo(() => otherExpenses.map(computeExpense), [otherExpenses]);

  const summary = useMemo(
    () => computeSummary(computedItems, computedExpenses),
    [computedItems, computedExpenses]
  );

  const itemTotals = useMemo(
    () => computeItemTotals(computedItems),
    [computedItems]
  );

  const rebateTotal = useMemo(
    () => computeRebateTotal(computedExpenses),
    [computedExpenses]
  );

  const hasRebate = rebateTotal > 0;

  const computedApprovalLevel = useMemo(() => {
    return resolveApprovalLevel({
      revenue: summary.revenue,
      totalGpPercent: summary.totalGpPercent,
      hasRebate,
    });
  }, [summary.revenue, summary.totalGpPercent, hasRebate]);

  const approvalLevel = sourceProject?.approval_level ?? computedApprovalLevel;

  const showVpCcto = approvalLevel !== APPROVAL_LEVEL.ESD_ONLY;
  const showPresidentCeo = approvalLevel === APPROVAL_LEVEL.PRESIDENT_AND_CEO;

  const isEntryRoute = pageRoute === 'entry';
  const isCurrentRoute = pageRoute === 'current';
  const isArchiveRoute = pageRoute === 'archive';

  const isFinalApprover = Number(sourceProject?.current_level || 0) === finalApprovalLevelNumber(approvalLevel);

  const isDirectorCustomerEngagementStep = Number(sourceProject?.current_level || 0) === 2;

  const canEditRebateJustification =
    isCurrentRoute &&
    readOnly &&
    canActOnCurrentProject &&
    isDirectorCustomerEngagementStep;

  const isRebateJustificationRequired = canEditRebateJustification && hasRebate;

  const signatories = useMemo(() => {
    const preparerName =
      sourceProject?.prepared_by_name ??
      auth?.user?.name ??
      [auth?.user?.first_name, auth?.user?.last_name].filter(Boolean).join(' ') ??
      createdBy ??
      '';

    const preparerActualPosition = auth?.user?.position ?? '';

    return {
      preparer: buildSigner({
        name: preparerName,
        title: 'PM INCHARGE',
        lookupPosition: preparerActualPosition,
      }),
      directorCustomerEngagement: buildSigner({
        name: approverUsers?.directorCustomerEngagement?.name ?? '',
        title: 'DIRECTOR - CUSTOMER ENGAGEMENT',
        lookupPosition:
          approverUsers?.directorCustomerEngagement?.position ??
          'DIRECTOR - CUSTOMER ENGAGEMENT',
      }),
      esdDirector: buildSigner({
        name: approverUsers?.esdDirector?.name ?? '',
        title: 'DIRECTOR - ENTERPRISE SOLUTIONS',
        lookupPosition: approverUsers?.esdDirector?.position ?? 'Director - Enterprise Solutions',
      }),
      vpCcto: buildSigner({
        name: approverUsers?.vpCcto?.name ?? '',
        title: 'VP & CCTO',
        lookupPosition: approverUsers?.vpCcto?.position ?? 'VP & CCTO',
      }),
      presidentCeo: buildSigner({
        name: approverUsers?.presidentCeo?.name ?? '',
        title: 'President & CEO',
        lookupPosition: approverUsers?.presidentCeo?.position ?? 'President & CEO',
      }),
    };
  }, [
    sourceProject?.prepared_by_name,
    createdBy,
    auth?.user?.name,
    auth?.user?.first_name,
    auth?.user?.last_name,
    auth?.user?.position,
    approverUsers,
  ]);

  const updateItem = (index, field, value) => {
    dispatch({ type: 'UPDATE_ITEM', index, field, value, });
  };

  const addItemRow = (index) => {
    dispatch({ type: 'ADD_ITEM_ROW', index, });
  };

  const removeItemRow = (index) => {
    dispatch({ type: 'REMOVE_ITEM_ROW', index, });
  };

  const updateExpense = (index, field, value) => {
    dispatch({ type: 'UPDATE_EXPENSE', index, field, value, });
  };

  const addExpenseRow = (index) => {
    dispatch({ type: 'ADD_EXPENSE_ROW', index, });
  };

  const removeExpenseRow = (index) => {
    dispatch({ type: 'REMOVE_EXPENSE_ROW', index, });
  };

  const buildPayload = () =>
    buildSprfPayload({
      sourceProject,
      sprfNo,
      companyInfo,
      remarks,
      rebateJustification,
      items,
      otherExpenses,
      summary,
    });

  const openPrintPage = (autoPrint = false) => {
    const projectId = sourceProject?.id;

    const printRouteName = isCurrentRoute
      ? 'sprf.current.print'
      : isArchiveRoute
        ? 'sprf.archive.print'
        : isEntryRoute
          ? 'sprf.entry.projects.print'
          : null;

    if (!projectId || !printRouteName) {
      window.alert('Please save draft first before printing.');
      return;
    }

    let storageKey = null;

    try {
      storageKey = `sprf-print:${projectId}:${Date.now()}`;

      const snapshot = {
        sprfNo,
        status: sourceProject?.status ?? 'draft',
        companyInfo,
        remarks: serializeRemarksRows(remarks),
        lastRejectNote: sourceProject?.last_reject_note ?? '',
        rebateJustification,
        items,
        otherExpenses,
        signatories,
      };

      sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('SPRF print snapshot could not be stored.', error);
      storageKey = null;
    }

    const params = new URLSearchParams();
    params.set('autoprint', autoPrint ? '1' : '0');

    params.set(
      'draftWatermark',
      isEntryRoute && sourceProject?.status === 'draft' ? '1' : '0'
    );

    if (storageKey) {
      params.set('storageKey', storageKey);
    }

    const href = `${ziggyRoute(printRouteName, projectId)}?${params.toString()}`;

    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

 const handleSaveDraft = () => {
    if (isSubmitting || readOnly) return;

    const validation = validateDraft({ companyInfo });

    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setIsSubmitting(true);

    router.post(ziggyRoute('sprf.entry.draft.save'), buildPayload(), {
      preserveScroll: true,
      preserveState: true,
      onFinish: () => {
        setIsSubmitting(false);
      },
    });
 };

 const handleSubmit = () => {
    if (isSubmitting || readOnly) return;

        const validation = validateSubmit({
          sourceProject,
          companyInfo,
          items,
          remarks,
        });

        if (!validation.ok) {
          toast.error(validation.message);
          return;
        }

    setIsSubmitting(true);

    router.patch(
      ziggyRoute('sprf.entry.projects.submit', sourceProject.id),
      buildPayload(),
      {
        preserveScroll: true,
        preserveState: true,
        onError: (errors) => {
          const firstError = Object.values(errors || {})[0];
          if (firstError) {
            toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
          }
        },
        onFinish: () => {
          setIsSubmitting(false);
        },
      }
    );
 };

const handleClearAll = () => {
  if (readOnly) return;

  toast.custom((t) => (
    <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-2xl bg-white  p-4 shadow-lg">
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-900">Clear all data?</p>
        <p className="mt-1 text-xs text-zinc-500">
          This action cannot be undone.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div
          onClick={() => toast.dismiss(t)}
          className="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:bg-zinc-100"
        >
          Cancel
        </div>

        <div
          onClick={() => {
            toast.dismiss(t);

            dispatch({ type: 'CLEAR_FORM', sourceProject });

            toast.success('All data cleared.');
          }}
          className="cursor-pointer rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600"
        >
          Confirm
        </div>
      </div>
    </div>
  ));
};

  const handleAdvanceCurrent = () => {
    if (isSubmitting || !sourceProject?.id) return;

    const validation = validateAdvance({
      isDirectorCustomerEngagementStep,
      hasRebate,
      rebateJustification,
    });

    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setIsSubmitting(true);

    router.post(
      ziggyRoute('sprf.current.advance', sourceProject.id),
      {
        rebate_justification: rebateJustification,
      },
      {
        preserveScroll: true,
        onError: (errors) => {
          const firstError = Object.values(errors || {})[0];
          if (firstError) {
            toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
          }
        },
        onFinish: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleApproveCurrent = () => {
    if (isSubmitting || !sourceProject?.id) return;

    setIsSubmitting(true);

    router.post(
      ziggyRoute('sprf.current.approve', sourceProject.id),
      {},
      {
        preserveScroll: true,
        onFinish: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleRejectCurrent = () => {
    if (isSubmitting || !sourceProject?.id) return;

    setIsSubmitting(true);

    router.post(
      ziggyRoute('sprf.current.reject', sourceProject.id),
      { body: rejectNote },
      {
        preserveScroll: true,
        onFinish: () => {
          setIsSubmitting(false);
          setShowRejectModal(false);
          setRejectNote('');
        },
      }
    );
  };

  const setCompanyInfo = (nextValueOrUpdater) => {
    dispatch({
      type: 'SET_COMPANY_INFO',
      value:
        typeof nextValueOrUpdater === 'function'
          ? nextValueOrUpdater(companyInfo)
          : nextValueOrUpdater,
    });
  };

  const setRemarks = (value) => {
    dispatch({
      type: 'SET_REMARKS',
      value,
    });
  };

  const setRebateJustification = (value) => {
    dispatch({
      type: 'SET_REBATE_JUSTIFICATION',
      value,
    });
  };

  return (
    <>
      <Head title={`SPRF ${pageLabel}`} />

      <div className="min-h-screen flex flex-col print:min-h-0 print:block">
      <div className="flex-1">
        <div className="px-2 pt-8 pb-3 flex justify-between mx-10 print:mx-0 print:pt-0">
          <div className="flex gap-1">
            <h1 className="font-semibold mt-3">{pageTitle}</h1>
            <p className="mt-3">/</p>
            <p className="text-3xl font-semibold">{pageLabel}</p>
          </div>

          <div className="flex flex-col gap-1 items-end">
            <h1 className="text-xs text-right text-slate-500">{formattedHeaderDate}</h1>
            <p className="text-xs text-right text-slate-500">
              Last Saved: {lastSavedDisplay}
            </p>
          </div>
        </div>

        <div className="mx-10 pb-28 print:mx-0 print:pb-0">
          <div className="print-avoid-break overflow-hidden rounded-2xl border border-[#2c2c2e]/20 bg-[#f8f8f8] shadow-md print:shadow-none print:border-none print:bg-transparent print:justify-center">
            <div className="bg-[#B5EBA2]/50 px-6 py-2 border border-b-[#2c2c2e]/10 text-center text-[15px] font-bold uppercase tracking-wide">
              IT Solutions Special Price Request Form
            </div>

            <div className="p-6 print:p-0">
              <div className="grid grid-cols-12 gap-6 print:grid-cols-[50%_50%] print:gap-2">
                <div className="col-span-8 space-y-3 print:space-y-1">
                  <CompanyInfoBlock
                    value={companyInfo}
                    onChange={setCompanyInfo}
                    readOnly={readOnly}
                  />

                  <RemarksBlock
                    value={remarks}
                    onChange={setRemarks}
                    readOnly={readOnly}
                    lastRejectNote={isArchiveRoute ? sourceProject?.last_reject_note ?? '' : ''}
                  />
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-1.5 xl:space-y-2 print:col-auto print:space-y-1">
                  <SprfMetaBlock
                    dateTime={displayDateTime}
                    sprfNo={sprfNo}
                  />

                  <SummaryBlock
                    summary={summary}
                  />
                </div>
              </div>

              <div className="mt-6 print:mt-2">
                <SprfItemsTable
                  items={items}
                  computedItems={computedItems}
                  onUpdateItem={updateItem}
                  onAddItemRow={addItemRow}
                  onRemoveItemRow={removeItemRow}
                  totals={itemTotals}
                  readOnly={readOnly}
                />
              </div>

              <div className="mt-6 print:mt-2">
                <SprfOtherExpenseTable
                  otherExpenses={otherExpenses}
                  computedExpenses={computedExpenses}
                  onUpdateExpense={updateExpense}
                  onAddExpenseRow={addExpenseRow}
                  onRemoveExpenseRow={removeExpenseRow}
                  totalOtherExpense={summary.otherExpense}
                  readOnly={readOnly}
                />
              </div>

              <div className="mt-10 grid grid-cols-12 gap-10 items-start print:mt-4 print:gap-2 print:items-start">
                <div className="cols-span-12 lg:col-span-5 print:col-span-5">
                  <Conditions />
                </div>

                <div className="cols-span-12 lg:col-span-7 print:col-span-7">
                  <NamesBlock
                    signatories={signatories}
                    showVpCcto={showVpCcto}
                    showPresidentCeo={showPresidentCeo}
                    showRebateJustification={true}
                    rebateJustification={rebateJustification}
                    onChangeRebateJustification={setRebateJustification}
                    canEditRebateJustification={canEditRebateJustification}
                    isRebateJustificationRequired={isRebateJustificationRequired}
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="sticky bottom-0 z-40 bg-[#f5f5f701] backdrop-blur border-t border-black/10">
          {isEntryRoute && !readOnly ? (
            <div className="px-10 py-3 flex items-center justify-between relative">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-1 rounded-xl border border-[#F27373] hover:shadow-innerRed text-red-600 hover:bg-[#F27373]/10 font-semibold disabled:opacity-50"
              >
                Clear All
              </button>

              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPrintPage(false)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-1 rounded-lg text-sm bg-lightgreen/80 hover:shadow-innerGreen text-black font-medium shadow disabled:opacity-50"
                >
                  Print Preview
                </button>

                <button
                  type="button"
                  onClick={() => openPrintPage(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-1 rounded-lg text-sm bg-lightgreen/80 hover:shadow-innerGreen text-black font-medium shadow disabled:opacity-50"
                >
                  Print
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-1 rounded-xl border border-darkgreen text-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800]/10 font-semibold disabled:opacity-50"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-1 rounded-xl bg-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-semibold shadow disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          ) : isCurrentRoute && readOnly ? (
            <div className="px-10 py-3 grid grid-cols-3 items-center">
              <div className="flex items-center justify-start">
                {canActOnCurrentProject && (
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-1 rounded-xl border border-[#F27373] hover:shadow-innerRed text-red-600 hover:bg-[#F27373]/10 font-semibold disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openPrintPage(false)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-1 rounded-lg text-sm bg-lightgreen/80 hover:shadow-innerGreen text-black font-medium shadow disabled:opacity-50"
                >
                  Print Preview
                </button>

                <button
                  type="button"
                  onClick={() => openPrintPage(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-1 rounded-lg text-sm bg-lightgreen/80 hover:shadow-innerGreen text-black font-medium shadow disabled:opacity-50"
                >
                  Print
                </button>
              </div>

              <div className="flex items-center justify-end">
                {canActOnCurrentProject && (
                  <>
                    {isFinalApprover ? (
                      <button
                        type="button"
                        onClick={handleApproveCurrent}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-5 py-1 rounded-xl bg-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-semibold shadow disabled:opacity-50"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAdvanceCurrent}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-5 py-1 rounded-xl bg-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-semibold shadow disabled:opacity-50"
                      >
                        Submit to Next Level
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : isArchiveRoute && readOnly ? (
            <div className="px-10 py-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openPrintPage(false)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-1 rounded-lg text-sm bg-lightgreen/80 hover:shadow-innerGreen text-black font-medium shadow disabled:opacity-50"
              >
                Print Preview
              </button>

              <button
                type="button"
                onClick={() => openPrintPage(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-1 rounded-lg text-sm bg-lightgreen/80 hover:shadow-innerGreen text-black font-medium shadow disabled:opacity-50"
              >
                Print
              </button>
            </div>
          ) : (
            <div className="px-10 py-3 flex items-center justify-end" />
          )}
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-black/10 p-5">
            <h2 className="text-lg font-bold text-[#111111]">Reject SPRF</h2>
            <p className="text-sm text-slate-500 mt-1">
              Add an optional note for the rejection.
            </p>

            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={5}
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none hover:border-[#28980080] focus:border-[#289800] focus:outline-none focus:ring-0 resize-none"
              placeholder="Enter rejection note"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNote('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectCurrent}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

Entry.layout = (page) => <AuthenticatedLayout children={page} />;

export default Entry;