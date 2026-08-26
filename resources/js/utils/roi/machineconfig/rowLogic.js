import { ROW_TYPE, MODE, CONTRACT_TYPE } from '@/utils/roi/machineconfig/const';

/**
 * Derives all display/validation flags for a single row based on
 * the row's type/mode and the active contract type.
 *
 * @param {object} row
 * @param {string} contractType  - from projectData.companyInfo.contractType
 * @param {object} errors        - Inertia page errors
 * @param {boolean} showOutrightErrors
 * @returns {{ isYieldDisabled, isPriceProhibited, isYieldError, isPriceError }}
 */
export function getRowDisplayFlags(row, contractType, errors = {}, showOutrightErrors = false) {
  const ct = String(contractType || '').toLowerCase();
  const mode = String(row?.mode || '').toLowerCase();

  const isMachineRow  = row?.type === ROW_TYPE.MACHINE;
  const isConsumable  = row?.type === ROW_TYPE.CONSUMABLE;
  const isMonoColor   = mode === MODE.MONO || mode === MODE.COLOR;

  // ── Contract type flags ──────────────────────────────────────────────────
  const isOutright      = ct.includes(CONTRACT_TYPE.OUTRIGHT);
  const isClick         = ct.includes(CONTRACT_TYPE.CLICK);
  const isFixed         = ct.includes(CONTRACT_TYPE.FIXED);

  // ── Yields ───────────────────────────────────────────────────────────────
  // Machines never have yields. Fixed contracts disable yields for all rows.
  const isYieldDisabled = isMachineRow || isFixed;

  // ── Selling price ────────────────────────────────────────────────────────
  // Prohibited when:
  //   • Non-outright machine rows
  //   • Any consumable row (mono/color/others alike) under a click-charge
  //     contract — Click Charge, Rental + Click Charge, Free Use + Click
  //     Charge, and Outright + Click Charge all share this via isClick
  //   • All fixed contract rows
  const isPriceProhibited =
    (isMachineRow && !isOutright) ||
    (isConsumable && isClick) ||
    isFixed;

  // ── Validation errors ────────────────────────────────────────────────────
  const hasGlobalError = !!errors?.machineConfiguration || showOutrightErrors;

  const isYieldError =
    hasGlobalError &&
    isConsumable &&
    isMonoColor &&
    (!row?.yields || parseFloat(row.yields) <= 0);

  const isPriceError =
    hasGlobalError &&
    ((isMachineRow && isOutright && (!row?.price || parseFloat(row.price) <= 0)) ||
     (isConsumable && isOutright && isMonoColor && !row?.price));

  return { isYieldDisabled, isPriceProhibited, isYieldError, isPriceError };
}