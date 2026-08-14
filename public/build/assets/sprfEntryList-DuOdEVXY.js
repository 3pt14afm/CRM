import{r as d,b as S,j as s,H as je,c as we}from"./app-BjvQJFdj.js";import{F as Ne,A as ke}from"./AuthenticatedLayout-DEe6pKtf.js";import{s as k}from"./index-BsxvijQw.js";import{P as De}from"./ProjectListSection-CSfH0RZW.js";import{i as Ee,f as Se}from"./index-BGwaQewh.js";import{i as Q,e as Ce}from"./index-DbIWfvw6.js";import{d as $e}from"./index-Ch4Vvb9L.js";import{M as ee,e as te,i as Fe,j as _e}from"./index-D0ycPVT5.js";import{D as Ae}from"./DatePicker-BbL1RNMq.js";import{V as se}from"./ViewButton-ZSmQnzgl.js";import"./iconBase-fXoT1kX8.js";import"./chevron-down-C7xTS38x.js";import"./index-DHFO-W3_.js";import"./clsx-B-dksMZM.js";const ae=e=>{if(!e)return"—";const t=new Date(e),i=Math.floor((new Date-t)/1e3);if(i<60)return"Just now";const o=Math.floor(i/60);if(o<60)return`${o}m ago`;const l=Math.floor(o/60);if(l<24)return`${l}hr${l>1?"s":""} ago`;const r=Math.floor(l/24);return r<30?`${r}d ago`:new Intl.DateTimeFormat("en-US",{month:"2-digit",day:"2-digit",year:"2-digit"}).format(t)};let Me={data:""},Pe=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||Me},Te=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Le=/\/\*[^]*?\*\/|  +/g,re=/\n+/g,A=(e,t)=>{let a="",i="",o="";for(let l in e){let r=e[l];l[0]=="@"?l[1]=="i"?a=l+" "+r+";":i+=l[1]=="f"?A(r,l):l+"{"+A(r,l[1]=="k"?"":t)+"}":typeof r=="object"?i+=A(r,t?t.replace(/([^,])+/g,c=>l.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,m=>/&/.test(m)?m.replace(/&/g,c):c?c+" "+m:m)):l):r!=null&&(l=/^--/.test(l)?l:l.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=A.p?A.p(l,r):l+":"+r+";")}return a+(t&&o?t+"{"+o+"}":o)+i},C={},ne=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+ne(e[a]);return t}return e},Ie=(e,t,a,i,o)=>{let l=ne(e),r=C[l]||(C[l]=(m=>{let p=0,x=11;for(;p<m.length;)x=101*x+m.charCodeAt(p++)>>>0;return"go"+x})(l));if(!C[r]){let m=l!==e?e:(p=>{let x,u,f=[{}];for(;x=Te.exec(p.replace(Le,""));)x[4]?f.shift():x[3]?(u=x[3].replace(re," ").trim(),f.unshift(f[0][u]=f[0][u]||{})):f[0][x[1]]=x[2].replace(re," ").trim();return f[0]})(e);C[r]=A(o?{["@keyframes "+r]:m}:m,a?"":"."+r)}let c=a&&C.g?C.g:null;return a&&(C.g=C[r]),((m,p,x,u)=>{u?p.data=p.data.replace(u,m):p.data.indexOf(m)===-1&&(p.data=x?m+p.data:p.data+m)})(C[r],t,i,c),r},Oe=(e,t,a)=>e.reduce((i,o,l)=>{let r=t[l];if(r&&r.call){let c=r(a),m=c&&c.props&&c.props.className||/^go/.test(c)&&c;r=m?"."+m:c&&typeof c=="object"?c.props?"":A(c,""):c===!1?"":c}return i+o+(r??"")},"");function U(e){let t=this||{},a=e.call?e(t.p):e;return Ie(a.unshift?a.raw?Oe(a,[].slice.call(arguments,1),t.p):a.reduce((i,o)=>Object.assign(i,o&&o.call?o(t.p):o),{}):a,Pe(t.target),t.g,t.o,t.k)}let oe,G,K;U.bind({g:1});let $=U.bind({k:1});function ze(e,t,a,i){A.p=t,oe=e,G=a,K=i}function M(e,t){let a=this||{};return function(){let i=arguments;function o(l,r){let c=Object.assign({},l),m=c.className||o.className;a.p=Object.assign({theme:G&&G()},c),a.o=/ *go\d+/.test(m),c.className=U.apply(a,i)+(m?" "+m:"");let p=e;return e[0]&&(p=c.as||e,delete c.as),K&&p[0]&&K(c),oe(p,c)}return t?t(o):o}}var Re=e=>typeof e=="function",H=(e,t)=>Re(e)?e(t):e,Be=(()=>{let e=0;return()=>(++e).toString()})(),ie=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),He=20,X="default",le=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(r=>r.id===t.toast.id?{...r,...t.toast}:r)};case 2:let{toast:i}=t;return le(e,{type:e.toasts.find(r=>r.id===i.id)?1:0,toast:i});case 3:let{toastId:o}=t;return{...e,toasts:e.toasts.map(r=>r.id===o||o===void 0?{...r,dismissed:!0,visible:!1}:r)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(r=>r.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let l=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(r=>({...r,pauseDuration:r.pauseDuration+l}))}}},B=[],de={toasts:[],pausedAt:void 0,settings:{toastLimit:He}},D={},ce=(e,t=X)=>{D[t]=le(D[t]||de,e),B.forEach(([a,i])=>{a===t&&i(D[t])})},me=e=>Object.keys(D).forEach(t=>ce(e,t)),Ue=e=>Object.keys(D).find(t=>D[t].toasts.some(a=>a.id===e)),W=(e=X)=>t=>{ce(t,e)},We={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},qe=(e={},t=X)=>{let[a,i]=d.useState(D[t]||de),o=d.useRef(D[t]);d.useEffect(()=>(o.current!==D[t]&&i(D[t]),B.push([t,i]),()=>{let r=B.findIndex(([c])=>c===t);r>-1&&B.splice(r,1)}),[t]);let l=a.toasts.map(r=>{var c,m,p;return{...e,...e[r.type],...r,removeDelay:r.removeDelay||((c=e[r.type])==null?void 0:c.removeDelay)||e?.removeDelay,duration:r.duration||((m=e[r.type])==null?void 0:m.duration)||e?.duration||We[r.type],style:{...e.style,...(p=e[r.type])==null?void 0:p.style,...r.style}}});return{...a,toasts:l}},Ve=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||Be()}),L=e=>(t,a)=>{let i=Ve(t,e,a);return W(i.toasterId||Ue(i.id))({type:2,toast:i}),i.id},g=(e,t)=>L("blank")(e,t);g.error=L("error");g.success=L("success");g.loading=L("loading");g.custom=L("custom");g.dismiss=(e,t)=>{let a={type:3,toastId:e};t?W(t)(a):me(a)};g.dismissAll=e=>g.dismiss(void 0,e);g.remove=(e,t)=>{let a={type:4,toastId:e};t?W(t)(a):me(a)};g.removeAll=e=>g.remove(void 0,e);g.promise=(e,t,a)=>{let i=g.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(o=>{let l=t.success?H(t.success,o):void 0;return l?g.success(l,{id:i,...a,...a?.success}):g.dismiss(i),o}).catch(o=>{let l=t.error?H(t.error,o):void 0;l?g.error(l,{id:i,...a,...a?.error}):g.dismiss(i)}),e};var Ye=1e3,Ge=(e,t="default")=>{let{toasts:a,pausedAt:i}=qe(e,t),o=d.useRef(new Map).current,l=d.useCallback((u,f=Ye)=>{if(o.has(u))return;let b=setTimeout(()=>{o.delete(u),r({type:4,toastId:u})},f);o.set(u,b)},[]);d.useEffect(()=>{if(i)return;let u=Date.now(),f=a.map(b=>{if(b.duration===1/0)return;let E=(b.duration||0)+b.pauseDuration-(u-b.createdAt);if(E<0){b.visible&&g.dismiss(b.id);return}return setTimeout(()=>g.dismiss(b.id,t),E)});return()=>{f.forEach(b=>b&&clearTimeout(b))}},[a,i,t]);let r=d.useCallback(W(t),[t]),c=d.useCallback(()=>{r({type:5,time:Date.now()})},[r]),m=d.useCallback((u,f)=>{r({type:1,toast:{id:u,height:f}})},[r]),p=d.useCallback(()=>{i&&r({type:6,time:Date.now()})},[i,r]),x=d.useCallback((u,f)=>{let{reverseOrder:b=!1,gutter:E=8,defaultPosition:I}=f||{},j=a.filter(v=>(v.position||I)===(u.position||I)&&v.height),O=j.findIndex(v=>v.id===u.id),w=j.filter((v,T)=>T<O&&v.visible).length;return j.filter(v=>v.visible).slice(...b?[w+1]:[0,w]).reduce((v,T)=>v+(T.height||0)+E,0)},[a]);return d.useEffect(()=>{a.forEach(u=>{if(u.dismissed)l(u.id,u.removeDelay);else{let f=o.get(u.id);f&&(clearTimeout(f),o.delete(u.id))}})},[a,l]),{toasts:a,handlers:{updateHeight:m,startPause:c,endPause:p,calculateOffset:x}}},Ke=$`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Xe=$`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ze=$`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Je=M("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ke} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Xe} 0.15s ease-out forwards;
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
    animation: ${Ze} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Qe=$`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,et=M("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${Qe} 1s linear infinite;
`,tt=$`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,st=$`
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
}`,at=M("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${tt} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${st} 0.2s ease-out forwards;
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
`,rt=M("div")`
  position: absolute;
`,nt=M("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ot=$`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,it=M("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ot} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,lt=({toast:e})=>{let{icon:t,type:a,iconTheme:i}=e;return t!==void 0?typeof t=="string"?d.createElement(it,null,t):t:a==="blank"?null:d.createElement(nt,null,d.createElement(et,{...i}),a!=="loading"&&d.createElement(rt,null,a==="error"?d.createElement(Je,{...i}):d.createElement(at,{...i})))},dt=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,ct=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,mt="0%{opacity:0;} 100%{opacity:1;}",ut="0%{opacity:1;} 100%{opacity:0;}",pt=M("div")`
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
`,xt=M("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,ft=(e,t)=>{let a=e.includes("top")?1:-1,[i,o]=ie()?[mt,ut]:[dt(a),ct(a)];return{animation:t?`${$(i)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${$(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},ht=d.memo(({toast:e,position:t,style:a,children:i})=>{let o=e.height?ft(e.position||t||"top-center",e.visible):{opacity:0},l=d.createElement(lt,{toast:e}),r=d.createElement(xt,{...e.ariaProps},H(e.message,e));return d.createElement(pt,{className:e.className,style:{...o,...a,...e.style}},typeof i=="function"?i({icon:l,message:r}):d.createElement(d.Fragment,null,l,r))});ze(d.createElement);var gt=({id:e,className:t,style:a,onHeightUpdate:i,children:o})=>{let l=d.useCallback(r=>{if(r){let c=()=>{let m=r.getBoundingClientRect().height;i(e,m)};c(),new MutationObserver(c).observe(r,{subtree:!0,childList:!0,characterData:!0})}},[e,i]);return d.createElement("div",{ref:l,className:t,style:a},o)},bt=(e,t)=>{let a=e.includes("top"),i=a?{top:0}:{bottom:0},o=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:ie()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(a?1:-1)}px)`,...i,...o}},yt=U`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,z=16,vt=({reverseOrder:e,position:t="top-center",toastOptions:a,gutter:i,children:o,toasterId:l,containerStyle:r,containerClassName:c})=>{let{toasts:m,handlers:p}=Ge(a,l);return d.createElement("div",{"data-rht-toaster":l||"",style:{position:"fixed",zIndex:9999,top:z,left:z,right:z,bottom:z,pointerEvents:"none",...r},className:c,onMouseEnter:p.startPause,onMouseLeave:p.endPause},m.map(x=>{let u=x.position||t,f=p.calculateOffset(x,{reverseOrder:e,gutter:i,defaultPosition:t}),b=bt(u,f);return d.createElement(gt,{id:x.id,key:x.id,onHeightUpdate:p.updateHeight,className:x.visible?yt:"",style:b},x.type==="custom"?H(x.message,x):o?o(x):d.createElement(ht,{toast:x,position:u}))}))},_=g;function R(e){if(!e)return null;const[t,a,i]=e.split("-");return new Date(t,a-1,i).toLocaleDateString("en-US",{month:"long",day:"2-digit",year:"numeric"})}function jt({drafts:e=null,stats:t=null}){const a=new Date,i=new Intl.DateTimeFormat("en-US",{day:"2-digit",month:"2-digit",year:"2-digit"}).format(a),[o,l]=d.useState(e),[r,c]=d.useState(t),[m,p]=d.useState(!1),[x,u]=d.useState(!1),[f,b]=d.useState(""),[E,I]=d.useState("all"),[j,O]=d.useState(""),[w,v]=d.useState(""),[T,q]=d.useState(!1),V=d.useRef(null);d.useEffect(()=>{const n=window.matchMedia("(max-width: 639px)"),h=()=>u(n.matches);return h(),n.addEventListener("change",h),()=>n.removeEventListener("change",h)},[]),d.useEffect(()=>{e&&l(e),t&&c(t)},[e,t]),d.useEffect(()=>{const n=h=>{V.current&&!V.current.contains(h.target)&&q(!1)};return document.addEventListener("mousedown",n),()=>document.removeEventListener("mousedown",n)},[]);const Y=async(n=1,{silent:h=!1}={})=>{h||p(!0);try{const y=await we.get(k("sprf.entry.list"),{params:{page:n,search:f||void 0,status:E!=="all"?E:void 0,date_from:j||void 0,date_to:w||void 0},headers:{"X-Requested-With":"XMLHttpRequest",Accept:"application/json"}});l(y.data.drafts),c(y.data.stats)}catch(y){console.error("Filtering error payload exception: ",y),h||_.error("Failed to load filtered drafts.")}finally{p(!1)}};d.useEffect(()=>{const n=setTimeout(()=>{Y(1)},300);return()=>clearTimeout(n)},[f,E,j,w]);const ue=d.useMemo(()=>{const n=r?.totalDrafts??o?.total??0,h=r?.recentlyModifiedText??"—",y=[{label:"Total Drafts",value:n,icon:s.jsx(Se,{}),variant:"normal"},{label:"Recently Modified",value:h,icon:s.jsx(Ce,{}),variant:"normal"}];return x||(y.push({label:s.jsxs(s.Fragment,{children:[s.jsx("span",{className:"sm:hidden",children:"Create"}),s.jsx("span",{className:"hidden sm:inline",children:"Create New Draft"})]}),value:"Markup % Input",icon:s.jsx(Q,{}),variant:"action",onClick:()=>S.visit(k("sprf.entry.create"))}),y.push({label:s.jsxs(s.Fragment,{children:[s.jsx("span",{className:"sm:hidden",children:"Create"}),s.jsx("span",{className:"hidden sm:inline",children:"Create New Draft"})]}),value:"Selling Price Input",icon:s.jsx(Q,{}),variant:"action",onClick:()=>S.visit(k("sprf.entry2.create"))})),y},[r,o,x]),Z=n=>{const h=n.sprf_no??n.id;_(y=>{const N=F=>{F.target.closest("[data-toast]")||(_.dismiss(y.id),document.removeEventListener("mousedown",N))};return document.addEventListener("mousedown",N),s.jsxs("span",{"data-toast":!0,className:"flex items-center gap-3",children:[s.jsxs("span",{children:["Delete draft ",s.jsx("b",{children:h}),"? This cannot be undone."]}),s.jsx("button",{onClick:()=>{_.dismiss(y.id),document.removeEventListener("mousedown",N),S.delete(k("sprf.entry.projects.destroy",n.id),{preserveScroll:!0,onStart:()=>{_.loading("Deleting draft...",{id:"deleteDraft"})},onSuccess:()=>{_.success("Draft deleted successfully!",{id:"deleteDraft"}),Y(o?.current_page??1)},onError:()=>{_.error("Delete failed. Please try again.",{id:"deleteDraft"})}})},className:"bg-red-500 text-white px-3 py-1 rounded text-sm",children:"Delete"}),s.jsx("button",{onClick:()=>{_.dismiss(y.id),document.removeEventListener("mousedown",N)},className:"bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm",children:"Cancel"})]})},{duration:1/0,style:{maxWidth:"500px",padding:"16px 20px",fontSize:"15px"}})},pe=d.useMemo(()=>[{key:"sprf_no",header:"SPRF #",cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-20 bg-slate-200/80 rounded animate-pulse"}):s.jsx("span",{className:"text-[#195c00] font-semibold",children:n.sprf_no??"—"})},{key:"sub_category",header:s.jsx("div",{className:"w-full",children:"SUB CATEGORY"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-24 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:"font-medium flex items-center",children:n.sub_category??"—"})},{key:"company_name",header:s.jsx("div",{className:"w-full",children:"ACCOUNT"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-32 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:"font-medium flex items-center",children:n.company_name??"—"})},{key:"account_manager",header:s.jsx("div",{className:"w-full",children:"ACCOUNT MANAGER"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-28 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:"font-medium flex items-center",children:n.account_manager??"—"})},{key:"type",header:s.jsx("div",{className:"w-full",children:"TYPE"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-16 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:`font-medium flex items-center ${n.type===1?"text-[#289800]":"text-gray-500"}`,children:n.type===1?"Existing":"Potential"})},{key:"last_saved_at",header:s.jsx("div",{className:"w-full",children:"LAST SAVED"}),cell:n=>n.isSkeleton?s.jsx("div",{className:"h-4 w-16 bg-slate-200/80 rounded animate-pulse mx-auto"}):s.jsx("span",{className:"flex items-center md:text-[10px] lg:text-[11px] text-slate-500",children:ae(n.last_saved_at)})},{key:"status",header:s.jsx("div",{className:"w-full",children:"STATUS"}),cell:n=>{if(n.isSkeleton)return s.jsx("div",{className:"h-5 w-20 bg-slate-200/80 rounded-full animate-pulse mx-auto"});const h=n.status==="returned";return s.jsx("div",{className:"flex items-center",children:s.jsx("span",{className:`px-2 rounded-full text-[9px] font-bold uppercase tracking-wider md:text-[8px] md:px-1 lg:text-[9px] lg:px-[6px] xl:text-[10px] xl:px-2 border ${h?"bg-red-100 text-red-700 border-red-200":"bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"}`,children:n.status??"—"})})}},{key:"actions",header:s.jsx("div",{className:"text-center w-full",children:"ACTIONS"}),cell:n=>n.isSkeleton?s.jsxs("div",{className:"flex justify-center items-center gap-2",children:[s.jsx("div",{className:"h-7 w-8 bg-slate-200/80 rounded-md animate-pulse"}),s.jsx("div",{className:"h-7 w-8 bg-slate-200/80 rounded-md animate-pulse"})]}):s.jsxs("div",{className:"flex items-center justify-center gap-2 md:gap-1",children:[s.jsx(se,{onClick:()=>S.visit(k(n.form_version===2?"sprf.entry2.projects.show":"sprf.entry.projects.show",n.id)),icon:ee,label:"Edit project",iconSize:"text-[10px] md:text-xs lg:text-sm xl:text-base",className:"py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"}),s.jsx(se,{onClick:()=>Z(n),icon:te,label:"Delete project",iconSize:"text-[10px] md:text-xs lg:text-sm xl:text-base",className:"px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold bg-transparent hover:bg-[#F27373]/10"})]})}],[o]),J=d.useMemo(()=>m?Array.from({length:5},(n,h)=>({id:`skeleton-row-${h}`,isSkeleton:!0})):o?.data??[],[m,o]),xe=o&&typeof o.current_page=="number"?{page:o.current_page,perPage:o.per_page??10,total:o.total??J.length,onPageChange:n=>Y(n)}:null,fe=j||w,he=j&&w?`${R(j)} – ${R(w)}`:j?`From ${R(j)}`:w?`Until ${R(w)}`:null,ge=()=>{O(""),v(""),q(!1)},be=s.jsxs("div",{className:"flex flex-row items-center gap-1 md:gap-1.5 min-w-0 w-full sm:w-auto",children:[s.jsxs("div",{className:"relative h-7 md:h-8 flex items-center min-w-0 flex-shrink-0",children:[s.jsx("input",{type:"text",placeholder:"Search",value:f,onChange:n=>b(n.target.value),className:`peer h-7 md:h-8 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
            outline-none focus:ring-0 focus:border-[#289800] transition-all duration-300
            
            /* Desktop styling: Always expanded */
            md:w-52 md:pl-8 md:pr-3 md:text-black md:placeholder:text-slate-400 md:cursor-text
            
            /* Mobile styling: Conditional based on whether text has been entered */
            ${f?"w-40 pl-8 pr-3 text-black placeholder:text-slate-400":"w-7 px-0 text-transparent placeholder:text-transparent cursor-pointer focus:w-40 focus:pl-8 focus:pr-3 focus:text-black focus:placeholder:text-slate-400 focus:cursor-text"}
          `}),s.jsx(Fe,{className:`absolute text-slate-400 text-base pointer-events-none z-10 transition-all duration-300 
            /* Centers the icon when collapsed, moves it to the left when focused, typed in, or on desktop */
            ${f?"left-2.5 translate-x-0":"left-1/2 -translate-x-1/2 peer-focus:left-2.5 peer-focus:translate-x-0 md:left-2.5 md:translate-x-0"}`})]}),s.jsxs("div",{className:"relative h-7 md:h-8 flex items-center flex-shrink-0",children:[s.jsx(_e,{className:"absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10 transition-all duration-150"}),s.jsxs("select",{value:E,onChange:n=>I(n.target.value),className:`h-7 md:h-8 w-7 md:w-32 px-0 md:pl-8 md:pr-6 py-0 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white 
            text-transparent md:text-black appearance-none cursor-pointer !bg-none [&::-ms-expand]:hidden
            flex items-center outline-none focus:ring-0 focus:border-[#289800]
            transition-all duration-150`,children:[s.jsx("option",{className:"text-black",value:"all",children:"  All Status  "}),s.jsx("option",{className:"text-black",value:"draft",children:"  Draft  "}),s.jsx("option",{className:"text-black",value:"returned",children:"  Returned  "}),s.jsx("option",{className:"text-black",value:"withdrawn",children:"  Withdrawn  "})]})]}),s.jsx(Ae,{showDatePicker:T,setShowDatePicker:q,datePickerRef:V,dateFrom:j,setDateFrom:O,dateTo:w,setDateTo:v,hasDateFilter:fe,dateLabel:he,handleDateClear:ge,tooltipLabel:"Filter by date",side:"top"})]}),ye=({r:n,router:h,handleDelete:y})=>{const[N,F]=d.useState(!1);return s.jsxs("div",{className:"relative",children:[s.jsx("button",{type:"button",onClick:P=>{P.stopPropagation(),F(!N)},className:"rounded-lg hover:bg-slate-100 text-slate-500 transition-colors",children:s.jsx($e,{className:"text-xl"})}),N&&s.jsx("div",{className:"fixed inset-0 z-40",onClick:P=>{P.stopPropagation(),F(!1)}}),N&&s.jsxs("div",{className:"absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-lg shadow-xl z-50 p-1 flex flex-col gap-1",children:[s.jsxs("button",{type:"button",onClick:P=>{P.stopPropagation(),F(!1),h.visit(k(n.form_version===2?"sprf.entry2.projects.show":"sprf.entry.projects.show",n.id))},className:"flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-semibold text-[#289800] hover:bg-[#B5EBA2]/20",children:[s.jsx(ee,{className:"text-sm"})," Edit"]}),s.jsxs("button",{type:"button",onClick:P=>{P.stopPropagation(),F(!1),y(n)},className:"flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-semibold text-red-500 hover:bg-red-50",children:[s.jsx(te,{className:"text-sm"})," Delete"]})]})]})},ve=n=>{if(n.isSkeleton)return s.jsxs("div",{className:"flex items-center gap-3 animate-pulse px-2 py-3",children:[s.jsx("div",{className:"h-10 w-10 rounded-lg bg-slate-200/80 shrink-0"}),s.jsxs("div",{className:"flex-1 space-y-2 min-w-0",children:[s.jsx("div",{className:"h-3 w-2/3 rounded-full bg-slate-200/80"}),s.jsx("div",{className:"h-2.5 w-1/2 rounded-full bg-slate-200/80"})]})]});const h=n.status?.toLowerCase()??"",y=h==="draft",N=h==="returned",F=h==="withdrawn";return s.jsxs("div",{onClick:()=>S.visit(k(n.form_version===2?"sprf.entry2.projects.show":"sprf.entry.projects.show",n.id)),className:"cursor-pointer px-2 py-3 hover:bg-slate-50 transition-colors rounded-xl",children:[s.jsxs("div",{className:"gap-2",children:[s.jsxs("div",{className:"flex items-start justify-between gap-2",children:[s.jsx("p",{className:`text-[11px] font-medium ${n.type===1?"text-[#289800]":"text-gray-500"}`,children:n.type===1?"Existing":n.type===0?"Potential":"—"}),s.jsxs("div",{className:"flex items-start justify-end gap-1",children:[s.jsx("span",{className:`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider whitespace-nowrap
                ${N?"bg-red-100 text-red-700 border border-red-200":y?"bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]":F?"bg-[#0565D2]/15 border-[#0565D2]/50 text-[#0565D2]":"bg-gray-100 text-gray-700 border border-gray-200"}`,children:n.status??"—"}),s.jsx("div",{className:"flex items-center justify-end",children:s.jsx(ye,{r:n,router:S,handleDelete:Z})})]})]}),s.jsxs("div",{className:"min-w-0 leading-relaxed pt-2.5",children:[s.jsx("p",{className:"text-xs font-medium",children:n.sprf_no??"—"}),s.jsx("p",{className:"text-sm font-semibold truncate",children:n.company_name??"—"}),s.jsx("p",{className:"text-[11px] text-slate-800 font-semibold",children:n.sub_category??"—"})]})]}),s.jsxs("div",{className:"flex items-center justify-between mt-5 pb-1.5 text-[11px] uppercase font-medium text-zinc-700",children:[s.jsx("span",{children:n.account_manager??"—"}),s.jsx("span",{className:"normal-case text-slate-500",children:ae(n.last_saved_at)})]})]})};return s.jsxs(s.Fragment,{children:[s.jsx("div",{className:"sticky top-0 z-30 px-4 py-1.5 pb-2 sm:hidden",children:s.jsxs("div",{className:"flex rounded-full bg-[#f8f8f8] w-full border border-[#2c2c2e10] border-b-[#2c2c2e]/15 shadow-sm",children:[s.jsx("button",{type:"button",className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800] border border-[#B5EBA2]/60",children:"Drafts"}),s.jsx("button",{type:"button",onClick:()=>S.visit(k("sprf.current")),className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors",children:"Current"}),s.jsx("button",{type:"button",onClick:()=>S.visit(k("sprf.archive")),className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors",children:"Archive"})]})}),s.jsx(je,{title:"SPRF Entry"}),s.jsxs("div",{className:"min-h-screen flex flex-col",children:[s.jsxs("div",{className:"flex-1 pb-24",children:[s.jsxs("div",{className:"px-4 sm:px-6 lg:px-10 pt-2 md:pt-8 pb-3 flex justify-between items-end",children:[s.jsxs("div",{className:"flex items-baseline gap-1",children:[s.jsx("h1",{className:"font-semibold text-[13px] sm:text-sm text-slate-500",children:"Project SPRF Approval"}),s.jsx("p",{className:"text-slate-400 hidden sm:block",children:"/"}),s.jsx("p",{className:"text-2xl sm:text-3xl font-semibold text-slate-900 hidden sm:block",children:"Entry"})]}),s.jsx("div",{className:"flex flex-col gap-1 items-end",children:s.jsx("h1",{className:"text-[10px] md:text-xs text-slate-500",children:i})})]}),s.jsx(De,{tiles:ue,tableTitle:"In-Progress Drafts",columns:pe,rows:J,rowKey:n=>String(n.id),pagination:m?null:xe,searchControl:be,emptyText:m?"Loading records...":"No matching records found.",renderCard:ve})]}),s.jsx("button",{type:"button",onClick:()=>S.visit(k("sprf.entry.create")),"aria-label":"Create New Draft",className:"sm:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#289800]/80 text-white shadow-lg active:scale-95 transition-transform",children:s.jsx(Ee,{className:"text-xl"})}),s.jsx(vt,{}),s.jsx(Ne,{})]})]})}jt.layout=e=>s.jsx(ke,{children:e});export{jt as default};
