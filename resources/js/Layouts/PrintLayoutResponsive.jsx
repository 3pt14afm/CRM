import React, { useEffect, useRef, useState, useCallback } from "react";

// mm dimensions in portrait orientation; cssName is what @page `size` accepts
export const PAPER_SIZES = {
  A4: { width: 210, height: 297, cssName: "A4" },
  Letter: { width: 215.9, height: 279.4, cssName: "letter" },
  Legal: { width: 215.9, height: 355.6, cssName: "legal" },
  A3: { width: 297, height: 420, cssName: "A3" },
};

/**
 * Drop-in replacement for PrintLayout.jsx.
 * Same props/behavior by default (A4, 12mm margin, no controls shown) —
 * plus paperSize / orientation / margin props, and an optional built-in
 * paper-size toolbar (showControls) that needs no changes to the page
 * that uses this as its .layout.
 */
export default function PrintLayoutResponsive({
  children,
  showDraftWatermark = false,
  watermarkText = "DRAFT",
  paperSize = "A4",
  orientation = "portrait",
  margin = 12, // number (mm, all sides) or { top, right, bottom, left }
  autoFit = true, // shrink oversized content (wide tables) to fit the page width
  showControls = false, // renders a no-print toolbar for switching paper size/orientation/margin
}) {
  const shouldShowDraftWatermark =
    showDraftWatermark === true || showDraftWatermark === 1 || showDraftWatermark === "1";

  // controls (if shown) drive their own state, seeded from props
  const [size, setSize] = useState(paperSize);
  const [orient, setOrient] = useState(orientation);
  const [marginMm, setMarginMm] = useState(typeof margin === "number" ? margin : 12);

  const paper = PAPER_SIZES[size] || PAPER_SIZES.A4;
  const landscape = orient === "landscape";
  const pageWidth = landscape ? paper.height : paper.width;
  const pageHeight = landscape ? paper.width : paper.height;

  const m =
    typeof margin === "number" && !showControls
      ? { top: margin, right: margin, bottom: margin, left: margin }
      : { top: marginMm, right: marginMm, bottom: marginMm, left: marginMm, ...(typeof margin === "object" ? margin : {}) };

  const paperRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  const recalcScale = useCallback(() => {
    if (!autoFit) {
      setScale(1);
      return;
    }
    const paperEl = paperRef.current;
    const contentEl = contentRef.current;
    if (!paperEl || !contentEl) return;

    // measure content at its natural width, then compare to the usable page width
    contentEl.style.transform = "none";
    contentEl.style.width = "max-content";
    const naturalWidth = contentEl.scrollWidth;

    const cs = window.getComputedStyle(paperEl);
    const usableWidth =
      paperEl.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);

    contentEl.style.width = "";

    if (!naturalWidth || !usableWidth || naturalWidth <= usableWidth) {
      setScale(1);
      return;
    }
    setScale(Math.max(usableWidth / naturalWidth, 0.3));
  }, [autoFit]);

  useEffect(() => {
    recalcScale();
    const t = setTimeout(recalcScale, 250); // let fonts/images/tables settle
    window.addEventListener("resize", recalcScale);
    window.addEventListener("beforeprint", recalcScale);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", recalcScale);
      window.removeEventListener("beforeprint", recalcScale);
    };
  }, [recalcScale, size, orient, marginMm, children]);

  const contentStyle =
    scale < 1 ? { transform: `scale(${scale})`, transformOrigin: "top left", width: `${100 / scale}%` } : undefined;

  return (
    <div className="print-shell-r">
      {showControls && (
        <div className="no-print print-controls-r">
          <label>
            Paper
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {Object.keys(PAPER_SIZES).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

          <label>
            Orientation
            <select value={orient} onChange={(e) => setOrient(e.target.value)}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>

          <label>
            Margin (mm)
            <input
              type="number"
              min={0}
              max={40}
              value={marginMm}
              onChange={(e) => setMarginMm(Number(e.target.value) || 0)}
            />
          </label>
        </div>
      )}

      <div className="paper-r" ref={paperRef}>
        {shouldShowDraftWatermark && (
          <div className="print-watermark-r" aria-hidden="true">
            {watermarkText}
          </div>
        )}

        <div className="paper-r-content" ref={contentRef} style={contentStyle}>
          {children}
        </div>
      </div>

      <style>{`
        @page {
          size: ${paper.cssName}${landscape ? " landscape" : ""};
          margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
        }

        .print-controls-r {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          justify-content: center;
          padding: 10px 12px;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
        }
        .print-controls-r label {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-weight: 600;
          color: #374151;
        }
        .print-controls-r select,
        .print-controls-r input {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 6px;
          font-size: 13px;
        }

        @media screen {
          .print-shell-r {
            min-height: 100vh;
            background: #e5e7eb;
          }

          .paper-r {
            position: relative;
            isolation: isolate;
            width: ${pageWidth}mm;
            min-height: ${pageHeight}mm;
            margin: 12px auto;
            background: #fff;
            padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
            box-sizing: border-box;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          }

          .print-watermark-r {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            user-select: none;
            z-index: 9999;
            font-weight: 800;
            font-size: clamp(48px, 10vw, 100px);
            letter-spacing: 0.25em;
            color: rgba(45, 120, 19, 0.2);
            transform: rotate(-32deg);
            text-transform: uppercase;
            white-space: nowrap;
          }

          .paper-r-content {
            position: relative;
            z-index: 1;
          }
        }

        @media print {
          html, body { width: ${pageWidth}mm; margin: 0 auto; }
          .print-shell-r { padding: 0; background: transparent; }
          .print-controls-r { display: none !important; }

          .paper-r {
            width: auto;
            padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
            box-shadow: none;
            border-radius: 0;
            position: relative;
            margin: 0 auto;
          }

          .print-watermark-r {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            user-select: none;
            z-index: 9999;
            font-weight: 800;
            font-size: 28mm;
            letter-spacing: 4mm;
            color: rgba(45, 120, 19, 0.2);
            transform: rotate(-32deg);
            text-transform: uppercase;
            white-space: nowrap;
          }

          .paper-r-content {
            position: relative;
            z-index: 1;
          }

          .print-root, .print-root * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .print-root {
            width: 100%;
            font-size: 11px;
            line-height: 1.25;
          }

          table {
            width: 100% !important;
            table-layout: fixed !important;
          }

          th, td {
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .no-print { display: none !important; }

          .print-page-break {
            break-before: page;
            page-break-before: always;
            height: 0;
          }

          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}