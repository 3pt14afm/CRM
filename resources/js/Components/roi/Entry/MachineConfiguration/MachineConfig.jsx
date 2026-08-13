import React, { useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { useProjectData } from '@/Context/ProjectContext';
import { useMachineRows, MANDATORY_ROW_ID } from '@/hooks/roi/useMachineRows';
import { getRowDisplayFlags } from '@/utils/roi/machineconfig/rowLogic';
import { getRowCalculations } from '@/utils/roi/calculations/getRowCalculations';
import { format2dpWithCommas, formatIntWithCommas, formatNum, sanitizeInt, sanitize2dp, normalize2dp } from '@/utils/roi/machineconfig/formatter';
import { ROW_TYPE, MODE, EMPTY_TOTALS } from '@/utils/roi/machineconfig/const';

// ── Shared class strings ───────────────────────────────────────────────────
const cls = {
  input:
    'w-full min-w-0 h-8 text-xs text-center rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
  select:
    'w-full min-w-0 h-8 text-xs print:text-[10px] rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white pl-2 pr-6 text-center leading-tight',
  readonly:
    'w-full h-8 text-[13px] print:text-xs text-center px-1 flex items-center justify-center',
  inputLeft:
    'w-full min-w-0 h-8 text-xs text-left rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
  selectLeft:
    'w-full min-w-0 h-8 text-xs print:text-[10px] rounded-sm border border-slate-200 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white pl-2 pr-6 text-left leading-tight',
  readonlyLeft:
    'w-full h-8 text-[13px] print:text-xs text-left px-2 flex items-center justify-start',
  footerCell: 'bg-[#D9F2D0] p-2 text-[12px] font-bold text-center',
  disabled:   'border-none disabled:bg-lightgreen/5 cursor-not-allowed',
};

const HEADERS = ['H', 'T', 'Item SKU', 'Unit Cost', 'Qty', 'Total Cost', 'Yields', 'Cost CPP', 'Selling Price', 'Total Sell', 'Sell CPP', '+/-', 'Remarks'];

const onlyNumericKeys = (allowDot) => (e) => {
  const passthrough = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
  if (passthrough.includes(e.key) || e.ctrlKey || e.metaKey || /^\d$/.test(e.key)) return;
  if (allowDot && e.key === '.') return;
  e.preventDefault();
};

const rowRequiresMode = (row) =>
  !row?.isMandatory && row?.type !== ROW_TYPE.MACHINE;

const isRowMissingMode = (row) => rowRequiresMode(row) && !String(row?.mode || '').trim();

const shouldHighlightModeError = (row, showModeErrors) =>
  showModeErrors && isRowMissingMode(row);

// ── useRowRenderData ─────────────────────────────────────────────────────
function useRowRenderData({ row, contractType, errors, showOutrightErrors, showModeErrors, focusedField, handlers }) {
  const { projectData } = useProjectData();
  const { enforceRowQty, isQtyEditable, computePrinterQtyTotal, rows } = handlers;

  const printerQtyTotal = computePrinterQtyTotal(rows);
  
  const modeStr = String(row.mode || '').toLowerCase();
  const isOthers = modeStr === MODE.OTHERS;

  // Contract exclusions
  const normalizedContractType = String(contractType).trim().toLowerCase();
  const isMonthlyRental = normalizedContractType === 'fixed monthly only';
  const isOutrightOnly = normalizedContractType.includes('outright') && normalizedContractType.includes('only');
  const shouldEnforcePrinterQty = !isMonthlyRental && !isOutrightOnly;

  let rowForCalcs = row;
  let displayQty = row.qty || 1;
  let qtyEditable = isQtyEditable(row, contractType);

  // Handle 'Others' mode: lock input and multiply qty by printerQtyTotal
  if (isOthers && shouldEnforcePrinterQty) {
    const baseQty = Number(row.qty) || 1;
    const effectiveQty = Math.round(baseQty * (printerQtyTotal || 1) * 100) / 100;
    
    rowForCalcs = { ...row, qty: effectiveQty };
    displayQty = effectiveQty;
    qtyEditable = false; // Lock input so it behaves exactly like Mono/Color
  } else {
    rowForCalcs = enforceRowQty(row, contractType, printerQtyTotal);
  }

  const calcs = getRowCalculations(rowForCalcs, projectData);
  const flags = getRowDisplayFlags(row, contractType, errors, showOutrightErrors);
  const { isYieldDisabled, isPriceProhibited, isYieldError, isPriceError } = flags;

  const isMachineRow      = row.type === ROW_TYPE.MACHINE;
  const isAutoOrMonoColor = !!row.autoAdded || modeStr === MODE.MONO || modeStr === MODE.COLOR || isOthers;
  const isMandatory       = !!row.isMandatory;
  const keyOf             = (field) => `${row.id}:${field}`;
  const isFocused         = (field) => focusedField === keyOf(field);
  const modeError         = shouldHighlightModeError(row, showModeErrors);

  return {
    calcs, isYieldDisabled, isPriceProhibited, isYieldError, isPriceError,
    isMachineRow, modeStr, isAutoOrMonoColor, isMandatory, keyOf, isFocused, modeError,
    qtyEditable,
    displayQty,
  };
}

// ── SKUCell ────────────────────────────────────────────────────────────────
function SKUCell({ row, readOnly, activeSearchRowId, handlers, align = 'center' }) {
  const {
    handleInputChange, handleMachineSearchChange, handleMachineInputBlur,
    handleMachineSuggestionSelect, handleConsumableSelect,
    getMachineSuggestions, getConsumableSuggestions, setActiveSearchRowId,
  } = handlers;

  const isMachine    = row.type === ROW_TYPE.MACHINE;
  const mode         = String(row.mode || '').toLowerCase();
  const isMonoColor  = mode === MODE.MONO || mode === MODE.COLOR;
  const isActive     = activeSearchRowId === row.id && !readOnly && row.sku?.trim();
  const selectCls    = align === 'left' ? cls.selectLeft : cls.select;
  const inputCls     = align === 'left' ? cls.inputLeft : cls.input;

  const Dropdown = ({ items, onSelect }) => (
    <div className="absolute left-0 top-full z-[9999] mt-1 w-full rounded-md bg-white/20 backdrop-blur-lg border border-gray-200 shadow-xl max-h-48 overflow-auto no-scrollbar">
      {items.length > 0 ? items.map((item) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(item)}
          className="block w-full text-left px-3 py-2 text-[12px] hover:bg-green-600 hover:text-black transition-colors"
        >
          {item.name}
        </button>
      )) : (
        <div className="px-3 py-2 text-[12px] text-slate-500">No results.</div>
      )}
    </div>
  );

  if (isMachine && mode !== MODE.MONO && mode !== MODE.COLOR) {
    return (
      <div className="relative">
        <input
          type="text"
          value={row.sku || ''}
          disabled={readOnly}
          onChange={(e) => handleMachineSearchChange(row.id, e.target.value)}
          onFocus={() => setActiveSearchRowId(row.id)}
          onBlur={handleMachineInputBlur}
          className={selectCls}
          placeholder="Enter printer..."
          autoComplete="off"
        />
        {isActive && (
          <Dropdown
            items={getMachineSuggestions(row.sku)}
            onSelect={(m) => handleMachineSuggestionSelect(row.id, m)}
          />
        )}
      </div>
    );
  }

  if (isMonoColor && !row.autoAdded) {
    return (
      <div className="relative">
        <input
          type="text"
          value={row.sku || ''}
          disabled={readOnly || !row.mode}
          onChange={(e) => { handleInputChange(row.id, 'sku', e.target.value); setActiveSearchRowId(row.id); }}
          onFocus={() => setActiveSearchRowId(row.id)}
          onBlur={handleMachineInputBlur}
          className={selectCls}
          placeholder={`Enter ${row.mode} item...`}
          autoComplete="off"
        />
        {isActive && (
          <Dropdown
            items={getConsumableSuggestions(row.mode, row.sku)}
            onSelect={(item) => handleConsumableSelect(row.id, item.id, row.mode)}
          />
        )}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={row.sku || ''}
      disabled={readOnly || row.autoAdded}
      onChange={(e) => handleInputChange(row.id, 'sku', e.target.value)}
      className={`${inputCls} ${row.autoAdded ? cls.disabled : ''}`}
      placeholder={row.autoAdded ? 'Auto-added' : 'Select mode'}
    />
  );
}

// ── MachineRow (desktop table row) ─────────────────────────────────────────
function MachineRow({ row, readOnly, canEditRemarks, activeSearchRowId, focusedField, contractType, errors, showOutrightErrors, showModeErrors, handlers }) {
  const {
    handleInputChange, toggleMachine, setMode, addRow, removeRow,
    setFocusedField, onBlurNormalize,
  } = handlers;

  const {
    calcs, isYieldDisabled, isPriceProhibited, isYieldError, isPriceError,
    isMachineRow, modeStr, isAutoOrMonoColor, isMandatory, keyOf, isFocused, modeError,
    qtyEditable, displayQty,
  } = useRowRenderData({ row, contractType, errors, showOutrightErrors, showModeErrors, focusedField, handlers });

  return (
    <tr
      className={[
        'border-b relative transition-all duration-300',
        activeSearchRowId === row.id ? 'z-50' : 'z-10',
        isMandatory ? 'bg-green-50/60' : '',
      ].join(' ')}
    >
      {/* H — checkbox */}
      <td className="border-r border-b border-darkgreen/15 text-center px-3 py-2">
        {isMandatory ? (
          <input
            type="checkbox"
            checked
            disabled
            onChange={() => {}}
            title="This printer row is required"
            className="w-4 h-4 border checkboxes border-darkgreen/35 accent-green-600 focus:ring-0 focus:outline-none cursor-not-allowed"
          />
        ) : (
          <input
            type="checkbox"
            className="w-4 h-4 border checkboxes border-darkgreen/35 accent-green-600 focus:ring-0 focus:outline-none cursor-pointer"
            checked={isMachineRow}
            onChange={(e) => toggleMachine(row.id, e.target.checked)}
            disabled={readOnly || !!row.autoAdded || modeStr === MODE.MONO || modeStr === MODE.COLOR}
          />
        )}
      </td>

      {/* T — mode */}
      <td className="border-r border-b border-darkgreen/15 px-1">
        <div className="flex items-center justify-center">
          {isMandatory ? (
            <span className="w-[90%] h-6 text-[10px] sm:text-[11px] flex items-center justify-center rounded-sm border border-darkgreen/20 bg-slate-100 text-slate-500 select-none cursor-not-allowed">
              Printer
            </span>
          ) : (
            <select
              value={isMachineRow && modeStr !== MODE.OTHERS ? '' : row.mode || ''}
              onChange={(e) => setMode(row.id, e.target.value)}
              disabled={readOnly || !!row.autoAdded}
              className={[
                'w-[90%] min-w-0 h-6 text-[10px] sm:text-[11px] pl-2 pr-5 py-0 rounded-sm accent-green-600 border bg-white outline-none focus:outline-none focus:ring-0',
                isMachineRow && modeStr !== MODE.OTHERS ? 'border-darkgreen/20 cursor-not-allowed bg-slate-100'
                  : modeError                            ? 'border-red-400 bg-red-50 text-red-700 cursor-pointer'
                  :                                       'border-darkgreen/20 focus:border-[#289800] cursor-pointer',
                isAutoOrMonoColor ? 'cursor-not-allowed bg-slate-100 border-slate-200' : '',
              ].join(' ')}
            >
              <option className="text-gray-400" value="">Select</option>
              <option value={MODE.MONO}>Mono</option>
              <option value={MODE.COLOR}>Color</option>
              <option value={MODE.OTHERS}>Others</option>
            </select>
          )}
          {modeError && (
            <span className="sr-only">A type must be selected for this row</span>
          )}
        </div>
      </td>

      {/* Item SKU */}
      <td className="border-b border-r border-darkgreen/15 p-1 text-black">
        <SKUCell row={row} readOnly={readOnly} activeSearchRowId={activeSearchRowId} handlers={handlers} />
      </td>

      {/* Unit cost */}
      <td className="border-b border-r border-darkgreen/15 p-1">
        <input
          type="text" inputMode="decimal" disabled={readOnly}
          value={isFocused('cost') ? row.cost || '' : format2dpWithCommas(row.cost)}
          onFocus={() => setFocusedField(keyOf('cost'))}
          onBlur={() => onBlurNormalize(row.id, 'cost')}
          onKeyDown={onlyNumericKeys(true)}
          onChange={(e) => handleInputChange(row.id, 'cost', sanitize2dp(e.target.value))}
          className={`${cls.input} ${readOnly ? cls.disabled : ''}`}
          placeholder="0.00"
        />
      </td>

      {/* Qty */}
      <td className="border-b border-r border-darkgreen/15 p-1">
        <input
          type="text"
          inputMode="numeric"
          value={isFocused('qty') ? row.qty || '' : formatIntWithCommas(displayQty)}
          disabled={readOnly || !qtyEditable}
          onFocus={() => qtyEditable && setFocusedField(keyOf('qty'))}
          onBlur={() => {
            setFocusedField(null);
            if (qtyEditable && !String(row.qty || '').trim()) {
              handleInputChange(row.id, 'qty', '1');
            }
          }}
          onKeyDown={onlyNumericKeys(false)}
          onChange={(e) => qtyEditable && handleInputChange(row.id, 'qty', sanitizeInt(e.target.value))}
          className={`${cls.input} ${!qtyEditable ? cls.disabled : ''}`}
        />
      </td>

      {/* Total cost */}
      <td className="border-b border-r border-darkgreen/15 p-1">
        <div className={cls.readonly}>
          {formatNum(Number(calcs.totalCost) || 0)}
        </div>
      </td>

      {/* Yields */}
      <td className={`border-b border-r border-darkgreen/15 p-1 ${isYieldError ? 'bg-red-50' : ''}`}>
        <input
          type="text" inputMode="numeric"
          value={isYieldDisabled ? '' : (isFocused('yields') ? row.yields || '' : formatIntWithCommas(row.yields))}
          onFocus={() => !isYieldDisabled && setFocusedField(keyOf('yields'))}
          onBlur={() => setFocusedField(null)}
          onKeyDown={onlyNumericKeys(false)}
          onChange={(e) => handleInputChange(row.id, 'yields', sanitizeInt(e.target.value))}
          disabled={readOnly || isYieldDisabled}
          className={`${cls.input} ${readOnly || isYieldDisabled ? 'bg-gray-100 cursor-not-allowed opacity-50 border-none' : ''} ${isYieldError ? 'ring-1 ring-red-500 border-red-500' : ''}`}
          placeholder="0"
        />
      </td>

      {/* Cost CPP */}
      <td className="border-b border-r border-darkgreen/15 p-1">
        <div className={cls.readonly}>{formatNum(calcs.costCpp)}</div>
      </td>

      {/* Selling price */}
      <td className={`border-b border-r border-darkgreen/15 p-1 ${isPriceError ? 'bg-red-50' : ''}`}>
        <input
          type="text" inputMode="decimal"
          value={isPriceProhibited ? '0.00' : (isFocused('price') ? row.price || '' : format2dpWithCommas(row.price))}
          onFocus={() => !isPriceProhibited && setFocusedField(keyOf('price'))}
          onBlur={() => { setFocusedField(null); if (!isPriceProhibited) handleInputChange(row.id, 'price', normalize2dp(row.price)); }}
          onKeyDown={onlyNumericKeys(true)}
          onChange={(e) => { if (!isPriceProhibited) handleInputChange(row.id, 'price', sanitize2dp(e.target.value)); }}
          disabled={readOnly || isPriceProhibited}
          className={`${cls.input} ${readOnly || isPriceProhibited ? 'bg-gray-100 cursor-not-allowed opacity-50 border-none' : ''} ${isPriceError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          placeholder={isPriceProhibited ? 'N/A' : '0.00'}
        />
      </td>

      {/* Total sell */}
      <td className="border-b border-r border-darkgreen/15 p-1">
        <div className={cls.readonly}>{formatNum(calcs.totalSell)}</div>
      </td>

      {/* Sell CPP */}
      <td className="border-b border-r border-darkgreen/15 p-1">
        <div className={cls.readonly}>{formatNum(calcs.sellCpp)}</div>
      </td>

      {/* +/- */}
      <td className="border-b border-r border-darkgreen/15 p-1">
        <div className="flex gap-1 justify-center">
          <button
            onClick={addRow}
            disabled={readOnly}
            className={`w-6 h-6 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100 ${readOnly ? 'cursor-not-allowed' : ''}`}
          >
            +
          </button>
          {!isMandatory && (
            <button
              onClick={() => removeRow(row.id)}
              disabled={readOnly || handlers.rows.length <= 1}
              title={handlers.rows.length <= 1 ? 'At least one row is required' : undefined}
              className={`w-6 h-6 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 ${readOnly || handlers.rows.length <= 1 ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              -
            </button>
          )}
          {isMandatory && <span className="w-6 h-6 inline-block" />}
        </div>
      </td>

      {/* Remarks */}
      <td className="border-b border-darkgreen/15 p-1">
        <input
          type="text"
          value={row.remarks || ''}
          onChange={(e) => handleInputChange(row.id, 'remarks', e.target.value)}
          placeholder="Enter remarks"
          disabled={!canEditRemarks}
          className={`${cls.input} normal-case text-start ${!canEditRemarks ? cls.disabled : ''}`}
        />
      </td>
    </tr>
  );
}

// ── Field (mobile card labeled field wrapper) ───────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className={error ? 'bg-red-50 rounded-md p-1 -m-1' : ''}>
      <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── MachineRowCard (mobile card) ────────────────────────────────────────────
function MachineRowCard({ row, readOnly, canEditRemarks, activeSearchRowId, focusedField, contractType, errors, showOutrightErrors, showModeErrors, handlers }) {
  const {
    handleInputChange, toggleMachine, setMode, addRow, removeRow,
    setFocusedField, onBlurNormalize,
  } = handlers;

  const {
    calcs, isYieldDisabled, isPriceProhibited, isYieldError, isPriceError,
    isMachineRow, modeStr, isAutoOrMonoColor, isMandatory, keyOf, isFocused, modeError,
    qtyEditable, displayQty,
  } = useRowRenderData({ row, contractType, errors, showOutrightErrors, showModeErrors, focusedField, handlers });

  return (
    <div
      className={[
        'rounded-xl border border-darkgreen/15 shadow-sm p-3 flex flex-col gap-3',
        isMandatory ? 'bg-lightgreen/5' : 'bg-white',
      ].join(' ')}
    >
      {/* Header: H checkbox, T select/badge, add/remove */}
      <div className="flex items-center justify-between gap-2 flex-wrap ">
        <div className="flex items-center gap-2">
          {isMandatory ? (
            <input
              type="checkbox"
              checked
              disabled
              onChange={() => {}}
              title="This printer row is required"
              className="w-4 h-4 border border-darkgreen/35 accent-green-600 focus:ring-0 focus:outline-none cursor-not-allowed"
            />
          ) : (
            <input
              type="checkbox"
              className="w-4 h-4 border border-darkgreen/35 accent-green-600 focus:ring-0 focus:outline-none cursor-pointer"
              checked={isMachineRow}
              onChange={(e) => toggleMachine(row.id, e.target.checked)}
              disabled={readOnly || !!row.autoAdded || modeStr === MODE.MONO || modeStr === MODE.COLOR}
            />
          )}

          {isMandatory ? (
            <span className="h-6 px-2 text-[11px] flex items-center justify-center rounded-sm border border-darkgreen/20 bg-slate-100 text-slate-500 select-none cursor-not-allowed">
              Printer
            </span>
          ) : (
            <select
              value={isMachineRow && modeStr !== MODE.OTHERS ? '' : row.mode || ''}
              onChange={(e) => setMode(row.id, e.target.value)}
              disabled={readOnly || !!row.autoAdded}
              className={[
                'h-8 text-[11px] w-20 px-2 rounded-sm border bg-white outline-none flex items-center leading-none',
                isMachineRow && modeStr !== MODE.OTHERS ? 'border-darkgreen/20 cursor-not-allowed bg-slate-100'
                  : modeError                            ? 'border-red-400 bg-red-50 text-red-700 cursor-pointer'
                  :                                       'border-darkgreen/20 focus:border-[#289800] cursor-pointer',
                isAutoOrMonoColor ? 'cursor-not-allowed bg-slate-100 border-slate-200' : '',
              ].join(' ')}
            >
              <option value="">Select</option>
              <option value={MODE.MONO}>Mono</option>
              <option value={MODE.COLOR}>Color</option>
              <option value={MODE.OTHERS}>Others</option>
            </select>
          )}
          {modeError && <span className="text-[10px] text-red-600 font-medium">Type required</span>}
        </div>

        <div className="flex gap-1">
          <button
            onClick={addRow}
            disabled={readOnly}
            className={`w-7 h-7 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100 ${readOnly ? 'cursor-not-allowed' : ''}`}
          >
            +
          </button>
          {!isMandatory && (
            <button
              onClick={() => removeRow(row.id)}
              disabled={readOnly || handlers.rows.length <= 1}
              title={handlers.rows.length <= 1 ? 'At least one row is required' : undefined}
              className={`w-7 h-7 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 ${readOnly || handlers.rows.length <= 1 ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              -
            </button>
          )}
        </div>
      </div>

      {/* SKU */}
      <Field label="Item SKU">
        <SKUCell row={row} readOnly={readOnly} activeSearchRowId={activeSearchRowId} handlers={handlers} align="left" />
      </Field>

      {/* Numeric fields */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit Cost">
          <input
            type="text" inputMode="decimal" disabled={readOnly}
            value={isFocused('cost') ? row.cost || '' : format2dpWithCommas(row.cost)}
            onFocus={() => setFocusedField(keyOf('cost'))}
            onBlur={() => onBlurNormalize(row.id, 'cost')}
            onKeyDown={onlyNumericKeys(true)}
            onChange={(e) => handleInputChange(row.id, 'cost', sanitize2dp(e.target.value))}
            className={`${cls.inputLeft} ${readOnly ? cls.disabled : ''}`}
            placeholder="0.00"
          />
        </Field>

        <Field label="Qty">
          <input
            type="text"
            inputMode="numeric"
            value={isFocused('qty') ? row.qty || '' : formatIntWithCommas(displayQty)}
            disabled={readOnly || !qtyEditable}
            onFocus={() => qtyEditable && setFocusedField(keyOf('qty'))}
            onBlur={() => {
              setFocusedField(null);
              if (qtyEditable && !String(row.qty || '').trim()) {
                handleInputChange(row.id, 'qty', '1');
              }
            }}
            onKeyDown={onlyNumericKeys(false)}
            onChange={(e) => qtyEditable && handleInputChange(row.id, 'qty', sanitizeInt(e.target.value))}
            className={`${cls.inputLeft} ${!qtyEditable ? cls.disabled : ''}`}
          />
        </Field>

        <Field label="Total Cost">
          <div className={cls.readonlyLeft}>
            {formatNum(Number(calcs.totalCost) || 0)}
          </div>
        </Field>

        <Field label="Yields" error={isYieldError}>
          <input
            type="text" inputMode="numeric"
            value={isYieldDisabled ? '' : (isFocused('yields') ? row.yields || '' : formatIntWithCommas(row.yields))}
            onFocus={() => !isYieldDisabled && setFocusedField(keyOf('yields'))}
            onBlur={() => setFocusedField(null)}
            onKeyDown={onlyNumericKeys(false)}
            onChange={(e) => handleInputChange(row.id, 'yields', sanitizeInt(e.target.value))}
            disabled={readOnly || isYieldDisabled}
            className={`${cls.inputLeft} ${readOnly || isYieldDisabled ? 'bg-gray-100 cursor-not-allowed opacity-50 border-none' : ''} ${isYieldError ? 'ring-1 ring-red-500 border-red-500' : ''}`}
            placeholder="0"
          />
        </Field>

        <Field label="Cost CPP">
          <div className={cls.readonlyLeft}>{formatNum(calcs.costCpp)}</div>
        </Field>

        <Field label="Selling Price" error={isPriceError}>
          <input
            type="text" inputMode="decimal"
            value={isPriceProhibited ? '0.00' : (isFocused('price') ? row.price || '' : format2dpWithCommas(row.price))}
            onFocus={() => !isPriceProhibited && setFocusedField(keyOf('price'))}
            onBlur={() => { setFocusedField(null); if (!isPriceProhibited) handleInputChange(row.id, 'price', normalize2dp(row.price)); }}
            onKeyDown={onlyNumericKeys(true)}
            onChange={(e) => { if (!isPriceProhibited) handleInputChange(row.id, 'price', sanitize2dp(e.target.value)); }}
            disabled={readOnly || isPriceProhibited}
            className={`${cls.inputLeft} ${readOnly || isPriceProhibited ? 'bg-gray-100 cursor-not-allowed opacity-50 border-none' : ''} ${isPriceError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            placeholder={isPriceProhibited ? 'N/A' : '0.00'}
          />
        </Field>

        <Field label="Total Sell">
          <div className={cls.readonlyLeft}>{formatNum(calcs.totalSell)}</div>
        </Field>

        <Field label="Sell CPP">
          <div className={cls.readonlyLeft}>{formatNum(calcs.sellCpp)}</div>
        </Field>
      </div>

      {/* Remarks */}
      <Field label="Remarks">
        <input
          type="text"
          value={row.remarks || ''}
          onChange={(e) => handleInputChange(row.id, 'remarks', e.target.value)}
          placeholder="Enter remarks"
          disabled={!canEditRemarks}
          className={`${cls.inputLeft} normal-case text-start ${!canEditRemarks ? cls.disabled : ''}`}
        />
      </Field>
    </div>
  );
}

// ── ConfigTableFooter (desktop tfoot) ───────────────────────────────────────
function ConfigTableFooter({ totals }) {
  const t = { ...EMPTY_TOTALS, ...totals };
  return (
    <tfoot>
      <tr>
        <td className={`${cls.footerCell} rounded-bl-xl`} />
        <td className={cls.footerCell} />
        <td className={cls.footerCell}>TOTALS</td>
        <td className={cls.footerCell}>{formatNum(t.unitCost)}</td>
        <td className={cls.footerCell}>{formatIntWithCommas(t.qty)}</td>
        <td className={cls.footerCell}>{formatNum(t.totalCost)}</td>
        <td className={cls.footerCell}>{formatNum(t.yields)}</td>
        <td className={cls.footerCell}>{formatNum(t.costCpp)}</td>
        <td className={cls.footerCell}>{formatNum(t.sellingPrice)}</td>
        <td className={cls.footerCell}>{formatNum(t.totalSell)}</td>
        <td className={cls.footerCell}>{formatNum(t.sellCpp)}</td>
        <td colSpan="2" className={`${cls.footerCell} rounded-br-xl`} />
      </tr>
    </tfoot>
  );
}

// ── MobileTotalsFooter ──────────────────────────────────────────────────────
function MobileTotalsFooter({ totals }) {
  const t = { ...EMPTY_TOTALS, ...totals };
  const items = [
    ['Unit Cost', formatNum(t.unitCost)],
    ['Qty', formatIntWithCommas(t.qty)],
    ['Total Cost', formatNum(t.totalCost)],
    ['Yields', formatNum(t.yields)],
    ['Cost CPP', formatNum(t.costCpp)],
    ['Selling Price', formatNum(t.sellingPrice)],
    ['Total Sell', formatNum(t.totalSell)],
    ['Sell CPP', formatNum(t.sellCpp)],
  ];

  return (
    <div className=" bottom-0 z-30 -mx-3 mt-1 px-3 pt-3 pb-4  bg-[#D9F2D0] border-t border-darkgreen/20 shadow-[0_-4px_10px_rgba(0,0,0,0.08)] rounded-b-2xl">
      <p className="text-[11px] font-bold tracking-wider uppercase text-center mb-2">Totals</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <span className="text-slate-600">{label}</span>
            <span className="font-bold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MachineConfig ──────────────────────────────────────────────────────────
function MachineConfig({ readOnly, showOutrightErrors, showModeErrors }) {
  const { auth, entryProject, project: inertiaProject, machineCatalog = [], consumableCatalog = {}, errors } = usePage().props;
  const { projectData } = useProjectData();

  const project        = entryProject ?? inertiaProject ?? null;
  const currentUserId  = auth?.user?.id ?? auth?.id ?? null;
  const isEntryOwner   = !project?.id || Number(project?.user_id) === Number(currentUserId);
  const canEditRemarks = !readOnly && isEntryOwner;
  const contractType   = projectData.companyInfo?.contractType || '';

  const baseHandlers = useMachineRows({ machineCatalog, consumableCatalog, canEditRemarks });
  
  // Intercept toggleMachine to reset all values when a row becomes a machine
  const handlers = useMemo(() => ({
    ...baseHandlers,
    toggleMachine: (id, isMachine) => {
      baseHandlers.toggleMachine(id, isMachine);
      if (isMachine) {
        baseHandlers.handleInputChange(id, 'yields', '0');
        baseHandlers.handleInputChange(id, 'price', '0');
      }
    }
  }), [baseHandlers]);

  const { rows, focusedField, activeSearchRowId } = handlers;

  // Calculate dynamic totals directly from rows to ensure 100% accuracy in the UI
  const totals = useMemo(() => {
    if (!rows || rows.length === 0) return EMPTY_TOTALS;
    
    const printerQtyTotal = handlers.computePrinterQtyTotal(rows);
    const normalizedContractType = String(contractType).trim().toLowerCase();
    const isMonthlyRental = normalizedContractType === 'fixed monthly only';
    const isOutrightOnly = normalizedContractType.includes('outright') && normalizedContractType.includes('only');
    const shouldEnforcePrinterQty = !isMonthlyRental && !isOutrightOnly;

    return rows.reduce((acc, row) => {
      const modeStr = String(row.mode || '').toLowerCase();
      const isOthers = modeStr === MODE.OTHERS;
      let rowForCalcs = row;
      
      if (isOthers && shouldEnforcePrinterQty) {
          const baseQty = Number(row.qty) || 1;
          const effectiveQty = Math.round(baseQty * (printerQtyTotal || 1) * 100) / 100;
          rowForCalcs = { ...row, qty: effectiveQty };
      } else {
          rowForCalcs = handlers.enforceRowQty(row, contractType, printerQtyTotal);
      }
      
      const calcs = getRowCalculations(rowForCalcs, projectData);
      
      acc.unitCost += Number(row.cost) || 0;
      acc.qty += Number(rowForCalcs.qty) || 0;
      acc.totalCost += Number(calcs.totalCost) || 0;
      acc.yields += Number(row.yields) || 0;
      acc.costCpp += Number(calcs.costCpp) || 0;
      acc.sellingPrice += Number(row.price) || 0;
      acc.totalSell += Number(calcs.totalSell) || 0;
      acc.sellCpp += Number(calcs.sellCpp) || 0;
      
      return acc;
    }, { ...EMPTY_TOTALS });
  }, [rows, handlers, contractType, projectData]);

  const hasInvalidRows = showModeErrors && rows.some(isRowMissingMode);

  const sharedRowProps = {
    readOnly, canEditRemarks, activeSearchRowId, focusedField,
    contractType, errors, showOutrightErrors, showModeErrors, handlers,
  };

  return (
    <div className="mx-3 sm:mx-10 mb-5">
      <div className="rounded-xl shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 bg-lightgreen/5">

        <div className="bg-[#D9F2D0] py-2 text-center rounded-t-xl border-b border-darkgreen/15">
          <h2 className="text-[14px] font-bold tracking-wider uppercase">Machine Configuration</h2>
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block w-full">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              {['4%','7%','30%','10%','5%','11%','8%','7%','9%','10%','7%','6%','16%'].map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>

            <thead>
              <tr className="bg-lightgreen/15 text-[11px] uppercase text-black">
                {HEADERS.map((label, i) => (
                  <th key={label} className={`border-b border-darkgreen/15 p-2 ${i < 12 ? 'border-r' : ''}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <MachineRow key={row.id} row={row} {...sharedRowProps} />
              ))}
            </tbody>

            <ConfigTableFooter totals={totals} />
          </table>
        </div>

        {/* Mobile: stacked cards + single sticky totals footer */}
        <div className="md:hidden px-3 pt-4 flex flex-col gap-3">
          {rows.map((row) => (
            <MachineRowCard key={row.id} row={row} {...sharedRowProps} />
          ))}
          <MobileTotalsFooter totals={totals} />
        </div>

      </div>
    </div>
  );
}

export default MachineConfig;