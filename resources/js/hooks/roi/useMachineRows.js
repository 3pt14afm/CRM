import { useState, useEffect, useRef } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { getRowCalculations } from '@/utils/roi/calculations/getRowCalculations';
import { ROW_TYPE, MODE, CONTRACT_TYPE } from '@/utils/roi/machineconfig/const';


// ── Stable ID generator ────────────────────────────────────────────────────
const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

// ── Mandatory printer row ──────────────────────────────────────────────────
export const MANDATORY_ROW_ID = '__mandatory_printer__';

// "Outright Only" (1yr) is the only contract type where a machine is
// optional and consumable qty is user-entered instead of derived from
// yields. There are three outright variants — "Outright + Click Charge",
// "Outright + Per Cartridge", and "Outright Only (1 year)" — and only the
// last one gets this behavior. There's no dedicated constant for it in
// const.js, so match on "outright" + "only" together, which is the one
// combination none of the other outright (or "fixed monthly only") types
// share.
export const isOutrightOnlyContract = (ct) => {
  const n = String(ct || '').trim().toLowerCase();
  return n.includes(CONTRACT_TYPE.OUTRIGHT) && n.includes('only');
};

// Has the user actually typed anything into this (would-be-mandatory) row?
// Used to tell a genuinely-configured machine apart from the untouched
// blank row that gets auto-created before we know the real contract type.
const isRowMandatoryDataEntered = (row) =>
  !!(
    String(row?.sku || '').trim() ||
    String(row?.cost ?? row?.inputtedCost ?? '').trim() ||
    String(row?.price || '').trim() ||
    String(row?.yields || '').trim() ||
    String(row?.remarks || '').trim()
  );

// Fixed Monthly Only allows exactly one printer — the mandatory row. Strip
// any other MACHINE-type row (e.g. left over from a prior Outright Only
// session, where a machine row is optional, or stale persisted data) so it
// never renders as a second printer. Blank stray rows are dropped outright;
// ones with real user data are kept but un-typed back to a plain consumable
// row rather than losing the data.
const stripStrayFixedMonthlyPrinters = (rows, contractType) => {
  const normalized = String(contractType || '').trim().toLowerCase();
  if (normalized !== 'fixed monthly only') return rows;
  const hasStrayPrinter = rows.some((r) => r.type === ROW_TYPE.MACHINE && !r.isMandatory);
  if (!hasStrayPrinter) return rows;
  return rows
    .filter((r) => !(r.type === ROW_TYPE.MACHINE && !r.isMandatory && !isRowMandatoryDataEntered(r)))
    .map((r) =>
      r.type === ROW_TYPE.MACHINE && !r.isMandatory
        ? { ...r, type: ROW_TYPE.CONSUMABLE, selectedMachineId: '', mode: '' }
        : r
    );
};

const makeMandatoryRow = (overrides = {}) => ({
  id:                   MANDATORY_ROW_ID,
  sku:                  '',
  cost:                 '',
  qty:                  1,
  yields:               '',
  price:                '',
  remarks:              '',
  type:                 ROW_TYPE.MACHINE,
  mode:                 '',
  selectedMachineId:    '',
  selectedConsumableId: '',
  linkedMachineRowId:   null,
  autoAdded:            false,
  isMandatory:          true,
  ...overrides,
  // These must never be overridden
  id:          MANDATORY_ROW_ID,
  isMandatory: true,
  type:        ROW_TYPE.MACHINE,
  mode:        '',
});

// ── Value normalizers (pure) ───────────────────────────────────────────────
const normalize2dp = (raw) => {
  const s = String(raw ?? '').trim();
  if (s === '') return '';
  const n = Number(s);
  return Number.isNaN(n) ? '' : n.toFixed(2);
};

const sanitizeInt = (v) => String(v ?? '').replace(/\D/g, '');

const sanitize2dp = (v) => {
  let s = String(v ?? '').replace(/,/g, '').trim().replace(/[^\d.]/g, '');
  const parts = s.split('.');
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
  const [a, b] = s.split('.');
  if (b !== undefined) s = `${a}.${b.slice(0, 2)}`;
  return s;
};

// ── Row factories ──────────────────────────────────────────────────────────
const makeBlankRow = () => ({
  id:                   genId(),
  sku:                  '',
  cost:                 '',
  qty:                  1,
  yields:               '',
  price:                '',
  remarks:              '',
  type:                 ROW_TYPE.CONSUMABLE,
  mode:                 '',
  selectedMachineId:    '',
  selectedConsumableId: '',
  linkedMachineRowId:   null,
  autoAdded:            false,
});

const makeAutoConsumableRow = (machineRowId, consumable) => ({
  id:                   genId(),
  sku:                  consumable.name,
  cost:                 normalize2dp(consumable.unitCost),
  qty:                  1,
  yields:               consumable.yields,
  price:                normalize2dp(consumable.sellingPrice),
  remarks:              '',
  type:                 ROW_TYPE.CONSUMABLE,
  mode:                 consumable.mode || '',
  selectedMachineId:    '',
  selectedConsumableId: consumable.id,
  linkedMachineRowId:   machineRowId,
  autoAdded:            true,
});

// ── Qty enforcement ────────────────────────────────────────────────────────
// A "printer" row is any MACHINE-type row whose mode isn't "others" — this
// covers the mandatory row (mode is always '') as well as any other
// user-added machine row that hasn't been switched to "others".
const isPrinterRow = (row) =>
  row?.type === ROW_TYPE.MACHINE && row?.mode !== MODE.OTHERS;

const isMonoColorConsumable = (row) =>
  row?.type === ROW_TYPE.CONSUMABLE && (row?.mode === MODE.MONO || row?.mode === MODE.COLOR);

// "fixed monthly only" and exact "Outright Only" (1yr) are the two exception
// contracts: printer qty stays locked at 1 and consumable mono/color qty
// stays user-entered. Every other contract flips this: printer qty is
// editable, and mono/color consumable qty is derived (locked, not directly
// editable) from the printer qty total.
const isExceptionContract = (contractType = '') => {
  const ct = (contractType || '').toLowerCase().trim();
  return ct === 'fixed monthly only' || isOutrightOnlyContract(ct);
};

// Sum of qty across every MANDATORY printer row currently on the table —
// this is what non-exception-contract consumable mono/color qty (and any
// secondary printer row) is locked to. Only the mandatory row counts here:
// any additional printer row a user checks "H" on is a follower, not a
// second source of qty, so it must never inflate this total.
const computePrinterQtyTotal = (rows = []) =>
  rows.reduce((sum, r) => (isPrinterRow(r) && r.isMandatory ? sum + (Number(r.qty) || 0) : sum), 0);

const isQtyEditable = (row, contractType = '') => {
  const exception = isExceptionContract(contractType);

  if (isPrinterRow(row)) {
    if (!row.isMandatory) {
      // Any printer row besides the mandatory one (e.g. a blank row the
      // user checked "H" on) is a follower: its qty always mirrors the
      // mandatory printer's qty and is never directly editable.
      return false;
    }
    // Mandatory printer qty is locked at 1 for the two exception contracts
    // (Fixed Monthly Only / Outright Only 1yr) — not user-editable there.
    // Editable everywhere else.
    return !exception;
  }

  if (isMonoColorConsumable(row)) {
    // Consumable mono/color qty: user-entered only for the two exception
    // contracts (unchanged legacy behavior). Everywhere else it's derived
    // from printer qty and not directly editable.
    return exception;
  }

  // "others" rows (machine or consumable) are always locked to 1.
  return false;
};

const enforceRowQty = (row, contractType = '', printerQtyTotal = 1) => {
  if (isQtyEditable(row, contractType)) return row;

  // Non-mandatory printer rows always mirror the mandatory printer's qty
  // (== printerQtyTotal, since only the mandatory row feeds that total)
  // instead of being counted separately or locked to 1.
  if (isPrinterRow(row) && !row.isMandatory) {
    return { ...row, qty: printerQtyTotal || 1 };
  }

  // Non-exception contracts: mono/color consumable qty tracks the summed
  // (mandatory) printer qty live, instead of being hardcoded to 1.
  if (isMonoColorConsumable(row) && !isExceptionContract(contractType)) {
    return { ...row, qty: printerQtyTotal };
  }

  // Everything else not covered above (mandatory printer row under the
  // two exception contracts, "others" rows) stays locked at 1.
  return { ...row, qty: 1 };
};

// ── Hydration ──────────────────────────────────────────────────────────────
function buildHydratedRows(
  { machine = [], consumable = [] },
  { hydrateMachineFields, inferSelectedConsumableId, isPersistedAutoConsumable, includeMandatory = true, contractType = '' }
) {
  const persistedMandatory = machine.find((r) => r.id === MANDATORY_ROW_ID);
  const otherMachines      = machine.filter((r) => r.id !== MANDATORY_ROW_ID);

  const mandatoryRow = includeMandatory
    ? makeMandatoryRow({
        sku:               persistedMandatory?.sku ?? '',
        cost:              persistedMandatory?.inputtedCost ?? persistedMandatory?.cost ?? '',
        qty:               Number(persistedMandatory?.qty) || 1,
        price:             persistedMandatory?.price ?? '',
        yields:            persistedMandatory?.yields ?? '',
        remarks:           persistedMandatory?.remarks ?? '',
        selectedMachineId: persistedMandatory?.selectedMachineId ?? '',
      })
    : null;

  // Not required for this contract type (e.g. Outright), but a mandatory
  // row was previously saved (project created under a different contract
  // type) — keep the data, just demote it to an ordinary, removable,
  // editable machine row instead of discarding it. A blank one is dropped
  // entirely rather than left sitting there with nothing in it.
  const demotedMandatoryRow = (!includeMandatory && persistedMandatory && isRowMandatoryDataEntered(persistedMandatory))
    ? hydrateMachineFields({
        ...persistedMandatory,
        id:                   persistedMandatory.id ?? genId(),
        cost:                 persistedMandatory.inputtedCost ?? persistedMandatory.cost ?? '',
        mode:                 persistedMandatory.mode || '',
        selectedMachineId:    persistedMandatory.selectedMachineId || '',
        selectedConsumableId: '',
        linkedMachineRowId:   null,
        autoAdded:            false,
        isMandatory:          false,
        qty:                  1,
      })
    : null;

  const hydratedMachines = otherMachines.map((r) => {
    const base = {
      ...r,
      id:                   r.id ?? genId(),
      cost:                 r.inputtedCost ?? r.cost ?? '',
      mode:                 r.mode || '',
      selectedMachineId:    r.selectedMachineId || '',
      selectedConsumableId: '',
      linkedMachineRowId:   null,
      autoAdded:            false,
      qty:                  Number(r.qty) || 1,
    };
    return hydrateMachineFields(base);
  });

  const hydratedConsumables = consumable.map((r) => {
    const wasAutoAdded = r.autoAdded === true || r.autoAdded === 1 || isPersistedAutoConsumable(r);
    const base = {
      ...r,
      id:                   r.id ?? genId(),
      cost:                 r.inputtedCost ?? r.cost ?? '',
      mode:                 r.mode || '',
      selectedMachineId:    '',
      selectedConsumableId: r.selectedConsumableId || '',
      linkedMachineRowId:   r.linkedMachineRowId ?? null,
      autoAdded:            wasAutoAdded,
      // Preserve persisted qty for mono/color consumables; default to 1
      qty:                  Number(r.qty) || 1,
    };

    if (
      base.type === ROW_TYPE.CONSUMABLE &&
      !base.selectedConsumableId &&
      (base.mode === MODE.MONO || base.mode === MODE.COLOR)
    ) {
      base.selectedConsumableId = inferSelectedConsumableId(base);
    }

    return base;
  });

  const combined = [
    ...(mandatoryRow ? [mandatoryRow] : []),
    ...(demotedMandatoryRow ? [demotedMandatoryRow] : []),
    ...hydratedMachines,
    ...hydratedConsumables,
  ];

  // Always leave at least one row on screen — a plain blank row (not
  // pinned as machine or consumable) if nothing else was hydrated in.
  const deduped = stripStrayFixedMonthlyPrinters(combined, contractType);
  return deduped.length > 0 ? deduped : [makeBlankRow()];
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useMachineRows({ machineCatalog = [], consumableCatalog = {}, canEditRemarks }) {
  const { setProjectData, projectData } = useProjectData();

  const [rows, setRows] = useState(() =>
    isOutrightOnlyContract(projectData.companyInfo?.contractType) ? [makeBlankRow()] : [makeMandatoryRow()]
  );
  const [focusedField, setFocusedField] = useState(null);
  const [activeSearchRowId, setActiveSearchRowId] = useState(null);
  const [manuallyEdited, setManuallyEdited] = useState({});

  const hydratedProjectKeyRef = useRef(null);

  // Derived contract type — used throughout for qty logic
  const contractType = (projectData.companyInfo?.contractType || '');

  // ── Catalog lookups ──────────────────────────────────────────────────────
  const findMachineById = (id) =>
    machineCatalog.find((item) => String(item.id) === String(id));

  const findConsumableById = (mode, id) =>
    (consumableCatalog[mode] || []).find((item) => String(item.id) === String(id));

  const inferSelectedMachineId = (row) =>
    machineCatalog.find((item) => item.name === row.sku)?.id || '';

  const inferSelectedConsumableId = (row) =>
    (consumableCatalog[row.mode] || []).find((item) => item.name === row.sku)?.id || '';

  const isPersistedAutoConsumable = (row) =>
    row?.type === ROW_TYPE.CONSUMABLE &&
    (row?.mode === MODE.MONO || row?.mode === MODE.COLOR) &&
    (row?.linkedMachineRowId != null || row?.autoAdded === true);

  const hydrateMachineFields = (row) => {
    if (row?.type !== ROW_TYPE.MACHINE) return row;
    const machineId = row.selectedMachineId || inferSelectedMachineId(row);
    const machine   = findMachineById(machineId);
    return {
      ...row,
      selectedMachineId: machineId || '',
      cost:  row.cost  !== '' && row.cost  != null ? row.cost  : normalize2dp(machine?.unitCost),
      price: row.price !== '' && row.price != null ? row.price : normalize2dp(machine?.sellingPrice),
    };
  };

  // ── Hydration effect ─────────────────────────────────────────────────────
  useEffect(() => {
    const projectKey = projectData?.metadata?.projectId ?? 'new';
    if (hydratedProjectKeyRef.current === projectKey) return;

    const mc = projectData.machineConfiguration || {};
    const combined = buildHydratedRows(
      { machine: mc.machine || [], consumable: mc.consumable || [] },
      {
        hydrateMachineFields,
        inferSelectedConsumableId,
        isPersistedAutoConsumable,
        includeMandatory: !isOutrightOnlyContract(projectData.companyInfo?.contractType),
        contractType: projectData.companyInfo?.contractType || '',
      }
    );

    setRows(combined);
    setFocusedField(null);
    setActiveSearchRowId(null);
    setManuallyEdited({});
    hydratedProjectKeyRef.current = projectKey;
  }, [projectData?.metadata?.projectId, projectData.machineConfiguration]);

  // ── Re-enforce qty rules when contract type changes ──────────────────────
  // Flipping contract type can flip which rows have editable qty (printer
  // rows lock/unlock, consumable mono/color rows switch between
  // user-entered and derived-from-printer-total). On an actual change (not
  // the initial load/hydration) a row's qty is reset back to 1 ONLY when
  // that row is transitioning from non-editable to editable — i.e. the user
  // is about to start typing into a previously-locked field and shouldn't
  // inherit a stale derived/locked value. Rows that stay non-editable, or
  // stay editable, keep whatever qty they already had; enforceRowQty below
  // still re-derives locked/mirrored values (e.g. followers, mono/color
  // consumable qty) from that preserved data.
  const prevContractTypeRef = useRef(contractType);
  useEffect(() => {
    const prevContractType = prevContractTypeRef.current;
    prevContractTypeRef.current = contractType;
    if (prevContractType === contractType) return; // skip on initial mount

    setRows((prev) => {
      const adjusted = prev.map((row) => {
        const wasEditable = isQtyEditable(row, prevContractType);
        const isEditable  = isQtyEditable(row, contractType);
        return (!wasEditable && isEditable) ? { ...row, qty: 1 } : row;
      });
      const printerQtyTotal = computePrinterQtyTotal(adjusted);
      return adjusted.map((row) => enforceRowQty(row, contractType, printerQtyTotal));
    });
  }, [contractType]);

  // ── Toggle the mandatory printer row in/out when contract type flips ────────
  // to/from exact "Outright" (1yr). Outright is the only contract type where
  // a machine is optional; every other type still requires one.
  //
  // NOTE: contractType can briefly be '' on first render (before the real
  // project data has hydrated in), which would look like a non-Outright
  // contract for one tick and auto-add the mandatory row. Once the real
  // contract type ("outright") arrives, if that row is still blank we drop
  // it outright rather than leaving a demoted-but-visible empty row behind.
  // If the user had actually typed something into it, we keep it (demoted
  // to optional/removable) so we never silently discard real data.
  useEffect(() => {
    const requiresMandatoryMachine = !isOutrightOnlyContract(contractType);

    setRows((prev) => {
      const mandatoryIdx = prev.findIndex((r) => r.id === MANDATORY_ROW_ID && r.isMandatory);
      const hasMandatory = mandatoryIdx !== -1;

      let next = prev;

      if (requiresMandatoryMachine && !hasMandatory) {
        // Leaving Outright Only (the only contract type without a
        // mandatory row) for any other contract type. Outright Only starts
        // with — and may still have sitting around — a blank, never-
        // touched starter row (unchecked "H", no mode picked). Carrying
        // that forward would show up as a second, pointless row next to
        // the newly-required mandatory printer, so drop anything blank.
        // Rows the user actually put data into are kept as-is.
        const preserved = prev.filter((r) => isRowMandatoryDataEntered(r));

        // If the user had already checked a row into a printer/machine
        // row under Outright Only, promote that exact row into the
        // mandatory printer instead of creating a brand new empty one
        // alongside it — otherwise the old row was left stranded as a
        // second, separate row.
        const existingPrinterIdx = preserved.findIndex((r) => r.type === ROW_TYPE.MACHINE);

        if (existingPrinterIdx !== -1) {
          const oldId = preserved[existingPrinterIdx].id;
          next = preserved.map((r, i) => {
            if (i === existingPrinterIdx) {
              return { ...r, id: MANDATORY_ROW_ID, isMandatory: true, type: ROW_TYPE.MACHINE, mode: '' };
            }
            // Keep any auto-added consumables (from selecting a catalog
            // machine) linked to their printer row under its new id.
            if (r.type === ROW_TYPE.CONSUMABLE && r.linkedMachineRowId === oldId) {
              return { ...r, linkedMachineRowId: MANDATORY_ROW_ID };
            }
            return r;
          });
        } else {
          next = [makeMandatoryRow(), ...preserved];
        }
      } else if (!requiresMandatoryMachine && hasMandatory) {
        const row = prev[mandatoryIdx];
        const isBlank = !isRowMandatoryDataEntered(row);
        if (isBlank) {
          const remaining = prev.filter((_, i) => i !== mandatoryIdx);
          // Never leave the table with zero rows — swap the blank
          // mandatory row out for a plain blank one instead of removing it.
          return remaining.length > 0 ? remaining : [makeBlankRow()];
        }
        return prev.map((r, i) => (i === mandatoryIdx ? { ...r, isMandatory: false } : r));
      }

      return stripStrayFixedMonthlyPrinters(next, contractType);
    });
  }, [contractType]);

  // ── Sync to ProjectContext ───────────────────────────────────────────────
  useEffect(() => {
    const isMonthlyRental = contractType.toLowerCase() === 'rental + supplies';
    const isBundleChecked = projectData.companyInfo?.bundledStdInk === true;

    const printerQtyTotal = computePrinterQtyTotal(rows);

    const rowsWithCalculations = rows.map((r) => {
      const normalized = enforceRowQty(r, contractType, printerQtyTotal);
      const calcs      = getRowCalculations(normalized, projectData);
      return {
        ...normalized,
        linkedMachineRowId:  r.linkedMachineRowId ?? null,
        autoAdded:           r.autoAdded ?? false,
        isMandatory:         r.isMandatory ?? false,
        inputtedCost:        calcs.inputtedCost,
        cost:                calcs.computedCost,
        basePerYear:         calcs.basePerYear,
        totalCost:           calcs.totalCost,
        yields:              calcs.yields,
        price:               calcs.price,
        costCpp:             calcs.costCpp,
        totalSell:           calcs.totalSell,
        sellCpp:             calcs.sellCpp,
        machineMargin:       calcs.machineMargin,
        machineMarginTotal:  calcs.machineMarginTotal,
      };
    });

    const machines = rowsWithCalculations.filter(
      (r) => r.type === ROW_TYPE.MACHINE && r.sku?.trim() !== ''
    );
    const consumables = rowsWithCalculations.filter(
      (r) => r.type === ROW_TYPE.CONSUMABLE && r.sku?.trim() !== ''
    );

    let calculatedBundledPrice = 0;
    if (isMonthlyRental && isBundleChecked) {
      calculatedBundledPrice = consumables.reduce((sum, r) => {
        const mode = r.mode?.toLowerCase();
        return mode === MODE.MONO || mode === MODE.COLOR
          ? sum + (Number(r.totalCost) || 0)
          : sum;
      }, 0);
    }

    const totalsObj = rowsWithCalculations.reduce(
      (acc, r) => {
        const calcs = getRowCalculations(r, projectData);
        acc.unitCost     += r.inputtedCost;
        acc.qty          += Number(r.qty) || 0;
        acc.totalCost    += r.totalCost;
        acc.yields       += Number(calcs.yields) || 0;
        acc.costCpp      += r.costCpp;
        acc.sellingPrice += Number(calcs.price) || 0;
        acc.totalSell    += r.totalSell;
        acc.sellCpp      += r.sellCpp;
        return acc;
      },
      { unitCost: 0, qty: 0, totalCost: 0, yields: 0, costCpp: 0, sellingPrice: 0, totalSell: 0, sellCpp: 0, totalBundledPrice: calculatedBundledPrice }
    );

    setProjectData((prev) => ({
      ...prev,
      machineConfiguration: {
        machine:    machines,
        consumable: consumables,
        totals:     totalsObj,
      },
    }));
  }, [
    rows,
    projectData.interest.annualInterest,
    projectData.companyInfo.contractYears,
    projectData.companyInfo.contractType,
    projectData.companyInfo.bundledStdInk,
    setProjectData,
  ]);

  // ── Row mutations ────────────────────────────────────────────────────────
  const handleInputChange = (id, field, value) => {
    if (field === 'cost' || field === 'yields') {
      setManuallyEdited((prev) => ({ ...prev, [`${id}:${field}`]: true }));
    }

    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'remarks' && !canEditRemarks) return row;
        if (row.isMandatory && (field === 'type' || field === 'mode')) return row;
        // Prevent qty changes on rows where qty is not editable
        if (field === 'qty' && !isQtyEditable(row, contractType)) return row;
        if (field === 'sku') {
          return { ...row, sku: value, selectedMachineId: '', selectedConsumableId: '' };
        }
        return { ...row, [field]: value };
      });

      // Re-derive printer qty total from the just-applied edit (covers the
      // case where the edit itself was a printer qty change) and re-enforce
      // it across every row so consumable qty stays live-synced.
      const printerQtyTotal = computePrinterQtyTotal(updated);
      return updated.map((row) => enforceRowQty(row, contractType, printerQtyTotal));
    });
  };

  const handleMachineSelect = (id, selectedId) => {
    const selectedMachine = findMachineById(selectedId);

    setRows((prev) => {
      const currentIndex = prev.findIndex((r) => r.id === id);
      if (currentIndex === -1) return prev;

      const currentRow = prev[currentIndex];
      const oldMachine = findMachineById(currentRow.selectedMachineId);
      const oldConsumableSkus = new Set((oldMachine?.consumables || []).map((c) => String(c.name).trim()));
      const oldConsumableIds  = new Set((oldMachine?.consumables || []).map((c) => String(c.id)));

      let nextMachineIndex = prev.findIndex((r, i) => i > currentIndex && r.type === ROW_TYPE.MACHINE);
      if (nextMachineIndex === -1) nextMachineIndex = prev.length;

      const result = [];
      for (let i = 0; i < prev.length; i++) {
        const r = prev[i];
        if (r.id === id) continue;

        const isInBlock = i > currentIndex && i < nextMachineIndex;
        if (isInBlock && r.type === ROW_TYPE.CONSUMABLE) {
          if (r.linkedMachineRowId === id) continue;
          const isMonoColor = r.mode === MODE.MONO || r.mode === MODE.COLOR;
          const skuMatch    = oldConsumableSkus.has(String(r.sku || '').trim());
          const idMatch     = r.selectedConsumableId && oldConsumableIds.has(String(r.selectedConsumableId));
          if (isMonoColor && (skuMatch || idMatch)) continue;
        }
        result.push(r);
      }

      if (!selectedMachine) {
        result.splice(currentIndex, 0, { ...currentRow, type: ROW_TYPE.MACHINE, selectedMachineId: '', qty: 1 });
        const printerQtyTotal = computePrinterQtyTotal(result);
        return result.map((r) => enforceRowQty(r, contractType, printerQtyTotal));
      }

      const base = {
        ...currentRow,
        type:              ROW_TYPE.MACHINE,
        selectedMachineId: selectedMachine.id,
        sku:               selectedMachine.name,
        cost:              normalize2dp(selectedMachine.unitCost),
        price:             normalize2dp(selectedMachine.sellingPrice),
        qty:               1,
      };
      const updatedMachineRow = currentRow.isMandatory
        ? { ...base, isMandatory: true, mode: '' }
        : base;

      const newConsumableRows = (selectedMachine.consumables || []).map((c) =>
        makeAutoConsumableRow(id, c)
      );

      result.splice(currentIndex, 0, updatedMachineRow, ...newConsumableRows);
      const printerQtyTotal = computePrinterQtyTotal(result);
      return result.map((r) => enforceRowQty(r, contractType, printerQtyTotal));
    });

    setActiveSearchRowId(null);
  };

  const handleConsumableSelect = (id, selectedId, mode) => {
    const selected = findConsumableById(mode, selectedId);
    setRows((prev) => {
      const printerQtyTotal = computePrinterQtyTotal(prev);
      return prev.map((row) => {
        if (row.id !== id) return row;
        if (!selected) {
          return enforceRowQty({ ...row, selectedConsumableId: '', sku: '', cost: '', price: '', yields: '' }, contractType, printerQtyTotal);
        }
        return enforceRowQty({
          ...row,
          selectedConsumableId: selected.id,
          sku:                  selected.name,
          cost:                 normalize2dp(selected.unitCost),
          price:                normalize2dp(selected.sellingPrice),
          yields:               selected.yields,
        }, contractType, printerQtyTotal);
      });
    });
    setActiveSearchRowId(null);
  };

  const toggleMachine = (id, isMachine) => {
    const target = rows.find((r) => r.id === id);
    if (target?.isMandatory) return;

    setRows((prev) => {
      const withoutLinked = prev.filter(
        (r) => !(r.type === ROW_TYPE.CONSUMABLE && r.linkedMachineRowId === id)
      );
      const updated = withoutLinked.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          type:                 isMachine ? ROW_TYPE.MACHINE : ROW_TYPE.CONSUMABLE,
          mode:                 r.mode || '',
          selectedMachineId:    '',
          selectedConsumableId: '',
          linkedMachineRowId:   null,
          autoAdded:            false,
        };
      });
      const printerQtyTotal = computePrinterQtyTotal(updated);
      return updated.map((r) => enforceRowQty(r, contractType, printerQtyTotal));
    });
  };

const setMode = (id, mode) => {
  const target = rows.find((r) => r.id === id);
  if (target?.isMandatory) return;

  setManuallyEdited((prev) => {
    const next = { ...prev };
    delete next[`${id}:cost`];
    delete next[`${id}:yields`];
    return next;
  });

  setRows((prev) => {
    const updated = prev.map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        type:                 mode === MODE.OTHERS ? ROW_TYPE.CONSUMABLE : r.type,
        mode,
        selectedMachineId:    '',
        selectedConsumableId: '',
        linkedMachineRowId:   null,
        autoAdded:            false,
      };
    });
    const printerQtyTotal = computePrinterQtyTotal(updated);
    return updated.map((r) => enforceRowQty(r, contractType, printerQtyTotal));
  });
};

  const addRow = () => setRows((prev) => [...prev, makeBlankRow()]);

  const removeRow = (id) => {
    const target = rows.find((r) => r.id === id);
    if (!target || target.isMandatory) return;

    const idsToRemove = new Set([id]);
    if (target.type === ROW_TYPE.MACHINE) {
      rows.forEach((r) => {
        if (String(r.linkedMachineRowId) === String(id)) idsToRemove.add(r.id);
      });
    }
    // Always keep at least one row on screen.
    if (rows.length - idsToRemove.size <= 0) return;

    setRows((prev) => prev.filter((r) => !idsToRemove.has(r.id)));
  };

  // ── Search suggestions ───────────────────────────────────────────────────
  const getMachineSuggestions = (query) => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    return machineCatalog.filter((item) => item.name?.toLowerCase().includes(q)).slice(0, 15);
  };

  const getConsumableSuggestions = (mode, query) => {
    const q = String(query || '').trim().toLowerCase();
    if (!q || !mode) return [];
    return (consumableCatalog[mode] || [])
      .filter((item) => item.name?.toLowerCase().includes(q))
      .slice(0, 15);
  };

  // ── Search input handlers ────────────────────────────────────────────────
  const handleMachineSearchChange = (id, value) => {
    handleInputChange(id, 'sku', value);
    setActiveSearchRowId(id);
  };

  const handleMachineInputBlur = () => {
    setTimeout(() => setActiveSearchRowId(null), 150);
  };

  const handleMachineSuggestionSelect = (id, machine) => {
    handleMachineSelect(id, machine.id);
  };

  // ── Field focus helpers ──────────────────────────────────────────────────
  const keyOf = (rowId, field) => `${rowId}:${field}`;

  const onBlurNormalize = (id, field) => {
    setFocusedField(null);
    handleInputChange(id, field, normalize2dp(rows.find((r) => r.id === id)?.[field]));
  };

  return {
    rows,
    focusedField,
    setFocusedField,
    activeSearchRowId,
    setActiveSearchRowId,
    manuallyEdited,
    contractType,
    handleInputChange,
    handleMachineSelect,
    handleConsumableSelect,
    handleMachineSuggestionSelect,
    handleMachineSearchChange,
    handleMachineInputBlur,
    toggleMachine,
    setMode,
    addRow,
    removeRow,
    getMachineSuggestions,
    getConsumableSuggestions,
    keyOf,
    onBlurNormalize,
    sanitizeInt,
    sanitize2dp,
    normalize2dp,
    enforceRowQty,
    isQtyEditable,
    computePrinterQtyTotal,
  };
}