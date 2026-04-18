import{r as m,j as l,a as C,H as q}from"./app-DnWYZnEJ.js";import{F as Q,A as V}from"./AuthenticatedLayout-BgRxduom.js";import{s as D}from"./index-BsxvijQw.js";import{P as J}from"./ProjectListSection-Cj480jzg.js";import{c as X}from"./index-BchnPm8w.js";import{c as ee,i as te}from"./index-B_99YZTM.js";import{M as se,d as ae}from"./index-DFzMXzRZ.js";import"./iconBase-BEGI8KQa.js";import"./index-DteAIqDT.js";let re={data:""},ie=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||re},oe=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,ne=/\/\*[^]*?\*\/|  +/g,R=/\n+/g,j=(e,t)=>{let s="",r="",n="";for(let o in e){let a=e[o];o[0]=="@"?o[1]=="i"?s=o+" "+a+";":r+=o[1]=="f"?j(a,o):o+"{"+j(a,o[1]=="k"?"":t)+"}":typeof a=="object"?r+=j(a,t?t.replace(/([^,])+/g,d=>o.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,c=>/&/.test(c)?c.replace(/&/g,d):d?d+" "+c:c)):o):a!=null&&(o=/^--/.test(o)?o:o.replace(/[A-Z]/g,"-$&").toLowerCase(),n+=j.p?j.p(o,a):o+":"+a+";")}return s+(t&&n?t+"{"+n+"}":n)+r},b={},B=e=>{if(typeof e=="object"){let t="";for(let s in e)t+=s+B(e[s]);return t}return e},le=(e,t,s,r,n)=>{let o=B(e),a=b[o]||(b[o]=(c=>{let p=0,i=11;for(;p<c.length;)i=101*i+c.charCodeAt(p++)>>>0;return"go"+i})(o));if(!b[a]){let c=o!==e?e:(p=>{let i,u,f=[{}];for(;i=oe.exec(p.replace(ne,""));)i[4]?f.shift():i[3]?(u=i[3].replace(R," ").trim(),f.unshift(f[0][u]=f[0][u]||{})):f[0][i[1]]=i[2].replace(R," ").trim();return f[0]})(e);b[a]=j(n?{["@keyframes "+a]:c}:c,s?"":"."+a)}let d=s&&b.g?b.g:null;return s&&(b.g=b[a]),((c,p,i,u)=>{u?p.data=p.data.replace(u,c):p.data.indexOf(c)===-1&&(p.data=i?c+p.data:p.data+c)})(b[a],t,r,d),a},de=(e,t,s)=>e.reduce((r,n,o)=>{let a=t[o];if(a&&a.call){let d=a(s),c=d&&d.props&&d.props.className||/^go/.test(d)&&d;a=c?"."+c:d&&typeof d=="object"?d.props?"":j(d,""):d===!1?"":d}return r+n+(a??"")},"");function O(e){let t=this||{},s=e.call?e(t.p):e;return le(s.unshift?s.raw?de(s,[].slice.call(arguments,1),t.p):s.reduce((r,n)=>Object.assign(r,n&&n.call?n(t.p):n),{}):s,ie(t.target),t.g,t.o,t.k)}let H,P,I;O.bind({g:1});let v=O.bind({k:1});function ce(e,t,s,r){j.p=t,H=e,P=s,I=r}function w(e,t){let s=this||{};return function(){let r=arguments;function n(o,a){let d=Object.assign({},o),c=d.className||n.className;s.p=Object.assign({theme:P&&P()},d),s.o=/ *go\d+/.test(c),d.className=O.apply(s,r)+(c?" "+c:"");let p=e;return e[0]&&(p=d.as||e,delete d.as),I&&p[0]&&I(d),H(p,d)}return t?t(n):n}}var ue=e=>typeof e=="function",F=(e,t)=>ue(e)?e(t):e,me=(()=>{let e=0;return()=>(++e).toString()})(),U=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),pe=20,M="default",Y=(e,t)=>{let{toastLimit:s}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,s)};case 1:return{...e,toasts:e.toasts.map(a=>a.id===t.toast.id?{...a,...t.toast}:a)};case 2:let{toast:r}=t;return Y(e,{type:e.toasts.find(a=>a.id===r.id)?1:0,toast:r});case 3:let{toastId:n}=t;return{...e,toasts:e.toasts.map(a=>a.id===n||n===void 0?{...a,dismissed:!0,visible:!1}:a)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(a=>a.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let o=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(a=>({...a,pauseDuration:a.pauseDuration+o}))}}},$=[],G={toasts:[],pausedAt:void 0,settings:{toastLimit:pe}},h={},K=(e,t=M)=>{h[t]=Y(h[t]||G,e),$.forEach(([s,r])=>{s===t&&r(h[t])})},W=e=>Object.keys(h).forEach(t=>K(e,t)),fe=e=>Object.keys(h).find(t=>h[t].toasts.some(s=>s.id===e)),S=(e=M)=>t=>{K(t,e)},xe={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},ge=(e={},t=M)=>{let[s,r]=m.useState(h[t]||G),n=m.useRef(h[t]);m.useEffect(()=>(n.current!==h[t]&&r(h[t]),$.push([t,r]),()=>{let a=$.findIndex(([d])=>d===t);a>-1&&$.splice(a,1)}),[t]);let o=s.toasts.map(a=>{var d,c,p;return{...e,...e[a.type],...a,removeDelay:a.removeDelay||((d=e[a.type])==null?void 0:d.removeDelay)||e?.removeDelay,duration:a.duration||((c=e[a.type])==null?void 0:c.duration)||e?.duration||xe[a.type],style:{...e.style,...(p=e[a.type])==null?void 0:p.style,...a.style}}});return{...s,toasts:o}},ye=(e,t="blank",s)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...s,id:s?.id||me()}),k=e=>(t,s)=>{let r=ye(t,e,s);return S(r.toasterId||fe(r.id))({type:2,toast:r}),r.id},g=(e,t)=>k("blank")(e,t);g.error=k("error");g.success=k("success");g.loading=k("loading");g.custom=k("custom");g.dismiss=(e,t)=>{let s={type:3,toastId:e};t?S(t)(s):W(s)};g.dismissAll=e=>g.dismiss(void 0,e);g.remove=(e,t)=>{let s={type:4,toastId:e};t?S(t)(s):W(s)};g.removeAll=e=>g.remove(void 0,e);g.promise=(e,t,s)=>{let r=g.loading(t.loading,{...s,...s?.loading});return typeof e=="function"&&(e=e()),e.then(n=>{let o=t.success?F(t.success,n):void 0;return o?g.success(o,{id:r,...s,...s?.success}):g.dismiss(r),n}).catch(n=>{let o=t.error?F(t.error,n):void 0;o?g.error(o,{id:r,...s,...s?.error}):g.dismiss(r)}),e};var he=1e3,be=(e,t="default")=>{let{toasts:s,pausedAt:r}=ge(e,t),n=m.useRef(new Map).current,o=m.useCallback((u,f=he)=>{if(n.has(u))return;let x=setTimeout(()=>{n.delete(u),a({type:4,toastId:u})},f);n.set(u,x)},[]);m.useEffect(()=>{if(r)return;let u=Date.now(),f=s.map(x=>{if(x.duration===1/0)return;let E=(x.duration||0)+x.pauseDuration-(u-x.createdAt);if(E<0){x.visible&&g.dismiss(x.id);return}return setTimeout(()=>g.dismiss(x.id,t),E)});return()=>{f.forEach(x=>x&&clearTimeout(x))}},[s,r,t]);let a=m.useCallback(S(t),[t]),d=m.useCallback(()=>{a({type:5,time:Date.now()})},[a]),c=m.useCallback((u,f)=>{a({type:1,toast:{id:u,height:f}})},[a]),p=m.useCallback(()=>{r&&a({type:6,time:Date.now()})},[r,a]),i=m.useCallback((u,f)=>{let{reverseOrder:x=!1,gutter:E=8,defaultPosition:L}=f||{},T=s.filter(y=>(y.position||L)===(u.position||L)&&y.height),Z=T.findIndex(y=>y.id===u.id),z=T.filter((y,_)=>_<Z&&y.visible).length;return T.filter(y=>y.visible).slice(...x?[z+1]:[0,z]).reduce((y,_)=>y+(_.height||0)+E,0)},[s]);return m.useEffect(()=>{s.forEach(u=>{if(u.dismissed)o(u.id,u.removeDelay);else{let f=n.get(u.id);f&&(clearTimeout(f),n.delete(u.id))}})},[s,o]),{toasts:s,handlers:{updateHeight:c,startPause:d,endPause:p,calculateOffset:i}}},ve=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,je=v`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,we=v`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Ne=w("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${ve} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${je} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${we} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Ee=v`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,ke=w("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${Ee} 1s linear infinite;
`,Ce=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,De=v`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,Ae=w("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ce} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${De} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,$e=w("div")`
  position: absolute;
`,Fe=w("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Oe=v`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Se=w("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Oe} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,Te=({toast:e})=>{let{icon:t,type:s,iconTheme:r}=e;return t!==void 0?typeof t=="string"?m.createElement(Se,null,t):t:s==="blank"?null:m.createElement(Fe,null,m.createElement(ke,{...r}),s!=="loading"&&m.createElement($e,null,s==="error"?m.createElement(Ne,{...r}):m.createElement(Ae,{...r})))},_e=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Pe=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Ie="0%{opacity:0;} 100%{opacity:1;}",Me="0%{opacity:1;} 100%{opacity:0;}",Le=w("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,ze=w("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Re=(e,t)=>{let s=e.includes("top")?1:-1,[r,n]=U()?[Ie,Me]:[_e(s),Pe(s)];return{animation:t?`${v(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${v(n)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Be=m.memo(({toast:e,position:t,style:s,children:r})=>{let n=e.height?Re(e.position||t||"top-center",e.visible):{opacity:0},o=m.createElement(Te,{toast:e}),a=m.createElement(ze,{...e.ariaProps},F(e.message,e));return m.createElement(Le,{className:e.className,style:{...n,...s,...e.style}},typeof r=="function"?r({icon:o,message:a}):m.createElement(m.Fragment,null,o,a))});ce(m.createElement);var He=({id:e,className:t,style:s,onHeightUpdate:r,children:n})=>{let o=m.useCallback(a=>{if(a){let d=()=>{let c=a.getBoundingClientRect().height;r(e,c)};d(),new MutationObserver(d).observe(a,{subtree:!0,childList:!0,characterData:!0})}},[e,r]);return m.createElement("div",{ref:o,className:t,style:s},n)},Ue=(e,t)=>{let s=e.includes("top"),r=s?{top:0}:{bottom:0},n=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:U()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(s?1:-1)}px)`,...r,...n}},Ye=O`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,A=16,Ge=({reverseOrder:e,position:t="top-center",toastOptions:s,gutter:r,children:n,toasterId:o,containerStyle:a,containerClassName:d})=>{let{toasts:c,handlers:p}=be(s,o);return m.createElement("div",{"data-rht-toaster":o||"",style:{position:"fixed",zIndex:9999,top:A,left:A,right:A,bottom:A,pointerEvents:"none",...a},className:d,onMouseEnter:p.startPause,onMouseLeave:p.endPause},c.map(i=>{let u=i.position||t,f=p.calculateOffset(i,{reverseOrder:e,gutter:r,defaultPosition:t}),x=Ue(u,f);return m.createElement(He,{id:i.id,key:i.id,onHeightUpdate:p.updateHeight,className:i.visible?Ye:"",style:x},i.type==="custom"?F(i.message,i):n?n(i):m.createElement(Be,{toast:i,position:u}))}))},N=g;function Ke({drafts:e=null,stats:t=null}){const s=new Date,r=new Intl.DateTimeFormat("en-US",{day:"2-digit",month:"2-digit",year:"2-digit"}).format(s),n=m.useMemo(()=>{const i=t?.totalDrafts??e?.total??0,u=t?.recentlyModifiedText??"—";return[{label:"Total Drafts",value:i,icon:l.jsx(X,{}),variant:"normal"},{label:"Recently Modified",value:u,icon:l.jsx(ee,{}),variant:"normal"},{label:"Create New Draft",value:null,icon:l.jsx(te,{}),variant:"action",onClick:()=>C.visit(D("sprf.entry.create"))}]},[t,e]),o=i=>{const u=i.sprf_number??i.id;N(f=>{const x=E=>{E.target.closest("[data-toast]")||(N.dismiss(f.id),document.removeEventListener("mousedown",x))};return document.addEventListener("mousedown",x),l.jsxs("span",{"data-toast":!0,className:"flex items-center gap-3",children:[l.jsxs("span",{children:["Delete draft ",l.jsx("b",{children:u}),"? This cannot be undone."]}),l.jsx("button",{onClick:()=>{N.dismiss(f.id),document.removeEventListener("mousedown",x),C.delete(D("sprf.entry.projects.destroy",i.id),{preserveScroll:!0,onStart:()=>{N.loading("Deleting draft...",{id:"deleteDraft"})},onSuccess:()=>{N.success("Draft deleted successfully!",{id:"deleteDraft"})},onError:()=>{N.error("Delete failed. Please try again.",{id:"deleteDraft"})}})},className:"bg-red-500 text-white px-3 py-1 rounded text-sm",children:"Delete"}),l.jsx("button",{onClick:()=>{N.dismiss(f.id),document.removeEventListener("mousedown",x)},className:"bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm",children:"Cancel"})]})},{duration:1/0,style:{maxWidth:"500px",padding:"16px 20px",fontSize:"15px"}})},a=m.useMemo(()=>[{key:"sprf_number",header:"SPRF #",cell:i=>l.jsx("span",{className:"text-[#195c00] font-semibold",children:i.sprf_number??"—"})},{key:"sub_category",header:l.jsx("div",{className:"text-center w-full",children:"SUB CATEGORY"}),cell:i=>l.jsx("span",{className:"font-medium flex justify-center items-center",children:i.sub_category??"—"})},{key:"account",header:l.jsx("div",{className:"text-center w-full",children:"ACCOUNT"}),cell:i=>l.jsx("span",{className:"font-medium flex justify-center items-center",children:i.account??"—"})},{key:"account_manager",header:l.jsx("div",{className:"text-center w-full",children:"ACCOUNT MANAGER"}),cell:i=>l.jsx("span",{className:"font-medium flex justify-center items-center",children:i.account_manager??"—"})},{key:"status",header:l.jsx("div",{className:"text-center w-full",children:"STATUS"}),cell:i=>{const u=i.status?.toLowerCase()==="active",f=i.status?.toLowerCase()==="inactive";return l.jsx("div",{className:"flex justify-center items-center",children:l.jsx("span",{className:`
                  px-2 rounded-full text-[9px] font-bold uppercase tracking-wider
                  md:text-[8px] md:px-1
                  lg:text-[9px] lg:px-[6px]
                  xl:text-[10px] xl:px-2
                  ${u?"bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]":f?"bg-red-100 text-red-700 border border-red-200":"bg-gray-100 text-gray-600 border border-gray-200"}
                `,children:i.status??"—"})})}},{key:"actions",header:l.jsx("div",{className:"text-center w-full",children:"ACTIONS"}),cell:i=>l.jsxs("div",{className:"flex items-center justify-center gap-2 md:gap-1",children:[l.jsx("button",{className:"py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold",onClick:()=>C.visit(D("sprf.entry.projects.show",i.id)),children:l.jsx(se,{className:"text-[10px] md:text-xs lg:text-sm xl:text-base"})}),l.jsx("button",{className:"px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10",onClick:()=>o(i),children:l.jsx(ae,{className:"text-[10px] md:text-xs lg:text-sm xl:text-base"})})]})}],[]),d=i=>{C.get(D("sprf.entry.list"),{page:i},{preserveScroll:!0,preserveState:!0})},c=e?.data??[],p=e&&typeof e.current_page=="number"?{page:e.current_page,perPage:e.per_page??10,total:e.total??c.length,onPageChange:d}:null;return l.jsxs(l.Fragment,{children:[l.jsx(q,{title:"SPRF Entry"}),l.jsxs("div",{className:"min-h-screen flex flex-col",children:[l.jsxs("div",{className:"flex-1 pb-24",children:[l.jsxs("div",{className:"px-2 pt-8 pb-3 flex justify-between mx-10 md:mx-4 lg:mx-5 xl:mx-10",children:[l.jsxs("div",{className:"flex gap-1",children:[l.jsx("h1",{className:"font-semibold mt-3",children:"Project SPRF"}),l.jsx("p",{className:"mt-3",children:"/"}),l.jsx("p",{className:"text-3xl font-semibold",children:"Entry"})]}),l.jsx("div",{className:"flex flex-col gap-1 items-end",children:l.jsx("h1",{className:"text-xs text-right text-slate-500",children:r})})]}),l.jsx(J,{tiles:n,tableTitle:"In-Progress Drafts",columns:a,rows:c,rowKey:i=>String(i.id),pagination:p})]}),l.jsx(Ge,{}),l.jsx(Q,{}),l.jsx("div",{className:"sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10",children:l.jsx("div",{className:"px-10 py-3 flex items-center justify-end"})})]})]})}Ke.layout=e=>l.jsx(V,{children:e});export{Ke as default};
