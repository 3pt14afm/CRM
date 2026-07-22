import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import SprfAddNotes from '@/Components/sprf/SprfAddNotes';
import SprfAddComments from '@/Components/sprf/SprfAddComments';
import { FaUndo, FaAngleLeft } from 'react-icons/fa';
import { MdOutlineCancel, MdVerified } from 'react-icons/md';
import { LuScanEye } from 'react-icons/lu';
import { IoChevronBack, IoPrintSharp } from 'react-icons/io5';

// Single source of truth for SPRF constants, factories, normalizers,
// calculations, validation, payload-building, and formatting. Unifies both
// old hardcoded logic and the new SprfApproverMatrixController condition
// codes. sprfEntry.jsx should not redefine any of this — fix it here once.
import {
  DEFAULT_SPRF_NO,
  APPROVAL_LEVEL,
  computeGroup,
  computeExpense,
  computeSummary as computeSummaryShared,
  computeItemTotals,
  computeRebateTotal,
  resolveApprovalLevelMatrix,
  makeSubitemRow,
  makeGroupRow,
  makeExpenseRow,
  makeInitialExpenseRows,
  flattenItemsFromApi,
  normalizeExpenseRows,
  normalizeRemarksRows,
  serializeRemarksRows,
  buildSprfPayload,
  hasValidCompanyInfo,
  hasValidItemGroups,
  validateDraft,
  validateAdvance,
  formatDateTime,
  buildSigner,
} from '@/utils/sprf';
import { IoIosArrowBack, IoMdSend } from 'react-icons/io';
import { RiArrowGoBackLine } from 'react-icons/ri';
import { TiArrowBack, TiArrowForward } from 'react-icons/ti';

function Entry({
  approverUsers = {},
  initialProject = null,
  project = null,
  readOnly = false,
  route: pageRoute = 'entry',
  createdBy = '—',
  canActOnCurrentProject = false,
  canWithdraw: canWithdrawProp = false,
  canCancel: canCancelProp = false,
  signatures = {},
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

  const handleGoBack = () => {
    const path = window.location.pathname;

    if (path.includes('/sprf/entry')) {
      router.visit(ziggyRoute('sprf.entry.list'));
    } else if (path.includes('/sprf/archive')) {
      router.visit(ziggyRoute('sprf.archive'));
    } else if (path.includes('/sprf/current')) {
      router.visit(ziggyRoute('sprf.current'));
    } else {
      window.history.back();
    }
  };

  const pageLabel =
    pageRoute === 'current' ? 'Current' : pageRoute === 'archive' ? 'Archive' : 'Entry';

  const pageTitle =
    pageRoute === 'entry' ? 'Project SPRF' : 'Project SPRF Approval';

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
    const lastSavedAt = sourceProject?.last_saved_at ?? sourceProject?.updated_at;

    if (!lastSavedAt) {
      return '—';
    }

    return formatDateTime(lastSavedAt);
  }, [sourceProject?.last_saved_at, sourceProject?.updated_at]);

  const [sprfNo, setSprfNo] = useState(sourceProject?.sprf_no ?? DEFAULT_SPRF_NO);

const [companyInfo, setCompanyInfo] = useState({
  subCategory: '',
  account: '',
  accountManager: '',
  type: null,              // NEW
  companySapCode: null,    // NEW
  potentialCompanyId: null,// NEW
});

  const [remarks, setRemarks] = useState(['']);
  const [rebateJustification, setRebateJustification] = useState('');

  // Pending remark attachment uploads/removals, keyed by remark row index.
  // remarksAttachments[index] = File[] (newly selected, not yet saved)
  // remarksRemovedIndexes = "rowIndex:savedSubIndex" strings to delete on next save
  const [remarksAttachments, setRemarksAttachments] = useState({});
  const [remarksRemovedIndexes, setRemarksRemovedIndexes] = useState([]);

  const handleRemarkImageSelect = (index, files) => {
    setRemarksAttachments((prev) => {
      const next = { ...prev };
      if (files && files.length) {
        next[index] = files;
      } else {
        delete next[index];
      }
      return next;
    });
  };

  const handleRemarkAttachmentRemove = (index, savedSubIndex) => {
    const key = `${index}:${savedSubIndex}`;
    setRemarksRemovedIndexes((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  // Remarks must have at least one file attachment to save/submit — the remark
  // text itself is optional as long as a file is attached. This accounts for
  // attachments already saved on the project (minus any the user just removed)
  // plus any newly-selected files pending upload.
  const hasRemarksAttachment = useMemo(() => {
    const existingAttachments = sourceProject?.attachments ?? {};

    const existingCount = Object.entries(existingAttachments).reduce(
      (count, [rowIndex, subItems]) => {
        const rowAttachments = Array.isArray(subItems) ? subItems : [];
        const remaining = rowAttachments.filter(
          (_, subIndex) => !remarksRemovedIndexes.includes(`${rowIndex}:${subIndex}`)
        );
        return count + remaining.length;
      },
      0
    );

    const newCount = Object.values(remarksAttachments).reduce(
      (count, files) => count + (Array.isArray(files) ? files.length : 0),
      0
    );

    return existingCount + newCount > 0;
  }, [sourceProject?.attachments, remarksAttachments, remarksRemovedIndexes]);

  const [items, setItems] = useState([makeGroupRow()]);
  const [otherExpenses, setOtherExpenses] = useState(() => makeInitialExpenseRows());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [sendBackMessage, setSendBackMessage] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const hydratedProjectIdRef = useRef(null);

  useEffect(() => {
    const currentProjectId = sourceProject?.id ?? null;
    if (hydratedProjectIdRef.current === currentProjectId) {
      return;
    }
    hydratedProjectIdRef.current = currentProjectId;

    if (!sourceProject) {
      setSprfNo(DEFAULT_SPRF_NO);
      setCompanyInfo({
        subCategory: '',
        account: '',
        accountManager: '',
        type: null,               // NEW
        companySapCode: null,     // NEW
        potentialCompanyId: null, // NEW
      });
      setRemarks(['']);
      setRebateJustification('');
      setItems([makeGroupRow()]);
      setOtherExpenses(makeInitialExpenseRows());
      setRemarksAttachments({});
      setRemarksRemovedIndexes([]);
      return;
    }

    setSprfNo(sourceProject?.sprf_no ?? DEFAULT_SPRF_NO);
    setCompanyInfo({
      subCategory: sourceProject?.company_info?.subCategory ?? '',
      account: sourceProject?.company_info?.account ?? '',
      accountManager: sourceProject?.company_info?.accountManager ?? '',
      type: sourceProject?.company_info?.type ?? null,                           // NEW
      companySapCode: sourceProject?.company_info?.companySapCode ?? null,       // NEW
      potentialCompanyId: sourceProject?.company_info?.potentialCompanyId ?? null, // NEW
    });
    setRemarks(normalizeRemarksRows(sourceProject?.remarks ?? ''));
    setRebateJustification(sourceProject?.rebate_justification ?? '');

    setItems(flattenItemsFromApi(sourceProject?.items ?? []));

    setOtherExpenses(normalizeExpenseRows(sourceProject?.other_expenses ?? []));
    setRemarksAttachments({});
    setRemarksRemovedIndexes([]);
  }, [sourceProject?.id]);

  const computedItems = useMemo(() => items.map(computeGroup), [items]);
  const computedExpenses = useMemo(() => otherExpenses.map(computeExpense), [otherExpenses]);

  const summary = useMemo(
    () => computeSummaryShared(computedItems, computedExpenses),
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

  // Compute the expected level if not provided by backend (entry route only —
  // sourceProject is null on a fresh draft so backend flags don't exist yet)
  const computedApprovalLevel = useMemo(
    () =>
      resolveApprovalLevelMatrix({
        hasRebate,
        revenue: summary.revenue,
        totalGpPercent: summary.totalGpPercent,
      }),
    [summary.revenue, summary.totalGpPercent, hasRebate]
  );

  const approvalLevel = sourceProject?.approval_level ?? computedApprovalLevel;

  // ============================================================================ //
  // SIGNATORY VISIBILITY — #3: Trust backend flags when present (current/archive
  // routes), fall back to local derivation only for entry route (fresh draft).
  // ============================================================================ //

  // Backend flags are booleans (true/false) when the project has been saved at
  // least once. On a brand-new entry draft sourceProject is null so both sides
  // of ?? are evaluated — the local derivation is the correct fallback there.
  const showPresidentCeo =
    sourceProject?.requires_president_ceo != null     
      ? Boolean(sourceProject.requires_president_ceo) 
      : (                                               
          approvalLevel === APPROVAL_LEVEL.REBATE_REQUEST ||
          approvalLevel === APPROVAL_LEVEL.GP_LTE_15 ||
          approvalLevel === APPROVAL_LEVEL.PRESIDENT_AND_CEO
        );

  const showVpCcto =
    sourceProject?.requires_vp_ccto != null
      ? Boolean(sourceProject.requires_vp_ccto)
      : (
          showPresidentCeo ||
          approvalLevel === APPROVAL_LEVEL.VALUE_GT_1M ||
          approvalLevel === APPROVAL_LEVEL.VP_AND_CCTO
        );

  const showDirectorCustomerEngagement =
    sourceProject?.requires_rebate_justification != null
      ? Boolean(sourceProject.requires_rebate_justification)
      : sourceProject
        ? sourceProject?.approval_condition_code === 'REBATE_REQUEST'
        : approvalLevel === APPROVAL_LEVEL.REBATE_REQUEST;

  const currentLevel = Number(sourceProject?.current_level || 0);
  
  // Calculate the terminal step mathematically
  const finalLevel = showPresidentCeo ? 5 : (showVpCcto ? 4 : 3);

  const isFinalApprover = 
    sourceProject?.is_final_approver ?? 
    (currentLevel >= finalLevel);

  const isEntryRoute = pageRoute === 'entry';
  const isCurrentRoute = pageRoute === 'current';
  const isArchiveRoute = pageRoute === 'archive';

  // Withdraw/Cancel — Preparer-only actions, only meaningful on the current route.
  // Trust the backend-computed flags (mirrors canActOnCurrentProject); they're the
  // source of truth since the same rules are enforced server-side on submit.
  const canWithdraw = isCurrentRoute && canWithdrawProp;
  const canCancel = isCurrentRoute && canCancelProp;

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

  const updateSubitem = (groupIndex, subIndex, field, value) => {
    setItems((prev) =>
      prev.map((group, gi) => {
        if (gi !== groupIndex) return group;
        return {
          ...group,
          subitems: group.subitems.map((sub, si) =>
            si === subIndex ? { ...sub, [field]: value } : sub
          ),
        };
      })
    );
  };

  const addGroup = () => {
    setItems((prev) => [...prev, makeGroupRow()]);
  };

  const addSubitem = (groupIndex, subIndex) => {
    setItems((prev) =>
      prev.map((group, gi) => {
        if (gi !== groupIndex) return group;
        const next = [...group.subitems];
        next.splice(subIndex + 1, 0, makeSubitemRow());
        return { ...group, subitems: next };
      })
    );
  };

  const removeSubitem = (groupIndex, subIndex) => {
    setItems((prev) => {
      const group = prev[groupIndex];
      if (!group) return prev;

      if (group.subitems.length === 1) {
        if (prev.length === 1) {
          return [makeGroupRow()];
        }
        return prev.filter((_, gi) => gi !== groupIndex);
      }

      return prev.map((g, gi) =>
        gi === groupIndex
          ? { ...g, subitems: g.subitems.filter((_, si) => si !== subIndex) }
          : g
      );
    });
  };

  // Rebate can only be added/edited once revenue reaches 1M; below that
  // threshold it's locked (existing values are preserved, just not editable).
  const rebateLocked = summary.revenue < 1000000;

  // If revenue drops back below 1M while a rebate value is still sitting in
  // the row (e.g. user pushed revenue over 1M, entered a rebate, then
  // removed items again), clear it out rather than silently keeping it
  // locked-but-populated. Skipped on read-only views (submitted/archived
  // records) so we never mutate historical data just by viewing it.
  useEffect(() => {
    if (!rebateLocked || readOnly) return;

    setOtherExpenses((prev) => {
      const idx = prev.findIndex((row) => row.expenseKey === 'rebate');
      if (idx === -1) return prev;

      const row = prev[idx];
      const isAlreadyClear =
        (row.qty === '' || row.qty === null || row.qty === undefined) &&
        (row.unitPrice === '' || row.unitPrice === null || row.unitPrice === undefined) &&
        (row.itemDescription === '' || row.itemDescription === null || row.itemDescription === undefined);

      if (isAlreadyClear) return prev;

      const next = [...prev];
      next[idx] = { ...row, qty: '', unitPrice: '', itemDescription: '' };
      return next;
    });
  }, [rebateLocked, readOnly]);

  const updateExpense = (index, field, value) => {
    setOtherExpenses((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        if (row.isFixed && field === 'productCode') {
          return row;
        }

        if (row.expenseKey === 'rebate' && rebateLocked && field !== 'productCode') {
          return row;
        }

        return { ...row, [field]: value };
      })
    );
  };

  const addExpenseRow = (index) => {
    setOtherExpenses((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, makeExpenseRow());
      return next;
    });
  };

  const removeExpenseRow = (index) => {
    setOtherExpenses((prev) => {
      if (prev.length === 1) return prev;
      if (prev[index]?.isFixed) return prev;
      return prev.filter((_, i) => i !== index);
    });
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
        notes: Array.isArray(sourceProject?.notes) ? sourceProject.notes : [],
        comments: Array.isArray(sourceProject?.comments) ? sourceProject.comments : [],
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
      isEntryRoute && ['draft', 'returned'].includes(sourceProject?.status) ? '1' : '0'
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

    const draftCheck = validateDraft({ companyInfo });
    if (!draftCheck.ok) {
      toast.error(draftCheck.message);
      return;
    }

    if (!hasRemarksAttachment) {
      toast.error('Please attach at least one file in Remarks before saving.');
      return;
    }

    setIsSubmitting(true);

    // 1. Initialize FormData
    const formData = new FormData();

    // 2. Append the main payload values as a JSON string
    formData.append('payload', JSON.stringify(buildPayload()));

    // 3. Append newly-selected remark attachment files, keyed by row index (each row can have multiple files)
    Object.entries(remarksAttachments).forEach(([index, files]) => {
      (files || []).forEach((file) => {
        if (file) {
          formData.append(`remarks_attachments[${index}][]`, file);
        }
      });
    });

    // 3b. Append "rowIndex:savedSubIndex" keys of previously-saved attachments the user removed
    remarksRemovedIndexes.forEach((key) => {
      formData.append('remarks_attachments_remove[]', key);
    });

    // 4. Send FormData with forceFormData enabled
    router.post(ziggyRoute('sprf.entry.draft.save'), formData, {
      forceFormData: true, // <--- Crucial for file uploads
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        setRemarksAttachments({});
        setRemarksRemovedIndexes([]);
        toast.success('Draft saved successfully!');
      },
      onError: (errors) => {
        const firstError = Object.values(errors || {})[0];
        if (firstError) {
          toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
        }
      },
      onFinish: () => {
        setIsSubmitting(false);
      },
    });
  };

  const handleSubmit = () => {
    if (isSubmitting || readOnly) return;

    switch (true) {
      case !sourceProject?.id:
        toast.error('Please save draft first before submitting.');
        return;

      case !hasValidCompanyInfo(companyInfo):
         toast.error("Company Information is required before submitting.");
         return;

      case !hasValidItemGroups(items):
        toast.error("Please add at least one item before submitting.");
        return;

      case !hasRemarksAttachment:
        toast.error('Please attach at least one file in Remarks before submitting.');
        return;

      default:
        break;
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

              setSprfNo(sourceProject?.sprf_no ?? DEFAULT_SPRF_NO);
              setCompanyInfo({
                subCategory: '',
                account: '',
                accountManager: '',
                type: null,               // NEW
                companySapCode: null,     // NEW
                potentialCompanyId: null, // NEW
              });
              setRemarks(['']);
              setRebateJustification('');
              setItems([makeGroupRow()]);
              setOtherExpenses(makeInitialExpenseRows());
              setRemarksAttachments({});
              setRemarksRemovedIndexes([]);

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

    const advanceCheck = validateAdvance({
      isDirectorCustomerEngagementStep,
      hasRebate,
      rebateJustification,
    });

    if (!advanceCheck.ok) {
      toast.error(advanceCheck.message);
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

  const handleSendBack = () => {
    if (isSubmitting || !sourceProject?.id) return;

    if (!sendBackMessage.trim()) {
      return;
    }

    setIsSubmitting(true);

    router.post(
      ziggyRoute('sprf.current.send-back', sourceProject.id),
      { message: sendBackMessage },
      {
        preserveScroll: true,
        onError: (errors) => {
          const firstError = Object.values(errors || {})[0];
          if (firstError) {
            // let Inertia handle error
          }
        },
        onFinish: () => {
          setIsSubmitting(false);
          setShowSendBackModal(false);
          setSendBackMessage('');
        },
      }
    );
  };

  const handleWithdraw = () => {
    if (isSubmitting || !sourceProject?.id) return;

    setIsSubmitting(true);

    router.post(
      ziggyRoute('sprf.current.withdraw', sourceProject.id),
      {},
      {
        preserveScroll: true,
        onStart: () => toast.loading('Withdrawing SPRF...', { id: 'sprf-withdraw' }),
        onSuccess: () => toast.success('SPRF withdrawn and returned to your entry list.', { id: 'sprf-withdraw' }),
        onError: (errors) => {
          const firstError = Object.values(errors || {})[0];
          toast.error(
            Array.isArray(firstError) ? firstError[0] : (firstError || 'Failed to withdraw SPRF.'),
            { id: 'sprf-withdraw' }
          );
        },
        onFinish: () => {
          setIsSubmitting(false);
          setShowWithdrawModal(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (isSubmitting || !sourceProject?.id) return;

    setIsSubmitting(true);

    router.post(
      ziggyRoute('sprf.current.cancel', sourceProject.id),
      {},
      {
        preserveScroll: true,
        onStart: () => toast.loading('Cancelling SPRF...', { id: 'sprf-cancel' }),
        onSuccess: () => toast.success('SPRF cancelled and archived.', { id: 'sprf-cancel' }),
        onError: (errors) => {
          const firstError = Object.values(errors || {})[0];
          toast.error(
            Array.isArray(firstError) ? firstError[0] : (firstError || 'Failed to cancel SPRF.'),
            { id: 'sprf-cancel' }
          );
        },
        onFinish: () => {
          setIsSubmitting(false);
          setShowCancelModal(false);
        },
      }
    );
  };

  return (
    <>
      <Head title={`SPRF ${pageLabel}`} />

      <div className="min-h-screen flex flex-col print:min-h-0 print:block">
      <div className="flex-1">
        <div className="md:px-2 pt-1 md:pt-6 pb-2 md:pb-3 flex flex-wrap items-end justify-between gap-2 mx-4 sm:mx-6 md:mx-10 print:mx-0 print:pt-0">
          <div className="flex items-baseline md:gap-1">
            <button
              type="button"
              onClick={handleGoBack}
              className="flex mr-2 mt-3 md:mt-2 self-center w-7 h-7 md:w-8 md:h-8 items-center justify-center pr-0.5 rounded-full bg-[#B5EBA2]/20 backdrop-blur border border-darkgreen/10 hover:bg-[#B5EBA2]/70 hover:shadow-[0_0_10px_#B5EBA2]/50 transition-all print:hidden"
            >
              <IoIosArrowBack size={20} className="text-darkgreen" />
            </button>
            <div className="flex flex-col md:flex-row md:items-baseline md:gap-1">
              <h1 className="font-semibold mt-3 text-xs sm:text-sm md:text-base">{pageTitle}</h1>
              <p className="hidden md:block md:mt-3">/</p>
              <p className="text-lg sm:text-xl md:text-3xl font-semibold">{pageLabel}</p>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 md:gap-1 items-end pb-1">
            <h1 className="text-[10px] md:text-xs text-right text-slate-500">{formattedHeaderDate}</h1>
            <p className="text-[10px] md:text-xs text-right text-slate-500">
              Last Saved: {lastSavedDisplay}
            </p>
          </div>
        </div>

        <div className="mx-4 sm:mx-6 md:mx-10 pb-28 print:mx-0 print:pb-0">
          <div className="print-avoid-break rounded-2xl border border-[#2c2c2e]/20 bg-[#f8f8f8] shadow-md print:shadow-none print:border-none print:bg-transparent print:justify-center">
            <div className="bg-[#B5EBA2]/50 px-3 rounded-t-2xl sm:px-6 py-1 sm:py-2 border border-b-[#2c2c2e]/10 text-center text-[11px] sm:text-[13px] md:text-[15px] font-bold uppercase tracking-wide">
              IT Solutions Special Price Request Form
            </div>

            <div className="p-2 sm:p-4 md:p-6 print:p-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-6 print:grid-cols-[50%_50%] print:gap-2">
                <div className="md:col-span-8 space-y-3 print:space-y-1">
                  <div className="md:hidden print:hidden">
                    <SprfMetaBlock
                      dateTime={displayDateTime}
                      sprfNo={sprfNo}
                    />
                  </div>

                  <CompanyInfoBlock
                    value={companyInfo}
                    onChange={setCompanyInfo}
                    readOnly={readOnly}
                  />

                  <RemarksBlock
                    key={`remarks-${sourceProject?.id ?? 'new'}-${sourceProject?.last_saved_at ?? 'unsaved'}`}
                    value={remarks}
                    onChange={setRemarks}
                    readOnly={readOnly}
                    lastRejectNote={isArchiveRoute ? sourceProject?.last_reject_note ?? '' : ''}
                    attachments={sourceProject?.attachments ?? {}}
                    onImageSelect={handleRemarkImageSelect}
                    onAttachmentRemove={handleRemarkAttachmentRemove}
                  />
                </div>

                <div className="md:col-span-4 space-y-1.5 xl:space-y-2 print:col-auto print:space-y-1">
                  <div className="hidden md:block">
                    <SprfMetaBlock
                      dateTime={displayDateTime}
                      sprfNo={sprfNo}
                    />
                  </div>

                  <SummaryBlock
                    summary={summary}
                  />
                </div>
              </div>

              <div className="mt-6 print:mt-2">
                <SprfItemsTable
                  items={items}
                  computedItems={computedItems}
                  onUpdateSubitem={updateSubitem}
                  onAddGroup={addGroup}
                  onAddSubitem={addSubitem}
                  onRemoveSubitem={removeSubitem}
                  totals={itemTotals}
                  summary={summary}
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
                  rebateLocked={rebateLocked}
                />
              </div>

              <div className="mt-4 sm:mt-10 w-full flex flex-col items-center justify-center print:mt-4 print:gap-2 print:items-start">
                <div className="flex flex-col md:flex-row gap-3 w-full">
                  <div className="w-full md:w-[40%]">
                    <Conditions />
                  </div>

                  <div className="grid grid-cols-2 w-full md:w-[60%] gap-1 md:gap-2">
                    <SprfAddNotes scopeKey="sprf-main" />
                    <SprfAddComments comments={initialProject?.comments} scopeKey="entry" />
                  </div>
                </div>
                
                <div className="mt-6 w-full lg:w-[85%] xl:w-[75%]">
                  <NamesBlock
                    signatories={signatories}
                    timestamps={{
                      submitted_at: sourceProject?.submitted_at,
                      dce_acted_at: sourceProject?.dce_acted_at,
                      esd_acted_at: sourceProject?.esd_acted_at,
                      vp_ccto_acted_at: sourceProject?.vp_ccto_acted_at,
                      president_ceo_acted_at: sourceProject?.president_ceo_acted_at,
                    }}
                    status={sourceProject?.status}
                    currentLevel={sourceProject?.current_level}
                    rejectedAt={sourceProject?.rejected_at}
                    showDirectorCustomerEngagement={showDirectorCustomerEngagement}
                    showVpCcto={showVpCcto}
                    showPresidentCeo={showPresidentCeo}
                    showRebateJustification={true}
                    rebateJustification={rebateJustification}
                    onChangeRebateJustification={setRebateJustification}
                    canEditRebateJustification={canEditRebateJustification}
                    isRebateJustificationRequired={isRebateJustificationRequired}
                    readOnly={readOnly}
                    signatures={signatures}  

                  />
              </div>

                
              </div>
              
              
              
              
            </div>
          </div>
        </div>
      </div>

        <div className="sticky bottom-9 rounded-full md:rounded-none mx-2 md:mx-0 md:bottom-0 z-40 bg-[#f5f5f501] backdrop-blur-[3px] md:backdrop-blur border md:border-t md:border-x-0 border-black/15 shadow-2xl shadow-white">
          {isEntryRoute && !readOnly ? (
            <div className="px-3 md:px-10 py-1.5 md:py-2 flex items-center justify-between gap-2 relative">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isSubmitting}
                className="w-auto flex items-center justify-center text-xs md:text-sm gap-2 px-2.5 md:px-5 py-1 rounded-xl border border-[#F27373] hover:shadow-innerRed text-red-600 hover:bg-[#F27373]/10 font-semibold disabled:opacity-50"
              >
                Clear All
              </button>

              <div className="static sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openPrintPage(false)}
                  disabled={isSubmitting}
                  className="group relative flex items-center justify-center md:border md:border-green p-1.5 rounded-xl md:bg-lightgreen/20 hover:shadow-innerGreen text-black transition-all"
                >
                  <LuScanEye className="text-[17px] md:text-xl" />
                        
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 sm:text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                    Print Preview
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openPrintPage(true)}
                  disabled={isSubmitting}
                  className="group relative flex items-center justify-center md:border md:border-green p-1.5 rounded-xl md:bg-lightgreen/20 hover:shadow-innerGreen text-black disabled:opacity-50 transition-all"
                >
                  <IoPrintSharp className="text-[17px] md:text-xl" />

                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 sm:text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                    Print
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-1 md:gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none flex items-center whitespace-nowrap justify-center text-xs md:text-sm gap-2 px-2.5 md:px-4 py-1 rounded-xl border border-darkgreen text-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800]/10 font-semibold disabled:opacity-50"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none flex items-center justify-center text-xs md:text-sm gap-2 px-3 md:px-5 py-1 rounded-xl bg-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-semibold shadow disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          ) : isCurrentRoute && readOnly ? (
            <div className="px-3 md:px-10 py-1.5 md:py-2 flex justify-between gap-2 sm:gap-0 items-center">
              <div className="flex items-center justify-center sm:justify-start flex-wrap gap-4 sm:gap-2">
                {canActOnCurrentProject && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isSubmitting}
                      className="flex items-center text-xs md:text-sm gap-2 px-2 sm:px-3 md:px-4 py-1 rounded-xl border border-[#F27373] hover:bg-[#F27373]/20 text-red-600 bg-[#F27373]/5 font-semibold disabled:opacity-50"
                    >
                      Disapprove
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSendBackModal(true)}
                      disabled={isSubmitting}
                      className="flex items-center text-xs md:text-sm gap-1 px-1 sm:px-2.5 md:px-3 py-0 sm:py-0.5 md:py-1 rounded-xl border border-amber-400 bg-amber-50/50 hover:bg-amber-100 text-amber-600 font-semibold disabled:opacity-50"
                    >
                     <TiArrowBack className="text-[25px] sm:text-[21px] md:text-xl"/><span className="hidden sm:inline">Send Back</span>
                    </button>
                  </>
                )}

                {canWithdraw && (
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={isSubmitting}
                    className="group relative flex items-center gap-1 px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-[#0565D2]/50 text-[#0565D2] text-xs md:text-sm hover:shadow-innerSkyBlue font-semibold bg-blue-400/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-blue-400/20 hover:border-[#0565D2]/70 transition-all duration-200"
                        >
                      <FaUndo className="text-xs md:text-md"/> Withdraw
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a4e9c] px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md z-10">
                      Withdraw Proposal
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openPrintPage(false)}
                  disabled={isSubmitting}
                  className="group relative flex items-center justify-center md:border md:border-green p-1.5 sm:p-2 rounded-lg md:rounded-xl md:bg-lightgreen/20 hover:shadow-innerGreen text-black disabled:opacity-50 transition-all"
                >
                  <LuScanEye className="text-[17px] md:text-xl" />

                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                    Print Preview
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openPrintPage(true)}
                  disabled={isSubmitting}
                  className="group relative flex items-center justify-center md:border md:border-green p-1.5 sm:p-2 rounded-lg md:rounded-xl md:bg-lightgreen/20 hover:shadow-innerGreen text-black disabled:opacity-50 transition-all"
                >
                  <IoPrintSharp className="text-[17px] md:text-xl" />

                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                    Print
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-center sm:justify-end flex-wrap gap-3">
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    disabled={isSubmitting}
                    className="group relative flex items-center gap-1 px-2 xl:px-3 py-1 md:py-1.5 rounded-xl border border-[#F27373] text-red-600 text-xs md:text-sm hover:shadow-innerRed hover:bg-[#F27373]/10 font-semibold disabled:opacity-50 transition-all"
                  >
                    <MdOutlineCancel size={16}/> Cancel

                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md z-10">
                        Cancel Proposal
                    </span>
                  </button>
                )}

                {canActOnCurrentProject && (
                  <>
                    {isFinalApprover ? (
                      <button
                        type="button"
                        onClick={handleApproveCurrent}
                        disabled={isSubmitting}
                        className="flex items-center text-xs md:text-sm gap-1 md:gap-2 px-2.5 sm:px-3 md:px-4 py-1 rounded-xl bg-darkgreen hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-semibold shadow disabled:opacity-50"
                      >
                        <MdVerified /><span>Approve</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAdvanceCurrent}
                        disabled={isSubmitting}
                        className="flex items-center text-xs md:text-sm gap-1.5 md:gap-2 px-1 sm:px-4 md:px-5 py-0 sm:py-1 rounded-xl sm:bg-darkgreen border border-darkgreen sm:border-0 hover:shadow-innerDarkgreen hover:bg-[#289800] text-white font-medium sm:font-semibold md:shadow disabled:opacity-50"
                      >
                        <span className="hidden sm:inline">Submit to Next Level</span><TiArrowForward className="text-[25px] sm:text-[21px] md:text-xl text-darkgreen hover:text-white sm:text-white"/>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : isArchiveRoute && readOnly ? (
            <div className="px-3 sm:px-10 py-1 md:py-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openPrintPage(false)}
                disabled={isSubmitting}
                className="group relative flex items-center justify-center md:border md:border-green p-1.5 sm:p-2 rounded-lg md:rounded-xl md:bg-lightgreen/50 hover:shadow-innerGreen text-black transition-all"
              >
                <LuScanEye className="text-[19px] md:text-xl" />
                        
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                  Print Preview
                </span>
              </button>

              <button
                type="button"
                onClick={() => openPrintPage(true)}
                disabled={isSubmitting}
                className="group relative flex items-center justify-center md:border md:border-green p-1.5 sm:p-2 rounded-lg md:rounded-xl md:bg-lightgreen/50 hover:shadow-innerGreen text-black disabled:opacity-50 transition-all"
              >
                <IoPrintSharp className="text-[19px] md:text-xl" />

                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                  Print
                </span>
              </button>
            </div>
          ) : (
            <div className="px-3 sm:px-10 py-3 flex items-center justify-end" />
          )}
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-black/10 p-5">
            <h2 className="text-base sm:text-md md:text-lg font-bold text-[#111111]">Disapprove SPRF</h2>
            <p className="text-[13px] md:text-sm text-slate-500 md:mt-1">
              Add an optional note explaining the disapproval.
            </p>

            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={5}
              className="mt-3 md:mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-xs md:text-sm outline-none hover:border-[#28980080] focus:border-[#289800] focus:outline-none focus:ring-0 resize-none"
              placeholder="Enter rejection note"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNote('');
                }}
                className="px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border border-slate-300 text-xs md:text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectCurrent}
                disabled={isSubmitting}
                className="px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl bg-red-500 text-white text-xs md:text-sm font-medium md:font-semibold disabled:opacity-50"
              >
                Disapprove
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendBackModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-black/10 p-5">
            <h2 className="text-base sm:text-md md:text-lg font-bold text-[#111111]">Send Back SPRF</h2>
            <p className="text-[13px] md:text-sm text-slate-500 md:mt-1 leading-snug md:leading-normal">
              This will return the project to the previous approver.{' '}
              {Number(sourceProject?.current_level) === 2
                ? 'Since this is at the first approval step, it will be returned to the Preparer as a draft.'
                : 'A message is required explaining why it is being sent back.'}
            </p>

            <textarea
              value={sendBackMessage}
              onChange={(e) => setSendBackMessage(e.target.value)}
              rows={5}
              className="mt-3 md:mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-xs md:text-sm outline-none hover:border-amber-400 focus:border-amber-500 focus:outline-none focus:ring-0 resize-none"
              placeholder="Required — explain why this is being sent back"
            />

            {sendBackMessage.trim() === '' && (
              <p className="md:mt-1 text-[11px] md:text-xs text-red-500 pl-1">A message is required.</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSendBackModal(false);
                  setSendBackMessage('');
                }}
                className="px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border border-slate-300 text-xs md:text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendBack}
                disabled={isSubmitting || sendBackMessage.trim() === ''}
                className="px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl bg-amber-500 text-white text-xs md:text-sm font-medium md:font-semibold disabled:opacity-50"
              >
                Confirm Send Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Withdraw Modal ── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-black/10 p-5">
            <h2 className="text-base sm:text-md md:text-lg font-bold text-[#0565D2]">Withdraw SPRF</h2>
            <p className="text-[13px] md:text-sm text-slate-500 md:mt-1">
              This will pull the project out of the approval pipeline and return it
              to your entry list. You can resubmit it after making changes.
            </p>

            <div className="mt-3 md:mt-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs md:text-sm text-blue-800">
              <span className="font-semibold">SPRF No.:</span> {sprfNo}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                disabled={isSubmitting}
                className="px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border border-slate-300 text-xs md:text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isSubmitting}
                className="px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl bg-[#0565D2] hover:bg-blue-700 text-white text-xs md:text-sm font-semibold disabled:opacity-50"
              >
                Yes, Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-black/10 p-5">
            <h2 className="text-base sm:text-md md:text-lg font-bold text-red-600">Cancel SPRF</h2>
            <p className="text-[13px] md:text-sm text-slate-500 md:mt-1">
              This will permanently archive the project with a{' '}
              <span className="font-semibold text-slate-700">Cancelled</span> status.
              This action cannot be undone.
            </p>

            <div className="mt-3 md:mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs md:text-sm text-red-800">
              <span className="font-semibold">SPRF No.:</span> {sprfNo}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isSubmitting}
                className="px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border border-slate-300 text-xs md:text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm font-semibold disabled:opacity-50"
              >
                Yes, Cancel Project
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