import{j as r,b as g,r as d}from"./app-GiR3PDYf.js";import y from"./Summary1stYear-BV54asij.js";import _ from"./SucceedingYears-BzMgW-xY.js";import"./SuccedingYearsPotential-B6oLuwmZ.js";import"./index-BSW8-65a.js";import"./index-BIMX1g5H.js";import"./index-BsxvijQw.js";import"./get1YrPotential-0wz61q4Q.js";import"./succeedingYears-D3BgFusu.js";function w({children:e,showDraftWatermark:n=!1}){const s=n===!0||n===1||n==="1";return r.jsxs("div",{className:"print-shell",children:[r.jsxs("div",{className:"paper",children:[s&&r.jsx("div",{className:"print-watermark","aria-hidden":"true",children:"DRAFT"}),e]}),r.jsx("style",{children:`
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
      `})]})}function x(e){const n=e?.items??[],s=e?.fees??[],l=t=>({id:t.client_row_id||String(t.id),type:t.kind==="machine"?"machine":"consumable",sku:t.sku??"",qty:Number(t.qty??0),yields:Number(t.yields??0),mode:t.mode??"",remarks:t.remarks??"",inputtedCost:Number(t.inputted_cost??0),cost:Number(t.cost??0),price:Number(t.price??0),basePerYear:Number(t.base_per_year??0),totalCost:Number(t.total_cost??0),costCpp:Number(t.cost_cpp??0),totalSell:Number(t.total_sell??0),sellCpp:Number(t.sell_cpp??0),machineMargin:Number(t.machine_margin??0),machineMarginTotal:Number(t.machine_margin_total??0)}),u=n.filter(t=>t.kind==="machine").map(l),m=n.filter(t=>t.kind==="consumable").map(l),p=t=>({id:t.client_row_id||String(t.id),label:t.label??"",category:t.category??"",remarks:t.remarks??"",cost:Number(t.cost??0),qty:Number(t.qty??0),total:Number(t.total??0),isMachine:!!t.is_machine}),i=s.filter(t=>t.payer==="company").map(p),a=s.filter(t=>t.payer==="customer").map(p),b=i.reduce((t,c)=>t+(c.total||0),0)+a.reduce((t,c)=>t+(c.total||0),0);return{metadata:{projectId:e?.id??null,lastSaved:e?.last_saved_at??null,version:e?.version??1,status:e?.status??"draft",comments:e?.comments??[],notes:e?.notes??"",signatories:e?.signatories??void 0},companyInfo:{companyName:e?.company_name??"",contractYears:Number(e?.contract_years??0),contractType:e?.contract_type??"",reference:e?.reference??"",purpose:e?.purpose??"",bundledStdInk:!!(e?.bundled_std_ink??!1)},interest:{annualInterest:Number(e?.annual_interest??0),percentMargin:Number(e?.percent_margin??0)},yield:{monoAmvpYields:{monthly:Number(e?.mono_yield_monthly??0),annual:Number(e?.mono_yield_annual??0)},colorAmvpYields:{monthly:Number(e?.color_yield_monthly??0),annual:Number(e?.color_yield_annual??0)}},machineConfiguration:{machine:u,consumable:m,totals:{unitCost:Number(e?.mc_unit_cost??0),qty:Number(e?.mc_qty??0),totalCost:Number(e?.mc_total_cost??0),yields:Number(e?.mc_yields??0),costCpp:Number(e?.mc_cost_cpp??0),sellingPrice:Number(e?.mc_selling_price??0),totalSell:Number(e?.mc_total_sell??0),sellCpp:Number(e?.mc_sell_cpp??0),totalBundledPrice:Number(e?.mc_total_bundled_price??0)}},additionalFees:{company:i,customer:a,total:Number(e?.fees_total??b)},yearlyBreakdown:e?.yearly_breakdown??{},totalProjectCost:{grandTotalCost:Number(e?.grand_total_cost??0),grandTotalRevenue:Number(e?.grand_total_revenue??0),grandROI:Number(e?.grand_roi??0),grandROIPercentage:Number(e?.grand_roi_percentage??0)},contractDetails:{machine:[],consumable:[],totalInitial:0}}}function N({tab:e="summary",storageKey:n=null,autoprint:s=!1,entryProject:l=null,project:u=null}){const{setProjectData:m,projectData:p}=g(),[i,a]=d.useState(!1);d.useEffect(()=>{const o=l||u;if(o)try{m(x(o)),a(!0)}catch(f){console.error("Print page: failed to map server project:",f),a(!0)}},[l,u,m]),d.useEffect(()=>{if(!i)try{if(!n){a(!0);return}const o=sessionStorage.getItem(n);if(!o){a(!0);return}m(JSON.parse(o)),a(!0)}catch(o){console.error("Print page: failed to load snapshot:",o),a(!0)}},[n,m,i]),d.useEffect(()=>(document.documentElement.classList.add("print-mode"),()=>document.documentElement.classList.remove("print-mode")),[]),d.useEffect(()=>{if(!s||!i)return;const o=setTimeout(()=>window.print(),300);return()=>clearTimeout(o)},[s,i]);const b=()=>window.print(),t=()=>{window.close(),setTimeout(()=>{window.closed||window.history.back()},50)},c=(p?.metadata?.status??"draft")==="draft",h=e==="succeeding"?"Succeeding Years — Print Preview":"Summary / 1st Year — Print Preview";return r.jsxs("div",{className:"preview-mode",children:[r.jsxs("div",{className:"no-print flex items-center justify-between mb-6",children:[r.jsx("h1",{className:"text-lg font-semibold",children:h}),r.jsxs("div",{className:"flex gap-2",children:[r.jsx("button",{type:"button",onClick:b,className:"px-4 py-2 rounded-md bg-darkgreen text-white text-sm font-medium",children:"Print"}),r.jsx("button",{type:"button",onClick:t,className:"px-4 py-2 rounded-md border border-slate-300 text-sm font-medium",children:"Close"})]})]}),i&&c&&r.jsx("div",{className:"print-watermark","aria-hidden":"true",children:"DRAFT"}),r.jsx("div",{className:"print-root",children:e==="succeeding"?r.jsx(_,{}):r.jsx(y,{})})]})}N.layout=e=>r.jsx(w,{showDraftWatermark:e.props.showDraftWatermark,children:e});export{N as default};
