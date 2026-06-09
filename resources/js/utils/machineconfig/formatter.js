/**
 * Pure formatting and sanitization utilities for numeric inputs.
 * No dependencies — safe to import anywhere.
 */

// ── Sanitizers (raw input → storable string) ───────────────────────────────

/**
 * Strips all non-digit characters. Used for integer fields like Yields.
 * @example sanitizeInt('1,500') → '1500'
 */
export const sanitizeInt = (v) => String(v ?? '').replace(/\D/g, '');

/**
 * Strips non-numeric characters and clamps to 2 decimal places.
 * Used while the user is actively typing in a decimal field.
 * @example sanitize2dp('1,234.567') → '1234.56'
 */
export const sanitize2dp = (v) => {
  let s = String(v ?? '').replace(/,/g, '').trim().replace(/[^\d.]/g, '');
  const parts = s.split('.');
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
  const [a, b] = s.split('.');
  if (b !== undefined) s = `${a}.${b.slice(0, 2)}`;
  return s;
};

// ── Normalizers (storable string → canonical stored value) ─────────────────

/**
 * Converts a raw string to a 2-decimal-place string suitable for storage.
 * Returns '' for empty or non-numeric input.
 * @example normalize2dp('5') → '5.00'
 */
export const normalize2dp = (raw) => {
  const s = String(raw ?? '').trim();
  if (s === '') return '';
  const n = Number(s);
  return Number.isNaN(n) ? '' : n.toFixed(2);
};

// ── Display formatters (stored value → display string) ─────────────────────

/**
 * Formats an integer string with thousands separators for display.
 * @example formatIntWithCommas('1500') → '1,500'
 */
export const formatIntWithCommas = (rawDigits) => {
  const s = String(rawDigits ?? '');
  if (!s) return '';
  const clean = s.replace(/^0+(?=\d)/, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Formats a number to 2 decimal places with thousands separators.
 * @example format2dpWithCommas('1500.5') → '1,500.50'
 */
export const format2dpWithCommas = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const n = Number(s);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formats any number (or numeric string) to 2 decimal places with commas.
 * Falls back to '0.00' for falsy/NaN values. Used in computed/readonly cells.
 * @example formatNum(1500.5) → '1,500.50'
 * @example formatNum(0)      → '0.00'
 */
export const formatNum = (num) =>
  (Number(num) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });