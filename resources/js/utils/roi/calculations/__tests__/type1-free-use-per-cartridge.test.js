import { describe, it, expect } from 'vitest';
import { getRowCalculations } from '@/utils/roi/calculations/getRowCalculations';
import { get1YrPotential } from '@/utils/roi/calculations/get1YrPotential';
import { succeedingYears } from '@/utils/roi/calculations/succeedingYears';
import { calculateProjectPotentials } from '@/utils/roi/calculations/calculatProjectPotentials';

/**
 * Contract Type 1: Free Use + per Cartridge
 *
 * Mirrors tests/Unit/Services/Roi/Entry/RoiCalculatorType1Test.php on the
 * backend — same fixture, same expected numbers, so both sides of the
 * calculation are pinned to the same source of truth. See that file's
 * top-of-class comment for the rule summary and inline comments for the
 * hand-derived arithmetic behind each expected value.
 */

function buildProjectData(overrides = {}) {
  const base = {
    companyInfo: {
      contractType: 'Free Use + per Cartridge',
      contractYears: 3,
      bundledStdInk: false,
    },
    interest: {
      annualInterest: 5, // 5%
    },
    yield: {
      monoAmvpYields: { monthly: 2000 }, // -> annual 24,000
      colorAmvpYields: { monthly: 1000 }, // -> annual 12,000
    },
    machineConfiguration: {
      machine: [
        {
          id: '__mandatory_printer__',
          sku: 'Printer Model X',
          type: 'machine',
          mode: '',
          cost: 10000,
          inputtedCost: 10000,
          qty: 2,
          yields: '',
          price: '',
          isMandatory: true,
        },
      ],
      consumable: [
        { id: 'c-mono', sku: 'Mono Toner', type: 'consumable', mode: 'mono', cost: 500, yields: 5000, price: 800, qty: 1 },
        { id: 'c-color', sku: 'Color Toner', type: 'consumable', mode: 'color', cost: 600, yields: 4000, price: 900, qty: 1 },
        { id: 'c-others', sku: 'Maintenance Kit', type: 'consumable', mode: 'others', cost: 300, yields: 8000, price: 400, qty: 1 },
      ],
    },
    additionalFees: {
      // Company side = cost. Unchecked "gross sales" rows land here.
      company: [
        { id: 'fee-shipping', label: 'Shipping', category: 'one-time-fee', total: 2000, qty: 1 },
        { id: 'fee-support', label: 'Support', category: 'recurring-fee', total: 500, qty: 12 },
      ],
      // Customer side = gross sales. Checked "gross sales" rows land here.
      customer: [
        { id: 'fee-install', label: 'Installation', category: 'one-time-fee', total: 1000, qty: 1 },
      ],
    },
  };

  // Shallow-safe deep merge for the small number of nested overrides we need.
  return {
    ...base,
    ...overrides,
    companyInfo: { ...base.companyInfo, ...(overrides.companyInfo || {}) },
  };
}

describe('Type 1: Free Use + per Cartridge — getRowCalculations', () => {
  it('computes hardware row cost, margin, and free-use pricing', () => {
    const projectData = buildProjectData();
    const printerRow = projectData.machineConfiguration.machine[0];

    const result = getRowCalculations(printerRow, projectData);

    // percentMargin = (5 * 3) / 100 = 0.15
    // computedCost = rawCost * (1 + rate) = 10000 * 1.05 = 10500
    // machineMargin (per-year) = (10000/3) * 0.15 = 500
    // machineMarginTotal = 10000 * 0.15 = 1500
    expect(result.computedCost).toBeCloseTo(10500, 2);
    expect(result.machineMargin).toBeCloseTo(500, 2);
    expect(result.machineMarginTotal).toBeCloseTo(1500, 2);

    // Machine Config's own totalCost column: plain qty x unit cost, no interest.
    expect(result.totalCost).toBeCloseTo(20000, 2);

    // Free Use: hardware has no selling price.
    expect(result.price).toBe(0);
    expect(result.totalSell).toBe(0);
    expect(result.yields).toBe(0);
    expect(result.costCpp).toBe(0);
  });

  it('computes a mono consumable row with no interest markup', () => {
    const projectData = buildProjectData();
    const monoRow = projectData.machineConfiguration.consumable[0];

    const result = getRowCalculations(monoRow, projectData);

    expect(result.computedCost).toBeCloseTo(500, 2);
    expect(result.machineMargin).toBe(0);
    expect(result.machineMarginTotal).toBe(0);
    expect(result.yields).toBeCloseTo(5000, 2);
    expect(result.costCpp).toBeCloseTo(0.1, 4); // 500 / 5000
    expect(result.price).toBeCloseTo(800, 2);
    expect(result.sellCpp).toBeCloseTo(0.16, 4); // 800 / 5000
  });
});

describe('Type 1: Free Use + per Cartridge — get1YrPotential', () => {
  it('produces the expected first-year totals', () => {
    const result = get1YrPotential(buildProjectData());

    // Hardware: qty 2 x (10000 + 1500 margin) = 23000; no revenue (free use)
    expect(result.totalMachineCost).toBeCloseTo(23000, 2);
    expect(result.totalMachineSales).toBeCloseTo(0, 2);
    expect(result.totalMachineMargin).toBeCloseTo(3000, 2); // 2 x 1500

    // Consumables: mono qty 10 (4.8 x printer-qty 2, ceil'd), color qty 6, others qty 6
    expect(result.totalConsumableQty).toBeCloseTo(22, 2);
    expect(result.totalConsumableCost).toBeCloseTo(10400, 2); // 5000+3600+1800
    expect(result.totalConsumableSales).toBeCloseTo(15800, 2); // 8000+5400+2400

    // Fees: shipping (2000) + support (500) = cost side; installation (1000) = sales side
    expect(result.totalCompanyFeesAmount).toBeCloseTo(2500, 2);
    expect(result.totalCustomerFeesAmount).toBeCloseTo(1000, 2);

    // grandtotalCost = 23000 + 10400 + 2500 = 35900
    // grandtotalSell = 0 + 15800 + 1000 = 16800
    // grossProfit = 16800 - 35900 = -19100
    expect(result.grandtotalCost).toBeCloseTo(35900, 2);
    expect(result.grandtotalSell).toBeCloseTo(16800, 2);
    expect(result.grossProfit).toBeCloseTo(-19100, 2);
    expect(result.roiPercentage).toBeCloseTo(-53.2, 1);
  });

  it('ceils consumable qty because billing is per cartridge', () => {
    const result = get1YrPotential(buildProjectData());
    const mono = result.consumables.find((c) => c.id === 'c-mono');

    // Raw derived qty is 4.8 x 2 = 9.6 -> ceil'd to 10 under "per cartridge"
    expect(mono.qty).toBeCloseTo(10, 2);
  });
});

describe('Type 1: Free Use + per Cartridge — succeedingYears', () => {
  it('drops hardware cost and the one-time shipping fee, keeps support', () => {
    const result = succeedingYears(buildProjectData());

    // Hardware already paid for: cost/sales/margin all zeroed
    expect(result.totalMachineCost).toBeCloseTo(0, 2);
    expect(result.totalMachineSales).toBeCloseTo(0, 2);
    expect(result.totalMachineMargin).toBeCloseTo(0, 2);

    // Consumables unchanged year over year
    expect(result.totalConsumableCost).toBeCloseTo(10400, 2);
    expect(result.totalConsumableSales).toBeCloseTo(15800, 2);

    // Shipping (one-time) zeroed; support (recurring) survives
    expect(result.totalCompanyFeesAmount).toBeCloseTo(500, 2);
    // Installation (one-time, customer-side) also zeroed
    expect(result.totalCustomerFeesAmount).toBeCloseTo(0, 2);

    // grandtotalCost = 0 + 10400 + 500 = 10900
    // grandtotalSell = 0 + 15800 + 0 = 15800
    // grossProfit = 4900
    expect(result.grandtotalCost).toBeCloseTo(10900, 2);
    expect(result.grandtotalSell).toBeCloseTo(15800, 2);
    expect(result.grossProfit).toBeCloseTo(4900, 2);
    expect(result.roiPercentage).toBeCloseTo(44.95, 1);
  });

  it('returns an empty breakdown for a one-year contract', () => {
    const projectData = buildProjectData({ companyInfo: { contractYears: 1 } });
    const result = succeedingYears(projectData);

    expect(result.grandtotalCost).toBe(0);
    expect(result.grandtotalSell).toBe(0);
    expect(result.machines).toEqual([]);
    expect(result.consumables).toEqual([]);
  });
});

describe('Type 1: Free Use + per Cartridge — calculateProjectPotentials', () => {
  it('rolls up first year + succeeding years across a 3-year contract', () => {
    const projectData = buildProjectData();
    const firstYear = get1YrPotential(projectData);
    const succeedingYear = succeedingYears(projectData);

    const yearlyBreakdown = {
      year_1: firstYear,
      year_2: succeedingYear,
      year_3: succeedingYear,
    };

    const result = calculateProjectPotentials(yearlyBreakdown);

    // totalCost = 35900 + 10900 + 10900 = 57700
    // totalRevenue = 16800 + 15800 + 15800 = 48400
    // totalGrossProfit = -19100 + 4900 + 4900 = -9300
    expect(result.totalCost).toBeCloseTo(57700, 2);
    expect(result.totalRevenue).toBeCloseTo(48400, 2);
    expect(result.totalGrossProfit).toBeCloseTo(-9300, 2);
    expect(result.totalRoiPercentage).toBeCloseTo(-16.12, 1);

    expect(result.breakdown.machine).toBeCloseTo(23000, 2);
    expect(result.breakdown.consumables).toBeCloseTo(31200, 2);
    expect(result.breakdown.fees).toBeCloseTo(3500, 2);
  });
});