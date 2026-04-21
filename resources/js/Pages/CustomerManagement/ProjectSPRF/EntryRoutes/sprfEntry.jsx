import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import CompanyInfoBlock from '@/Components/sprf/CompanyInfoBlock';
import RemarksBlock from '@/Components/sprf/RemarksBlock';
import SprfMetaBlock from '@/Components/sprf/SprfMetaBlock';
import SummaryBlock from '@/Components/sprf/SummaryBlock';
import SprfItemsTable from '@/Components/sprf/SprfItemsTable';
import SprfOtherExpenseTable from '@/Components/sprf/SprfOtherExpenseTable';
import NamesBlock from '@/Components/sprf/NamesBlock';

const FIXED_OTHER_EXPENSE_ROWS = [
  { key: 'deliveryCharge', productCode: 'Delivery Charge' },
  { key: 'bidDocs', productCode: 'Bid Docs' },
  { key: 'otherServices', productCode: 'Other Services' },
  { key: 'rebate', productCode: 'Rebate' },
  { key: 'others', productCode: 'Others' },
];

const APPROVAL_LEVEL = {
  ESD_ONLY: 'ESD_ONLY',
  VP_AND_CCTO: 'VP_AND_CCTO',
  PRESIDENT_AND_CEO: 'PRESIDENT_AND_CEO',
};

const toNumber = (value) => Number(value || 0);

const makeItemRow = () => ({
  productCode: '',
  itemDescription: '',
  qty: '',
  disty: '',
  costPerUnit: '',
});

const makeExpenseRow = ({
  expenseKey = null,
  isFixed = false,
  productCode = '',
  itemDescription = '',
} = {}) => ({
  expenseKey,
  isFixed,
  productCode,
  itemDescription,
  qty: '',
  unitPrice: '',
});

const makeInitialExpenseRows = () =>
  FIXED_OTHER_EXPENSE_ROWS.map((row) =>
    makeExpenseRow({
      expenseKey: row.key,
      isFixed: true,
      productCode: row.productCode,
      itemDescription: '',
    })
  );

const computeItem = (row) => {
  const qty = toNumber(row.qty);
  const costPerUnit = toNumber(row.costPerUnit);

  const totalCost = qty * costPerUnit;
  const sellingPricePerUnitVatInc = costPerUnit * 1.15;
  const totalSellingPriceVatInc = qty * sellingPricePerUnitVatInc;
  const markupValue = totalSellingPriceVatInc - totalCost;
  const markupPercent =
    costPerUnit > 0 ? ((sellingPricePerUnitVatInc / costPerUnit) - 1) * 100 : 0;

  return {
    ...row,
    totalCost,
    sellingPricePerUnitVatInc,
    totalSellingPriceVatInc,
    markupValue,
    markupPercent,
  };
};

const computeExpense = (row) => {
  const qty = toNumber(row.qty);
  const unitPrice = toNumber(row.unitPrice);

  return {
    ...row,
    total: qty * unitPrice,
  };
};

const resolveApprovalLevel = ({ revenue, totalGpPercent, hasRebate }) => {
  if (hasRebate) {
    return APPROVAL_LEVEL.PRESIDENT_AND_CEO;
  }

  if (revenue <= 0) {
    return APPROVAL_LEVEL.ESD_ONLY;
  }

  if (totalGpPercent < 8) {
    return APPROVAL_LEVEL.PRESIDENT_AND_CEO;
  }

  if (totalGpPercent < 10 || revenue > 1000000) {
    return APPROVAL_LEVEL.VP_AND_CCTO;
  }

  return APPROVAL_LEVEL.ESD_ONLY;
};

const buildSigner = ({ name = '', title = '', lookupPosition = '' } = {}) => ({
  name,
  title,
  lookupPosition,
});

function Entry({ approverUsers = {} }) {
  const { auth } = usePage().props;

  const now = new Date();

  const formattedHeaderDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(now);

  const formattedDateTime = `${now.toLocaleDateString('en-US')} ${now.toLocaleTimeString('en-US', {
    hour12: false,
  })}`;

  const [sprfNo] = useState('SPRFIT-0000');

  const [companyInfo, setCompanyInfo] = useState({
    subCategory: '',
    account: '',
    accountManager: '',
  });

  const [remarks, setRemarks] = useState('');
  const [rebateJustification, setRebateJustification] = useState('');

  const [items, setItems] = useState([makeItemRow()]);
  const [otherExpenses, setOtherExpenses] = useState(() => makeInitialExpenseRows());

  const computedItems = useMemo(() => items.map(computeItem), [items]);
  const computedExpenses = useMemo(() => otherExpenses.map(computeExpense), [otherExpenses]);

  const summary = useMemo(() => {
    const revenue = computedItems.reduce((sum, row) => sum + row.totalSellingPriceVatInc, 0);
    const cogs = computedItems.reduce((sum, row) => sum + row.totalCost, 0);
    const otherExpense = computedExpenses.reduce((sum, row) => sum + row.total, 0);

    const totalExpense = cogs + otherExpense;
    const gpValue = revenue - totalExpense;
    const totalGpPercent = revenue > 0 ? (gpValue / revenue) * 100 : 0;

    return {
      revenue,
      cogs,
      otherExpense,
      totalExpense,
      gpValue,
      totalGpPercent,
    };
  }, [computedItems, computedExpenses]);

  const itemTotals = useMemo(() => {
    const ttlCost = computedItems.reduce((sum, row) => sum + row.totalCost, 0);
    const ttlRev = computedItems.reduce((sum, row) => sum + row.totalSellingPriceVatInc, 0);

    return {
      ttlCost,
      ttlRev,
    };
  }, [computedItems]);

  const rebateTotal = useMemo(() => {
    return computedExpenses
      .filter((row) => row.expenseKey === 'rebate')
      .reduce((sum, row) => sum + row.total, 0);
  }, [computedExpenses]);

  const hasRebate = rebateTotal > 0;

  const approvalLevel = useMemo(() => {
    return resolveApprovalLevel({
      revenue: summary.revenue,
      totalGpPercent: summary.totalGpPercent,
      hasRebate,
    });
  }, [summary.revenue, summary.totalGpPercent, hasRebate]);

  const showVpCcto = approvalLevel !== APPROVAL_LEVEL.ESD_ONLY;
  const showPresidentCeo = approvalLevel === APPROVAL_LEVEL.PRESIDENT_AND_CEO;

  const signatories = useMemo(() => {
    const preparerName = auth?.user?.name ?? '';
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
        lookupPosition: approverUsers?.esdDirector?.position ?? 'ESD Director',
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
  }, [auth?.user?.name, auth?.user?.position, approverUsers]);

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addItemRow = (index) => {
    setItems((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, makeItemRow());
      return next;
    });
  };

  const removeItemRow = (index) => {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateExpense = (index, field, value) => {
    setOtherExpenses((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
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

  return (
    <>
      <Head title="SPRF Entry" />

      <div className="min-h-screen flex flex-col">
        <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
          <div className="flex gap-1">
            <h1 className="font-semibold mt-3">Project SPRF</h1>
            <p className="mt-3">/</p>
            <p className="text-3xl font-semibold">Entry</p>
          </div>

          <div className="flex flex-col gap-1 items-end">
            <h1 className="text-xs text-right text-slate-500">{formattedHeaderDate}</h1>
          </div>
        </div>

        <div className="mx-10 pb-10">
          <div className="overflow-hidden rounded-2xl border border-[#2c2c2e]/20 print:shadow-none print:border-0 bg-[#f8f8f8] shadow-md">
            <div className="bg-[#B5EBA2]/50 px-6 py-2 border border-b-[#2c2c2e]/10 text-center text-[15px] font-bold uppercase tracking-wide">
              IT Solutions Special Price Request Form
            </div>

            <div className="p-6">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 xl:col-span-8 space-y-3">
                  <CompanyInfoBlock value={companyInfo} onChange={setCompanyInfo} />
                  <RemarksBlock value={remarks} onChange={setRemarks} />
                </div>

                <div className="col-span-12 xl:col-span-4 space-y-3">
                  <SprfMetaBlock dateTime={formattedDateTime} sprfNo={sprfNo} />
                  <SummaryBlock summary={summary} />
                </div>
              </div>

              <div className="mt-6">
                <SprfItemsTable
                  items={items}
                  computedItems={computedItems}
                  onUpdateItem={updateItem}
                  onAddItemRow={addItemRow}
                  onRemoveItemRow={removeItemRow}
                  totals={itemTotals}
                />
              </div>

              <div className="mt-6">
                <SprfOtherExpenseTable
                  otherExpenses={otherExpenses}
                  computedExpenses={computedExpenses}
                  onUpdateExpense={updateExpense}
                  onAddExpenseRow={addExpenseRow}
                  onRemoveExpenseRow={removeExpenseRow}
                  totalOtherExpense={summary.otherExpense}
                />
              </div>

              <div className="mt-6">
                <NamesBlock
                  signatories={signatories}
                  showVpCcto={showVpCcto}
                  showPresidentCeo={showPresidentCeo}
                  showRebateJustification={hasRebate}
                  rebateJustification={rebateJustification}
                  onChangeRebateJustification={setRebateJustification}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Entry.layout = (page) => <AuthenticatedLayout children={page} />;

export default Entry;