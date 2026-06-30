import { useEffect, useRef, useState } from 'react';
import { MdAdd, MdOutlineDelete, MdAttachFile, MdClose } from 'react-icons/md';

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
  onImageSelect,
  onAttachmentRemove,
  attachments = {},
}) {
  const rows = Array.isArray(value) && value.length > 0 ? value : [makeEmptyRemark()];

  const [images, setImages] = useState({});
  const [removedSaved, setRemovedSaved] = useState({});
  const fileInputRefs = useRef({});

  const updateRemark = (index, nextValue) => {
    if (readOnly || typeof onChange !== 'function') return;
    onChange(rows.map((row, i) => (i === index ? nextValue : row)));
  };

  const addRemarkRow = (index) => {
    if (readOnly || typeof onChange !== 'function') return;

    const next = [...rows];
    next.splice(index + 1, 0, makeEmptyRemark());
    onChange(next);

    // Shift any stored images down so they stay aligned with their row
    setImages((prev) => {
      const shifted = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        shifted[k > index ? k + 1 : k] = val;
      });
      return shifted;
    });

    setRemovedSaved((prev) => {
      const shifted = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        shifted[k > index ? k + 1 : k] = val;
      });
      return shifted;
    });
  };

  const removeRemarkRow = (index) => {
    if (readOnly || typeof onChange !== 'function') return;

    if (rows.length === 1) {
      onChange([makeEmptyRemark()]);
      setImages({});
      return;
    }

    onChange(rows.filter((_, i) => i !== index));

    setImages((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        if (k === index) return;
        next[k > index ? k - 1 : k] = val;
      });
      return next;
    });

    setRemovedSaved((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        if (k === index) return;
        next[k > index ? k - 1 : k] = val;
      });
      return next;
    });
  };

  const handleClipClick = (index) => {
    if (readOnly) return;
    const input = fileInputRefs.current[index];
    if (input) input.click();
  };

  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches server-side max:10240

  const handleFileChange = (index, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const tooLarge = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      alert('One or more files are too large. Please attach files under 10MB each.');
      e.target.value = '';
      return;
    }

    const newEntries = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    setImages((prev) => {
      const existing = prev[index] || [];
      const next = { ...prev, [index]: [...existing, ...newEntries] };

      if (typeof onImageSelect === 'function') {
        // Hand the parent the full, up-to-date list of pending File objects for this row
        onImageSelect(index, next[index].map((entry) => entry.file));
      }

      return next;
    });

    // Allow re-selecting the same file again later
    e.target.value = '';
  };

  const removeImage = (index, subIndex) => {
    const pending = images[index] || [];
    const isPending = subIndex < pending.length;

    if (isPending) {
      setImages((prev) => {
        const list = [...(prev[index] || [])];
        const [removed] = list.splice(subIndex, 1);
        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);

        const next = { ...prev };
        if (list.length) {
          next[index] = list;
        } else {
          delete next[index];
        }

        if (typeof onImageSelect === 'function') {
          onImageSelect(index, list.map((entry) => entry.file));
        }

        return next;
      });
      return;
    }

    // Not a pending upload — this is a previously saved attachment being removed.
    // savedSubIndex is its position within the saved attachments array for this row.
    const savedSubIndex = subIndex - pending.length;
    setRemovedSaved((prev) => {
      const set = new Set(prev[index] || []);
      set.add(savedSubIndex);
      return { ...prev, [index]: set };
    });

    if (typeof onAttachmentRemove === 'function') {
      onAttachmentRemove(index, savedSubIndex);
    }
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
          {rows.map((row, index) => {
            const img = images[index] || [];

            // ROBUST LOOKUP: attachments[index] can be a single saved attachment object
            // (legacy/back-compat) or an array of them (multi-file rows).
            let savedAttachments = [];
            let parsedAttachments = attachments;
            if (typeof parsedAttachments === 'string') {
              try {
                parsedAttachments = JSON.parse(parsedAttachments);
              } catch {
                parsedAttachments = null;
              }
            }

            let rawForRow = null;
            if (Array.isArray(parsedAttachments)) {
              rawForRow =
                parsedAttachments.find(
                  (att) =>
                    Number(att?.remark_index) === index ||
                    Number(att?.row_index) === index ||
                    Number(att?.index) === index
                ) ?? parsedAttachments[index];
            } else if (parsedAttachments && typeof parsedAttachments === 'object') {
              rawForRow = parsedAttachments[index];
            }

            if (Array.isArray(rawForRow)) {
              savedAttachments = rawForRow;
            } else if (rawForRow) {
              savedAttachments = [rawForRow]; // legacy single-attachment shape
            }

            const removedSet = removedSaved[index];
            if (removedSet && removedSet.size) {
              savedAttachments = savedAttachments.filter((_, subIndex) => !removedSet.has(subIndex));
            }

            return (
              <div key={`remark-${index}`} className="flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <AutoResizeTextarea
                      value={row}
                      onChange={(value) => updateRemark(index, value)}
                      placeholder={`Enter remark ${index + 1}`}
                      readOnly={readOnly}
                    />

                    {/* Newly uploaded previews and saved attachments, supporting multiple files per row */}
                    {(img.length > 0 || savedAttachments.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {img.map((entry, subIndex) => (
                          <div
                            key={`pending-${index}-${subIndex}`}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 pl-3 pr-1 py-1 w-fit max-w-full"
                          >
                            <MdAttachFile className="text-[10px] text-gray-500 shrink-0" />
                            <a
                              href={entry.previewUrl}
                              download={entry.name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:underline truncate max-w-[140px] cursor-pointer"
                              title="Click to download attachment"
                            >
                              {entry.name}
                            </a>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => removeImage(index, subIndex)}
                                className="p-0.5 rounded-full text-red-500 hover:bg-red-50 ml-1"
                                title="Remove attachment"
                              >
                                <MdClose className="text-[10px]" />
                              </button>
                            )}
                          </div>
                        ))}

                        {savedAttachments.map((savedAttachment, savedSubIndex) => (
                          <div
                            key={`saved-${index}-${savedSubIndex}`}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 pl-3 pr-1 py-1 w-fit max-w-full"
                          >
                            <MdAttachFile className="text-[10px] text-gray-500 shrink-0" />
                            <a
                              href={
                                savedAttachment?.url ||
                                savedAttachment?.original_url ||
                                (savedAttachment?.path ? `/storage/${savedAttachment.path}` : undefined)
                              }
                              download={savedAttachment?.name || 'attachment'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:underline truncate max-w-[140px] cursor-pointer"
                              title="Click to download attachment"
                            >
                              {savedAttachment?.name}
                            </a>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => removeImage(index, img.length + savedSubIndex)}
                                className="p-0.5 rounded-full text-red-500 hover:bg-red-50 ml-1"
                                title="Remove attachment"
                              >
                                <MdClose className="text-[10px]" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!readOnly && (
                    <div className="flex gap-1 pt-1.5">
                      <input
                        type="file"
                        multiple
                        ref={(el) => (fileInputRefs.current[index] = el)}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => handleFileChange(index, e)}
                      />

                      <button
                        type="button"
                        onClick={() => handleClipClick(index)}
                        className="py-2 md:px-1 md:py-1 rounded-md border border-gray-300 bg-gray-50 text-gray-600 font-semibold hover:bg-gray-100"
                        title="Attach file (image, PDF, Word, or Excel)"
                      >
                        <MdAttachFile className="text-[10px] md:text-[11px] lg:text-xs xl:text-[13px]" />
                      </button>

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
              </div>
            );
          })}

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