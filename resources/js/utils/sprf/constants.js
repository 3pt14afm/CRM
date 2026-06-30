export const DEFAULT_SPRF_NO = 'SPRFIT-0000';

export const FIXED_OTHER_EXPENSE_ROWS = [
  { key: 'deliveryCharge', productCode: 'Delivery Charge' },
  { key: 'bidDocs', productCode: 'Bid Docs' },
  { key: 'otherServices', productCode: 'Other Services' },
  { key: 'rebate', productCode: 'Rebate' },
  { key: 'others', productCode: 'Others' },
];

// APPROVAL_LEVEL lives in calculations.js only — it's the superset (legacy
// ESD_ONLY/VP_AND_CCTO/PRESIDENT_AND_CEO keys plus the newer matrix
// condition codes used by resolveApprovalLevelMatrix). Don't redefine it
// here; index.js's `export *` from both files would collide on the name.