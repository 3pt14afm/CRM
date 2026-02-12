import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { getRowCalculations } from '@/utils/calculations/freeuse/getRowCalculations';
import { get1YrPotential } from '@/utils/calculations/freeuse/get1YrPotential';
import { succeedingYears } from '@/utils/calculations/freeuse/succeedingYears';

function MachineConfig() {
  const { setProjectData, projectData, setYearlyData } = useProjectData();

  // ✅ Track which numeric cell is currently focused (so we can show raw while editing)
  const [focusedField, setFocusedField] = useState(null);
  const keyOf = (rowId, field) => `${rowId}:${field}`;

  // ✅ Helpers for sanitizing + formatting (only what we discussed)
  const sanitizeInt = (v) => String(v ?? '').replace(/\D/g, ''); // digits only

  const sanitize2dp = (v) => {
    let s = String(v ?? '').replace(/,/g, '').trim();
    s = s.replace(/[^\d.]/g, ''); // digits + dot only

    // keep only first dot
    const parts = s.split('.');
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');

    // limit decimals to 2
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
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const onlyNumericKeys = (allowDot) => (e) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (/^\d$/.test(e.key)) return;
    if (allowDot && e.key === '.') return;
    e.preventDefault();
  };

  // Initialize rows from context or default
  const [rows, setRows] = useState(() => {
    const { machine = [], consumable = [] } = projectData.machineConfiguration || {};
    const combined = [...machine, ...consumable];

    return combined.length > 0
      ? combined.map(r => ({
          ...r,
          cost: r.inputtedCost || r.cost,
          mode: r.mode || "", // ✅ default for old saved rows
        }))
      : [{
          id: Date.now(),
          sku: '',
          cost: '',
          qty: '',
          yields: '',
          price: '',
          remarks: '',
          type: 'consumable',
          mode: '', // ✅ default for new rows
        }];
  });

  // Totals for table footer
  const computeTotals = (rows) => rows.reduce((acc, r) => {
    const calcs = getRowCalculations(r);
    acc.unitCost += parseFloat(r.cost) || 0;
    acc.qty += parseFloat(r.qty) || 0;
    acc.totalCost += calcs.totalCost;
    acc.yields += parseFloat(r.yields) || 0;
    acc.costCpp += calcs.costCpp;
    acc.sellingPrice += parseFloat(r.price) || 0;
    acc.totalSell += calcs.totalSell;
    acc.sellCpp += calcs.sellCpp;
    return acc;
  }, { unitCost: 0, qty: 0, totalCost: 0, yields: 0, costCpp: 0, sellingPrice: 0, totalSell: 0, sellCpp: 0 });

  const tableTotals = computeTotals(rows);

  // Handle input changes (update local rows only)
  const handleInputChange = (id, field, value) => {
    setRows(prevRows => prevRows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const toggleMachine = (id, isMachine) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;

        // going to MACHINE: store current mode, clear mode (blank)
        if (isMachine) {
          return {
            ...r,
            type: "machine",
            prevMode: r.mode || "",
            mode: "", // ✅ blank while machine
          };
        }

        // going back to CONSUMABLE: restore previous mode
        return {
          ...r,
          type: "consumable",
          mode: r.prevMode || "",
        };
      })
    );
  };

  const setMode = (id, mode) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, mode } : r)));
  };

  // Add / Remove row
  const addRow = () => setRows([...rows, { id: Date.now(), sku: '', cost: '', qty: '', yields: '', price: '', remarks: '', type: 'consumable', mode: '', }]);
  const removeRow = (id) => rows.length > 1 && setRows(rows.filter(r => r.id !== id));
  const formatNum = (num) => (Number(num) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Live update context whenever rows change
  useEffect(() => {
    const rowsWithCalculations = rows.map(r => {
      const calcs = getRowCalculations(r, projectData);
      return {
        ...r,
        inputtedCost: calcs.inputtedCost,
        cost: calcs.computedCost,
        basePerYear: calcs.basePerYear, // Storing basePerYear in context here
        totalCost: calcs.totalCost,
        costCpp: calcs.costCpp,
        totalSell: calcs.totalSell,
        sellCpp: calcs.sellCpp,
        machineMargin: calcs.machineMargin,
        machineMarginTotal : calcs.machineMarginTotal
      };
    });

    // Filter based on SKU and type
    const machines = rowsWithCalculations.filter(r => r.type === 'machine' && r.sku?.trim() !== '');
    const consumables = rowsWithCalculations.filter(r => r.type === 'consumable' && r.sku?.trim() !== '');

    const totalsObj = rowsWithCalculations.reduce((acc, r) => {
      acc.unitCost += r.inputtedCost;
      acc.qty += Number(r.qty) || 0;
      acc.totalCost += r.totalCost;
      acc.yields += Number(r.yields) || 0;
      acc.costCpp += r.costCpp;
      acc.sellingPrice += Number(r.price) || 0;
      acc.totalSell += r.totalSell;
      acc.sellCpp += r.sellCpp;

      return acc;
    }, { unitCost: 0, qty: 0, totalCost: 0, yields: 0, costCpp: 0, sellingPrice: 0, totalSell: 0, sellCpp: 0 });

    setProjectData(prev => ({
      ...prev,
      machineConfiguration: { machine: machines, consumable: consumables, totals: totalsObj }
    }));
  }, [rows, projectData.interest.annualInterest, projectData.companyInfo.contractYears]);

  const inputClass = "w-full min-w-0 h-8 text-[13px] print:text-xs text-center rounded-sm border border-slate-200 outline-none focus:border-green-400 bg-white px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const readonlyClass = "w-full h-8 text-[13px] print:text-xs text-center px-1 flex items-center justify-center";
  const footerCellClass ="bg-[#D9F2D0] p-2 text-[12px] font-bold text-center ";

  return (
    <div className="mx-10 mb-5">
      <div className="overflow-hidden rounded-md border border-slate-300 shadow-md bg-lightgreen/5">
        <div className="bg-[#D9F2D0] py-2 text-center border-b border-darkgreen/15">
          <h2 className="text-[14px] font-bold tracking-wider uppercase">Machine Configuration</h2>
        </div>
        <div className="w-full">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "11%" }} />
              {/* remaining columns can share what's left */}
              <col style={{ width: "8%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "16%" }} /> {/* remarks */}
            </colgroup>
            <thead>
              <tr className="bg-lightgreen/15 text-[11px] uppercase text-black">
                <th className="border-b border-r border-darkgreen/15 p-2">H</th>
                <th className="border-b border-r border-darkgreen/15 p-2">T</th>
                <th className="border-b border-r border-darkgreen/15 p-2">Item SKU</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">Unit Cost</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">Qty</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">Total Cost</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">Yields</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">Cost CPP</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">Selling Price</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">Total Sell</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">Sell CPP</th>
                <th className="border-b border-r border-darkgreen/15 p-2 ">+/-</th>
                <th className="border-b border-darkgreen/15 p-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const calcs = getRowCalculations(row);
                return (
                  <tr key={row.id} className='border-b'>
                    <td className="border-r border-b border-darkgreen/15 text-center px-3 py-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 border border-darkgreen/30 accent-green-600 focus:ring-0 focus:outline-none cursor-pointer"
                        checked={row.type === 'machine'}
                        onChange={e => toggleMachine(row.id, e.target.checked)}
                      />
                    </td>
                    <td className="border-r border-b border-darkgreen/15 px-1">
                      <div className="flex items-center justify-center">
                        <select
                          value={row.type === "machine" ? "" : (row.mode || "")}
                          onChange={(e) => setMode(row.id, e.target.value)}
                          disabled={row.type === "machine"}
                          className={`w-[90%] min-w-0 h-6 text-[11px] sm:text-xs px-2 py-0 rounded-sm accent-green-600 border border-darkgreen/20 bg-white outline-none focus:outline-none focus:ring-0 focus:border-darkgreen/20  ${row.type === "machine" ? "opacity-50 cursor-not-allowed bg-slate-100" : "cursor-pointer"}`}
                          aria-label="Select mode: Mono / Color / Others"
                        >
                          {/* blank display for machine */}
                          <option className="text-gray-400" value="">Select</option>
                          <option value="mono">Mono</option>
                          <option value="color">Color</option>
                          <option value="others">Others</option>
                        </select>
                      </div>
                    </td>
                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        value={row.sku}
                        onChange={e => handleInputChange(row.id, 'sku', e.target.value)}
                        className={`${inputClass} ${!row.sku ? 'border-orange-200' : ''}`}
                        placeholder="SKU-XXX"
                      />
                    </td>

                    {/* ✅ Unit Cost (2 decimals, commas when not focused) */}
                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          focusedField === keyOf(row.id, 'cost')
                            ? (row.cost || '')
                            : format2dpWithCommas(row.cost)
                        }
                        onFocus={() => setFocusedField(keyOf(row.id, 'cost'))}
                        onBlur={() => {
                          setFocusedField(null);
                          handleInputChange(row.id, 'cost', normalize2dp(row.cost));
                        }}
                        onKeyDown={onlyNumericKeys(true)}
                        onChange={e => handleInputChange(row.id, 'cost', sanitize2dp(e.target.value))}
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </td>

                    {/* ✅ Qty (whole number, commas when not focused) */}
                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          focusedField === keyOf(row.id, 'qty')
                            ? (row.qty || '')
                            : formatIntWithCommas(row.qty)
                        }
                        onFocus={() => setFocusedField(keyOf(row.id, 'qty'))}
                        onBlur={() => setFocusedField(null)}
                        onKeyDown={onlyNumericKeys(false)}
                        onChange={e => handleInputChange(row.id, 'qty', sanitizeInt(e.target.value))}
                        className={inputClass}
                        placeholder="0"
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>{formatNum(calcs.totalCost)}</div>
                    </td>

                    {/* ✅ Yields (whole number, commas when not focused) */}
                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          focusedField === keyOf(row.id, 'yields')
                            ? (row.yields || '')
                            : formatIntWithCommas(row.yields)
                        }
                        onFocus={() => setFocusedField(keyOf(row.id, 'yields'))}
                        onBlur={() => setFocusedField(null)}
                        onKeyDown={onlyNumericKeys(false)}
                        onChange={e => handleInputChange(row.id, 'yields', sanitizeInt(e.target.value))}
                        className={inputClass}
                        placeholder="0"
                      />
                    </td>

                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <div className={readonlyClass}>{formatNum(calcs.costCpp)}</div>
                    </td>

                    {/* ✅ Selling Price (2 decimals, commas when not focused) */}
                    <td className="border-b border-r border-darkgreen/15 p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          focusedField === keyOf(row.id, 'price')
                            ? (row.price || '')
                            : format2dpWithCommas(row.price)
                        }
                        onFocus={() => setFocusedField(keyOf(row.id, 'price'))}
                        onBlur={() => {
                          setFocusedField(null);
                          handleInputChange(row.id, 'price', normalize2dp(row.price));
                        }}
                        onKeyDown={onlyNumericKeys(true)}
                        onChange={e => handleInputChange(row.id, 'price', sanitize2dp(e.target.value))}
                        className={inputClass}
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
                        <button onClick={addRow} className="w-6 h-6 rounded bg-lightgreen/50 text-green-600 border border-darkgreen/20 hover:bg-green-100">+</button>
                        <button onClick={() => removeRow(row.id)} className="w-6 h-6 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">-</button>
                      </div>
                    </td>
                    <td className="border-b border-darkgreen/15 p-1">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={e => handleInputChange(row.id, 'remarks', e.target.value)}
                        className={`${inputClass} text-start`}
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
