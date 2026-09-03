import { describe, it, expect } from 'vitest';
import { get1YrPotential } from '../get1YrPotential';
import { succeedingYears } from '../succeedingYears';
import { getRowCalculations } from '../getRowCalculations';

// Type 5 — NON-OUTRIGHT, Fixed Monthly Only.
// Same fixture as RoiCalculatorType5Test.php: 3-year contract, 10% annual
// interest, mandatory printer qty 1, one "others" machine row with a
// user-entered qty, mono/color/others consumables billed at plain entered
// qty x cost, one one-time company fee (shipping), two recurring company
// fees (support, rental), and one one-time customer fee (setup).

const projectData = {
  companyInfo: {
    contractType: 'Fixed Monthly Only',
    contractYears: 3,
    bundledStdInk: false,
  },
  interest: {
    annualInterest: 10,
  },
  yield: {
    monoAmvpYields: { monthly: 0 },
    colorAmvpYields: { monthly: 0 },
  },
  machineConfiguration: {
    machine: [
      {
        id: '__mandatory_printer__',
        isMandatory: true,
        type: 'machine',
        mode: 'mono',
        qty: 1,
        cost: 5000,
        inputtedCost: 5000,
        price: 6000,
        yields: 0,
      },
      {
        id: 'others-1',
        isMandatory: false,
        type: 'machine',
        mode: 'others',
        qty: 3,
        cost: 1000,
        inputtedCost: 1000,
        price: 0,
        yields: 0,
      },
    ],
    consumable: [
      { type: 'consumable', mode: 'mono', qty: 10, cost: 50, yields: 5000, price: 2 },
      { type: 'consumable', mode: 'color', qty: 8, cost: 70, yields: 4000, price: 3 },
      { type: 'consumable', mode: 'others', qty: 5, cost: 20, yields: 0, price: 0 },
    ],
  },
  additionalFees: {
    company: [
      { name: 'Shipping', category: 'one-time-fee', total: 2000, qty: 1, checked: false },
      { name: 'Support', category: 'recurring-fee', total: 1200, qty: 12, checked: false },
      { name: 'Rental', category: 'recurring-fee', total: 24000, qty: 12, checked: false },
    ],
    customer: [
      { name: 'Setup Fee', category: 'one-time-fee', total: 3000, qty: 1, checked: true },
    ],
  },
};

describe('Type 5 (Fixed Monthly Only) — getRowCalculations', () => {
  it('computes a monthly-rental consumable row: no financing, entered qty x cost only', () => {
    const row = { type: 'consumable', mode: 'mono', cost: 50, qty: 10, yields: 5000, price: 2 };
    const result = getRowCalculations(row, projectData);

    expect(result.inputtedCost).toBeCloseTo(50, 4);
    expect(result.computedCost).toBeCloseTo(50, 4);
    expect(result.basePerYear).toBeCloseTo(50, 4);
    expect(result.totalCost).toBeCloseTo(500, 4);
    expect(result.yields).toBeCloseTo(0, 4);
    expect(result.costCpp).toBeCloseTo(0, 4);
    expect(result.price).toBeCloseTo(0, 4);
    expect(result.totalSell).toBeCloseTo(0, 4);
    expect(result.sellCpp).toBeCloseTo(0, 4);
    expect(result.machineMargin).toBeCloseTo(0, 4);
    expect(result.machineMarginTotal).toBeCloseTo(0, 4);
  });

  it('computes a monthly-rental printer machine row: financed cost + margin, price forced to 0', () => {
    const row = { type: 'machine', mode: 'mono', cost: 5000, qty: 2, yields: 0, price: 6000 };
    const result = getRowCalculations(row, projectData);

    expect(result.inputtedCost).toBeCloseTo(5000, 4);
    expect(result.computedCost).toBeCloseTo(5500, 4); // 5000 * (1 + 10%)
    expect(result.basePerYear).toBeCloseTo(1666.6667, 4);
    expect(result.totalCost).toBeCloseTo(10000, 4); // plain qty x cost, no markup
    expect(result.yields).toBeCloseTo(0, 4);
    expect(result.costCpp).toBeCloseTo(0, 4);
    expect(result.price).toBeCloseTo(0, 4);
    expect(result.totalSell).toBeCloseTo(0, 4);
    expect(result.sellCpp).toBeCloseTo(0, 4);
    expect(result.machineMargin).toBeCloseTo(500, 4); // per-year
    expect(result.machineMarginTotal).toBeCloseTo(1500, 4);
  });
});

describe('Type 5 (Fixed Monthly Only) — get1YrPotential', () => {
  it('computes first-year totals', () => {
    const result = get1YrPotential(projectData);

    expect(result.totalMachineQty).toBeCloseTo(4, 4);
    expect(result.totalMachineCost).toBeCloseTo(9500, 4);
    expect(result.totalMachineSales).toBeCloseTo(0, 4);
    expect(result.totalMachineMargin).toBeCloseTo(1500, 4);

    expect(result.totalConsumableQty).toBeCloseTo(23, 4);
    expect(result.totalConsumableCost).toBeCloseTo(1160, 4);
    expect(result.totalConsumableSales).toBeCloseTo(0, 4);

    expect(result.totalCompanyFeesAmount).toBeCloseTo(27200, 4);
    expect(result.totalCustomerFeesAmount).toBeCloseTo(3000, 4);

    expect(result.grandtotalCost).toBeCloseTo(37860, 4);
    expect(result.grandtotalSell).toBeCloseTo(3000, 4);
    expect(result.grossProfit).toBeCloseTo(-34860, 4);
    expect(result.roiPercentage).toBeCloseTo(-92.08, 2);

    expect(result.bundleDeduction).toBeCloseTo(0, 4);
    expect(result.firstYearTotalCost).toBeCloseTo(10660, 4);
    expect(result.firstYearTotalSell).toBeCloseTo(0, 4);
  });

  it('respects user-entered "others" machine qty and plain consumable qty', () => {
    const result = get1YrPotential(projectData);

    expect(result.machines[0].qty).toBeCloseTo(1, 4);
    expect(result.machines[1].qty).toBeCloseTo(3, 4);

    expect(result.consumables[0].qty).toBeCloseTo(10, 4);
    expect(result.consumables[0].price).toBeCloseTo(0, 4);
    expect(result.consumables[0].yields).toBe(0);
  });
});

describe('Type 5 (Fixed Monthly Only) — succeedingYears', () => {
  it('computes recurring-year totals', () => {
    const result = succeedingYears(projectData);

    expect(result.totalMachineQty).toBeCloseTo(4, 4);
    expect(result.totalMachineCost).toBeCloseTo(0, 4); // machines already paid for in Year 1
    expect(result.totalMachineSales).toBeCloseTo(0, 4);
    expect(result.totalMachineMargin).toBeCloseTo(0, 4); // reported per-row, not summed

    expect(result.totalConsumableQty).toBeCloseTo(23, 4);
    expect(result.totalConsumableCost).toBeCloseTo(1160, 4); // recurs every year
    expect(result.totalConsumableSales).toBeCloseTo(0, 4);

    expect(result.totalFeesQty).toBeCloseTo(24, 4); // one-time qtys zeroed, recurring kept
    expect(result.totalCompanyFeesAmount).toBeCloseTo(25200, 4); // shipping dropped
    expect(result.totalCustomerFeesAmount).toBeCloseTo(0, 4); // setup fee was one-time

    expect(result.grandtotalCost).toBeCloseTo(26360, 4);
    expect(result.grandtotalSell).toBeCloseTo(0, 4);
    expect(result.grossProfit).toBeCloseTo(-26360, 4);
    expect(result.roiPercentage).toBeCloseTo(-100, 4);

    expect(result.succeedingYearsTotalCost).toBeCloseTo(1160, 4);
    expect(result.succeedingYearsTotalSales).toBeCloseTo(0, 4);

    // machineMarginTotal is still reported per-row (informational), just not folded into the totals above.
    expect(result.machines[0].machineMarginTotal).toBeCloseTo(1500, 4);
  });

  it('returns all zeros when contractYears is 1 (no succeeding years)', () => {
    const oneYearProjectData = {
      ...projectData,
      companyInfo: { ...projectData.companyInfo, contractYears: 1 },
    };
    const result = succeedingYears(oneYearProjectData);

    expect(result.totalMachineQty).toBe(0);
    expect(result.grandtotalCost).toBe(0);
    expect(result.grandtotalSell).toBe(0);
    expect(result.machines).toEqual([]);
    expect(result.consumables).toEqual([]);
  });
});

describe('Type 5 (Fixed Monthly Only) — edge cases', () => {
  it('derives "others" machine qty from yields when not entered', () => {
    const pd = {
      companyInfo: { contractType: 'Fixed Monthly Only', contractYears: 1 },
      interest: { annualInterest: 0 },
      yield: { monoAmvpYields: { monthly: 500 }, colorAmvpYields: { monthly: 0 } },
      machineConfiguration: {
        machine: [{ id: 'others-1', type: 'machine', mode: 'others', qty: 0, cost: 100, yields: 2000 }],
        consumable: [],
      },
      additionalFees: { company: [], customer: [] },
    };

    const result = get1YrPotential(pd);

    // annualMonoYields = 500 * 12 = 6000; 6000 / 2000 = 3
    expect(result.machines[0].qty).toBeCloseTo(3, 4);
  });

  it('defaults "others" machine qty to 1 when not entered and no valid yield', () => {
    const pd = {
      companyInfo: { contractType: 'Fixed Monthly Only', contractYears: 1 },
      interest: { annualInterest: 0 },
      yield: { monoAmvpYields: { monthly: 0 }, colorAmvpYields: { monthly: 0 } },
      machineConfiguration: {
        machine: [{ id: 'others-1', type: 'machine', mode: 'others', qty: 0, cost: 100, yields: 0 }],
        consumable: [],
      },
      additionalFees: { company: [], customer: [] },
    };

    const result = get1YrPotential(pd);

    expect(result.machines[0].qty).toBeCloseTo(1, 4);
  });

  it('bundle deduction reduces grandtotalCost and a negative-cost result reports 0% ROI', () => {
    const pd = {
      companyInfo: { contractType: 'Fixed Monthly Only', contractYears: 1, bundledStdInk: true },
      interest: { annualInterest: 0 },
      yield: { monoAmvpYields: { monthly: 0 }, colorAmvpYields: { monthly: 0 } },
      machineConfiguration: {
        machine: [{ id: 'p1', isMandatory: true, type: 'machine', mode: 'mono', qty: 1, cost: 1000, inputtedCost: 1000 }],
        consumable: [{ type: 'consumable', mode: 'mono', qty: 5, cost: 10 }],
        totals: { totalBundledPrice: 5000 },
      },
      additionalFees: { company: [], customer: [] },
    };

    const result = get1YrPotential(pd);

    expect(result.bundleDeduction).toBeCloseTo(5000, 4);
    // (1000 machine + 50 consumable) - 5000 bundle = -3950
    expect(result.grandtotalCost).toBeCloseTo(-3950, 4);
    // roiPercentage only divides when grandtotalCost > 0, so a negative
    // result (bundle bigger than spend) reports 0, not a meaningful
    // negative-denominator percentage.
    expect(result.roiPercentage).toBeCloseTo(0, 4);
  });

  it('consumable with 0 qty costs 0, not defaulted', () => {
    const pd = JSON.parse(JSON.stringify(projectData));
    pd.machineConfiguration.consumable = [
      { type: 'consumable', mode: 'mono', qty: 0, cost: 100, yields: 5000, price: 2 },
    ];

    const result = get1YrPotential(pd);

    expect(result.consumables[0].qty).toBeCloseTo(0, 4);
    expect(result.consumables[0].totalCost).toBeCloseTo(0, 4);
  });

  it('consumable with negative qty currently passes through unclamped', () => {
    // NOTE: the monthly-rental consumable branch reads qty straight via
    // getSafeNumber(), bypassing the negative-qty guard that the other
    // consumable branches use (see the `rawQty < 0 ? 1 : rawQty` check
    // further down in the same function). This test documents that
    // current behavior — flag it if a negative qty should instead be
    // clamped to 0 or 1 for Fixed Monthly.
    const pd = JSON.parse(JSON.stringify(projectData));
    pd.machineConfiguration.consumable = [
      { type: 'consumable', mode: 'mono', qty: -5, cost: 100, yields: 5000, price: 2 },
    ];

    const result = get1YrPotential(pd);

    expect(result.consumables[0].qty).toBeCloseTo(-5, 4);
    expect(result.consumables[0].totalCost).toBeCloseTo(-500, 4);
  });

  it('zero annual interest zeroes machine margin cleanly', () => {
    const pd = JSON.parse(JSON.stringify(projectData));
    pd.interest.annualInterest = 0;

    const result = get1YrPotential(pd);

    expect(result.totalMachineMargin).toBeCloseTo(0, 4);
    expect(result.machines[0].machineMarginTotal).toBeCloseTo(0, 4);
    expect(result.machines[0].totalCost).toBeCloseTo(5000, 4); // 1 x 5000, no margin loaded in
  });

  it('row calculation with zero interest returns un-marked-up cost', () => {
    const row = { type: 'machine', mode: 'mono', cost: 5000, qty: 2, yields: 0, price: 6000 };
    const pd = JSON.parse(JSON.stringify(projectData));
    pd.interest.annualInterest = 0;

    const result = getRowCalculations(row, pd);

    expect(result.computedCost).toBeCloseTo(5000, 4); // no interest markup
    expect(result.machineMargin).toBeCloseTo(0, 4);
    expect(result.machineMarginTotal).toBeCloseTo(0, 4);
  });

  it('missing contractYears defaults to 1 in get1YrPotential', () => {
    const pd = JSON.parse(JSON.stringify(projectData));
    delete pd.companyInfo.contractYears;

    const result = get1YrPotential(pd);

    // percentMargin falls back to (annualInterest * 1) / 100 = 0.10,
    // so the printer's margin is unitCost x 0.10 instead of x 0.30.
    expect(result.machines[0].machineMarginTotal).toBeCloseTo(500, 4);
  });

  it('row calculation with missing contractYears defaults to 1', () => {
    const row = { type: 'machine', mode: 'mono', cost: 5000, qty: 2, yields: 0, price: 6000 };
    const pd = JSON.parse(JSON.stringify(projectData));
    delete pd.companyInfo.contractYears;

    const result = getRowCalculations(row, pd);

    expect(result.basePerYear).toBeCloseTo(5000, 4); // rawCost / 1
    expect(result.computedCost).toBeCloseTo(5500, 4); // 5000 * (1 + 10%)
    expect(result.machineMarginTotal).toBeCloseTo(500, 4); // 5000 * (10 * 1) / 100
  });
});

// Note: RoiCalculator.php has a `calculateAll()` method that loops
// year_2..year_N reusing the same succeedingYears() result object per
// year. No JS equivalent of calculateAll/yearlyBreakdown was uploaded
// (only calculatProjectPotentials.jsx, which consumes a yearlyBreakdown
// but doesn't build one), so that specific gap has no JS test here.
// The PHP side covers it in RoiCalculatorType5Test.php.

describe('Type 5 (Fixed Monthly Only) — string-typed numeric inputs (Number() coercion)', () => {
  it('getRowCalculations coerces string cost/qty/yields/price the same as numeric', () => {
    const row = { type: 'machine', mode: 'mono', cost: '5000', qty: '2', yields: '0', price: '6000' };
    const result = getRowCalculations(row, projectData);

    expect(result.inputtedCost).toBeCloseTo(5000, 4);
    expect(result.computedCost).toBeCloseTo(5500, 4);
    expect(result.basePerYear).toBeCloseTo(1666.6667, 4);
    expect(result.totalCost).toBeCloseTo(10000, 4);
    expect(result.machineMargin).toBeCloseTo(500, 4);
    expect(result.machineMarginTotal).toBeCloseTo(1500, 4);
  });

  it('get1YrPotential coerces string-typed machine/consumable fields the same as numeric', () => {
    const pd = JSON.parse(JSON.stringify(projectData));
    pd.machineConfiguration.machine[0].cost = '5000';
    pd.machineConfiguration.machine[0].inputtedCost = '5000';
    pd.machineConfiguration.machine[0].qty = '1';
    pd.machineConfiguration.machine[1].cost = '1000';
    pd.machineConfiguration.machine[1].inputtedCost = '1000';
    pd.machineConfiguration.machine[1].qty = '3';
    pd.machineConfiguration.consumable[0].qty = '10';
    pd.machineConfiguration.consumable[0].cost = '50';

    const result = get1YrPotential(pd);

    // Identical to the numeric baseline in the first describe block above.
    expect(result.totalMachineCost).toBeCloseTo(9500, 4);
    expect(result.totalMachineMargin).toBeCloseTo(1500, 4);
    expect(result.totalConsumableCost).toBeCloseTo(1160, 4);
    expect(result.machines[0].qty).toBeCloseTo(1, 4);
    expect(result.machines[1].qty).toBeCloseTo(3, 4);
  });
});

describe('Type 5 (Fixed Monthly Only) — missing machineConfiguration / additionalFees (?? [] fallbacks)', () => {
  it('get1YrPotential falls back to empty arrays when machineConfiguration and additionalFees are absent', () => {
    const pd = {
      companyInfo: { contractType: 'Fixed Monthly Only', contractYears: 1 },
      interest: { annualInterest: 0 },
      // machineConfiguration and additionalFees keys deliberately absent.
    };

    const result = get1YrPotential(pd);

    expect(result.machines).toEqual([]);
    expect(result.consumables).toEqual([]);
    expect(result.companyFees).toEqual([]);
    expect(result.customerFees).toEqual([]);
    expect(result.totalMachineCost).toBeCloseTo(0, 4);
    expect(result.totalConsumableCost).toBeCloseTo(0, 4);
    expect(result.totalCompanyFeesAmount).toBeCloseTo(0, 4);
    expect(result.totalCustomerFeesAmount).toBeCloseTo(0, 4);
    expect(result.grandtotalCost).toBeCloseTo(0, 4);
    expect(result.grandtotalSell).toBeCloseTo(0, 4);
  });

  it('succeedingYears falls back to empty arrays when machineConfiguration and additionalFees are absent', () => {
    // contractYears = 3 keeps this on the normal computation path
    // (succeedingYearCount = 2), exercising the `|| []`/`|| {}` fallbacks
    // themselves rather than the separate contractYears<=1 early return.
    const pd = {
      companyInfo: { contractType: 'Fixed Monthly Only', contractYears: 3 },
      interest: { annualInterest: 10 },
      // machineConfiguration and additionalFees keys deliberately absent.
    };

    const result = succeedingYears(pd);

    expect(result.machines).toEqual([]);
    expect(result.consumables).toEqual([]);
    expect(result.companyFees).toEqual([]);
    expect(result.customerFees).toEqual([]);
    expect(result.totalMachineQty).toBeCloseTo(0, 4);
    expect(result.totalFeesQty).toBeCloseTo(0, 4);
    expect(result.grandtotalCost).toBeCloseTo(0, 4);
    expect(result.grandtotalSell).toBeCloseTo(0, 4);
  });
});

describe('Type 5 (Fixed Monthly Only) — color-only yield fallback for "others" machines', () => {
  it('falls back to color yields when mono yield is zero', () => {
    const pd = {
      companyInfo: { contractType: 'Fixed Monthly Only', contractYears: 1 },
      interest: { annualInterest: 0 },
      // mono = 0, color > 0 -> baseYields must resolve to color.
      yield: { monoAmvpYields: { monthly: 0 }, colorAmvpYields: { monthly: 250 } },
      machineConfiguration: {
        machine: [{ id: 'others-1', type: 'machine', mode: 'others', qty: 0, cost: 200, yields: 600 }],
        consumable: [],
      },
      additionalFees: { company: [], customer: [] },
    };

    const result = get1YrPotential(pd);

    // annualColorYields = 250 * 12 = 3000; 3000 / 600 = 5
    expect(result.machines[0].qty).toBeCloseTo(5, 4);
    expect(result.machines[0].totalCost).toBeCloseTo(1000, 4); // 5 x 200, no margin (others mode)
  });
});

describe('Type 5 (Fixed Monthly Only) — contractYears: 0, negative, and missing', () => {
  const assertZeroYearShape = (result) => {
    expect(result.totalMachineQty).toBeCloseTo(0, 4);
    expect(result.grandtotalCost).toBeCloseTo(0, 4);
    expect(result.grandtotalSell).toBeCloseTo(0, 4);
    expect(result.bundleDeduction).toBeCloseTo(0, 4);
    expect(result.firstYearTotalCost).toBeCloseTo(0, 4);
    expect(result.firstYearTotalSell).toBeCloseTo(0, 4);
    expect(result.machines).toEqual([]);
    expect(result.consumables).toEqual([]);
    expect(result.companyFees).toEqual([]);
    expect(result.customerFees).toEqual([]);
  };

  it('returns the all-zero shape when contractYears is explicitly 0', () => {
    const pd = JSON.parse(JSON.stringify(projectData));
    pd.companyInfo.contractYears = 0;

    assertZeroYearShape(get1YrPotential(pd));
  });

  it('returns the all-zero shape when contractYears is negative', () => {
    const pd = JSON.parse(JSON.stringify(projectData));
    pd.companyInfo.contractYears = -3;

    assertZeroYearShape(get1YrPotential(pd));
  });

  it('missing contractYears defaults to 1 instead of hitting the zero shape', () => {
    // Contrast with the two tests above: an absent key must NOT hit the
    // <= 0 early return — it silently defaults to 1 and computes normally.
    const pd = JSON.parse(JSON.stringify(projectData));
    delete pd.companyInfo.contractYears;

    const result = get1YrPotential(pd);

    // percentMargin falls back to (10 * 1) / 100 = 0.10, so the printer's
    // margin is unitCost x 0.10 (500) instead of x 0.30 (1500) — machine
    // cost, fees, and consumables are all otherwise unchanged from the
    // 3-year baseline.
    expect(result.machines).not.toEqual([]);
    expect(result.totalMachineQty).toBeCloseTo(4, 4);
    expect(result.totalMachineCost).toBeCloseTo(8500, 4); // 5500 (printer, incl. 500 margin) + 3000 (others)
    expect(result.totalMachineMargin).toBeCloseTo(500, 4);
    expect(result.totalConsumableCost).toBeCloseTo(1160, 4); // unaffected by contractYears
    expect(result.totalCompanyFeesAmount).toBeCloseTo(27200, 4); // unaffected by contractYears
    expect(result.grandtotalCost).toBeCloseTo(36860, 4);
    expect(result.grandtotalSell).toBeCloseTo(3000, 4);
    expect(result.grossProfit).toBeCloseTo(-33860, 4);
    expect(result.roiPercentage).toBeCloseTo(-91.86, 2);
  });
});

describe('Type 5 (Fixed Monthly Only) — rounding (to2Decimals applied at the correct stage)', () => {
  it('rounds yield-derived "others" qty and Fixed-Monthly consumable totalCost to 2 decimals', () => {
    const pd = {
      companyInfo: { contractType: 'Fixed Monthly Only', contractYears: 1 },
      interest: { annualInterest: 0 },
      yield: { monoAmvpYields: { monthly: 500 }, colorAmvpYields: { monthly: 0 } },
      machineConfiguration: {
        // annualMonoYields = 500 * 12 = 6000; 6000 / 7 = 857.142857... -> 857.14
        machine: [{ id: 'others-1', type: 'machine', mode: 'others', qty: 0, cost: 10, yields: 7 }],
        // 3 x 33.336 = 100.008 -> 100.01
        consumable: [{ type: 'consumable', mode: 'mono', qty: 3, cost: 33.336, yields: 0, price: 0 }],
      },
      additionalFees: { company: [], customer: [] },
    };

    const result = get1YrPotential(pd);

    expect(result.machines[0].qty).toBeCloseTo(857.14, 4);
    expect(result.machines[0].totalCost).toBeCloseTo(8571.4, 4); // 857.14 x 10
    expect(result.consumables[0].totalCost).toBeCloseTo(100.01, 4);
    expect(result.totalConsumableCost).toBeCloseTo(100.01, 4);
  });

  it('getRowCalculations does not pre-round basePerYear', () => {
    // getRowCalculations never applies 2-decimal rounding — basePerYear
    // should carry full, unrounded precision (rawCost / contractYears).
    const row = { type: 'machine', mode: 'mono', cost: 1000, qty: 1, yields: 0, price: 0 };

    const result = getRowCalculations(row, projectData); // contractYears = 3

    expect(result.basePerYear).toBeCloseTo(333.333333, 6);
  });
});