import React from "react";

export default function PrintLayout({ children }) {
  return (
    <div className="print-shell">
      <div className="paper">
        {/* Watermark */}
        <div className="print-watermark" aria-hidden="true">
          DRAFT
        </div>

        {children}
      </div>

      <style>{`
        @page { size: A4; margin: 12mm; }

        /* Screen preview "paper" */
        @media screen {
          .print-shell {
            min-height: 100vh;
            background: #e5e7eb;
            padding: 12px;
          }

          .paper {
            position: relative;
            width: 300mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #fff;
            padding: 10mm;
            box-sizing: border-box;
            overflow: hidden;
          }

          /* Watermark in screen preview */
          .print-watermark {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            user-select: none;
            z-index: 0;
            font-weight: 800;
            font-size: 100px;
            letter-spacing: 0.25em;
            color: rgba(100, 100, 100, 0.1); 
            transform: rotate(-32deg);
            text-transform: uppercase;
            white-space: nowrap;
          }

          /* Content above watermark */
          .paper > *:not(.print-watermark) {
            position: relative;
            z-index: 1;
          }
        }

        /* Print: prevent shrink-to-fit */
        @media print {
          html, body { width: 210mm; }
          .print-shell { padding: 0; background: transparent; }
          .paper {
            width: auto;
            padding: 0;
            box-shadow: none;
            border-radius: 0;
            position: relative;
          }

          /* ✅ Watermark for every printed page */
          .print-watermark {
            position: fixed; /* repeats on printed pages in Chrome/Edge */
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            user-select: none;
            z-index: 0;
            font-weight: 800;
            font-size: 44mm;       /* scale with paper size */
            letter-spacing: 4mm;
            color: rgba(100, 100, 100, 0.1);
            transform: rotate(-32deg);
            text-transform: uppercase;
            white-space: nowrap;
          }

          /* Keep content above watermark */
          .paper > *:not(.print-watermark) {
            position: relative;
            z-index: 1;
          }

          /* ✅ This stops Chrome from scaling because of overflow */
          .print-root, .print-root * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          /* ✅ If any component uses zoom/transform, undo it for print */
          .print-root {
            width: 100%;
            transform: none !important;
            zoom: 1 !important;
            font-size: 11px;
            line-height: 1.25;
          }

          /* ✅ Tables often cause overflow → force them to fit */
          table {
            width: 100% !important;
            table-layout: fixed !important;
          }

          th, td {
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .no-print { display: none !important; }

          /* Page-break helpers */
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