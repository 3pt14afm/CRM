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
    const wasAutoAdded = r.autoAdded === true || r.autoAdded === 1 || isPersistedAutoConsumable(r);

    const base = {
      ...r,
      id: r.id ?? genId(),
      cost: r.inputtedCost ?? r.cost ?? '',
      mode: r.mode || '',
      selectedMachineId: '',
      selectedConsumableId: r.selectedConsumableId || '',
      linkedMachineRowId: r.linkedMachineRowId ?? null,
      autoAdded: wasAutoAdded,
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

function MachineConfig({ readOnly, showOutrightErrors }) {
  const {
    auth,
    entryProject,
    project: inertiaProject,
    machineCatalog = [],
    consumableCatalog = { mono: [], color: [], others: [] },
    errors,
  } = usePage().props;

  const { setProjectData, projectData } = useProjectData();

  const currentUserId = auth?.user?.id ?? auth?.id ?? null;
  const project = entryProject ?? inertiaProject ?? null;

  const isEntryOwner = !project?.id || Number(project?.user_id) === Number(currentUserId);
  const canEditRemarks = !readOnly && isEntryOwner;

  const [focusedField, setFocusedField] = useState(null);
  const [activeSearchRowId, setActiveSearchRowId] = useState(null);
  const [manuallyEdited, setManuallyEdited] = useState({});

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
    (row?.linkedMachineRowId != null || row?.autoAdded === true);

  const hydrateMachineFields = (row) => {
    if (row?.type !== 'machine') return row;
    const machineId = row.selectedMachineId || inferSelectedMachineId(row);
    const machine = findMachineById(machineId);
    return {
      ...row,
      selectedMachineId: machineId || '',
      cost: row.cost !== '' && row.cost != null ? row.cost : normalize2dp(machine?.unitCost),
      price: row.price !== '' && row.price != null ? row.price : normalize2dp(machine?.sellingPrice),
    };
  };

  const enforceRowQty = (row) => ({ ...row, qty: 1 });

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
    const combined = buildHydratedRows({ machine: mc.machine || [], consumable: mc.consumable || [] }, hydrateHelpers);
    
    setRows(combined.length > 0 ? combined : [makeBlankRow()]);
    setFocusedField(null);
    setActiveSearchRowId(null);
    setManuallyEdited({});
    hydratedProjectKeyRef.current = projectKey;
  }, [projectData?.metadata?.projectId, projectData.machineConfiguration]);

  const handleInputChange = (id, field, value) => {
    if (field === 'cost' || field === 'yields') {
      setManuallyEdited((prev) => ({
        ...prev,
        [`${id}:${field}`]: true,
      }));
    }

    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== id) return row;
        if (field === 'remarks' && !canEditRemarks) return row;
        
        if (field === 'sku') {
          return enforceRowQty({ 
            ...row, 
            sku: value, 
            selectedMachineId: '', 
            selectedConsumableId: '' 
          });
        }

        return enforceRowQty({ ...row, [field]: value });
      })
    );
  };

  const getMachineSuggestions = (query) => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    return machineCatalog
      .filter((item) => String(item.name || '').toLowerCase().includes(q))
      .slice(0, 15);
  };

  const getConsumableSuggestions = (mode, query) => {
    const q = String(query || '').trim().toLowerCase();
    if (!q || !mode) return [];
    const catalog = consumableCatalog[mode] || [];
    return catalog.filter((item) => String(item.name || '').toLowerCase().includes(q)).slice(0, 15);
  };

  const handleMachineSearchChange = (id, typedValue) => {
    handleInputChange(id, 'sku', typedValue);
    setActiveSearchRowId(id);
  };

  const handleMachineInputBlur = () => {
    setTimeout(() => setActiveSearchRowId(null), 150);
  };

  const handleMachineSelect = (id, selectedId) => {
    const selectedMachine = findMachineById(selectedId);
    setRows((prev) => {
      const currentMachineIndex = prev.findIndex((r) => r.id === id);
      if (currentMachineIndex === -1) return prev;

      const currentMachineRow = prev[currentMachineIndex];
      const oldMachine = findMachineById(currentMachineRow.selectedMachineId);

      const oldConsumableSkus = new Set((oldMachine?.consumables || []).map((c) => String(c.name).trim()));
      const oldConsumableIds = new Set((oldMachine?.consumables || []).map((c) => String(c.id)));

      let nextMachineIndex = prev.findIndex((r, index) => index > currentMachineIndex && r.type === 'machine');
      if (nextMachineIndex === -1) nextMachineIndex = prev.length;

      const result = [];

      for (let i = 0; i < prev.length; i++) {
        const r = prev[i];
        if (r.id === id) continue;

        const isInsideCurrentMachineBlock = i > currentMachineIndex && i < nextMachineIndex;

        if (isInsideCurrentMachineBlock && r.type === 'consumable') {
          if (r.linkedMachineRowId === id) continue;
          const isMonoColor = r.mode === 'mono' || r.mode === 'color';
          const skuMatch = oldConsumableSkus.has(String(r.sku || '').trim());
          const idMatch = r.selectedConsumableId && oldConsumableIds.has(String(r.selectedConsumableId));
          if (isMonoColor && (skuMatch || idMatch)) continue;
        }
        result.push(r);
      }

      if (!selectedMachine) {
        const manualMachineRow = {
          ...currentMachineRow,
          type: 'machine',
          selectedMachineId: '',
          qty: 1,
        };
        result.splice(currentMachineIndex, 0, manualMachineRow);
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

    setActiveSearchRowId(null);
  };

  const handleMachineSuggestionSelect = (id, machine) => {
    handleMachineSelect(id, machine.id);
  };

  const handleConsumableSelect = (id, selectedId, mode) => {
    const selectedConsumable = findConsumableById(mode, selectedId);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
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
    setActiveSearchRowId(null);
  };

  const toggleMachine = (id, isMachine) => {
    setRows((prev) => {
      const withoutLinkedAutoRows = prev.filter(
        (r) => !(r.type === 'consumable' && r.linkedMachineRowId === id)
      );

      return withoutLinkedAutoRows.map((r) => {
        if (r.id !== id) return r;

        return {
          ...r,
          type: isMachine ? 'machine' : 'consumable',
          mode: r.mode || '',
          selectedMachineId: isMachine ? '' : '',
          selectedConsumableId: '',
          linkedMachineRowId: null,
          autoAdded: false,
          sku: r.sku,
          cost: r.cost,
          yields: r.yields,
          price: r.price,
        };
      });
    });
  };

  const setMode = (id, mode) => {
    setManuallyEdited(prev => {
      const newEdited = { ...prev };
      delete newEdited[`${id}:cost`];
      delete newEdited[`${id}:yields`];
      return newEdited;
    });

    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const isSwitchingToOthers = mode === 'others';
        return {
          ...r,
          type: isSwitchingToOthers ? 'consumable' : r.type,
          mode,
          sku: '',
          selectedMachineId: '',
          selectedConsumableId: '',
          linkedMachineRowId: null,
          autoAdded: false,
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

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows((prev) => {
        const targetRow = prev.find((r) => r.id === id);
        const isMachine = targetRow?.type === 'machine';

        return prev.filter((r) => {
          if (r.id === id) return false;
          if (isMachine && String(r.linkedMachineRowId) === String(id)) {
            return false;
          }
          return true;
        });
      });
    }
  };

  const formatNum = (num) =>
    (Number(num) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    const contractType = projectData.companyInfo?.contractType || '';
    const isMonthlyRental = contractType === 'Rental + Supplies';
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
        yields: calcs.yields,        // ✅ overrides normalizedRow.yields
        price: calcs.price,          // ✅ overrides normalizedRow.price
        costCpp: calcs.costCpp,
        totalSell: calcs.totalSell,
        sellCpp: calcs.sellCpp,
        machineMargin: calcs.machineMargin,
        machineMarginTotal: calcs.machineMarginTotal,
      };
    });

    const machines = rowsWithCalculations.filter((r) => r.type === 'machine' && r.sku?.trim() !== '');
    const consumables = rowsWithCalculations.filter((r) => r.type === 'consumable' && r.sku?.trim() !== '');

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
        const calcs = getRowCalculations(r, projectData);
        acc.unitCost += r.inputtedCost;
        acc.qty += Number(r.qty) || 0;
        acc.totalCost += r.totalCost;
        acc.yields += Number(calcs.yields) || 0;  
        acc.costCpp += r.costCpp;
         acc.sellingPrice += Number(calcs.price) || 0;
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

  // Table Totals helper
  const tableTotals = projectData.machineConfiguration?.totals || {
    unitCost: 0, qty: 0, totalCost: 0, yields: 0, costCpp: 0, sellingPrice: 0, totalSell: 0, sellCpp: 0
  };

  const inputClass =
    'w-full min-w-0 h-8 text-xs text-center rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  const selectClass =
    'w-full min-w-0 h-8 text-xs print:text-[10px] rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white pl-2 pr-6 text-center leading-tight';

  const readonlyClass = 'w-full h-8 text-[13px] print:text-xs text-center px-1 flex items-center justify-center';
  const footerCellClass = 'bg-[#D9F2D0] p-2 text-[12px] font-bold text-center ';
  const disabledInputClass = 'border-none disabled:bg-lightgreen/5  cursor-not-allowed';

  return (
    <div className="mx-10 mb-5">
      <div className="rounded-xl shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 bg-lightgreen/5">
        <div className="bg-[#D9F2D0] py-2 text-center rounded-t-xl border-b border-darkgreen/15">
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
                const isConsumable = row.type === 'consumable';
                const modeStr = String(row.mode || '').toLowerCase();
                
                // --- MODEL LOGIC EXTRACTION ---
                const contractType = (projectData?.companyInfo?.contractType || "").toLowerCase();
                const isOutright = contractType.includes("outright");
                const isOutrightClick = contractType.includes("outright + click charge");
                const isRental = contractType.includes("rental");
                const isFreeUse = contractType.includes("free use");
                const isClick = contractType.includes("click");
                const isFixed = contractType.includes("fixed");

                // General Machine Rule: Never allow Yields for hardware.
                // Toner Rule: Always require Yields for consumables.
                const isYieldDisabled = isMachineRow || (isFixed && isMachineRow) || isFixed;
                
                // Selling Price Logic
                // PROHIBITED for non-outright machines
                // PROHIBITED for Mono/Color items in Click-based service models
                const isPriceProhibited = (isMachineRow && !isOutright) || 
                                          (isConsumable && (isRental || isFreeUse) && isClick && (modeStr === 'mono' || modeStr === 'color')) || isFixed || (isOutrightClick && isConsumable);

                // Validation Indicators
                const hasGlobalError = !!errors?.machineConfiguration || showOutrightErrors;
                const isYieldError = hasGlobalError && isConsumable && (modeStr === 'mono' || modeStr === 'color') && (!row.yields || parseFloat(row.yields) <= 0);
                const isPriceError = hasGlobalError && 
                                    ((isMachineRow && isOutright && (!row.price || parseFloat(row.price) <= 0)) ||
                                     (isConsumable && isOutright && (modeStr === 'mono' || modeStr === 'color') && !row.price));

                const machineSuggestions = isMachineRow && activeSearchRowId === row.id ? getMachineSuggestions(row.sku) : [];

                return (
                  <tr key={row.id} className={`border-b relative transition-all duration-300 ${activeSearchRowId === row.id ? 'z-50' : 'z-10'}`}>
                    <td className="border-r border-b border-darkgreen/15 text-center px-3 py-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 border checkboxes border-darkgreen/35 accent-green-600 focus:ring-0 focus:outline-none cursor-pointer"
                        checked={isMachineRow}
                        onChange={(e) => toggleMachine(row.id, e.target.checked)}
                        disabled={readOnly || !!row.autoAdded || modeStr === 'mono' || modeStr === 'color'}
                      />
                    </td>

                    <td className="border-r border-b border-darkgreen/15 px-1">
                      <div className="flex items-center justify-center">
                        <select
                          value={isMachineRow && modeStr !== 'others' ? '' : row.mode || ''}
                          onChange={(e) => setMode(row.id, e.target.value)}
                          disabled={readOnly || !!row.autoAdded}
                          className={`w-[90%] min-w-0 h-6 text-[10px] sm:text-[11px] pl-2 pr-5 py-0 rounded-sm accent-green-600 border bg-white outline-none focus:outline-none focus:ring-0 ${
                            isMachineRow && modeStr !== 'others'
                              ? 'border-darkgreen/20 cursor-not-allowed bg-slate-100'
                              : shouldHighlightModeError(row)
                              ? 'border-red-400 bg-red-50 text-red-700 cursor-pointer'
                              : 'border-darkgreen/20 focus:border-[#289800] cursor-pointer'
                          } ${
                            (!!row.autoAdded || modeStr === 'mono' || modeStr === 'color') 
                              ? ' cursor-not-allowed bg-slate-100 border-slate-200' : ''
                          }`}
                        >
                          <option className="text-gray-400" value="">Select</option>
                          <option value="mono">Mono</option>
                          <option value="color">Color</option>
                          <option value="others">Others</option>
                        </select>
                      </div>
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1 text-black">
                      {isMachineRow && modeStr !== 'others' ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={row.sku || ''}
                            disabled={readOnly}
                            onChange={(e) => handleMachineSearchChange(row.id, e.target.value)}
                            onFocus={() => setActiveSearchRowId(row.id)}
                            onBlur={handleMachineInputBlur}
                            className={selectClass}
                            placeholder="Search printer..."
                            autoComplete="off"
                          />
                          {activeSearchRowId === row.id && !readOnly && row.sku?.trim() && (
                            <div className="absolute left-0 top-full z-[9999] mt-1 w-full rounded-md bg-white/20 backdrop-blur-lg border border-gray-200 shadow-xl max-h-48 overflow-auto no-scrollbar">
                              {machineSuggestions.length > 0 ? (
                                machineSuggestions.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleMachineSuggestionSelect(row.id, m)}
                                    className="block w-full text-left px-3 py-2 text-[12px] hover:bg-green-600 hover:text-black transition-colors"
                                  >
                                    {m.name}
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-[12px] text-slate-500">No results.</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (modeStr === 'mono' || modeStr === 'color') && !row.autoAdded ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={row.sku || ''}
                            disabled={readOnly || !row.mode}
                            onChange={(e) => {
                                handleInputChange(row.id, 'sku', e.target.value);
                                setActiveSearchRowId(row.id);
                            }}
                            onFocus={() => setActiveSearchRowId(row.id)}
                            onBlur={handleMachineInputBlur}
                            className={selectClass}
                            placeholder={`Search ${row.mode} item...`}
                            autoComplete="off"
                          />
                          {activeSearchRowId === row.id && !readOnly && row.sku?.trim() && (
                            <div className="absolute left-0 top-full z-[9999] mt-1 w-full rounded-md bg-white/30 backdrop-blur-lg border border-gray-200 shadow-xl max-h-48 overflow-auto no-scrollbar">
                              {(() => {
                                const suggestions = getConsumableSuggestions(row.mode, row.sku);
                                return suggestions.length > 0 ? (
                                  suggestions.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleConsumableSelect(row.id, item.id, row.mode)}
                                      className="block w-full text-left px-3 py-2 text-[12px] hover:bg-green-600 hover:text-black transition-colors"
                                    >
                                      {item.name}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-[12px] text-slate-500">No results.</div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={row.sku || ''}
                          disabled={readOnly || row.autoAdded}
                          onChange={(e) => handleInputChange(row.id, 'sku', e.target.value)}
                          className={`${inputClass} ${row.autoAdded ? disabledInputClass : ''}`}
                          placeholder={row.autoAdded ? 'Auto-added' : 'Select mode'}
                        />
                      )}
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={readOnly}
                        value={focusedField === keyOf(row.id, 'cost') ? row.cost || '' : format2dpWithCommas(row.cost)}
                        onFocus={() => setFocusedField(keyOf(row.id, 'cost'))}
                        onBlur={() => {
                          setFocusedField(null);
                          handleInputChange(row.id, 'cost', normalize2dp(row.cost));
                        }}
                        onKeyDown={onlyNumericKeys(true)}
                        onChange={(e) => handleInputChange(row.id, 'cost', sanitize2dp(e.target.value))}
                        className={`${inputClass} ${readOnly ? disabledInputClass : ''}`}
                        placeholder="0.00"
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input type="text" value="1" disabled className={`${inputClass} ${disabledInputClass}`} />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>
                        {calcs.totalCost !== 0 ? formatNum(isMachineRow ? Number(row.cost) || 0 : Number(calcs.totalCost) || 0) : '0.00'}
                      </div>
                    </td>

                    <td className={`border-b border-r border-darkgreen/15 p-1 ${isYieldError ? 'bg-red-50' : ''}`}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={isYieldDisabled ? "" : (focusedField === keyOf(row.id, 'yields') ? row.yields || '' : formatIntWithCommas(row.yields))}
                        onFocus={() => !isYieldDisabled && setFocusedField(keyOf(row.id, 'yields'))}
                        onBlur={() => setFocusedField(null)}
                        onKeyDown={onlyNumericKeys(false)}
                        onChange={(e) => handleInputChange(row.id, 'yields', sanitizeInt(e.target.value))}
                        disabled={readOnly || isYieldDisabled}
                        className={`${inputClass} ${
                          (readOnly || isYieldDisabled) ? "bg-gray-100 cursor-not-allowed opacity-50 border-none" : ""
                        } ${isYieldError ? 'ring-1 ring-red-500 border-red-500' : ''}`}
                        placeholder={isYieldDisabled ? "0" : "0"}
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>
                        {calcs.costCpp !== 0 ? formatNum(calcs.costCpp) : '0.00'}
                      </div>
                    </td>

                    <td className={`border-b border-r border-darkgreen/15 p-1 ${isPriceError ? 'bg-red-50' : ''}`}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={isPriceProhibited ? "0.00" : (focusedField === keyOf(row.id, 'price') ? row.price || '' : format2dpWithCommas(row.price))}
                        onFocus={() => !isPriceProhibited && setFocusedField(keyOf(row.id, 'price'))}
                        onBlur={() => {
                          setFocusedField(null);
                          if (!isPriceProhibited) handleInputChange(row.id, 'price', normalize2dp(row.price));
                        }}
                        onKeyDown={onlyNumericKeys(true)}
                        onChange={(e) => {
                          if (!isPriceProhibited) handleInputChange(row.id, 'price', sanitize2dp(e.target.value));
                        }}
                        disabled={readOnly || isPriceProhibited}
                        className={`${inputClass} ${
                          (readOnly || isPriceProhibited) ? "bg-gray-100 cursor-not-allowed opacity-50 border-none" : ""
                        } ${isPriceError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        placeholder={isPriceProhibited ? "N/A" : "0.00"}
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>
                        {Number(calcs.totalSell) !== 0 ? formatNum(calcs.totalSell) : '0.00'}
                      </div>
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>
                        {Number(calcs.sellCpp) !== 0 ? formatNum(calcs.sellCpp) : '0.00'}
                      </div>
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className="flex gap-1 justify-center">
                        <button onClick={addRow} disabled={readOnly} className={`w-6 h-6 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100 ${readOnly ? 'cursor-not-allowed' : ''}`}>+</button>
                        <button onClick={() => removeRow(row.id)} disabled={readOnly} className={`w-6 h-6 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 ${readOnly ? 'cursor-not-allowed' : ''}`}>-</button>
                      </div>
                    </td>

                    <td className="border-b border-darkgreen/15 p-1">
                      <input
                        type="text"
                        value={row.remarks || ''}
                        onChange={(e) => handleInputChange(row.id, 'remarks', e.target.value)}
                        placeholder="Enter remarks"
                        disabled={!canEditRemarks}
                        className={`${inputClass} normal-case text-start ${!canEditRemarks ? disabledInputClass : ''}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td className={`${footerCellClass} rounded-bl-xl`}></td>
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
                <td colSpan="2" className={`${footerCellClass} rounded-br-xl`}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MachineConfig;