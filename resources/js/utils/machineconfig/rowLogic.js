import { ROW_TYPE, MODE, CONTRACT_TYPE } from '@/utils/machineconfig/const';

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
  const isOutrightClick = ct.includes(CONTRACT_TYPE.OUTRIGHT_CLICK);
  const isRental        = ct.includes(CONTRACT_TYPE.RENTAL);
  const isFreeUse       = ct.includes(CONTRACT_TYPE.FREE_USE);
  const isClick         = ct.includes(CONTRACT_TYPE.CLICK);
  const isFixed         = ct.includes(CONTRACT_TYPE.FIXED);

  // ── Yields ───────────────────────────────────────────────────────────────
  // Machines never have yields. Fixed contracts disable yields for all rows.
  const isYieldDisabled = isMachineRow || isFixed;

  // ── Selling price ────────────────────────────────────────────────────────
  // Prohibited when:
  //   • Non-outright machine rows
  //   • Mono/color consumables in click-based rental/free-use models
  //   • All fixed contract rows
  //   • Outright+click consumable rows
  const isPriceProhibited =
    (isMachineRow && !isOutright) ||
    (isConsumable && (isRental || isFreeUse) && isClick && isMonoColor) ||
    isFixed ||
    (isOutrightClick && isConsumable);

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