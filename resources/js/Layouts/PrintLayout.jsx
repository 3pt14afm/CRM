import React from "react";

export default function PrintLayout({ children }) {
  return (
    <div className="print-shell">
      <div className="paper print-root">
        {children}
      </div>

      <style>{`
        @page { size: A4; margin: 12mm; }

        /* Screen preview "paper" */
        @media screen {
            .print-shell {
            min-height: 100vh;
            background: #e5e7eb;
            padding: 24px;
            }
            .paper {
            width: 400mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #fff;
            padding: 12mm;
            box-sizing: border-box;
            }
        }

        /* Print: prevent shrink-to-fit */
        @media print {
            html, body { width: 210mm; }
            .print-shell { padding: 0; background: transparent; }
            .paper { width: auto; padding: 0; box-shadow: none; border-radius: 0; }

            /* ✅ This stops Chrome from scaling because of overflow */
            .print-root, .print-root * {
            max-width: 100% !important;
            box-sizing: border-box !important;
            }
           

            /* ✅ If any component uses zoom/transform, undo it for print */
            .print-root {
            width : 100%;
            transform: none !important;
            zoom: 1 !important;
            font-size: 11px;     /* base text */
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

            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }

        
        `}</style>

    </div>
  );
}
