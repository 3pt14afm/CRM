import{r as d,a as _,j as s,H as be,b as ye}from"./app-Bo5NM8qy.js";import{F as ve,A as je}from"./AuthenticatedLayout-Co2bTP3D.js";import{s as S}from"./index-BsxvijQw.js";import{P as we}from"./ProjectListSection-3z_3diSR.js";import{i as Ne,e as ke}from"./index-0_bedNQm.js";import{i as Ee,c as De}from"./index-DjEslEqk.js";import{M as Q,e as ee,h as Ce,i as Se,B as te,d as Ae}from"./index-C5C5NAhB.js";import"./iconBase-B356q89P.js";import"./index-CIhAI8c7.js";import"./chevron-down-DC8WiBzl.js";const se=e=>{if(!e)return"—";const t=new Date(e),i=Math.floor((new Date-t)/1e3);if(i<60)return"Just now";const o=Math.floor(i/60);if(o<60)return`${o}m ago`;const l=Math.floor(o/60);if(l<24)return`${l}hr${l>1?"s":""} ago`;const r=Math.floor(l/24);return r<30?`${r}d ago`:new Intl.DateTimeFormat("en-US",{month:"2-digit",day:"2-digit",year:"2-digit"}).format(t)};let Fe={data:""},$e=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||Fe},_e=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Me=/\/\*[^]*?\*\/|  +/g,ae=/\n+/g,F=(e,t)=>{let a="",i="",o="";for(let l in e){let r=e[l];l[0]=="@"?l[1]=="i"?a=l+" "+r+";":i+=l[1]=="f"?F(r,l):l+"{"+F(r,l[1]=="k"?"":t)+"}":typeof r=="object"?i+=F(r,t?t.replace(/([^,])+/g,c=>l.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,u=>/&/.test(u)?u.replace(/&/g,c):c?c+" "+u:u)):l):r!=null&&(l=/^--/.test(l)?l:l.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=F.p?F.p(l,r):l+":"+r+";")}return a+(t&&o?t+"{"+o+"}":o)+i},E={},re=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+re(e[a]);return t}return e},Te=(e,t,a,i,o)=>{let l=re(e),r=E[l]||(E[l]=(u=>{let p=0,x=11;for(;p<u.length;)x=101*x+u.charCodeAt(p++)>>>0;return"go"+x})(l));if(!E[r]){let u=l!==e?e:(p=>{let x,m,f=[{}];for(;x=_e.exec(p.replace(Me,""));)x[4]?f.shift():x[3]?(m=x[3].replace(ae," ").trim(),f.unshift(f[0][m]=f[0][m]||{})):f[0][x[1]]=x[2].replace(ae," ").trim();return f[0]})(e);E[r]=F(o?{["@keyframes "+r]:u}:u,a?"":"."+r)}let c=a&&E.g?E.g:null;return a&&(E.g=E[r]),((u,p,x,m)=>{m?p.data=p.data.replace(m,u):p.data.indexOf(u)===-1&&(p.data=x?u+p.data:p.data+u)})(E[r],t,i,c),r},Pe=(e,t,a)=>e.reduce((i,o,l)=>{let r=t[l];if(r&&r.call){let c=r(a),u=c&&c.props&&c.props.className||/^go/.test(c)&&c;r=u?"."+u:c&&typeof c=="object"?c.props?"":F(c,""):c===!1?"":c}return i+o+(r??"")},"");function U(e){let t=this||{},a=e.call?e(t.p):e;return Te(a.unshift?a.raw?Pe(a,[].slice.call(arguments,1),t.p):a.reduce((i,o)=>Object.assign(i,o&&o.call?o(t.p):o),{}):a,$e(t.target),t.g,t.o,t.k)}let ne,G,K;U.bind({g:1});let D=U.bind({k:1});function Le(e,t,a,i){F.p=t,ne=e,G=a,K=i}function $(e,t){let a=this||{};return function(){let i=arguments;function o(l,r){let c=Object.assign({},l),u=c.className||o.className;a.p=Object.assign({theme:G&&G()},c),a.o=/ *go\d+/.test(u),c.className=U.apply(a,i)+(u?" "+u:"");let p=e;return e[0]&&(p=c.as||e,delete c.as),K&&p[0]&&K(c),ne(p,c)}return t?t(o):o}}var Ie=e=>typeof e=="function",H=(e,t)=>Ie(e)?e(t):e,Oe=(()=>{let e=0;return()=>(++e).toString()})(),oe=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),ze=20,V="default",ie=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(r=>r.id===t.toast.id?{...r,...t.toast}:r)};case 2:let{toast:i}=t;return ie(e,{type:e.toasts.find(r=>r.id===i.id)?1:0,toast:i});case 3:let{toastId:o}=t;return{...e,toasts:e.toasts.map(r=>r.id===o||o===void 0?{...r,dismissed:!0,visible:!1}:r)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(r=>r.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let l=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(r=>({...r,pauseDuration:r.pauseDuration+l}))}}},B=[],le={toasts:[],pausedAt:void 0,settings:{toastLimit:ze}},N={},de=(e,t=V)=>{N[t]=ie(N[t]||le,e),B.forEach(([a,i])=>{a===t&&i(N[t])})},ce=e=>Object.keys(N).forEach(t=>de(e,t)),Re=e=>Object.keys(N).find(t=>N[t].toasts.some(a=>a.id===e)),W=(e=V)=>t=>{de(t,e)},Be={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},He=(e={},t=V)=>{let[a,i]=d.useState(N[t]||le),o=d.useRef(N[t]);d.useEffect(()=>(o.current!==N[t]&&i(N[t]),B.push([t,i]),()=>{let r=B.findIndex(([c])=>c===t);r>-1&&B.splice(r,1)}),[t]);let l=a.toasts.map(r=>{var c,u,p;return{...e,...e[r.type],...r,removeDelay:r.removeDelay||((c=e[r.type])==null?void 0:c.removeDelay)||e?.removeDelay,duration:r.duration||((u=e[r.type])==null?void 0:u.duration)||e?.duration||Be[r.type],style:{...e.style,...(p=e[r.type])==null?void 0:p.style,...r.style}}});return{...a,toasts:l}},Ue=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||Oe()}),T=e=>(t,a)=>{let i=Ue(t,e,a);return W(i.toasterId||Re(i.id))({type:2,toast:i}),i.id},h=(e,t)=>T("blank")(e,t);h.error=T("error");h.success=T("success");h.loading=T("loading");h.custom=T("custom");h.dismiss=(e,t)=>{let a={type:3,toastId:e};t?W(t)(a):ce(a)};h.dismissAll=e=>h.dismiss(void 0,e);h.remove=(e,t)=>{let a={type:4,toastId:e};t?W(t)(a):ce(a)};h.removeAll=e=>h.remove(void 0,e);h.promise=(e,t,a)=>{let i=h.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(o=>{let l=t.success?H(t.success,o):void 0;return l?h.success(l,{id:i,...a,...a?.success}):h.dismiss(i),o}).catch(o=>{let l=t.error?H(t.error,o):void 0;l?h.error(l,{id:i,...a,...a?.error}):h.dismiss(i)}),e};var We=1e3,qe=(e,t="default")=>{let{toasts:a,pausedAt:i}=He(e,t),o=d.useRef(new Map).current,l=d.useCallback((m,f=We)=>{if(o.has(m))return;let g=setTimeout(()=>{o.delete(m),r({type:4,toastId:m})},f);o.set(m,g)},[]);d.useEffect(()=>{if(i)return;let m=Date.now(),f=a.map(g=>{if(g.duration===1/0)return;let k=(g.duration||0)+g.pauseDuration-(m-g.createdAt);if(k<0){g.visible&&h.dismiss(g.id);return}return setTimeout(()=>h.dismiss(g.id,t),k)});return()=>{f.forEach(g=>g&&clearTimeout(g))}},[a,i,t]);let r=d.useCallback(W(t),[t]),c=d.useCallback(()=>{r({type:5,time:Date.now()})},[r]),u=d.useCallback((m,f)=>{r({type:1,toast:{id:m,height:f}})},[r]),p=d.useCallback(()=>{i&&r({type:6,time:Date.now()})},[i,r]),x=d.useCallback((m,f)=>{let{reverseOrder:g=!1,gutter:k=8,defaultPosition:P}=f||{},y=a.filter(v=>(v.position||P)===(m.position||P)&&v.height),L=y.findIndex(v=>v.id===m.id),w=y.filter((v,M)=>M<L&&v.visible).length;return y.filter(v=>v.visible).slice(...g?[w+1]:[0,w]).reduce((v,M)=>v+(M.height||0)+k,0)},[a]);return d.useEffect(()=>{a.forEach(m=>{if(m.dismissed)l(m.id,m.removeDelay);else{let f=o.get(m.id);f&&(clearTimeout(f),o.delete(m.id))}})},[a,l]),{toasts:a,handlers:{updateHeight:u,startPause:c,endPause:p,calculateOffset:x}}},Ye=D`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Ge=D`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ke=D`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Ve=$("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ye} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Ge} 0.15s ease-out forwards;
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
    animation: ${Ke} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Xe=D`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,Ze=$("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${Xe} 1s linear infinite;
`,Je=D`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,Qe=D`
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
}`,et=$("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Je} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Qe} 0.2s ease-out forwards;
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
`,tt=$("div")`
  position: absolute;
`,st=$("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,at=D`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,rt=$("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${at} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,nt=({toast:e})=>{let{icon:t,type:a,iconTheme:i}=e;return t!==void 0?typeof t=="string"?d.createElement(rt,null,t):t:a==="blank"?null:d.createElement(st,null,d.createElement(Ze,{...i}),a!=="loading"&&d.createElement(tt,null,a==="error"?d.createElement(Ve,{...i}):d.createElement(et,{...i})))},ot=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,it=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,lt="0%{opacity:0;} 100%{opacity:1;}",dt="0%{opacity:1;} 100%{opacity:0;}",ct=$("div")`
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
`,ut=$("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,mt=(e,t)=>{let a=e.includes("top")?1:-1,[i,o]=oe()?[lt,dt]:[ot(a),it(a)];return{animation:t?`${D(i)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${D(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},pt=d.memo(({toast:e,position:t,style:a,children:i})=>{let o=e.height?mt(e.position||t||"top-center",e.visible):{opacity:0},l=d.createElement(nt,{toast:e}),r=d.createElement(ut,{...e.ariaProps},H(e.message,e));return d.createElement(ct,{className:e.className,style:{...o,...a,...e.style}},typeof i=="function"?i({icon:l,message:r}):d.createElement(d.Fragment,null,l,r))});Le(d.createElement);var xt=({id:e,className:t,style:a,onHeightUpdate:i,children:o})=>{let l=d.useCallback(r=>{if(r){let c=()=>{let u=r.getBoundingClientRect().height;i(e,u)};c(),new MutationObserver(c).observe(r,{subtree:!0,childList:!0,characterData:!0})}},[e,i]);return d.createElement("div",{ref:l,className:t,style:a},o)},ft=(e,t)=>{let a=e.includes("top"),i=a?{top:0}:{bottom:0},o=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:oe()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(a?1:-1)}px)`,...i,...o}},ht=U`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,z=16,gt=({reverseOrder:e,position:t="top-center",toastOptions:a,gutter:i,children:o,toasterId:l,containerStyle:r,containerClassName:c})=>{let{toasts:u,handlers:p}=qe(a,l);return d.createElement("div",{"data-rht-toaster":l||"",style:{position:"fixed",zIndex:9999,top:z,left:z,right:z,bottom:z,pointerEvents:"none",...r},className:c,onMouseEnter:p.startPause,onMouseLeave:p.endPause},u.map(x=>{let m=x.position||t,f=p.calculateOffset(x,{reverseOrder:e,gutter:i,defaultPosition:t}),g=ft(m,f);return d.createElement(xt,{id:x.id,key:x.id,onHeightUpdate:p.updateHeight,className:x.visible?ht:"",style:g},x.type==="custom"?H(x.message,x):o?o(x):d.createElement(pt,{toast:x,position:m}))}))},A=h;function R(e){if(!e)return null;const[t,a,i]=e.split("-");return new Date(t,a-1,i).toLocaleDateString("en-US",{month:"long",day:"2-digit",year:"numeric"})}function bt({drafts:e=null,stats:t=null}){const a=new Date,i=new Intl.DateTimeFormat("en-US",{day:"2-digit",month:"2-digit",year:"2-digit"}).format(a),[o,l]=d.useState(e),[r,c]=d.useState(t),[u,p]=d.useState(!1),[x,m]=d.useState(!1),[f,g]=d.useState(""),[k,P]=d.useState("all"),[y,L]=d.useState(""),[w,v]=d.useState(""),[M,I]=d.useState(!1),q=d.useRef(null);d.useEffect(()=>{const n=window.matchMedia("(max-width: 639px)"),b=()=>m(n.matches);return b(),n.addEventListener("change",b),()=>n.removeEventListener("change",b)},[]),d.useEffect(()=>{e&&l(e),t&&c(t)},[e,t]),d.useEffect(()=>{const n=b=>{q.current&&!q.current.contains(b.target)&&I(!1)};return document.addEventListener("mousedown",n),()=>document.removeEventListener("mousedown",n)},[]);const Y=async(n=1,{silent:b=!1}={})=>{b||p(!0);try{const j=await ye.get(S("sprf.entry.list"),{params:{page:n,search:f||void 0,status:k!=="all"?k:void 0,date_from:y||void 0,date_to:w||void 0},headers:{"X-Requested-With":"XMLHttpRequest",Accept:"application/json"}});l(j.data.drafts),c(j.data.stats)}catch(j){console.error("Filtering error payload exception: ",j),b||A.error("Failed to load filtered drafts.")}finally{p(!1)}};d.useEffect(()=>{const n=setTimeout(()=>{Y(1)},300);return()=>clearTimeout(n)},[f,k,y,w]);const ue=d.useMemo(()=>{const n=r?.totalDrafts??o?.total??0,b=r?.recentlyModifiedText??"—",j=[{label:"Total Drafts",value:n,icon:s.jsx(ke,{}),variant:"normal"},{label:"Recently Modified",value:b,icon:s.jsx(De,{}),variant:"normal"}];return x||j.push({label:s.jsxs(s.Fragment,{children:[s.jsx("span",{className:"sm:hidden",children:"Create"}),s.jsx("span",{className:"hidden sm:inline",children:"Create New Draft"})]}),value:null,icon:s.jsx(Ee,{}),variant:"action",onClick:()=>_.visit(S("sprf.entry.create"))}),j},[r,o,x]),X=n=>{const b=n.sprf_no??n.id;A(j=>{const C=ge=>{ge.target.closest("[data-toast]")||(A.dismiss(j.id),document.removeEventListener("mousedown",C))};return document.addEventListener("mousedown",C),s.jsxs("span",{"data-toast":!0,className:"flex items-center gap-3",children:[s.jsxs("span",{children:["Delete draft ",s.jsx("b",{children:b}),"? This cannot be undone."]}),s.jsx("button",{onClick:()=>{A.dismiss(j.id),document.removeEventListener("mousedown",C),_.delete(S("sprf.entry.projects.destroy",n.id),{preserveScroll:!0,onStart:()=>{A.loading("Deleting draft...",{id:"deleteDraft"})},onSuccess:()=>{A.success("Draft deleted successfully!",{id:"deleteDraft"}),Y(o?.current_page??1)},onError:()=>{A.error("Delete failed. Please try again.",{id:"deleteDraft"})}})},className:"bg-red-500 text-white px-3 py-1 rounded text-sm",children:"Delete"}),s.jsx("button",{onClick:()=>{A.dismiss(j.id),document.removeEventListener("mousedown",C)},className:"bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm",children:"Cancel"})]})},{duration:1/0,style:{maxWidth:"500px",padding:"16px 20px",fontSize:"15px"}})},me=d.useMemo(()=>[{key:"sprf_no",header:"SPRF #",cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-20 bg-slate-200/80 rounded animate-pulse"}):s.jsx("span",{className:"text-[#195c00] font-semibold",children:n.sprf_no??"—"})},{key:"sub_category",header:s.jsx("div",{className:"text-center w-full",children:"SUB CATEGORY"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-24 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:"font-medium flex justify-center items-center",children:n.sub_category??"—"})},{key:"company_name",header:s.jsx("div",{className:"text-center w-full",children:"ACCOUNT"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-32 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:"font-medium flex justify-center items-center",children:n.company_name??"—"})},{key:"account_manager",header:s.jsx("div",{className:"text-center w-full",children:"ACCOUNT MANAGER"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-28 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:"font-medium flex justify-center items-center",children:n.account_manager??"—"})},{key:"last_saved_at",header:s.jsx("div",{className:"text-center w-full",children:"LAST SAVED"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-16 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:"flex justify-center items-center text-[11px] text-slate-500",children:se(n.last_saved_at)})},{key:"status",header:s.jsx("div",{className:"text-center w-full",children:"STATUS"}),cell:n=>{if(n.isSkeleton)return s.jsx("div",{className:"h-5 w-20 bg-slate-200/80 rounded-full animate-pulse mx-auto"});const b=n.status==="returned";return s.jsx("div",{className:"flex justify-center items-center",children:s.jsx("span",{className:`px-2 rounded-full text-[9px] font-bold uppercase tracking-wider md:text-[8px] md:px-1 lg:text-[9px] lg:px-[6px] xl:text-[10px] xl:px-2 border ${b?"bg-red-100 text-red-700 border-red-200":"bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"}`,children:n.status??"—"})})}},{key:"actions",header:s.jsx("div",{className:"text-center w-full",children:"ACTIONS"}),cell:n=>n.isSkeleton?s.jsxs("div",{className:"flex justify-center items-center gap-2",children:[s.jsx("div",{className:"h-7 w-8 bg-slate-200/80 rounded-md animate-pulse"}),s.jsx("div",{className:"h-7 w-8 bg-slate-200/80 rounded-md animate-pulse"})]}):s.jsxs("div",{className:"flex items-center justify-center gap-2 md:gap-1",children:[s.jsx("button",{className:"py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold",onClick:()=>_.visit(S("sprf.entry.projects.show",n.id)),children:s.jsx(Q,{className:"text-[10px] md:text-xs lg:text-sm xl:text-base"})}),s.jsx("button",{className:"px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10",onClick:()=>X(n),children:s.jsx(ee,{className:"text-[10px] md:text-xs lg:text-sm xl:text-base"})})]})}],[o]),Z=d.useMemo(()=>u?Array.from({length:5},(n,b)=>({id:`skeleton-row-${b}`,isSkeleton:!0})):o?.data??[],[u,o]),pe=o&&typeof o.current_page=="number"?{page:o.current_page,perPage:o.per_page??10,total:o.total??Z.length,onPageChange:n=>Y(n)}:null,O=y||w,xe=y&&w?`${R(y)} – ${R(w)}`:y?`From ${R(y)}`:w?`Until ${R(w)}`:null,J=()=>{L(""),v(""),I(!1)},fe=s.jsxs("div",{className:"flex flex-row items-center gap-1 md:gap-1.5 min-w-0 w-full sm:w-auto",children:[s.jsxs("div",{className:"relative h-7 md:h-8 flex items-center min-w-0 flex-shrink-0",children:[s.jsx("input",{type:"text",placeholder:"Search",value:f,onChange:n=>g(n.target.value),className:`peer h-7 md:h-8 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
            outline-none focus:ring-0 focus:border-[#289800] transition-all duration-300
            
            /* Desktop styling: Always expanded */
            md:w-52 md:pl-8 md:pr-3 md:text-black md:placeholder:text-slate-400 md:cursor-text
            
            /* Mobile styling: Conditional based on whether text has been entered */
            ${f?"w-40 pl-8 pr-3 text-black placeholder:text-slate-400":"w-7 px-0 text-transparent placeholder:text-transparent cursor-pointer focus:w-40 focus:pl-8 focus:pr-3 focus:text-black focus:placeholder:text-slate-400 focus:cursor-text"}
          `}),s.jsx(Ce,{className:`absolute text-slate-400 text-base pointer-events-none z-10 transition-all duration-300 
            /* Centers the icon when collapsed, moves it to the left when focused, typed in, or on desktop */
            ${f?"left-2.5 translate-x-0":"left-1/2 -translate-x-1/2 peer-focus:left-2.5 peer-focus:translate-x-0 md:left-2.5 md:translate-x-0"}`})]}),s.jsxs("div",{className:"relative h-7 md:h-8 flex items-center flex-shrink-0",children:[s.jsx(Se,{className:"absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10 transition-all duration-150"}),s.jsxs("select",{value:k,onChange:n=>P(n.target.value),className:`h-7 md:h-8 w-7 md:w-32 px-0 md:pl-8 md:pr-6 py-0 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white 
            text-transparent md:text-black appearance-none cursor-pointer !bg-none [&::-ms-expand]:hidden
            flex items-center outline-none focus:ring-0 focus:border-[#289800]
            transition-all duration-150`,children:[s.jsx("option",{className:"text-black",value:"all",children:"  All Status  "}),s.jsx("option",{className:"text-black",value:"draft",children:"  Draft  "}),s.jsx("option",{className:"text-black",value:"returned",children:"  Returned  "}),s.jsx("option",{className:"text-black",value:"withdrawn",children:"  Withdrawn  "})]})]}),s.jsxs("div",{className:"relative flex-shrink-0",ref:q,children:[s.jsxs("button",{type:"button",onClick:()=>I(n=>!n),className:`h-7 md:h-8 flex items-center gap-1.5 px-1.5 md:px-2.5 text-xs md:text-[13px] font-medium border rounded-lg transition-all duration-150 whitespace-nowrap outline-none focus:ring-0 focus:border-[#289800]
            ${O?"border-[#4FA34E]/40 bg-[#E9F7E7] text-[#2DA300]":"border-gray-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-gray-300"}`,children:[s.jsx(te,{size:15,className:O?"text-[#4FA34E]":"text-slate-400"}),O&&s.jsx("span",{className:"hidden sm:inline text-[12px] max-w-[180px] truncate",children:xe}),O&&s.jsx("span",{className:"ml-0.5 flex items-center text-[#2DA300] hover:text-red-400 transition-colors",onMouseDown:n=>{n.stopPropagation(),J()},children:s.jsx(Ae,{size:13})})]}),M&&s.jsxs("div",{className:"absolute right-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg p-4",children:[s.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[s.jsx(te,{size:16,className:"text-[#4FA34E]"}),s.jsx("span",{className:"text-[12px] font-semibold text-slate-700 tracking-wide",children:"Filter by Date"})]}),s.jsxs("div",{className:"space-y-2",children:[s.jsx("input",{type:"date",value:y,onChange:n=>L(n.target.value),className:"w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"}),s.jsx("input",{type:"date",value:w,min:y||void 0,onChange:n=>v(n.target.value),className:"w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"})]}),s.jsxs("div",{className:"flex items-center gap-2 mt-4 pt-3 border-t border-gray-100",children:[s.jsx("button",{type:"button",onClick:J,className:"flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50",children:"Clear"}),s.jsx("button",{type:"button",onClick:()=>I(!1),className:"flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]",children:"Apply"})]})]})]})]}),he=n=>{if(n.isSkeleton)return s.jsxs("div",{className:"flex items-center gap-3 animate-pulse px-2 py-3",children:[s.jsx("div",{className:"h-10 w-10 rounded-lg bg-slate-200/80 shrink-0"}),s.jsxs("div",{className:"flex-1 space-y-2 min-w-0",children:[s.jsx("div",{className:"h-3 w-2/3 rounded-full bg-slate-200/80"}),s.jsx("div",{className:"h-2.5 w-1/2 rounded-full bg-slate-200/80"})]})]});const b=n.status==="returned",j=n.status==="withdrawn";return s.jsxs("div",{className:"px-2 py-3",children:[s.jsxs("div",{className:"flex items-start justify-between gap-2",children:[s.jsx("p",{className:`text-[11px] font-medium ${n.type===1?"text-[#289800]":"text-gray-500"}`,children:n.type===1?"Existing":n.type===0?"Potential":"—"}),s.jsx("span",{className:`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border whitespace-nowrap
            ${b?"bg-red-100 text-red-700 border-red-200":j?"bg-blue-100 text-blue-700 border-blue-200":"bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"}`,children:n.status??"—"})]}),s.jsxs("div",{className:"min-w-0 leading-relaxed pt-1",children:[s.jsx("p",{className:"text-xs font-medium",children:n.sprf_no??"—"}),s.jsx("p",{className:"text-sm font-semibold truncate",children:n.company_name??"—"}),s.jsxs("p",{className:"text-[11px] text-slate-800 font-semibold",children:[n.sub_category??"—"," · ",n.account_manager??"—"]})]}),s.jsx("p",{className:"mt-5 flex items-center justify-between text-[11px] text-slate-500",children:s.jsx("span",{className:"normal-case text-[10px] text-slate-500 italic",children:se(n.last_saved_at)})}),s.jsxs("div",{className:"mt-3 flex items-center gap-2",children:[s.jsxs("button",{type:"button",onClick:C=>{C.stopPropagation(),_.visit(S("sprf.entry.projects.show",n.id))},className:"flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] text-xs font-semibold",children:[s.jsx(Q,{className:"text-sm"})," Edit"]}),s.jsxs("button",{type:"button",onClick:C=>{C.stopPropagation(),X(n)},className:"flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[#F27373] text-red-500 text-xs font-semibold hover:bg-[#F27373]/10",children:[s.jsx(ee,{className:"text-sm"})," Delete"]})]})]})};return s.jsxs(s.Fragment,{children:[s.jsx("div",{className:"sticky top-0 z-30 px-4 py-1.5 pb-2 sm:hidden",children:s.jsxs("div",{className:"flex rounded-full bg-[#f8f8f8] w-full border border-[#2c2c2e10] border-b-[#2c2c2e]/15 shadow-sm",children:[s.jsx("button",{type:"button",className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800] border border-[#B5EBA2]/60",children:"Drafts"}),s.jsx("button",{type:"button",onClick:()=>_.visit(S("sprf.current")),className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors",children:"Current"}),s.jsx("button",{type:"button",onClick:()=>_.visit(S("sprf.archive")),className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors",children:"Archive"})]})}),s.jsx(be,{title:"SPRF Entry"}),s.jsxs("div",{className:"min-h-screen flex flex-col",children:[s.jsxs("div",{className:"flex-1 pb-24",children:[s.jsxs("div",{className:"px-4 sm:px-6 lg:px-10 pt-2 md:pt-8 pb-3 flex justify-between items-end",children:[s.jsxs("div",{className:"flex items-baseline gap-1",children:[s.jsx("h1",{className:"font-semibold text-[13px] sm:text-sm text-slate-500",children:"Project SPRF Approval"}),s.jsx("p",{className:"text-slate-400 hidden sm:block",children:"/"}),s.jsx("p",{className:"text-2xl sm:text-3xl font-semibold text-slate-900 hidden sm:block",children:"Entry"})]}),s.jsx("div",{className:"flex flex-col gap-1 items-end",children:s.jsx("h1",{className:"text-[10px] md:text-xs text-slate-500",children:i})})]}),s.jsx(we,{tiles:ue,tableTitle:"In-Progress Drafts",columns:me,rows:Z,rowKey:n=>String(n.id),pagination:u?null:pe,searchControl:fe,emptyText:u?"Loading records...":"No matching records found.",renderCard:he})]}),s.jsx("button",{type:"button",onClick:()=>_.visit(S("sprf.entry.create")),"aria-label":"Create New Draft",className:"sm:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#289800]/80 text-white shadow-lg active:scale-95 transition-transform",children:s.jsx(Ne,{className:"text-xl"})}),s.jsx(gt,{}),s.jsx(ve,{})]})]})}bt.layout=e=>s.jsx(je,{children:e});export{bt as default};
