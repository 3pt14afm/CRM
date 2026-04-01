import React, { useState, useEffect, useRef } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { usePage } from '@inertiajs/react';
import { getRowCalculations } from '@/utils/calculations/freeuse/getRowCalculations';

// ── Stable ID generator ────────────────────────────────────────────────────
const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

// ── Hydration helper ───────────────────────────────────────────────────────
// IMPORTANT FIX:
// Keep persisted ids instead of regenerating them.
// This preserves linkedMachineRowId after draft reload.
function buildHydratedRows(
  { machine = [], consumable = [] },
  { hydrateMachineFields, inferSelectedConsumableId, isPersistedAutoConsumable, enforceRowQty }
) {
  const hydratedMachines = machine.map((r) => {
    const base = {
      ...r,
      id: r.id ?? genId(),
      cost: r.inputtedCost ?? r.cost ?? '',
      mode: r.mode || '',
      selectedMachineId: r.selectedMachineId || '',
      selectedConsumableId: '',
      linkedMachineRowId: null,
      autoAdded: false,
      qty: 1,
    };

    Object.assign(base, hydrateMachineFields(base));
    return enforceRowQty(base);
  });

  const hydratedConsumables = consumable.map((r) => {
    const base = {
      ...r,
      id: r.id ?? genId(),
      cost: r.inputtedCost ?? r.cost ?? '',
      mode: r.mode || '',
      selectedMachineId: '',
      selectedConsumableId: r.selectedConsumableId || '',
      linkedMachineRowId: r.linkedMachineRowId ?? null,
      autoAdded: Boolean(r.autoAdded) || isPersistedAutoConsumable(r),
      qty: 1,
    };

    if (
      base.type === 'consumable' &&
      !base.selectedConsumableId &&
      (base.mode === 'mono' || base.mode === 'color')
    ) {
      base.selectedConsumableId = inferSelectedConsumableId(base);
    }

    return enforceRowQty(base);
  });

  return [...hydratedMachines, ...hydratedConsumables];
}
// ──────────────────────────────────────────────────────────────────────────

function MachineConfig({ readOnly }) {
  const {
    auth,
    entryProject,
    project: inertiaProject,
    machineCatalog = [],
    consumableCatalog = { mono: [], color: [], others: [] },
  } = usePage().props;

  const { setProjectData, projectData } = useProjectData();

  const currentUserId = auth?.user?.id ?? auth?.id ?? null;
  const project = entryProject ?? inertiaProject ?? null;

  const isEntryOwner = !project?.id || Number(project?.user_id) === Number(currentUserId);
  const canEditRemarks = !readOnly && isEntryOwner;

  const [focusedField, setFocusedField] = useState(null);
  const keyOf = (rowId, field) => `${rowId}:${field}`;
  const hydratedProjectKeyRef = useRef(null);

  const sanitizeInt = (v) => String(v ?? '').replace(/\D/g, '');

  const sanitize2dp = (v) => {
    let s = String(v ?? '').replace(/,/g, '').trim();
    s = s.replace(/[^\d.]/g, '');
    const parts = s.split('.');
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
    const [a, b] = s.split('.');
    if (b !== undefined) s = `${a}.${b.slice(0, 2)}`;
    return s;
  };

  const normalize2dp = (raw) => {
    const s = String(raw ?? '').trim();
    if (s === '') return '';
    const n = Number(s);
    if (Number.isNaN(n)) return '';
    return n.toFixed(2);
  };

  const formatIntWithCommas = (rawDigits) => {
    const s = String(rawDigits ?? '');
    if (!s) return '';
    const clean = s.replace(/^0+(?=\d)/, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const format2dpWithCommas = (raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    const n = Number(s);
    if (Number.isNaN(n)) return '';
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const onlyNumericKeys = (allowDot) => (e) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (/^\d$/.test(e.key)) return;
    if (allowDot && e.key === '.') return;
    e.preventDefault();
  };

  const findMachineById = (id) =>
    machineCatalog.find((item) => String(item.id) === String(id));

  const findConsumableById = (mode, id) =>
    (consumableCatalog[mode] || []).find((item) => String(item.id) === String(id));

  const inferSelectedMachineId = (row) => {
    const matched = machineCatalog.find((item) => item.name === row.sku);
    return matched?.id || '';
  };

  const inferSelectedConsumableId = (row) => {
    const matched = (consumableCatalog[row.mode] || []).find((item) => item.name === row.sku);
    return matched?.id || '';
  };

  const isPersistedAutoConsumable = (row) =>
    row?.type === 'consumable' &&
    (row?.mode === 'mono' || row?.mode === 'color') &&
    row?.linkedMachineRowId != null;

const isLockedLinkedConsumable = (row) => {
  if (row?.type !== 'consumable') return false;
  if (row?.mode !== 'mono' && row?.mode !== 'color') return false;

  const hasChosenCatalogConsumable = Boolean(row?.selectedConsumableId);
  const hasPersistedPrinterConsumableSku = Boolean(String(row?.sku || '').trim());

  return Boolean(
    row?.linkedMachineRowId != null ||
      row?.autoAdded ||
      hasChosenCatalogConsumable ||
      hasPersistedPrinterConsumableSku
  );
};

  const hydrateMachineFields = (row) => {
    if (row?.type !== 'machine') return row;
    const machineId = row.selectedMachineId || inferSelectedMachineId(row);
    const machine = findMachineById(machineId);
    return {
      ...row,
      selectedMachineId: machineId || '',
      cost:
        row.cost !== '' && row.cost != null
          ? row.cost
          : normalize2dp(machine?.unitCost),
      price:
        row.price !== '' && row.price != null
          ? row.price
          : normalize2dp(machine?.sellingPrice),
    };
  };

  const enforceRowQty = (row) => {
    if (row?.type === 'machine') return { ...row, qty: 1 };
    if (row?.type === 'consumable') return { ...row, qty: 1 };
    return row;
  };

  const hydrateHelpers = {
    hydrateMachineFields,
    inferSelectedConsumableId,
    isPersistedAutoConsumable,
    enforceRowQty,
  };

  const makeBlankRow = () => ({
    id: genId(),
    sku: '',
    cost: '',
    qty: 1,
    yields: '',
    price: '',
    remarks: '',
    type: 'consumable',
    mode: '',
    selectedMachineId: '',
    selectedConsumableId: '',
    linkedMachineRowId: null,
    autoAdded: false,
  });

  const makeAutoConsumableRow = (machineRowId, consumable) => ({
    id: genId(),
    sku: consumable.name,
    cost: normalize2dp(consumable.unitCost),
    qty: 1,
    yields: consumable.yields,
    price: normalize2dp(consumable.sellingPrice),
    remarks: '',
    type: 'consumable',
    mode: consumable.mode || '',
    selectedMachineId: '',
    selectedConsumableId: consumable.id,
    linkedMachineRowId: machineRowId,
    autoAdded: true,
  });

  const [rows, setRows] = useState(() => {
    const mc = projectData.machineConfiguration || {};
    const combined = buildHydratedRows(
      { machine: mc.machine || [], consumable: mc.consumable || [] },
      hydrateHelpers
    );
    return combined.length > 0 ? combined : [makeBlankRow()];
  });

  useEffect(() => {
    const projectKey = projectData?.metadata?.projectId ?? 'new';
    if (hydratedProjectKeyRef.current === projectKey) return;

    const mc = projectData.machineConfiguration || {};
    const machine = Array.isArray(mc.machine) ? mc.machine : [];
    const consumable = Array.isArray(mc.consumable) ? mc.consumable : [];

    const combined = buildHydratedRows({ machine, consumable }, hydrateHelpers);
    setRows(combined.length > 0 ? combined : [makeBlankRow()]);
    setFocusedField(null);
    hydratedProjectKeyRef.current = projectKey;
  }, [projectData?.metadata?.projectId, projectData.machineConfiguration]);

  const computeTotals = (rows) =>
    rows.reduce(
      (acc, r) => {
        const normalizedRow = enforceRowQty(r);
        const calcs = getRowCalculations(normalizedRow, projectData);
        acc.unitCost += parseFloat(normalizedRow.cost) || 0;
        acc.qty += parseFloat(normalizedRow.qty) || 0;
        acc.totalCost += calcs.totalCost;
        acc.yields += parseFloat(normalizedRow.yields) || 0;
        acc.costCpp += calcs.costCpp;
        acc.sellingPrice += parseFloat(normalizedRow.price) || 0;
        acc.totalSell += calcs.totalSell;
        acc.sellCpp += calcs.sellCpp;
        return acc;
      },
      {
        unitCost: 0,
        qty: 0,
        totalCost: 0,
        yields: 0,
        costCpp: 0,
        sellingPrice: 0,
        totalSell: 0,
        sellCpp: 0,
      }
    );

  const tableTotals = computeTotals(rows);

  const handleInputChange = (id, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== id) return row;
        if (field === 'qty') return { ...row, qty: 1 };
        if (field === 'remarks' && !canEditRemarks) return row;
        return enforceRowQty({ ...row, [field]: value });
      })
    );
  };

const handleMachineSelect = (id, selectedId) => {
  const selectedMachine = findMachineById(selectedId);

  setRows((prev) => {
    const currentMachineIndex = prev.findIndex((r) => r.id === id);
    if (currentMachineIndex === -1) return prev;

    const currentMachineRow = prev[currentMachineIndex];
    const oldMachine = findMachineById(currentMachineRow.selectedMachineId);

    const oldConsumableSkus = new Set(
      (oldMachine?.consumables || []).map((c) => String(c.name).trim())
    );

    const oldConsumableIds = new Set(
      (oldMachine?.consumables || []).map((c) => String(c.id))
    );

    // Find the next machine row so removal is scoped only to this machine block
    let nextMachineIndex = prev.findIndex(
      (r, index) => index > currentMachineIndex && r.type === 'machine'
    );
    if (nextMachineIndex === -1) nextMachineIndex = prev.length;

    const result = [];

    for (let i = 0; i < prev.length; i++) {
      const r = prev[i];

      // remove current machine row itself, will reinsert updated one later
      if (r.id === id) continue;

      const isInsideCurrentMachineBlock =
        i > currentMachineIndex && i < nextMachineIndex;

      if (isInsideCurrentMachineBlock && r.type === 'consumable') {
        // primary: remove properly linked rows for this machine
        if (r.linkedMachineRowId === id) continue;

        // fallback: only remove rows inside this machine's own block
        const isMonoColor = r.mode === 'mono' || r.mode === 'color';
        const skuMatch = oldConsumableSkus.has(String(r.sku || '').trim());
        const idMatch =
          r.selectedConsumableId != null &&
          oldConsumableIds.has(String(r.selectedConsumableId));

        if (isMonoColor && (skuMatch || idMatch)) continue;
      }

      result.push(r);
    }

    if (!selectedMachine) {
      const clearedMachineRow = {
        ...currentMachineRow,
        type: 'machine',
        selectedMachineId: '',
        sku: '',
        cost: '',
        price: '',
        qty: 1,
      };

      result.splice(currentMachineIndex, 0, clearedMachineRow);
      return result;
    }

    const updatedMachineRow = {
      ...currentMachineRow,
      type: 'machine',
      selectedMachineId: selectedMachine.id,
      sku: selectedMachine.name,
      cost: normalize2dp(selectedMachine.unitCost),
      price: normalize2dp(selectedMachine.sellingPrice),
      qty: 1,
    };

    const newConsumableRows = (selectedMachine.consumables || []).map((consumable) =>
      makeAutoConsumableRow(id, consumable)
    );

    result.splice(currentMachineIndex, 0, updatedMachineRow, ...newConsumableRows);
    return result;
  });
};

  const handleConsumableSelect = (id, selectedId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const selectedConsumable = findConsumableById(row.mode, selectedId);
        if (!selectedConsumable) {
          return {
            ...row,
            selectedConsumableId: '',
            sku: '',
            cost: '',
            price: '',
            yields: '',
            qty: 1,
          };
        }
        return {
          ...row,
          selectedConsumableId: selectedConsumable.id,
          sku: selectedConsumable.name,
          cost: normalize2dp(selectedConsumable.unitCost),
          price: normalize2dp(selectedConsumable.sellingPrice),
          yields: selectedConsumable.yields,
          qty: 1,
        };
      })
    );
  };

  const toggleMachine = (id, isMachine) => {
    setRows((prev) => {
      const withoutLinkedAutoRows = prev.filter(
        (r) => !(r.type === 'consumable' && r.linkedMachineRowId === id)
      );

      return withoutLinkedAutoRows.map((r) => {
        if (r.id !== id) return r;
        if (isMachine) {
          return {
            ...r,
            type: 'machine',
            prevMode: r.mode || '',
            mode: '',
            qty: 1,
            yields: '',
            selectedConsumableId: '',
            sku: '',
            cost: '',
            price: '',
            selectedMachineId: '',
            linkedMachineRowId: null,
            autoAdded: false,
          };
        }
        return {
          ...r,
          type: 'consumable',
          mode: r.prevMode || '',
          qty: 1,
          selectedMachineId: '',
          sku: '',
          cost: '',
          price: '',
          yields: '',
          selectedConsumableId: '',
          linkedMachineRowId: null,
          autoAdded: false,
        };
      });
    });
  };

  const setMode = (id, mode) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (mode === 'mono' || mode === 'color' || mode === 'others') {
          return {
            ...r,
            mode,
            selectedConsumableId: '',
            sku: '',
            cost: '',
            price: '',
            yields: '',
            qty: 1,
          };
        }
        return {
          ...r,
          mode: '',
          selectedConsumableId: '',
          sku: '',
          cost: '',
          price: '',
          yields: '',
          qty: 1,
        };
      })
    );
  };

  const isRowStarted = (row) =>
    Boolean(
      String(row?.sku || '').trim() ||
        String(row?.cost || '').trim() ||
        String(row?.yields || '').trim() ||
        String(row?.price || '').trim() ||
        String(row?.remarks || '').trim()
    );

  const shouldHighlightModeError = (row) =>
    row?.type === 'consumable' && isRowStarted(row) && !String(row?.mode || '').trim();

  const addRow = () => setRows((prev) => [...prev, makeBlankRow()]);

  const removeRow = (id) =>
    rows.length > 1 &&
    setRows((prev) =>
      prev.filter(
        (r) => r.id !== id && !(r.type === 'consumable' && r.linkedMachineRowId === id)
      )
    );

  const formatNum = (num) =>
    (Number(num) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    const isMonthlyRental = projectData.companyInfo?.contractType === 'Rental + Supplies';
    const isBundleChecked = projectData.companyInfo?.bundledStdInk === true;

    const rowsWithCalculations = rows.map((r) => {
      const normalizedRow = enforceRowQty(r);
      const calcs = getRowCalculations(normalizedRow, projectData);

      return {
        ...normalizedRow,
        linkedMachineRowId: r.linkedMachineRowId ?? null,
        autoAdded: r.autoAdded ?? false,
        inputtedCost: calcs.inputtedCost,
        cost: calcs.computedCost,
        basePerYear: calcs.basePerYear,
        totalCost: calcs.totalCost,
        costCpp: calcs.costCpp,
        totalSell: calcs.totalSell,
        sellCpp: calcs.sellCpp,
        machineMargin: calcs.machineMargin,
        machineMarginTotal: calcs.machineMarginTotal,
      };
    });

    const machines = rowsWithCalculations.filter(
      (r) => r.type === 'machine' && r.sku?.trim() !== ''
    );

    const consumables = rowsWithCalculations.filter(
      (r) => r.type === 'consumable' && r.sku?.trim() !== ''
    );

    let calculatedBundledPrice = 0;
    if (isMonthlyRental && isBundleChecked) {
      calculatedBundledPrice = consumables.reduce((sum, r) => {
        const mode = r.mode?.toLowerCase();
        if (mode === 'mono' || mode === 'color') {
          return sum + (Number(r.totalCost) || 0);
        }
        return sum;
      }, 0);
    }

    const totalsObj = rowsWithCalculations.reduce(
      (acc, r) => {
        acc.unitCost += r.inputtedCost;
        acc.qty += Number(r.qty) || 0;
        acc.totalCost += r.totalCost;
        acc.yields += Number(r.yields) || 0;
        acc.costCpp += r.costCpp;
        acc.sellingPrice += Number(r.price) || 0;
        acc.totalSell += r.totalSell;
        acc.sellCpp += r.sellCpp;
        return acc;
      },
      {
        unitCost: 0,
        qty: 0,
        totalCost: 0,
        yields: 0,
        costCpp: 0,
        sellingPrice: 0,
        totalSell: 0,
        sellCpp: 0,
        totalBundledPrice: calculatedBundledPrice,
      }
    );

    setProjectData((prev) => ({
      ...prev,
      machineConfiguration: {
        machine: machines,
        consumable: consumables,
        totals: totalsObj,
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

  const inputClass =
    'w-full min-w-0 h-8 text-[13px] print:text-xs text-center rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  const selectClass =
    'w-full min-w-0 h-8 text-[11px] print:text-[10px] rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white pl-2 pr-6 text-left cursor-pointer leading-tight';

  const readonlyClass =
    'w-full h-8 text-[13px] print:text-xs text-center px-1 flex items-center justify-center';

  const footerCellClass = 'bg-[#D9F2D0] p-2 text-[12px] font-bold text-center ';
  const disabledInputClass =
    'border-none disabled:bg-lightgreen/5 text-slate-500 cursor-not-allowed';

  return (
    <div className="mx-10 mb-5">
      <div className="overflow-hidden rounded-md border border-slate-300 shadow-md bg-lightgreen/5">
        <div className="bg-[#D9F2D0] py-2 text-center border-b border-darkgreen/15">
          <h2 className="text-[14px] font-bold tracking-wider uppercase">Machine Configuration</h2>
        </div>

        <div className="w-full">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>

            <thead>
              <tr className="bg-lightgreen/15 text-[11px] uppercase text-black">
                <th className="border-b border-r border-darkgreen/15 p-2">H</th>
                <th className="border-b border-r border-darkgreen/15 p-2">T</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Item SKU</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Unit Cost</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Qty</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Total Cost</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Yields</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Cost CPP</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Selling Price</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Total Sell</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Sell CPP</th>
                <th className="border-b border-r border-darkgreen/15 p-2">+/-</th>
                <th className="border-b border-darkgreen/15 p-2">Remarks</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const normalizedRow = enforceRowQty(row);
                const calcs = getRowCalculations(normalizedRow, projectData);
                const isMachineRow = row.type === 'machine';

                const isOtherConsumable =
                  row.type === 'consumable' && row.mode === 'others' && !row.autoAdded;

                const shouldShowReadonlyConsumableSku =
                  row.type === 'consumable' &&
                  (row.mode === 'mono' || row.mode === 'color') &&
                  Boolean(row.selectedConsumableId || row.sku);

                const shouldShowConsumableDropdown =
                  row.type === 'consumable' &&
                  (row.mode === 'mono' || row.mode === 'color') &&
                  !row.autoAdded &&
                  !shouldShowReadonlyConsumableSku;

                return (
                  <tr key={row.id} className="border-b">
                    <td className="border-r border-b border-darkgreen/15 text-center px-3 py-2">
                      <input
                        disabled={readOnly || row.autoAdded}
                        type="checkbox"
                        className="w-4 h-4 border checkboxes border-darkgreen/35 accent-green-600 focus:ring-0 focus:outline-none cursor-pointer"
                        checked={row.type === 'machine'}
                        onChange={(e) => toggleMachine(row.id, e.target.checked)}
                      />
                    </td>

                    <td className="border-r border-b border-darkgreen/15 px-1">
                      <div className="flex items-center justify-center">
                        <select
                          value={row.type === 'machine' ? '' : row.mode || ''}
                          onChange={(e) => setMode(row.id, e.target.value)}
                          disabled={row.type === 'machine' || readOnly || row.autoAdded}
                          className={`w-[90%] min-w-0 h-6 text-[10px] sm:text-[11px] pl-2 pr-5 py-0 rounded-sm accent-green-600 border bg-white outline-none focus:outline-none focus:ring-0 ${
                            row.type === 'machine'
                              ? 'border-darkgreen/20 cursor-not-allowed bg-slate-100'
                              : shouldHighlightModeError(row)
                              ? 'border-red-400 focus:border-red-400 bg-red-50 text-red-700 cursor-pointer'
                              : 'border-darkgreen/20 focus:border-[#289800] cursor-pointer'
                          } ${row.autoAdded ? 'opacity-100 cursor-not-allowed bg-slate-50' : ''}`}
                          aria-label="Select mode: Mono / Color / Others"
                        >
                          <option className="text-gray-400" value="">
                            Select
                          </option>
                          <option value="mono">Mono</option>
                          <option value="color">Color</option>
                          <option value="others">Others</option>
                        </select>
                      </div>
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1 text-black">
                      {isMachineRow ? (
                        <select
                          value={row.selectedMachineId || ''}
                          onChange={(e) => handleMachineSelect(row.id, e.target.value)}
                          disabled={readOnly}
                          className={selectClass}
                          title={row.sku || ''}
                        >
                          <option value="">Select Printer</option>
                          {machineCatalog.map((machine) => (
                            <option key={machine.id} value={machine.id}>
                              {machine.name}
                            </option>
                          ))}
                        </select>
                      ) : shouldShowConsumableDropdown ? (
                        <select
                          value={row.selectedConsumableId || ''}
                          onChange={(e) => handleConsumableSelect(row.id, e.target.value)}
                          disabled={readOnly || row.autoAdded || !row.mode}
                          className={selectClass}
                          title={row.sku || ''}
                        >
                          <option value="">Select Consumable</option>
                          {(consumableCatalog[row.mode] || []).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      ) : shouldShowReadonlyConsumableSku ? (
                        <input
                          type="text"
                          value={row.sku || ''}
                          disabled
                          className={`${inputClass} ${disabledInputClass}`}
                          placeholder="Consumable"
                          title={row.sku || ''}
                        />
                      ) : (
                        <input
                          type="text"
                          value={row.sku}
                          disabled={readOnly || row.autoAdded || (!isOtherConsumable && !row.mode)}
                          onChange={(e) => handleInputChange(row.id, 'sku', e.target.value)}
                          className={`${inputClass} ${!row.sku ? 'border-orange-200' : ''} ${
                            readOnly || row.autoAdded || (!isOtherConsumable && !row.mode)
                              ? disabledInputClass
                              : ''
                          }`}
                          placeholder={
                            row.autoAdded
                              ? 'Auto-added consumable'
                              : row.mode === 'others'
                              ? 'Enter item name'
                              : 'Select mode first'
                          }
                        />
                      )}
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={
                          readOnly || isMachineRow || row.autoAdded || isLockedLinkedConsumable(row)
                        }
                        value={
                          focusedField === keyOf(row.id, 'cost')
                            ? row.cost || ''
                            : format2dpWithCommas(row.cost)
                        }
                        onFocus={() => setFocusedField(keyOf(row.id, 'cost'))}
                        onBlur={() => {
                          setFocusedField(null);
                          handleInputChange(row.id, 'cost', normalize2dp(row.cost));
                        }}
                        onKeyDown={onlyNumericKeys(true)}
                        onChange={(e) =>
                          handleInputChange(row.id, 'cost', sanitize2dp(e.target.value))
                        }
                        className={`${inputClass} ${
                          readOnly || isMachineRow || row.autoAdded || isLockedLinkedConsumable(row)
                            ? disabledInputClass
                            : ''
                        }`}
                        placeholder="0.00"
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value="1"
                        disabled={true}
                        className={`${inputClass} ${disabledInputClass}`}
                        placeholder="1"
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>
                        {formatNum(
                          isMachineRow
                            ? (Number(row.cost) || 0) * 1
                            : (Number(calcs.totalCost) || 0) * 1
                        )}
                      </div>
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          focusedField === keyOf(row.id, 'yields')
                            ? row.yields || ''
                            : formatIntWithCommas(row.yields)
                        }
                        onFocus={() => setFocusedField(keyOf(row.id, 'yields'))}
                        onBlur={() => setFocusedField(null)}
                        onKeyDown={onlyNumericKeys(false)}
                        onChange={(e) =>
                          handleInputChange(row.id, 'yields', sanitizeInt(e.target.value))
                        }
                        disabled={
                          isMachineRow || row.autoAdded || isLockedLinkedConsumable(row) || readOnly
                        }
                        className={`${inputClass} ${
                          isMachineRow || row.autoAdded || isLockedLinkedConsumable(row) || readOnly
                            ? disabledInputClass
                            : ''
                        }`}
                        placeholder="0"
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>{formatNum(calcs.costCpp)}</div>
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          focusedField === keyOf(row.id, 'price')
                            ? row.price || ''
                            : format2dpWithCommas(row.price)
                        }
                        onFocus={() => setFocusedField(keyOf(row.id, 'price'))}
                        onBlur={() => {
                          setFocusedField(null);
                          handleInputChange(row.id, 'price', normalize2dp(row.price));
                        }}
                        onKeyDown={onlyNumericKeys(true)}
                        onChange={(e) =>
                          handleInputChange(row.id, 'price', sanitize2dp(e.target.value))
                        }
                        disabled={readOnly}
                        className={`${inputClass} ${readOnly ? disabledInputClass : ''}`}
                        placeholder="0.00"
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>{formatNum(calcs.totalSell)}</div>
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>{formatNum(calcs.sellCpp)}</div>
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={addRow}
                          disabled={readOnly}
                          className={`w-6 h-6 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100 ${
                            readOnly ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeRow(row.id)}
                          disabled={readOnly}
                          className={`w-6 h-6 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 ${
                            readOnly ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                        >
                          -
                        </button>
                      </div>
                    </td>

                    <td className="border-b border-darkgreen/15 p-1">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleInputChange(row.id, 'remarks', e.target.value)}
                        placeholder="Enter remarks"
                        disabled={!canEditRemarks}
                        className={`${inputClass} normal-case text-start ${
                          !canEditRemarks ? disabledInputClass : ''
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td className={footerCellClass}></td>
                <td className={footerCellClass}></td>
                <td className={footerCellClass}>TOTALS</td>
                <td className={footerCellClass}>{formatNum(tableTotals.unitCost)}</td>
                <td className={footerCellClass}>{tableTotals.qty}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.totalCost)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.yields)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.costCpp)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.sellingPrice)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.totalSell)}</td>
                <td className={footerCellClass}>{formatNum(tableTotals.sellCpp)}</td>
                <td colSpan="2" className={footerCellClass}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MachineConfig;