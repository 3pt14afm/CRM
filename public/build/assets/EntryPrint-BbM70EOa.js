import{j as e,b as f,r as o}from"./app-CR5RCa7W.js";import h from"./Summary1stYear-DutQQmwY.js";import x from"./SucceedingYears-CphtnUEM.js";import"./SuccedingYearsPotential-Cfg371W5.js";import"./index-pc9LLJLd.js";import"./index-UpF-hdA7.js";import"./index-BsxvijQw.js";import"./get1YrPotential-0wz61q4Q.js";import"./succeedingYears-D3BgFusu.js";function w({children:t,showDraftWatermark:r=!1}){const i=r===!0||r===1||r==="1";return e.jsxs("div",{className:"print-shell",children:[e.jsxs("div",{className:"paper",children:[i&&e.jsx("div",{className:"print-watermark","aria-hidden":"true",children:"DRAFT"}),t]}),e.jsx("style",{children:`
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
            isolation: isolate;
            width: 300mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #fff;
            padding: 10mm;
            box-sizing: border-box;
            overflow: hidden;
          }

          .print-watermark {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            user-select: none;
            z-index: 9999;
            font-weight: 800;
            font-size: 100px;
            letter-spacing: 0.25em;
            color: rgba(100, 100, 100, 0.2);
            transform: rotate(-32deg);
            text-transform: uppercase;
            white-space: nowrap;
          }

          .paper > *:not(.print-watermark) {
            position: relative;
            z-index: 1;
          }
        }

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

          .print-watermark {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            user-select: none;
            z-index: 9999;
            font-weight: 800;
            font-size: 44mm;
            letter-spacing: 4mm;
            color: rgba(45, 120, 19, 0.2);
            transform: rotate(-32deg);
            text-transform: uppercase;
            white-space: nowrap;
          }

          .paper > *:not(.print-watermark) {
            position: relative;
            z-index: 1;
          }

          .print-root, .print-root * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .print-root {
            width: 100%;
            transform: none !important;
            zoom: 1 !important;
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
      `})]})}function b({tab:t="summary",storageKey:r=null,autoprint:i=!1}){const{setProjectData:d,projectData:m}=f(),[s,a]=o.useState(!1);o.useEffect(()=>{try{if(!r){a(!0);return}const n=sessionStorage.getItem(r);if(!n){a(!0);return}d(JSON.parse(n)),a(!0)}catch(n){console.error("Print page: failed to load snapshot:",n),a(!0)}},[r,d]),o.useEffect(()=>(document.documentElement.classList.add("print-mode"),()=>document.documentElement.classList.remove("print-mode")),[]),o.useEffect(()=>{if(!i||!s)return;document.documentElement.classList.add("print-mode");const n=setTimeout(()=>window.print(),300);return()=>clearTimeout(n)},[i,s]);const p=()=>{document.documentElement.classList.add("print-mode"),window.print()},c=()=>{window.close(),setTimeout(()=>{window.closed||window.history.back()},50)},l=(m?.metadata?.status??"draft")==="draft",u=t==="succeeding"?"Succeeding Years — Print Preview":"Summary / 1st Year — Print Preview";return e.jsxs("div",{className:"preview-mode",children:[e.jsxs("div",{className:"no-print flex items-center justify-between mb-6",children:[e.jsx("h1",{className:"text-lg font-semibold",children:u}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{type:"button",onClick:p,className:"px-4 py-2 rounded-md bg-darkgreen text-white text-sm font-medium",children:"Print"}),e.jsx("button",{type:"button",onClick:c,className:"px-4 py-2 rounded-md border border-slate-300 text-sm font-medium",children:"Close"})]})]}),s&&l&&e.jsx("div",{className:"print-watermark","aria-hidden":"true",children:"DRAFT"}),e.jsx("div",{className:"print-root",children:t==="succeeding"?e.jsx(x,{}):e.jsx(h,{})})]})}b.layout=t=>e.jsx(w,{showDraftWatermark:t.props.showDraftWatermark,children:t});export{b as default};
