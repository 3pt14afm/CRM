import{r as m,j as l,a as k,H as Z}from"./app-Ckyxu5o6.js";import{F as q,A as J}from"./AuthenticatedLayout-8s9w6_Df.js";import{s as C}from"./index-BsxvijQw.js";import{P as Q}from"./ProjectListSection-ioJMWR-o.js";import{e as X}from"./index-DQq-sMZm.js";import{c as ee,i as te}from"./index-BzJTWcAj.js";import{M as se,e as ae}from"./index-CN5cNnY3.js";import"./iconBase-dGFKZFRA.js";import"./index-DXYxQJZw.js";const re=e=>{if(!e)return"—";const t=new Date(e),r=Math.floor((new Date-t)/1e3);if(r<60)return"Just now";const n=Math.floor(r/60);if(n<60)return`${n}m ago`;const i=Math.floor(n/60);if(i<24)return`${i}hr${i>1?"s":""} ago`;const a=Math.floor(i/24);return a<30?`${a}d ago`:new Intl.DateTimeFormat("en-US",{month:"2-digit",day:"2-digit",year:"2-digit"}).format(t)};let ie={data:""},oe=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||ie},ne=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,le=/\/\*[^]*?\*\/|  +/g,z=/\n+/g,j=(e,t)=>{let s="",r="",n="";for(let i in e){let a=e[i];i[0]=="@"?i[1]=="i"?s=i+" "+a+";":r+=i[1]=="f"?j(a,i):i+"{"+j(a,i[1]=="k"?"":t)+"}":typeof a=="object"?r+=j(a,t?t.replace(/([^,])+/g,d=>i.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,c=>/&/.test(c)?c.replace(/&/g,d):d?d+" "+c:c)):i):a!=null&&(i=/^--/.test(i)?i:i.replace(/[A-Z]/g,"-$&").toLowerCase(),n+=j.p?j.p(i,a):i+":"+a+";")}return s+(t&&n?t+"{"+n+"}":n)+r},b={},B=e=>{if(typeof e=="object"){let t="";for(let s in e)t+=s+B(e[s]);return t}return e},de=(e,t,s,r,n)=>{let i=B(e),a=b[i]||(b[i]=(c=>{let p=0,o=11;for(;p<c.length;)o=101*o+c.charCodeAt(p++)>>>0;return"go"+o})(i));if(!b[a]){let c=i!==e?e:(p=>{let o,u,f=[{}];for(;o=ne.exec(p.replace(le,""));)o[4]?f.shift():o[3]?(u=o[3].replace(z," ").trim(),f.unshift(f[0][u]=f[0][u]||{})):f[0][o[1]]=o[2].replace(z," ").trim();return f[0]})(e);b[a]=j(n?{["@keyframes "+a]:c}:c,s?"":"."+a)}let d=s&&b.g?b.g:null;return s&&(b.g=b[a]),((c,p,o,u)=>{u?p.data=p.data.replace(u,c):p.data.indexOf(c)===-1&&(p.data=o?c+p.data:p.data+c)})(b[a],t,r,d),a},ce=(e,t,s)=>e.reduce((r,n,i)=>{let a=t[i];if(a&&a.call){let d=a(s),c=d&&d.props&&d.props.className||/^go/.test(d)&&d;a=c?"."+c:d&&typeof d=="object"?d.props?"":j(d,""):d===!1?"":d}return r+n+(a??"")},"");function T(e){let t=this||{},s=e.call?e(t.p):e;return de(s.unshift?s.raw?ce(s,[].slice.call(arguments,1),t.p):s.reduce((r,n)=>Object.assign(r,n&&n.call?n(t.p):n),{}):s,oe(t.target),t.g,t.o,t.k)}let H,M,F;T.bind({g:1});let v=T.bind({k:1});function ue(e,t,s,r){j.p=t,H=e,M=s,F=r}function w(e,t){let s=this||{};return function(){let r=arguments;function n(i,a){let d=Object.assign({},i),c=d.className||n.className;s.p=Object.assign({theme:M&&M()},d),s.o=/ *go\d+/.test(c),d.className=T.apply(s,r)+(c?" "+c:"");let p=e;return e[0]&&(p=d.as||e,delete d.as),F&&p[0]&&F(d),H(p,d)}return t?t(n):n}}var me=e=>typeof e=="function",A=(e,t)=>me(e)?e(t):e,pe=(()=>{let e=0;return()=>(++e).toString()})(),U=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),fe=20,P="default",Y=(e,t)=>{let{toastLimit:s}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,s)};case 1:return{...e,toasts:e.toasts.map(a=>a.id===t.toast.id?{...a,...t.toast}:a)};case 2:let{toast:r}=t;return Y(e,{type:e.toasts.find(a=>a.id===r.id)?1:0,toast:r});case 3:let{toastId:n}=t;return{...e,toasts:e.toasts.map(a=>a.id===n||n===void 0?{...a,dismissed:!0,visible:!1}:a)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(a=>a.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let i=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(a=>({...a,pauseDuration:a.pauseDuration+i}))}}},S=[],G={toasts:[],pausedAt:void 0,settings:{toastLimit:fe}},y={},K=(e,t=P)=>{y[t]=Y(y[t]||G,e),S.forEach(([s,r])=>{s===t&&r(y[t])})},V=e=>Object.keys(y).forEach(t=>K(e,t)),xe=e=>Object.keys(y).find(t=>y[t].toasts.some(s=>s.id===e)),_=(e=P)=>t=>{K(t,e)},ge={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},he=(e={},t=P)=>{let[s,r]=m.useState(y[t]||G),n=m.useRef(y[t]);m.useEffect(()=>(n.current!==y[t]&&r(y[t]),S.push([t,r]),()=>{let a=S.findIndex(([d])=>d===t);a>-1&&S.splice(a,1)}),[t]);let i=s.toasts.map(a=>{var d,c,p;return{...e,...e[a.type],...a,removeDelay:a.removeDelay||((d=e[a.type])==null?void 0:d.removeDelay)||e?.removeDelay,duration:a.duration||((c=e[a.type])==null?void 0:c.duration)||e?.duration||ge[a.type],style:{...e.style,...(p=e[a.type])==null?void 0:p.style,...a.style}}});return{...s,toasts:i}},ye=(e,t="blank",s)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...s,id:s?.id||pe()}),D=e=>(t,s)=>{let r=ye(t,e,s);return _(r.toasterId||xe(r.id))({type:2,toast:r}),r.id},g=(e,t)=>D("blank")(e,t);g.error=D("error");g.success=D("success");g.loading=D("loading");g.custom=D("custom");g.dismiss=(e,t)=>{let s={type:3,toastId:e};t?_(t)(s):V(s)};g.dismissAll=e=>g.dismiss(void 0,e);g.remove=(e,t)=>{let s={type:4,toastId:e};t?_(t)(s):V(s)};g.removeAll=e=>g.remove(void 0,e);g.promise=(e,t,s)=>{let r=g.loading(t.loading,{...s,...s?.loading});return typeof e=="function"&&(e=e()),e.then(n=>{let i=t.success?A(t.success,n):void 0;return i?g.success(i,{id:r,...s,...s?.success}):g.dismiss(r),n}).catch(n=>{let i=t.error?A(t.error,n):void 0;i?g.error(i,{id:r,...s,...s?.error}):g.dismiss(r)}),e};var be=1e3,ve=(e,t="default")=>{let{toasts:s,pausedAt:r}=he(e,t),n=m.useRef(new Map).current,i=m.useCallback((u,f=be)=>{if(n.has(u))return;let x=setTimeout(()=>{n.delete(u),a({type:4,toastId:u})},f);n.set(u,x)},[]);m.useEffect(()=>{if(r)return;let u=Date.now(),f=s.map(x=>{if(x.duration===1/0)return;let E=(x.duration||0)+x.pauseDuration-(u-x.createdAt);if(E<0){x.visible&&g.dismiss(x.id);return}return setTimeout(()=>g.dismiss(x.id,t),E)});return()=>{f.forEach(x=>x&&clearTimeout(x))}},[s,r,t]);let a=m.useCallback(_(t),[t]),d=m.useCallback(()=>{a({type:5,time:Date.now()})},[a]),c=m.useCallback((u,f)=>{a({type:1,toast:{id:u,height:f}})},[a]),p=m.useCallback(()=>{r&&a({type:6,time:Date.now()})},[r,a]),o=m.useCallback((u,f)=>{let{reverseOrder:x=!1,gutter:E=8,defaultPosition:L}=f||{},O=s.filter(h=>(h.position||L)===(u.position||L)&&h.height),W=O.findIndex(h=>h.id===u.id),R=O.filter((h,I)=>I<W&&h.visible).length;return O.filter(h=>h.visible).slice(...x?[R+1]:[0,R]).reduce((h,I)=>h+(I.height||0)+E,0)},[s]);return m.useEffect(()=>{s.forEach(u=>{if(u.dismissed)i(u.id,u.removeDelay);else{let f=n.get(u.id);f&&(clearTimeout(f),n.delete(u.id))}})},[s,i]),{toasts:s,handlers:{updateHeight:c,startPause:d,endPause:p,calculateOffset:o}}},je=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,we=v`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ne=v`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Ee=w("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${je} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${we} 0.15s ease-out forwards;
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
    animation: ${Ne} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,De=v`
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
  animation: ${De} 1s linear infinite;
`,Ce=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,$e=v`
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
}`,Se=w("div")`
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
    animation: ${$e} 0.2s ease-out forwards;
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
`,Ae=w("div")`
  position: absolute;
`,Te=w("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,_e=v`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Oe=w("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${_e} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,Ie=({toast:e})=>{let{icon:t,type:s,iconTheme:r}=e;return t!==void 0?typeof t=="string"?m.createElement(Oe,null,t):t:s==="blank"?null:m.createElement(Te,null,m.createElement(ke,{...r}),s!=="loading"&&m.createElement(Ae,null,s==="error"?m.createElement(Ee,{...r}):m.createElement(Se,{...r})))},Me=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Fe=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Pe="0%{opacity:0;} 100%{opacity:1;}",Le="0%{opacity:1;} 100%{opacity:0;}",Re=w("div")`
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
`,Be=(e,t)=>{let s=e.includes("top")?1:-1,[r,n]=U()?[Pe,Le]:[Me(s),Fe(s)];return{animation:t?`${v(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${v(n)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},He=m.memo(({toast:e,position:t,style:s,children:r})=>{let n=e.height?Be(e.position||t||"top-center",e.visible):{opacity:0},i=m.createElement(Ie,{toast:e}),a=m.createElement(ze,{...e.ariaProps},A(e.message,e));return m.createElement(Re,{className:e.className,style:{...n,...s,...e.style}},typeof r=="function"?r({icon:i,message:a}):m.createElement(m.Fragment,null,i,a))});ue(m.createElement);var Ue=({id:e,className:t,style:s,onHeightUpdate:r,children:n})=>{let i=m.useCallback(a=>{if(a){let d=()=>{let c=a.getBoundingClientRect().height;r(e,c)};d(),new MutationObserver(d).observe(a,{subtree:!0,childList:!0,characterData:!0})}},[e,r]);return m.createElement("div",{ref:i,className:t,style:s},n)},Ye=(e,t)=>{let s=e.includes("top"),r=s?{top:0}:{bottom:0},n=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:U()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(s?1:-1)}px)`,...r,...n}},Ge=T`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,$=16,Ke=({reverseOrder:e,position:t="top-center",toastOptions:s,gutter:r,children:n,toasterId:i,containerStyle:a,containerClassName:d})=>{let{toasts:c,handlers:p}=ve(s,i);return m.createElement("div",{"data-rht-toaster":i||"",style:{position:"fixed",zIndex:9999,top:$,left:$,right:$,bottom:$,pointerEvents:"none",...a},className:d,onMouseEnter:p.startPause,onMouseLeave:p.endPause},c.map(o=>{let u=o.position||t,f=p.calculateOffset(o,{reverseOrder:e,gutter:r,defaultPosition:t}),x=Ye(u,f);return m.createElement(Ue,{id:o.id,key:o.id,onHeightUpdate:p.updateHeight,className:o.visible?Ge:"",style:x},o.type==="custom"?A(o.message,o):n?n(o):m.createElement(He,{toast:o,position:u}))}))},N=g;function Ve({drafts:e=null,stats:t=null}){const s=new Date,r=new Intl.DateTimeFormat("en-US",{day:"2-digit",month:"2-digit",year:"2-digit"}).format(s),n=m.useMemo(()=>{const o=t?.totalDrafts??e?.total??0,u=t?.recentlyModifiedText??"—";return[{label:"Total Drafts",value:o,icon:l.jsx(X,{}),variant:"normal"},{label:"Recently Modified",value:u,icon:l.jsx(ee,{}),variant:"normal"},{label:"Create New Draft",value:null,icon:l.jsx(te,{}),variant:"action",onClick:()=>k.visit(C("sprf.entry.create"))}]},[t,e]),i=o=>{const u=o.sprf_no??o.id;N(f=>{const x=E=>{E.target.closest("[data-toast]")||(N.dismiss(f.id),document.removeEventListener("mousedown",x))};return document.addEventListener("mousedown",x),l.jsxs("span",{"data-toast":!0,className:"flex items-center gap-3",children:[l.jsxs("span",{children:["Delete draft ",l.jsx("b",{children:u}),"? This cannot be undone."]}),l.jsx("button",{onClick:()=>{N.dismiss(f.id),document.removeEventListener("mousedown",x),k.delete(C("sprf.entry.projects.destroy",o.id),{preserveScroll:!0,onStart:()=>{N.loading("Deleting draft...",{id:"deleteDraft"})},onSuccess:()=>{N.success("Draft deleted successfully!",{id:"deleteDraft"})},onError:()=>{N.error("Delete failed. Please try again.",{id:"deleteDraft"})}})},className:"bg-red-500 text-white px-3 py-1 rounded text-sm",children:"Delete"}),l.jsx("button",{onClick:()=>{N.dismiss(f.id),document.removeEventListener("mousedown",x)},className:"bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm",children:"Cancel"})]})},{duration:1/0,style:{maxWidth:"500px",padding:"16px 20px",fontSize:"15px"}})},a=m.useMemo(()=>[{key:"sprf_no",header:"SPRF #",cell:o=>l.jsx("span",{className:"text-[#195c00] font-semibold",children:o.sprf_no??"—"})},{key:"sub_category",header:l.jsx("div",{className:"text-center w-full",children:"SUB CATEGORY"}),cell:o=>l.jsx("span",{className:"font-medium flex justify-center items-center",children:o.sub_category??"—"})},{key:"company_name",header:l.jsx("div",{className:"text-center w-full",children:"ACCOUNT"}),cell:o=>l.jsx("span",{className:"font-medium flex justify-center items-center",children:o.company_name??"—"})},{key:"account_manager",header:l.jsx("div",{className:"text-center w-full",children:"ACCOUNT MANAGER"}),cell:o=>l.jsx("span",{className:"font-medium flex justify-center items-center",children:o.account_manager??"—"})},{key:"last_saved_at",header:l.jsx("div",{className:"text-center w-full",children:"LAST SAVED"}),cell:o=>l.jsx("span",{className:"flex justify-center items-center text-[11px] text-slate-500",children:re(o.last_saved_at)})},{key:"status",header:l.jsx("div",{className:"text-center w-full",children:"STATUS"}),cell:o=>{const u=o.status==="returned";return l.jsx("div",{className:"flex justify-center items-center",children:l.jsx("span",{className:`px-2 rounded-full text-[9px] font-bold uppercase tracking-wider md:text-[8px] md:px-1 lg:text-[9px] lg:px-[6px] xl:text-[10px] xl:px-2 border ${u?"bg-red-100 text-red-700 border-red-200":"bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"}`,children:o.status??"—"})})}},{key:"actions",header:l.jsx("div",{className:"text-center w-full",children:"ACTIONS"}),cell:o=>l.jsxs("div",{className:"flex items-center justify-center gap-2 md:gap-1",children:[l.jsx("button",{className:"py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold",onClick:()=>k.visit(C("sprf.entry.projects.show",o.id)),children:l.jsx(se,{className:"text-[10px] md:text-xs lg:text-sm xl:text-base"})}),l.jsx("button",{className:"px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10",onClick:()=>i(o),children:l.jsx(ae,{className:"text-[10px] md:text-xs lg:text-sm xl:text-base"})})]})}],[]),d=o=>{k.get(C("sprf.entry.list"),{page:o},{preserveScroll:!0,preserveState:!0})},c=e?.data??[],p=e&&typeof e.current_page=="number"?{page:e.current_page,perPage:e.per_page??10,total:e.total??c.length,onPageChange:d}:null;return l.jsxs(l.Fragment,{children:[l.jsx(Z,{title:"SPRF Entry"}),l.jsxs("div",{className:"min-h-screen flex flex-col",children:[l.jsxs("div",{className:"flex-1 pb-24",children:[l.jsxs("div",{className:"px-2 pt-8 pb-3 flex justify-between mx-10 md:mx-4 lg:mx-5 xl:mx-10",children:[l.jsxs("div",{className:"flex gap-1",children:[l.jsx("h1",{className:"font-semibold mt-3",children:"Project SPRF"}),l.jsx("p",{className:"mt-3",children:"/"}),l.jsx("p",{className:"text-3xl font-semibold",children:"Entry"})]}),l.jsx("div",{className:"flex flex-col gap-1 items-end",children:l.jsx("h1",{className:"text-xs text-right text-slate-500",children:r})})]}),l.jsx(Q,{tiles:n,tableTitle:"In-Progress Drafts",columns:a,rows:c,rowKey:o=>String(o.id),pagination:p})]}),l.jsx(Ke,{}),l.jsx(q,{})]})]})}Ve.layout=e=>l.jsx(J,{children:e});export{Ve as default};
