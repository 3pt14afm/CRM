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
import { FaUndo } from 'react-icons/fa';
import { MdOutlineCancel } from 'react-icons/md';
import { LuScanEye } from 'react-icons/lu';
import { IoPrintSharp } from 'react-icons/io5';

const FIXED_OTHER_EXPENSE_ROWS = [
  { key: 'deliveryCharge', productCode: 'Delivery Charge' },
  { key: 'bidDocs', productCode: 'Bid Docs' },
  { key: 'otherServices', productCode: 'Other Services' },
  { key: 'rebate', productCode: 'Rebate' },
  { key: 'others', productCode: 'Others' },
];

// Unifies both old hardcoded logic and the new SprfApproverMatrixController condition codes
const APPROVAL_LEVEL = {
  // Legacy / Fallback
  ESD_ONLY: 'ESD_ONLY',
  VP_AND_CCTO: 'VP_AND_CCTO',
  PRESIDENT_AND_CEO: 'PRESIDENT_AND_CEO',
  
  // Matrix Conditions
  STANDARD_PRICING: 'STANDARD_PRICING',
  VALUE_GT_1M: 'VALUE_GT_1M',
  GP_GT_15: 'GP_GT_15',
  GP_LTE_15: 'GP_LTE_15',
  REBATE_REQUEST: 'REBATE_REQUEST',
};

const isBlank = (value) =>
  value === '' || value === null || value === undefined;

const toNumber = (value) => Number(value || 0);

const makeRowKey = (prefix = 'row') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeSubitemRow = ({
  rowKey = makeRowKey('sub'),
  productCode = '',
  itemDescription = '',
  qty = '',
  disty = '',
  costPerUnit = '',
  markupPercent = '',
} = {}) => ({
  rowKey,
  productCode,
  itemDescription,
  qty,
  disty,
  costPerUnit,
  markupPercent,
});

const makeGroupRow = ({
  rowKey = makeRowKey('group'),
  subitems = [makeSubitemRow()],
} = {}) => ({
  rowKey,
  subitems,
});

const flattenItemsFromApi = (apiItems = []) => {
  if (!Array.isArray(apiItems) || apiItems.length === 0) {
    return [makeGroupRow()];
  }

  return apiItems.map((group) =>
    makeGroupRow({
      rowKey: group.rowKey || makeRowKey('group'),
      subitems: (group.subitems || []).length > 0
        ? group.subitems.map((sub) =>
            makeSubitemRow({
              rowKey: sub.rowKey || makeRowKey('sub'),
              productCode: sub.productCode ?? '',
              itemDescription: sub.itemDescription ?? '',
              qty: sub.qty ?? '',
              disty: sub.disty ?? '',
              costPerUnit: isBlank(sub.costPerUnit) ? '' : Number(sub.costPerUnit),
              markupPercent: isBlank(sub.markupPercent) ? '' : Number(sub.markupPercent),
            })
          )
        : [makeSubitemRow()],
    })
  );
};

const makeExpenseRow = ({
  expenseKey = null,
  isFixed = false,
  productCode = '',
  itemDescription = '',
  qty = '',
  unitPrice = '',
} = {}) => ({
  expenseKey,
  isFixed,
  productCode,
  itemDescription,
  qty,
  unitPrice,
});

const makeInitialExpenseRows = () =>
  FIXED_OTHER_EXPENSE_ROWS.map((row) =>
    makeExpenseRow({
      expenseKey: row.key,
      isFixed: true,
      productCode: row.productCode,
      itemDescription: '',
      qty: '',
      unitPrice: '',
    })
  );

const normalizeExpenseRows = (rows = []) => {
  const incoming = Array.isArray(rows) ? rows : [];
  const incomingByKey = new Map(
    incoming
      .filter((row) => row?.expenseKey)
      .map((row) => [row.expenseKey, row])
  );

  const fixedRows = FIXED_OTHER_EXPENSE_ROWS.map((fixed) => {
    const existing = incomingByKey.get(fixed.key);

    return makeExpenseRow({
      expenseKey: fixed.key,
      isFixed: true,
      productCode: fixed.productCode,
      itemDescription: existing?.itemDescription ?? '',
      qty: existing?.qty ?? '',
      unitPrice: existing?.unitPrice ?? '',
    });
  });

  const extraRows = incoming
    .filter(
      (row) =>
        !row?.isFixed &&
        !FIXED_OTHER_EXPENSE_ROWS.some((fixed) => fixed.key === row?.expenseKey)
    )
    .map((row) =>
      makeExpenseRow({
        expenseKey: row?.expenseKey ?? null,
        isFixed: false,
        productCode: row?.productCode ?? '',
        itemDescription: row?.itemDescription ?? '',
        qty: row?.qty ?? '',
        unitPrice: row?.unitPrice ?? '',
      })
    );

  return [...fixedRows, ...extraRows];
};

const normalizeRemarksRows = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((row) => String(row ?? '')) : [''];
  }

  const text = String(value ?? '');
  if (!text.trim()) {
    return [''];
  }

  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trimEnd());

  return rows.length > 0 ? rows : [''];
};

const serializeRemarksRows = (rows) => {
  if (!Array.isArray(rows)) return '';

  return rows
    .map((row) => String(row ?? '').trim())
    .filter((row) => row !== '')
    .join('\n');
};

const computeSubitem = (row) => {
  const qty = toNumber(row.qty);
  const costPerUnit = toNumber(row.costPerUnit);
  const markupPercent = toNumber(row.markupPercent);

  const qtyBlank = isBlank(row.qty);
  const costBlank = isBlank(row.costPerUnit);
  const markupBlank = isBlank(row.markupPercent);

  const markupPerUnit = costBlank || markupBlank ? '' : costPerUnit * (markupPercent / 100);
  const totalCost = qtyBlank || costBlank ? '' : qty * costPerUnit;
  const totalMarkup = qtyBlank || markupPerUnit === '' ? '' : qty * markupPerUnit;

  return { ...row, markupPerUnit, totalCost, totalMarkup };
};

const computeGroup = (group) => {
  const computedSubitems = (group.subitems || []).map(computeSubitem);

  let sumCostPerUnit = 0;
  let sumMarkupPerUnit = 0;
  let grandTotalCost = 0;
  let grandTotalMarkup = 0;
  let hasIncompleteMarkup = false;

  computedSubitems.forEach((row) => {
    if (!isBlank(row.costPerUnit)) sumCostPerUnit += toNumber(row.costPerUnit);
    if (row.totalCost !== '') grandTotalCost += toNumber(row.totalCost);

    if (isBlank(row.markupPercent)) {
      hasIncompleteMarkup = true;
    } else {
      sumMarkupPerUnit += toNumber(row.markupPerUnit);
      grandTotalMarkup += toNumber(row.totalMarkup);
    }
  });

  return {
    ...group,
    computedSubitems,
    totalCost: grandTotalCost,
    sellingPricePerUnitVatInc: hasIncompleteMarkup ? '' : sumCostPerUnit + sumMarkupPerUnit,
    totalSellingPriceVatInc: hasIncompleteMarkup ? '' : grandTotalCost + grandTotalMarkup,
    markupValue: hasIncompleteMarkup ? '' : grandTotalMarkup,
  };
};

const computeExpense = (row) => {
  const qtyBlank = isBlank(row.qty);
  const unitPriceBlank = isBlank(row.unitPrice);

  const qty = toNumber(row.qty);
  const unitPrice = toNumber(row.unitPrice);

  return {
    ...row,
    total: qtyBlank || unitPriceBlank ? '' : qty * unitPrice,
  };
};

const buildSigner = ({ name = '', title = '', lookupPosition = '' } = {}) => ({
  name,
  title,
  lookupPosition,
});

const formatDateTime = (value) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
};

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
    if (!sourceProject?.last_saved_at) {
      return '—';
    }

    return formatDateTime(sourceProject.last_saved_at);
  }, [sourceProject?.last_saved_at]);

  const [sprfNo, setSprfNo] = useState(sourceProject?.sprf_no ?? 'SPRFIT-0000');

  const [companyInfo, setCompanyInfo] = useState({
    subCategory: '',
    account: '',
    accountManager: '',
  });

  const [remarks, setRemarks] = useState(['']);
  const [rebateJustification, setRebateJustification] = useState('');

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
      setSprfNo('SPRFIT-0000');
      setCompanyInfo({
        subCategory: '',
        account: '',
        accountManager: '',
      });
      setRemarks(['']);
      setRebateJustification('');
      setItems([makeGroupRow()]);
      setOtherExpenses(makeInitialExpenseRows());
      return;
    }

    setSprfNo(sourceProject?.sprf_no ?? 'SPRFIT-0000');
    setCompanyInfo({
      subCategory: sourceProject?.company_info?.subCategory ?? '',
      account: sourceProject?.company_info?.account ?? '',
      accountManager: sourceProject?.company_info?.accountManager ?? '',
    });
    setRemarks(normalizeRemarksRows(sourceProject?.remarks ?? ''));
    setRebateJustification(sourceProject?.rebate_justification ?? '');

    setItems(flattenItemsFromApi(sourceProject?.items ?? []));

    setOtherExpenses(normalizeExpenseRows(sourceProject?.other_expenses ?? []));
  }, [sourceProject?.id]);

  const computedItems = useMemo(() => items.map(computeGroup), [items]);
  const computedExpenses = useMemo(() => otherExpenses.map(computeExpense), [otherExpenses]);

  const summary = useMemo(() => {
    const revenue = computedItems.reduce((sum, g) => sum + toNumber(g.totalSellingPriceVatInc), 0);
    const cogs = computedItems.reduce((sum, g) => sum + toNumber(g.totalCost), 0);
    const otherExpense = computedExpenses.reduce((sum, row) => sum + toNumber(row.total), 0);

    const totalExpense = cogs + otherExpense;
    const gpValue = revenue - totalExpense;
    const totalGpPercent = revenue > 0 ? (gpValue / revenue) * 100 : 0;

    return { revenue, cogs, otherExpense, totalExpense, gpValue, totalGpPercent };
  }, [computedItems, computedExpenses]);

  const itemTotals = useMemo(() => ({
    ttlCost: computedItems.reduce((sum, g) => sum + toNumber(g.totalCost), 0),
    ttlRev: computedItems.reduce((sum, g) => sum + toNumber(g.totalSellingPriceVatInc), 0),
  }), [computedItems]);

  const rebateTotal = useMemo(() => {
    return computedExpenses
      .filter((row) => row.expenseKey === 'rebate')
      .reduce((sum, row) => sum + toNumber(row.total), 0);
  }, [computedExpenses]);

  const hasRebate = rebateTotal > 0; 

  // Compute the expected level if not provided by backend (entry route only —
  // sourceProject is null on a fresh draft so backend flags don't exist yet)
  const computedApprovalLevel = useMemo(() => {
    if (hasRebate) return APPROVAL_LEVEL.REBATE_REQUEST;
    if (summary.revenue <= 0) return APPROVAL_LEVEL.STANDARD_PRICING;
    if (summary.totalGpPercent < 16) return APPROVAL_LEVEL.GP_LTE_15;
    if (summary.revenue > 1000000) return APPROVAL_LEVEL.VALUE_GT_1M;
    return APPROVAL_LEVEL.GP_GT_15;
  }, [summary.revenue, summary.totalGpPercent, hasRebate]);

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
          approvalLevel === APPROVAL_LEVEL.GP_GT_15 ||
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

  const updateExpense = (index, field, value) => {
    setOtherExpenses((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        if (row.isFixed && field === 'productCode') {
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

  const buildPayload = () => ({
    project_id: sourceProject?.id ?? null,
    sprf_no: sprfNo,
    company_info: companyInfo,
    remarks: serializeRemarksRows(remarks),
    rebate_justification: rebateJustification,
    items,
    other_expenses: otherExpenses,
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

  const hasValidCompanyInfo = (companyInfo) => {
    return (
      companyInfo?.subCategory?.trim() &&
      companyInfo?.account?.trim() &&
      companyInfo?.accountManager?.trim()
    );
  };

  const hasValidItems = (items) => {
    return items.some((group) =>
      (group.subitems || []).some((row) =>
        row.productCode?.trim() ||
        row.itemDescription?.trim() ||
        Number(row.qty) > 0 ||
        Number(row.costPerUnit) > 0
      )
    );
  };

  const hasValidExpenses = (expenses) => {
    return expenses.some((row) => {
      return (
        row.itemDescription?.trim() ||
        Number(row.qty) > 0 ||
        Number(row.unitPrice) > 0
      );
    });
  };

  const handleSaveDraft = () => {
    if (isSubmitting || readOnly) return;

    switch(true){
       case !hasValidCompanyInfo(companyInfo):
          toast.error("Company Information is required before saving draft.");
            return;
       default:
        break;
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

    switch (true) {
      case !sourceProject?.id:
        toast.error('Please save draft first before submitting.');
        return;

      case !hasValidCompanyInfo(companyInfo):
         toast.error("Company Information is required before submitting.");
         return;

      case !hasValidItems(items):
        toast.error("Please add at least one item before submitting.");
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

              setSprfNo(sourceProject?.sprf_no ?? 'SPRFIT-0000');
              setCompanyInfo({
                subCategory: '',
                account: '',
                accountManager: '',
              });
              setRemarks(['']);
              setRebateJustification('');
              setItems([makeGroupRow()]);
              setOtherExpenses(makeInitialExpenseRows());

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

    if (isDirectorCustomerEngagementStep && hasRebate && rebateJustification.trim() === '') {
      toast.error('Rebate justification is required when the Rebate row has a value.');
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
                />
              </div>

              <div className="mt-10 w-full flex flex-col items-center justify-center print:mt-4 print:gap-2 print:items-start">
                <div className="flex gap-3">
                  <div className="w-[40%]">
                    <Conditions />
                  </div>

                  <div className="flex w-[60%] gap-2">
                    <SprfAddNotes scopeKey="sprf-main" />
                    <SprfAddComments comments={initialProject?.comments} scopeKey="entry" />
                  </div>
                </div>
                
                <div className="mt-6 w-[95%] lg:w-[85%] xl:w-[75%]">
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
                  />
              </div>

                
              </div>
              
              
              
              
            </div>
          </div>
        </div>
      </div>

        <div className="sticky bottom-0 z-40 bg-[#f5f5f701] backdrop-blur border-t border-black/10">
          {isEntryRoute && !readOnly ? (
            <div className="px-10 py-2 flex items-center justify-between relative">
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
                  className="group relative flex items-center justify-center border border-green p-2 rounded-xl bg-lightgreen/50 hover:shadow-innerGreen text-black transition-all"
                >
                  <LuScanEye className="text-xl" />
                        
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                    Print Preview
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openPrintPage(true)}
                  disabled={isSubmitting}
                  className="group relative flex items-center justify-center border border-green p-2 rounded-xl bg-lightgreen/50 hover:shadow-innerGreen text-black disabled:opacity-50 transition-all"
                >
                  <IoPrintSharp className="text-xl" />

                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                    Print
                  </span>
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
            <div className="px-10 py-2 grid grid-cols-3 items-center">
              <div className="flex items-center justify-start gap-2">
                {canActOnCurrentProject && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-1 rounded-xl border border-[#F27373] hover:shadow-innerRed text-red-600 hover:bg-[#F27373]/10 font-semibold disabled:opacity-50"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSendBackModal(true)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-1 rounded-xl border border-amber-400 hover:bg-amber-50 text-amber-600 font-semibold disabled:opacity-50"
                    >
                      Send Back
                    </button>
                  </>
                )}

                {canWithdraw && (
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={isSubmitting}
                    className="group relative flex items-center gap-1 px-4 py-1 rounded-xl border border-[#0565D2]/50 text-[#0565D2] text-xs xl:text-sm hover:shadow-innerSkyBlue font-semibold bg-blue-400/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-blue-400/20 hover:border-[#0565D2]/70 transition-all duration-200"
                        >
                      <FaUndo size={12}/> Withdraw
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a4e9c] px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md z-10">
                      Withdraw Proposal
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openPrintPage(false)}
                  disabled={isSubmitting}
                  className="group relative flex items-center justify-center border border-green p-2 rounded-xl bg-lightgreen/50 hover:shadow-innerGreen text-black disabled:opacity-50 transition-all"
                >
                  <LuScanEye className="text-xl" />

                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                    Print Preview
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openPrintPage(true)}
                  disabled={isSubmitting}
                  className="group relative flex items-center justify-center border border-green p-2 rounded-xl bg-lightgreen/50 hover:shadow-innerGreen text-black disabled:opacity-50 transition-all"
                >
                  <IoPrintSharp className="text-xl" />

                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                    Print
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-3">
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    disabled={isSubmitting}
                    className="group relative flex items-center gap-1 px-2 xl:px-3 py-1 rounded-xl border border-[#F27373] text-red-600 text-xs xl:text-sm hover:shadow-innerRed hover:bg-[#F27373]/10 font-semibold disabled:opacity-50 transition-all"
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
            <div className="px-10 py-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openPrintPage(false)}
                disabled={isSubmitting}
                className="group relative flex items-center justify-center border border-green p-2 rounded-xl bg-lightgreen/50 hover:shadow-innerGreen text-black transition-all"
              >
                <LuScanEye className="text-xl" />
                        
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                  Print Preview
                </span>
              </button>

              <button
                type="button"
                onClick={() => openPrintPage(true)}
                disabled={isSubmitting}
                className="group relative flex items-center justify-center border border-green p-2 rounded-xl bg-lightgreen/50 hover:shadow-innerGreen text-black disabled:opacity-50 transition-all"
              >
                <IoPrintSharp className="text-xl" />

                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none shadow-md">
                  Print
                </span>
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

      {showSendBackModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-black/10 p-5">
            <h2 className="text-lg font-bold text-[#111111]">Send Back SPRF</h2>
            <p className="text-sm text-slate-500 mt-1">
              This will return the project to the previous approver.{' '}
              {Number(sourceProject?.current_level) === 2
                ? 'Since this is at the first approval step, it will be returned to the Preparer as a draft.'
                : 'A message is required explaining why it is being sent back.'}
            </p>

            <textarea
              value={sendBackMessage}
              onChange={(e) => setSendBackMessage(e.target.value)}
              rows={5}
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none hover:border-amber-400 focus:border-amber-500 focus:outline-none focus:ring-0 resize-none"
              placeholder="Required — explain why this is being sent back"
            />

            {sendBackMessage.trim() === '' && (
              <p className="mt-1 text-xs text-red-500 pl-1">A message is required.</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSendBackModal(false);
                  setSendBackMessage('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendBack}
                disabled={isSubmitting || sendBackMessage.trim() === ''}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
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
            <h2 className="text-lg font-bold text-[#0565D2]">Withdraw SPRF</h2>
            <p className="text-sm text-slate-500 mt-1">
              This will pull the project out of the approval pipeline and return it
              to your entry list. You can resubmit it after making changes.
            </p>

            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <span className="font-semibold">SPRF No.:</span> {sprfNo}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#0565D2] hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
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
            <h2 className="text-lg font-bold text-red-600">Cancel SPRF</h2>
            <p className="text-sm text-slate-500 mt-1">
              This will permanently archive the project with a{' '}
              <span className="font-semibold text-slate-700">Cancelled</span> status.
              This action cannot be undone.
            </p>

            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              <span className="font-semibold">SPRF No.:</span> {sprfNo}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
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