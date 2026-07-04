import React, { useEffect, useRef, useState } from 'react';

// A4 dimensions in CSS px at 96dpi (1mm ≈ 3.78px). The "paper" is always laid
// out at this real, fixed width — we never change its markup or breakpoints.
// On narrow screens we just visually shrink it with a transform, the same way
// Word/Google Docs "zoom to fit" a page on mobile.
const PAGE_WIDTH_PX = 794; // ~210mm

// Breathing room reserved on either side of the page so it never touches the
// screen edges, even fully zoomed out.
const SIDE_MARGIN_PX = 20;

// Gap reserved *below* each page, to separate it from whatever page comes
// next. This is NOT applied above a page too — the space above the very
// first page is the parent layout's job (see Paper.jsx), so we don't want to
// stack an extra gap on top of that.
const PAGE_GAP_PX = 40;
const MIN_GAP_PX = 16; // never collapse the gap so small it's hard to tell pages apart

const PrintablePaper = ({ children }) => {
  const outerRef = useRef(null); // measures the space we actually have on screen
  const pageRef = useRef(null);  // the real, full-size page (unscaled layout)
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  // Recompute the zoom level whenever the viewport / container width changes.
  useEffect(() => {
    const updateScale = () => {
      if (!outerRef.current) return;
      const available = outerRef.current.offsetWidth - SIDE_MARGIN_PX * 2;
      // Only ever shrink to fit — never zoom in past the real 100% size.
      setScale(Math.min(1, available / PAGE_WIDTH_PX));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Track the page's real (unscaled) height, since content length varies
  // (specs image, terms text, etc). transform doesn't change layout size,
  // so offsetHeight/scrollHeight here still reflect the true, full-size page.
  useEffect(() => {
    if (!pageRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setNaturalHeight(entry.target.scrollHeight);
    });
    observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, []);

  const gap = Math.max(MIN_GAP_PX, PAGE_GAP_PX * scale);

  return (
    <div
      ref={outerRef}
      // touchAction left as the browser default (not "none"/"manipulation")
      // so native pinch-to-zoom keeps working here. If pinch-zoom still isn't
      // working, check the <meta name="viewport"> tag in your root layout —
      // `user-scalable=no` or `maximum-scale=1` there will block it regardless
      // of anything set in this component.
      style={{ touchAction: 'pinch-zoom' }}
      className="flex flex-col items-center px-4 bg-slate-100 print:!p-0 print:bg-white"
    >
      {/* Sized to the page's *scaled* footprint, so shrinking the page down
          doesn't leave a big blank gap below it in the layout. marginBottom
          only separates this page from the next one — no padding is added
          above it. */}
      <div
        style={{
          width: PAGE_WIDTH_PX * scale,
          height: naturalHeight ? naturalHeight * scale : undefined,
          marginBottom: gap,
        }}
        className="print:!w-full print:!h-auto print:!mb-0"
      >
        <div
          ref={pageRef}
          style={{
            width: PAGE_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="
            bg-white shadow-2xl
            p-[15mm] sm:p-[20mm]
            print:p-[10mm] print:shadow-none print:!w-full print:!transform-none
            min-h-[297mm] relative overflow-hidden
          "
        >
          {/* Your Proposal Content Starts Here */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default PrintablePaper;