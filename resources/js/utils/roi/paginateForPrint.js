import { Previewer } from "pagedjs";

/**
 * Runs Paged.js over `sourceEl`'s current HTML and renders the paginated
 * result (with real @page counters) into `targetEl`. Call this after the
 * print content has finished rendering, and again whenever paperSize,
 * hideSignatories, or tab changes.
 */
export async function paginateForPrint(sourceEl, targetEl, extraCss = "") {
  if (!sourceEl || !targetEl) return;

  // Pick up the app's actual compiled stylesheets so Tailwind/utility
  // classes apply inside Paged.js's independent render pass.
  const appStylesheetUrls = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]')
  ).map((link) => link.href);

  // extraCss (the @page rules + print-only classes) has no real URL,
  // so package it as a Blob URL Paged.js can fetch like any other sheet.
  const extraCssUrl = URL.createObjectURL(
    new Blob([extraCss], { type: "text/css" })
  );

  targetEl.innerHTML = "";

  const previewer = new Previewer();
  await previewer.preview(
    sourceEl.innerHTML,
    [...appStylesheetUrls, extraCssUrl],
    targetEl
  );

  URL.revokeObjectURL(extraCssUrl);
}