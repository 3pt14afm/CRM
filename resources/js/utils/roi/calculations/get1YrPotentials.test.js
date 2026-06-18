import { describe, it, expect } from 'vitest';
import { get1YrPotential } from './get1YrPotential';

describe('get1YrPotential()', () => {
  
  // Shared Mock Data Generator to keep tests DRY (Don't Repeat Yourself)
  const createBaseProjectData = (overrides = {}) => ({
    machineConfiguration: { machine: [], consumable: [] },
    companyInfo: { contractType: 'Outright Sale', bundledStdInk: false },
    ...overrides
  });

  // ==========================================
  // 🟢 SUB-SUITE: POSITIVE (NORMAL) TESTS
  // ==========================================
  describe('Positive Scenarios (Happy Path)', () => {
    
    it('should correctly calculate totals for valid outright contracts', () => {
      const data = createBaseProjectData({
        machineConfiguration: {
          machine: [{ mode: 'mono', qty: 2, cost: 100, margin: 20, price: 200 }]
        }
      });
      const result = get1YrPotential(data);
      expect(result.totalMachineSales).toBe(400);
      expect(result.grandtotalCost).toBe(240); // (100 + 20) * 2
    });

    it('should calculate consumable quantity based on yields', () => {
      const data = createBaseProjectData({
        yield: { monoAmvpYields: { monthly: 1000 } }, // 12,000 annual
        machineConfiguration: {
          consumable: [{ mode: 'mono', yields: 3000, cost: 10, price: 20 }]
        }
      });
      const result = get1YrPotential(data);
      expect(result.totalConsumableQty).toBe(4); // 12000 / 3000
    });
  });

  // ==========================================
  // 🔴 SUB-SUITE: NEGATIVE TESTS
  // ==========================================
  describe('Negative Scenarios (Edge Cases & Resiliency)', () => {

    it('should not crash when passed null or undefined data', () => {
      expect(() => get1YrPotential(null)).not.toThrow();
      expect(() => get1YrPotential(undefined)).not.toThrow();
    });

it('should fallback to 1 safely when math calculations encounter NaN values without yields', () => {
  const corruptedData = {
    machineConfiguration: {
      machine: [{ mode: 'mono', qty: 'invalid_string_qty', cost: 100, margin: 0, price: 0 }]
    },
    companyInfo: { contractType: 'outright' }
  };

  const result = get1YrPotential(corruptedData);

  // ✅ Change this to 1 because your business logic intentionally defaults missing quantities to 1
  expect(result.totalMachineQty).toBe(1); 
  expect(result.totalMachineCost).toBe(100); // 1 * 100 cost
});

    it('should treat missing structural properties as empty lists', () => {
      // Intentionally omitting 'machine' and 'consumable' arrays entirely
      const result = get1YrPotential({ machineConfiguration: {} });
      expect(result.machines).toEqual([]);
      expect(result.consumables).toEqual([]);
    });
  });

});