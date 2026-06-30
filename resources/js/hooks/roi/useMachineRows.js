import { useState, useEffect, useRef } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { getRowCalculations } from '@/utils/roi/calculations/getRowCalculations';
import { ROW_TYPE, MODE } from '@/utils/roi/machineconfig/const';


// ── Stable ID generator ────────────────────────────────────────────────────
const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

// ── Mandatory printer row ──────────────────────────────────────────────────
export const MANDATORY_ROW_ID = '__mandatory_printer__';

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
  qty:         1,
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
// Machine rows are always qty 1.
// Consumable mono/color rows are free to have user-defined qty when contract
// is "fixed monthly only"; everything else is locked to 1.
const isQtyEditable = (row, contractType = '') =>
  (contractType || '').toLowerCase() === 'fixed monthly only' &&
  row.type === ROW_TYPE.CONSUMABLE &&
  (row.mode === MODE.MONO || row.mode === MODE.COLOR);

const enforceRowQty = (row, contractType = '') =>
  isQtyEditable(row, contractType) ? row : { ...row, qty: 1 };

// ── Hydration ──────────────────────────────────────────────────────────────
function buildHydratedRows(
  { machine = [], consumable = [] },
  { hydrateMachineFields, inferSelectedConsumableId, isPersistedAutoConsumable }
) {
  const persistedMandatory = machine.find((r) => r.id === MANDATORY_ROW_ID);
  const otherMachines      = machine.filter((r) => r.id !== MANDATORY_ROW_ID);

  const mandatoryRow = makeMandatoryRow({
    sku:               persistedMandatory?.sku ?? '',
    cost:              persistedMandatory?.inputtedCost ?? persistedMandatory?.cost ?? '',
    price:             persistedMandatory?.price ?? '',
    yields:            persistedMandatory?.yields ?? '',
    remarks:           persistedMandatory?.remarks ?? '',
    selectedMachineId: persistedMandatory?.selectedMachineId ?? '',
  });

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
      qty:                  1,
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

  return [mandatoryRow, ...hydratedMachines, ...hydratedConsumables];
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useMachineRows({ machineCatalog = [], consumableCatalog = {}, canEditRemarks }) {
  const { setProjectData, projectData } = useProjectData();

  const [rows, setRows] = useState([makeMandatoryRow()]);
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
      { hydrateMachineFields, inferSelectedConsumableId, isPersistedAutoConsumable }
    );

    setRows(combined);
    setFocusedField(null);
    setActiveSearchRowId(null);
    setManuallyEdited({});
    hydratedProjectKeyRef.current = projectKey;
  }, [projectData?.metadata?.projectId, projectData.machineConfiguration]);

  // ── Reset consumable qty when contract type changes away from fixed monthly ─
  useEffect(() => {
    if (contractType.toLowerCase() !== 'fixed monthly only') {
      setRows((prev) =>
        prev.map((row) => {
          if (row.type === ROW_TYPE.CONSUMABLE && (row.mode === MODE.MONO || row.mode === MODE.COLOR)) {
            return { ...row, qty: 1 };
          }
          return row;
        })
      );
    }
  }, [contractType]);

  // ── Sync to ProjectContext ───────────────────────────────────────────────
  useEffect(() => {
    const isMonthlyRental = contractType.toLowerCase() === 'rental + supplies';
    const isBundleChecked = projectData.companyInfo?.bundledStdInk === true;

    
    const rowsWithCalculations = rows.map((r) => {
      const normalized = enforceRowQty(r, contractType);
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

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'remarks' && !canEditRemarks) return row;
        if (row.isMandatory && (field === 'type' || field === 'mode')) return row;
        // Prevent qty changes on rows where qty is not editable
        if (field === 'qty' && !isQtyEditable(row, contractType)) return row;
        if (field === 'sku') {
          return enforceRowQty({ ...row, sku: value, selectedMachineId: '', selectedConsumableId: '' }, contractType);
        }
        return enforceRowQty({ ...row, [field]: value }, contractType);
      })
    );
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
        return result;
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
      return result;
    });

    setActiveSearchRowId(null);
  };

  const handleConsumableSelect = (id, selectedId, mode) => {
    const selected = findConsumableById(mode, selectedId);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!selected) {
          return enforceRowQty({ ...row, selectedConsumableId: '', sku: '', cost: '', price: '', yields: '' }, contractType);
        }
        return enforceRowQty({
          ...row,
          selectedConsumableId: selected.id,
          sku:                  selected.name,
          cost:                 normalize2dp(selected.unitCost),
          price:                normalize2dp(selected.sellingPrice),
          yields:               selected.yields,
        }, contractType);
      })
    );
    setActiveSearchRowId(null);
  };

  const toggleMachine = (id, isMachine) => {
    if (id === MANDATORY_ROW_ID) return;

    setRows((prev) => {
      const withoutLinked = prev.filter(
        (r) => !(r.type === ROW_TYPE.CONSUMABLE && r.linkedMachineRowId === id)
      );
      return withoutLinked.map((r) => {
        if (r.id !== id) return r;
        return enforceRowQty({
          ...r,
          type:                 isMachine ? ROW_TYPE.MACHINE : ROW_TYPE.CONSUMABLE,
          mode:                 r.mode || '',
          selectedMachineId:    '',
          selectedConsumableId: '',
          linkedMachineRowId:   null,
          autoAdded:            false,
        }, contractType);
      });
    });
  };

  const setMode = (id, mode) => {
    if (id === MANDATORY_ROW_ID) return;

    setManuallyEdited((prev) => {
      const next = { ...prev };
      delete next[`${id}:cost`];
      delete next[`${id}:yields`];
      return next;
    });

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return enforceRowQty({
          ...r,
          type:                 mode === MODE.OTHERS ? ROW_TYPE.CONSUMABLE : r.type,
          mode,
          sku:                  '',
          selectedMachineId:    '',
          selectedConsumableId: '',
          linkedMachineRowId:   null,
          autoAdded:            false,
        }, contractType);
      })
    );
  };

  const addRow = () => setRows((prev) => [...prev, makeBlankRow()]);

  const removeRow = (id) => {
    if (id === MANDATORY_ROW_ID) return;
    const nonMandatoryRows = rows.filter((r) => r.id !== MANDATORY_ROW_ID);
    if (nonMandatoryRows.length <= 0) return;

    setRows((prev) => {
      const target = prev.find((r) => r.id === id);
      return prev.filter((r) => {
        if (r.id === id) return false;
        if (target?.type === ROW_TYPE.MACHINE && String(r.linkedMachineRowId) === String(id)) return false;
        return true;
      });
    });
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
  };
}