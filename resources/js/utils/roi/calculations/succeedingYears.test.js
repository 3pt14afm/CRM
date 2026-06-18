import { describe, it, expect } from 'vitest';
import { succeedingYears } from './succeedingYears'; // Update path if needed

describe('succeedingYears - Hardened Test Suite', () => {
  
  // Helper to generate structural boilerplate data
  const createBaseProjectData = (overrides = {}) => ({
    machineConfiguration: {
      machine: [],
      consumable: []
    },
    companyInfo: {
      contractType: 'rental + click charge',
      contractYears: 3 // Defaults to 2 succeeding years (3 - 1)
    },
    yield: {
      monoAmvpYields: { monthly: 1000 }, // 12,000 annual
      colorAmvpYields: { monthly: 0 }
    },
    additionalFees: {
      company: [],
      customer: []
    },
    ...overrides
  });

  // ==========================================
  // 🟢 SUB-SUITE: POSITIVE (HAPPY PATH) TESTS
  // ==========================================
  describe('Positive Scenarios', () => {

    it('should compute exact consumable quantity based on base yields', () => {
      const data = createBaseProjectData({
        machineConfiguration: {
          consumable: [{ mode: 'mono', yields: 3000, cost: 10, price: 20 }] // 12000 / 3000 = 4 units
        }
      });

      const result = succeedingYears(data);
      expect(result.totalConsumableQty).toBe(4);
      expect(result.totalConsumableCost).toBe(40);
      expect(result.totalConsumableSales).toBe(80);
    });

    it('should strip out total/qty values for "one-time-fee" items', () => {
      const data = createBaseProjectData({
        additionalFees: {
          company: [
            { category: 'one-time-fee', total: 500, qty: 1 },
            { category: 'recurring', total: 100, qty: 1 }
          ],
          customer: [
            { category: 'one-time-fee', total: 1000, qty: 1 },
            { category: 'monthly-fee', total: 200, qty: 2 }
          ]
        }
      });

      const result = succeedingYears(data);
      expect(result.totalCompanyFeesAmount).toBe(100); 
      expect(result.totalCustomerFeesAmount).toBe(200);
      expect(result.totalFeesQty).toBe(3); // 1 (recurring) + 2 (monthly)
    });

    it('should handle floating-point decimal addition without breaking precision', () => {
      const data = createBaseProjectData({
        companyInfo: { contractYears: 2 },
        additionalFees: {
          company: [
            { category: 'recurring', total: 10.15, qty: 1 },
            { category: 'recurring', total: 20.20, qty: 1 }
          ]
        }
      });

      const result = succeedingYears(data);
      // Confirms JavaScript floating point errors are safely rounded to 30.35
      expect(result.grandtotalCost).toBe(30.35);
    });
  });

  // ==========================================
  // 🔴 SUB-SUITE: NEGATIVE (RESILIENCY) TESTS
  // ==========================================
  describe('Negative Scenarios', () => {

    it('should return completely zeroed out defaults if contractYears is 1 or less', () => {
      const data = createBaseProjectData({
        companyInfo: { contractYears: 1 }
      });

      const result = succeedingYears(data);
      expect(result.grandtotalCost).toBe(0);
      expect(result.grandtotalSell).toBe(0);
      expect(result.consumables).toEqual([]);
    });

    it('should handle completely missing or undefined input without crashing', () => {
      expect(() => succeedingYears(null)).not.toThrow();
      expect(() => succeedingYears(undefined)).not.toThrow();
      expect(() => succeedingYears({})).not.toThrow();
    });

    it('should fallback to 0 safely when consumable math encounters NaN strings', () => {
      const corruptedData = createBaseProjectData({
        machineConfiguration: {
          consumable: [{ mode: 'mono', qty: 'broken_string_qty', cost: 50, price: 100 }]
        }
      });

      const result = succeedingYears(corruptedData);
      
      // Because mode is 'mono' but has no valid item yield definitions,
      // your business logic rules set qty to 0. Let's make sure it doesn't output NaN!
      expect(result.totalConsumableQty).toBe(0);
      expect(result.totalConsumableCost).toBe(0);
      expect(result.totalConsumableSales).toBe(0);
    });

    it('should fallback to default item quantity rules safely if mode triggers unknown fallback', () => {
      const corruptedData = createBaseProjectData({
        machineConfiguration: {
          consumable: [{ mode: 'unknown_custom_mode', qty: 'invalid_numeric_text', cost: 10, price: 15 }]
        }
      });

      const result = succeedingYears(corruptedData);

      // 'invalid_numeric_text' falls back to 1 via getSafeNumber(c.qty, 1) inside Case 4
      expect(result.totalConsumableQty).toBe(1);
      expect(result.totalConsumableCost).toBe(10);
      expect(result.totalConsumableSales).toBe(15);
    });
  });
});