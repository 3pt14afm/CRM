import { useEffect, useRef } from 'react';
import { MdAdd, MdOutlineDelete } from 'react-icons/md';

const makeEmptyRemark = () => '';

function AutoResizeTextarea({ value, onChange, placeholder = '', readOnly = false }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  if (readOnly) {
    return (
      <div className="w-full min-h-[32px] overflow-hidden rounded-xl border border-gray-200 px-3 py-1.5 text-xs bg-white whitespace-pre-wrap">
        {value?.trim?.() ? value : '—'}
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      placeholder={placeholder}
      className="w-full overflow-hidden rounded-xl border border-gray-200 px-3 py-1.5 text-xs outline-none placeholder:text-[#9AA08F] hover:border-[#28980080] focus:border-[#289800] focus:outline-none focus:ring-0 resize-none"
    />
  );
}

export default function RemarksBlock({
  value = [makeEmptyRemark()],
  onChange,
  readOnly = false,
  lastRejectNote = '',
}) {
  const rows = Array.isArray(value) && value.length > 0 ? value : [makeEmptyRemark()];

  const updateRemark = (index, nextValue) => {
    if (readOnly || typeof onChange !== 'function') return;
    onChange(rows.map((row, i) => (i === index ? nextValue : row)));
  };

  const addRemarkRow = (index) => {
    if (readOnly || typeof onChange !== 'function') return;

    const next = [...rows];
    next.splice(index + 1, 0, makeEmptyRemark());
    onChange(next);
  };

  const removeRemarkRow = (index) => {
    if (readOnly || typeof onChange !== 'function') return;

    if (rows.length === 1) {
      onChange([makeEmptyRemark()]);
      return;
    }

    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-xl border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 bg-[#FBFFFA] px-5 xl:px-7 py-3 shadow-md">
      <div className="grid grid-cols-[95px_minmax(0,1fr)] xl:grid-cols-[110px_minmax(0,1fr)] items-start gap-5">
        <label className="text-[11px] xl:text-xs uppercase font-bold tracking-[0.01em]">
          Justification /
          <br />
          Remarks
        </label>

        <div className="space-y-1">
          {rows.map((row, index) => (
            <div key={`remark-${index}`} className="flex items-start gap-2">
              <AutoResizeTextarea
                value={row}
                onChange={(value) => updateRemark(index, value)}
                placeholder={`Enter remark ${index + 1}`}
                readOnly={readOnly}
              />

              {!readOnly && (
                <div className="flex gap-1 pt-1.5">
                  <button
                    type="button"
                    onClick={() => addRemarkRow(index)}
                    className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/15 text-[#289800] font-semibold"
                    title="Add remark row"
                  >
                    <MdAdd className="text-[10px] md:text-[11px] lg:text-xs xl:text-[13px]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeRemarkRow(index)}
                    className="px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10"
                    title="Remove remark row"
                  >
                    <MdOutlineDelete className="text-[10px] md:text-[11px] lg:text-xs xl:text-[13px]" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {readOnly && lastRejectNote?.trim?.() && (
            <div className="mt-3 rounded-xl border border-[#F27373]/30 bg-[#FFF6F6] px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-red-600 mb-1">
                Reject Note
              </div>
              <div className="text-xs whitespace-pre-wrap text-slate-700">
                {lastRejectNote}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}