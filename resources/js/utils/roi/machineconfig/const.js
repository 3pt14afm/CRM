/**
 * Shared constants for the MachineConfig domain.
 * Import these everywhere instead of using raw string literals.
 */

// ── Row types ──────────────────────────────────────────────────────────────
export const ROW_TYPE = Object.freeze({
  MACHINE:    'machine',
  CONSUMABLE: 'consumable',
});

// ── Consumable modes ───────────────────────────────────────────────────────
export const MODE = Object.freeze({
  MONO:   'mono',
  COLOR:  'color',
  OTHERS: 'others',
});

// ── Contract type substrings ───────────────────────────────────────────────
// These are matched with .includes() against the lowercased contractType string,
// so they reflect the substrings that actually appear in the contract type values.
export const CONTRACT_TYPE = Object.freeze({
  OUTRIGHT:       'outright',
  OUTRIGHT_CLICK: 'outright + click charge',
  RENTAL:         'rental',
  FREE_USE:       'free use',
  CLICK:          'click',
  FIXED:          'fixed',
  RENTAL_SUPPLIES: 'rental + supplies',
});

// ── Totals default (safe fallback for before first calculation) ────────────
export const EMPTY_TOTALS = Object.freeze({
  unitCost:     0,
  qty:          0,
  totalCost:    0,
  yields:       0,
  costCpp:      0,
  sellingPrice: 0,
  totalSell:    0,
  sellCpp:      0,
});