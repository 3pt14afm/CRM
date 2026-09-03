import { describe, it, expect } from 'vitest';
import { getRowCalculations } from '@/utils/roi/calculations/getRowCalculations';
import { get1YrPotential } from '@/utils/roi/calculations/get1YrPotential';
import { succeedingYears } from '@/utils/roi/calculations/succeedingYears';
import { calculateProjectPotentials } from '@/utils/roi/calculations/calculatProjectPotentials';

/**
 * Contract Type 1: Free Use + per Cartridge — EDGE CASES
 *
 * Mirrors RoiCalculatorType1EdgeCasesTest.php on the backend. Companion to
 * type1-free-use-per-cartridge.test.js, which only covers the happy path.
 *
 * IMPORTANT — four tests in here are marked "EXPECTED TO FAIL" below. They
 * assert the behavior we WANT, not what the JS files currently do, for the
 * same three reasons as the PHP side: negative numbers pass through
 * unguarded, a categoryless fee defaults to recurring instead of one-time,
 * and contractYears=0 is handled inconsistently between get1YrPotential
 * (falls back to 1) and succeedingYears (treated as invalid).
 */

function buildProjectData(overrides = {}) {
  const base = {
    companyInfo: {
      contractType: 'Free Use + per Cartridge',
      contractYears: 1,
      bundledStdInk: false,
    },
    interest: {
      annualInterest: 0,
    },
    yield: {
      monoAmvpYields: { monthly: 1000 }, // -> annual 12,000
      colorAmvpYields: { monthly: 500 }, // -> annual 6,000
    },
    machineConfiguration: {
      machine: [
        {
          id: '__mandatory_printer__',
          type: 'machine',
          mode: '',
          cost: 1000,
          inputtedCost: 1000,
          qty: 1,
          isMandatory: true,
        },
      ],
      consumable: [],
    },
    additionalFees: {
      company: [],
      customer: [],
    },
  };

  const result = { ...base };
  for (const key of Object.keys(overrides)) {
    if ((key === 'machineConfiguration' || key === 'additionalFees') && typeof overrides[key] === 'object') {
      result[key] = overrides[key]; // full replace, never merged
    } else if (typeof overrides[key] === 'object' && result[key] && typeof result[key] === 'object') {
      result[key] = { ...result[key], ...overrides[key] };
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

describe('Type 1 edge cases — missing / blank input', () => {
  it('blank fields do not crash and compute as zero', () => {
    const row = { id: 'c-blank', type: 'consumable', mode: 'mono', cost: '', qty: '', yields: '', price: '' };
    const result = getRowCalculations(row, buildProjectData());

    expect(result.computedCost).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.yields).toBe(0);
    expect(result.price).toBe(0);
    expect(result.totalSell).toBe(0);
    expect(result.costCpp).toBe(0);
    expect(result.sellCpp).toBe(0);
  });

  it('non-numeric strings fall back to zero', () => {
    const row = { id: 'c-junk', type: 'consumable', mode: 'mono', cost: 'abc', qty: 5, yields: 1000, price: 'xyz' };
    const result = getRowCalculations(row, buildProjectData());

    expect(result.inputtedCost).toBe(0);
    expect(result.price).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.totalSell).toBe(0);
    expect(result.yields).toBe(1000);
  });

  // EXPECTED TO FAIL against current code — see file header.
  it('negative numbers are sanitized, not passed through', () => {
    const row = { id: 'c-neg', type: 'consumable', mode: 'mono', cost: -500, qty: 2, yields: 1000, price: -800 };
    const result = getRowCalculations(row, buildProjectData());

    expect(result.inputtedCost).toBe(0); // currently -500
    expect(result.price).toBe(0); // currently -800
  });

  // EXPECTED TO FAIL against current code — see file header.
  it('negative qty on a generic-mode row is sanitized', () => {
    const projectData = buildProjectData({
      machineConfiguration: {
        machine: [{ id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 1, isMandatory: true }],
        consumable: [{ id: 'c-misc', type: 'consumable', mode: 'misc', cost: 100, yields: 0, price: 50, qty: -3 }],
      },
    });

    const result = get1YrPotential(projectData);
    const misc = result.consumables.find((c) => c.id === 'c-misc');

    expect(misc.qty).toBeGreaterThanOrEqual(0); // currently -3
  });
});

describe('Type 1 edge cases — qty 0 vs. untouched', () => {
  it('explicit zero qty and missing qty derive identically when yields are valid', () => {
    const zeroData = buildProjectData({
      machineConfiguration: {
        machine: [{ id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 1, isMandatory: true }],
        consumable: [{ id: 'c-mono', type: 'consumable', mode: 'mono', cost: 10, yields: 2000, price: 20, qty: 0 }],
      },
    });
    const missingData = buildProjectData({
      machineConfiguration: {
        machine: [{ id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 1, isMandatory: true }],
        consumable: [{ id: 'c-mono', type: 'consumable', mode: 'mono', cost: 10, yields: 2000, price: 20 }],
      },
    });

    const resultZero = get1YrPotential(zeroData);
    const resultMissing = get1YrPotential(missingData);

    expect(resultZero.consumables[0].qty).toBeCloseTo(6, 2);
    expect(resultMissing.consumables[0].qty).toBeCloseTo(6, 2);
  });
});

describe('Type 1 edge cases — structural', () => {
  it('no consumables returns zeros without error', () => {
    const result = get1YrPotential(buildProjectData());

    expect(result.consumables).toEqual([]);
    expect(result.totalConsumableCost).toBe(0);
    expect(result.totalConsumableSales).toBe(0);
    expect(result.totalMachineCost).toBeCloseTo(1000, 2);
  });

  it('no machine rows falls back printer qty to one', () => {
    const projectData = buildProjectData({
      machineConfiguration: {
        machine: [],
        consumable: [{ id: 'c-mono', type: 'consumable', mode: 'mono', cost: 10, yields: 1000, price: 20 }],
      },
    });

    const result = get1YrPotential(projectData);

    expect(result.consumables[0].qty).toBeCloseTo(12, 2);
    expect(result.totalMachineCost).toBe(0);
    expect(result.machines).toEqual([]);
  });

  it('multiple non-mandatory printer rows are not double counted', () => {
    const projectData = buildProjectData({
      machineConfiguration: {
        machine: [
          { id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 2, isMandatory: true },
          { id: 'p2', type: 'machine', mode: '', cost: 500, inputtedCost: 500, qty: 5, isMandatory: false },
        ],
        consumable: [{ id: 'c-mono', type: 'consumable', mode: 'mono', cost: 10, yields: 1000, price: 20 }],
      },
    });

    const result = get1YrPotential(projectData);

    // printerMachineQty only sums the mandatory row's qty (2), not p2's (5).
    expect(result.consumables[0].qty).toBeCloseTo(24, 2);
  });

  it('consumable with no yields falls back to entered qty times printer qty', () => {
    const projectData = buildProjectData({
      machineConfiguration: {
        machine: [{ id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 2, isMandatory: true }],
        consumable: [{ id: 'c-mono', type: 'consumable', mode: 'mono', cost: 10, yields: 0, price: 20, qty: 3 }],
      },
    });

    const result = get1YrPotential(projectData);

    expect(result.consumables[0].qty).toBeCloseTo(6, 2); // 3 * 2
  });

  it('others-mode machine row with no yields always derives from printer qty', () => {
    const projectData = buildProjectData({
      machineConfiguration: {
        machine: [
          { id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 3, isMandatory: true },
          { id: 'm-others', type: 'machine', mode: 'others', cost: 200, inputtedCost: 200, qty: 999, yields: 0 },
        ],
        consumable: [],
      },
    });

    const result = get1YrPotential(projectData);
    const others = result.machines.find((m) => m.id === 'm-others');

    expect(others.qty).toBeCloseTo(3, 2); // entered qty 999 ignored entirely
  });

  it('others-mode consumable row with no yields uses entered qty times printer qty', () => {
    const projectData = buildProjectData({
      machineConfiguration: {
        machine: [{ id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 3, isMandatory: true }],
        consumable: [{ id: 'c-others', type: 'consumable', mode: 'others', cost: 50, yields: 0, price: 80, qty: 5 }],
      },
    });

    const result = get1YrPotential(projectData);

    expect(result.consumables[0].qty).toBeCloseTo(15, 2); // 5 * 3
  });

  it('empty additionalFees returns zero totals without error', () => {
    const projectData = buildProjectData({ additionalFees: {} });

    const result = get1YrPotential(projectData);

    expect(result.totalCompanyFeesAmount).toBe(0);
    expect(result.totalCustomerFeesAmount).toBe(0);
  });

  // EXPECTED TO FAIL against current code — see file header.
  it('fee missing category defaults to one-time, not recurring', () => {
    const projectData = buildProjectData({
      companyInfo: { contractType: 'Free Use + per Cartridge', contractYears: 2, bundledStdInk: false },
      additionalFees: {
        company: [{ id: 'f-nocat', label: 'Mystery Fee', total: 1000, qty: 1 }], // no 'category' key
        customer: [],
      },
    });

    const result = succeedingYears(projectData);

    expect(result.totalCompanyFeesAmount).toBe(0); // currently 1000 (treated as recurring)
  });
});

describe('Type 1 edge cases — contract-type string robustness', () => {
  it('contract type casing does not affect result', () => {
    const lower = buildProjectData({ companyInfo: { contractType: 'free use + per cartridge', contractYears: 1, bundledStdInk: false } });
    const upper = buildProjectData({ companyInfo: { contractType: 'FREE USE + PER CARTRIDGE', contractYears: 1, bundledStdInk: false } });

    const resultLower = get1YrPotential(lower);
    const resultUpper = get1YrPotential(upper);

    expect(resultLower.grandtotalCost).toBeCloseTo(resultUpper.grandtotalCost, 2);
    expect(resultLower.totalMachineCost).toBeCloseTo(resultUpper.totalMachineCost, 2);
  });

  it('contract type leading/trailing whitespace does not affect result', () => {
    const clean = buildProjectData({ companyInfo: { contractType: 'Free Use + per Cartridge', contractYears: 1, bundledStdInk: false } });
    const whitespace = buildProjectData({ companyInfo: { contractType: '  Free Use + per Cartridge  ', contractYears: 1, bundledStdInk: false } });

    const resultClean = get1YrPotential(clean);
    const resultWhitespace = get1YrPotential(whitespace);

    expect(resultClean.grandtotalCost).toBeCloseTo(resultWhitespace.grandtotalCost, 2);
    expect(resultClean.totalMachineCost).toBeCloseTo(resultWhitespace.totalMachineCost, 2);
  });
});

describe('Type 1 edge cases — rounding boundaries', () => {
  it('qty exactly on a whole number is not bumped up', () => {
    const projectData = buildProjectData({
      machineConfiguration: {
        machine: [{ id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 1, isMandatory: true }],
        // 12000 / 2000 = exactly 6.0
        consumable: [{ id: 'c-mono', type: 'consumable', mode: 'mono', cost: 10, yields: 2000, price: 20 }],
      },
    });

    const result = get1YrPotential(projectData);

    expect(result.consumables[0].qty).toBeCloseTo(6, 3);
  });

  it('qty just over a whole number ceils up', () => {
    const projectData = buildProjectData({
      machineConfiguration: {
        machine: [{ id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 1, isMandatory: true }],
        // 12000 / 1998 = 6.006... -> rounds to 6.01 -> ceils to 7
        consumable: [{ id: 'c-mono', type: 'consumable', mode: 'mono', cost: 10, yields: 1998, price: 20 }],
      },
    });

    const result = get1YrPotential(projectData);

    expect(result.consumables[0].qty).toBeCloseTo(7, 3);
  });
});

describe('Type 1 edge cases — multi-year', () => {
  // EXPECTED TO FAIL against current code — see file header.
  it('contractYears of 0 produces zero output', () => {
    const projectData = buildProjectData({ companyInfo: { contractType: 'Free Use + per Cartridge', contractYears: 0, bundledStdInk: false } });

    const result = get1YrPotential(projectData);

    expect(result.grandtotalCost).toBe(0); // currently non-zero (falls back to contractYears=1)
  });

  it('contractYears missing defaults to one', () => {
    const missingData = buildProjectData();
    delete missingData.companyInfo.contractYears;
    const explicitOneData = buildProjectData({ companyInfo: { contractType: 'Free Use + per Cartridge', contractYears: 1, bundledStdInk: false } });

    const resultMissing = get1YrPotential(missingData);
    const resultExplicitOne = get1YrPotential(explicitOneData);

    expect(resultMissing.grandtotalCost).toBeCloseTo(resultExplicitOne.grandtotalCost, 2);
  });

  it('large contractYears scales linearly', () => {
    const projectData = buildProjectData({
      companyInfo: { contractType: 'Free Use + per Cartridge', contractYears: 10, bundledStdInk: false },
      machineConfiguration: {
        machine: [{ id: '__mandatory_printer__', type: 'machine', mode: '', cost: 1000, inputtedCost: 1000, qty: 1, isMandatory: true }],
        consumable: [{ id: 'c-mono', type: 'consumable', mode: 'mono', cost: 10, yields: 2000, price: 20 }],
      },
    });

    const firstYear = get1YrPotential(projectData);
    const succeedingYear = succeedingYears(projectData);

    const yearlyBreakdown = { year_1: firstYear };
    for (let y = 2; y <= 10; y++) {
      yearlyBreakdown[`year_${y}`] = succeedingYear;
    }

    const result = calculateProjectPotentials(yearlyBreakdown);

    const expectedTotalCost = firstYear.grandtotalCost + 9 * succeedingYear.grandtotalCost;
    expect(result.totalCost).toBeCloseTo(expectedTotalCost, 2);
    expect(Object.keys(yearlyBreakdown)).toHaveLength(10);
  });
});