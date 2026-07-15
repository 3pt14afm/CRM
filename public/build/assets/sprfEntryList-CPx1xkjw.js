import{r as d,b as F,j as t,H as ve,c as je}from"./app-uxhmR4Cf.js";import{F as we,A as Ne}from"./AuthenticatedLayout-C9N3dRnQ.js";import{s as E}from"./index-BsxvijQw.js";import{P as ke}from"./ProjectListSection-BdsptjwR.js";import{g as De,e as Ee}from"./index-DBzxQCF1.js";import{i as Ce,d as Se}from"./index-BgB-snS2.js";import{a as Ae}from"./index-jQr-WeC2.js";import{M as te,e as se,h as Fe,i as $e,C as ae,d as Me}from"./index-CU3ifRyb.js";import"./iconBase-t5YIG_yy.js";import"./chevron-down-DSsVwb-P.js";const re=e=>{if(!e)return"—";const s=new Date(e),l=Math.floor((new Date-s)/1e3);if(l<60)return"Just now";const o=Math.floor(l/60);if(o<60)return`${o}m ago`;const i=Math.floor(o/60);if(i<24)return`${i}hr${i>1?"s":""} ago`;const n=Math.floor(i/24);return n<30?`${n}d ago`:new Intl.DateTimeFormat("en-US",{month:"2-digit",day:"2-digit",year:"2-digit"}).format(s)};let _e={data:""},Pe=e=>{if(typeof window=="object"){let s=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return s.nonce=window.__nonce__,s.parentNode||(e||document.head).appendChild(s),s.firstChild}return e||_e},Te=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Le=/\/\*[^]*?\*\/|  +/g,ne=/\n+/g,M=(e,s)=>{let a="",l="",o="";for(let i in e){let n=e[i];i[0]=="@"?i[1]=="i"?a=i+" "+n+";":l+=i[1]=="f"?M(n,i):i+"{"+M(n,i[1]=="k"?"":s)+"}":typeof n=="object"?l+=M(n,s?s.replace(/([^,])+/g,c=>i.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,m=>/&/.test(m)?m.replace(/&/g,c):c?c+" "+m:m)):i):n!=null&&(i=/^--/.test(i)?i:i.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=M.p?M.p(i,n):i+":"+n+";")}return a+(s&&o?s+"{"+o+"}":o)+l},C={},oe=e=>{if(typeof e=="object"){let s="";for(let a in e)s+=a+oe(e[a]);return s}return e},Ie=(e,s,a,l,o)=>{let i=oe(e),n=C[i]||(C[i]=(m=>{let p=0,x=11;for(;p<m.length;)x=101*x+m.charCodeAt(p++)>>>0;return"go"+x})(i));if(!C[n]){let m=i!==e?e:(p=>{let x,u,f=[{}];for(;x=Te.exec(p.replace(Le,""));)x[4]?f.shift():x[3]?(u=x[3].replace(ne," ").trim(),f.unshift(f[0][u]=f[0][u]||{})):f[0][x[1]]=x[2].replace(ne," ").trim();return f[0]})(e);C[n]=M(o?{["@keyframes "+n]:m}:m,a?"":"."+n)}let c=a&&C.g?C.g:null;return a&&(C.g=C[n]),((m,p,x,u)=>{u?p.data=p.data.replace(u,m):p.data.indexOf(m)===-1&&(p.data=x?m+p.data:p.data+m)})(C[n],s,l,c),n},Oe=(e,s,a)=>e.reduce((l,o,i)=>{let n=s[i];if(n&&n.call){let c=n(a),m=c&&c.props&&c.props.className||/^go/.test(c)&&c;n=m?"."+m:c&&typeof c=="object"?c.props?"":M(c,""):c===!1?"":c}return l+o+(n??"")},"");function q(e){let s=this||{},a=e.call?e(s.p):e;return Ie(a.unshift?a.raw?Oe(a,[].slice.call(arguments,1),s.p):a.reduce((l,o)=>Object.assign(l,o&&o.call?o(s.p):o),{}):a,Pe(s.target),s.g,s.o,s.k)}let le,V,X;q.bind({g:1});let S=q.bind({k:1});function ze(e,s,a,l){M.p=s,le=e,V=a,X=l}function _(e,s){let a=this||{};return function(){let l=arguments;function o(i,n){let c=Object.assign({},i),m=c.className||o.className;a.p=Object.assign({theme:V&&V()},c),a.o=/ *go\d+/.test(m),c.className=q.apply(a,l)+(m?" "+m:"");let p=e;return e[0]&&(p=c.as||e,delete c.as),X&&p[0]&&X(c),le(p,c)}return s?s(o):o}}var Re=e=>typeof e=="function",W=(e,s)=>Re(e)?e(s):e,Be=(()=>{let e=0;return()=>(++e).toString()})(),ie=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let s=matchMedia("(prefers-reduced-motion: reduce)");e=!s||s.matches}return e}})(),He=20,Z="default",de=(e,s)=>{let{toastLimit:a}=e.settings;switch(s.type){case 0:return{...e,toasts:[s.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(n=>n.id===s.toast.id?{...n,...s.toast}:n)};case 2:let{toast:l}=s;return de(e,{type:e.toasts.find(n=>n.id===l.id)?1:0,toast:l});case 3:let{toastId:o}=s;return{...e,toasts:e.toasts.map(n=>n.id===o||o===void 0?{...n,dismissed:!0,visible:!1}:n)};case 4:return s.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(n=>n.id!==s.toastId)};case 5:return{...e,pausedAt:s.time};case 6:let i=s.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(n=>({...n,pauseDuration:n.pauseDuration+i}))}}},U=[],ce={toasts:[],pausedAt:void 0,settings:{toastLimit:He}},k={},me=(e,s=Z)=>{k[s]=de(k[s]||ce,e),U.forEach(([a,l])=>{a===s&&l(k[s])})},ue=e=>Object.keys(k).forEach(s=>me(e,s)),Ue=e=>Object.keys(k).find(s=>k[s].toasts.some(a=>a.id===e)),Y=(e=Z)=>s=>{me(s,e)},We={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},qe=(e={},s=Z)=>{let[a,l]=d.useState(k[s]||ce),o=d.useRef(k[s]);d.useEffect(()=>(o.current!==k[s]&&l(k[s]),U.push([s,l]),()=>{let n=U.findIndex(([c])=>c===s);n>-1&&U.splice(n,1)}),[s]);let i=a.toasts.map(n=>{var c,m,p;return{...e,...e[n.type],...n,removeDelay:n.removeDelay||((c=e[n.type])==null?void 0:c.removeDelay)||e?.removeDelay,duration:n.duration||((m=e[n.type])==null?void 0:m.duration)||e?.duration||We[n.type],style:{...e.style,...(p=e[n.type])==null?void 0:p.style,...n.style}}});return{...a,toasts:i}},Ye=(e,s="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:s,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||Be()}),L=e=>(s,a)=>{let l=Ye(s,e,a);return Y(l.toasterId||Ue(l.id))({type:2,toast:l}),l.id},g=(e,s)=>L("blank")(e,s);g.error=L("error");g.success=L("success");g.loading=L("loading");g.custom=L("custom");g.dismiss=(e,s)=>{let a={type:3,toastId:e};s?Y(s)(a):ue(a)};g.dismissAll=e=>g.dismiss(void 0,e);g.remove=(e,s)=>{let a={type:4,toastId:e};s?Y(s)(a):ue(a)};g.removeAll=e=>g.remove(void 0,e);g.promise=(e,s,a)=>{let l=g.loading(s.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(o=>{let i=s.success?W(s.success,o):void 0;return i?g.success(i,{id:l,...a,...a?.success}):g.dismiss(l),o}).catch(o=>{let i=s.error?W(s.error,o):void 0;i?g.error(i,{id:l,...a,...a?.error}):g.dismiss(l)}),e};var Ge=1e3,Ke=(e,s="default")=>{let{toasts:a,pausedAt:l}=qe(e,s),o=d.useRef(new Map).current,i=d.useCallback((u,f=Ge)=>{if(o.has(u))return;let b=setTimeout(()=>{o.delete(u),n({type:4,toastId:u})},f);o.set(u,b)},[]);d.useEffect(()=>{if(l)return;let u=Date.now(),f=a.map(b=>{if(b.duration===1/0)return;let D=(b.duration||0)+b.pauseDuration-(u-b.createdAt);if(D<0){b.visible&&g.dismiss(b.id);return}return setTimeout(()=>g.dismiss(b.id,s),D)});return()=>{f.forEach(b=>b&&clearTimeout(b))}},[a,l,s]);let n=d.useCallback(Y(s),[s]),c=d.useCallback(()=>{n({type:5,time:Date.now()})},[n]),m=d.useCallback((u,f)=>{n({type:1,toast:{id:u,height:f}})},[n]),p=d.useCallback(()=>{l&&n({type:6,time:Date.now()})},[l,n]),x=d.useCallback((u,f)=>{let{reverseOrder:b=!1,gutter:D=8,defaultPosition:I}=f||{},v=a.filter(j=>(j.position||I)===(u.position||I)&&j.height),O=v.findIndex(j=>j.id===u.id),w=v.filter((j,T)=>T<O&&j.visible).length;return v.filter(j=>j.visible).slice(...b?[w+1]:[0,w]).reduce((j,T)=>j+(T.height||0)+D,0)},[a]);return d.useEffect(()=>{a.forEach(u=>{if(u.dismissed)i(u.id,u.removeDelay);else{let f=o.get(u.id);f&&(clearTimeout(f),o.delete(u.id))}})},[a,i]),{toasts:a,handlers:{updateHeight:m,startPause:c,endPause:p,calculateOffset:x}}},Ve=S`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Xe=S`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ze=S`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Je=_("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ve} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
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
`,Qe=S`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,et=_("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${Qe} 1s linear infinite;
`,tt=S`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,st=S`
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
}`,at=_("div")`
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
`,rt=_("div")`
  position: absolute;
`,nt=_("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ot=S`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,lt=_("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ot} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,it=({toast:e})=>{let{icon:s,type:a,iconTheme:l}=e;return s!==void 0?typeof s=="string"?d.createElement(lt,null,s):s:a==="blank"?null:d.createElement(nt,null,d.createElement(et,{...l}),a!=="loading"&&d.createElement(rt,null,a==="error"?d.createElement(Je,{...l}):d.createElement(at,{...l})))},dt=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,ct=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,mt="0%{opacity:0;} 100%{opacity:1;}",ut="0%{opacity:1;} 100%{opacity:0;}",pt=_("div")`
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
`,xt=_("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,ft=(e,s)=>{let a=e.includes("top")?1:-1,[l,o]=ie()?[mt,ut]:[dt(a),ct(a)];return{animation:s?`${S(l)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${S(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},ht=d.memo(({toast:e,position:s,style:a,children:l})=>{let o=e.height?ft(e.position||s||"top-center",e.visible):{opacity:0},i=d.createElement(it,{toast:e}),n=d.createElement(xt,{...e.ariaProps},W(e.message,e));return d.createElement(pt,{className:e.className,style:{...o,...a,...e.style}},typeof l=="function"?l({icon:i,message:n}):d.createElement(d.Fragment,null,i,n))});ze(d.createElement);var gt=({id:e,className:s,style:a,onHeightUpdate:l,children:o})=>{let i=d.useCallback(n=>{if(n){let c=()=>{let m=n.getBoundingClientRect().height;l(e,m)};c(),new MutationObserver(c).observe(n,{subtree:!0,childList:!0,characterData:!0})}},[e,l]);return d.createElement("div",{ref:i,className:s,style:a},o)},bt=(e,s)=>{let a=e.includes("top"),l=a?{top:0}:{bottom:0},o=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:ie()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${s*(a?1:-1)}px)`,...l,...o}},yt=q`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,B=16,vt=({reverseOrder:e,position:s="top-center",toastOptions:a,gutter:l,children:o,toasterId:i,containerStyle:n,containerClassName:c})=>{let{toasts:m,handlers:p}=Ke(a,i);return d.createElement("div",{"data-rht-toaster":i||"",style:{position:"fixed",zIndex:9999,top:B,left:B,right:B,bottom:B,pointerEvents:"none",...n},className:c,onMouseEnter:p.startPause,onMouseLeave:p.endPause},m.map(x=>{let u=x.position||s,f=p.calculateOffset(x,{reverseOrder:e,gutter:l,defaultPosition:s}),b=bt(u,f);return d.createElement(gt,{id:x.id,key:x.id,onHeightUpdate:p.updateHeight,className:x.visible?yt:"",style:b},x.type==="custom"?W(x.message,x):o?o(x):d.createElement(ht,{toast:x,position:u}))}))},$=g;function H(e){if(!e)return null;const[s,a,l]=e.split("-");return new Date(s,a-1,l).toLocaleDateString("en-US",{month:"long",day:"2-digit",year:"numeric"})}function jt({drafts:e=null,stats:s=null}){const a=new Date,l=new Intl.DateTimeFormat("en-US",{day:"2-digit",month:"2-digit",year:"2-digit"}).format(a),[o,i]=d.useState(e),[n,c]=d.useState(s),[m,p]=d.useState(!1),[x,u]=d.useState(!1),[f,b]=d.useState(""),[D,I]=d.useState("all"),[v,O]=d.useState(""),[w,j]=d.useState(""),[T,z]=d.useState(!1),G=d.useRef(null);d.useEffect(()=>{const r=window.matchMedia("(max-width: 639px)"),h=()=>u(r.matches);return h(),r.addEventListener("change",h),()=>r.removeEventListener("change",h)},[]),d.useEffect(()=>{e&&i(e),s&&c(s)},[e,s]),d.useEffect(()=>{const r=h=>{G.current&&!G.current.contains(h.target)&&z(!1)};return document.addEventListener("mousedown",r),()=>document.removeEventListener("mousedown",r)},[]);const K=async(r=1,{silent:h=!1}={})=>{h||p(!0);try{const y=await je.get(E("sprf.entry.list"),{params:{page:r,search:f||void 0,status:D!=="all"?D:void 0,date_from:v||void 0,date_to:w||void 0},headers:{"X-Requested-With":"XMLHttpRequest",Accept:"application/json"}});i(y.data.drafts),c(y.data.stats)}catch(y){console.error("Filtering error payload exception: ",y),h||$.error("Failed to load filtered drafts.")}finally{p(!1)}};d.useEffect(()=>{const r=setTimeout(()=>{K(1)},300);return()=>clearTimeout(r)},[f,D,v,w]);const pe=d.useMemo(()=>{const r=n?.totalDrafts??o?.total??0,h=n?.recentlyModifiedText??"—",y=[{label:"Total Drafts",value:r,icon:t.jsx(Ee,{}),variant:"normal"},{label:"Recently Modified",value:h,icon:t.jsx(Se,{}),variant:"normal"}];return x||y.push({label:t.jsxs(t.Fragment,{children:[t.jsx("span",{className:"sm:hidden",children:"Create"}),t.jsx("span",{className:"hidden sm:inline",children:"Create New Draft"})]}),value:null,icon:t.jsx(Ce,{}),variant:"action",onClick:()=>F.visit(E("sprf.entry.create"))}),y},[n,o,x]),J=r=>{const h=r.sprf_no??r.id;$(y=>{const N=A=>{A.target.closest("[data-toast]")||($.dismiss(y.id),document.removeEventListener("mousedown",N))};return document.addEventListener("mousedown",N),t.jsxs("span",{"data-toast":!0,className:"flex items-center gap-3",children:[t.jsxs("span",{children:["Delete draft ",t.jsx("b",{children:h}),"? This cannot be undone."]}),t.jsx("button",{onClick:()=>{$.dismiss(y.id),document.removeEventListener("mousedown",N),F.delete(E("sprf.entry.projects.destroy",r.id),{preserveScroll:!0,onStart:()=>{$.loading("Deleting draft...",{id:"deleteDraft"})},onSuccess:()=>{$.success("Draft deleted successfully!",{id:"deleteDraft"}),K(o?.current_page??1)},onError:()=>{$.error("Delete failed. Please try again.",{id:"deleteDraft"})}})},className:"bg-red-500 text-white px-3 py-1 rounded text-sm",children:"Delete"}),t.jsx("button",{onClick:()=>{$.dismiss(y.id),document.removeEventListener("mousedown",N)},className:"bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm",children:"Cancel"})]})},{duration:1/0,style:{maxWidth:"500px",padding:"16px 20px",fontSize:"15px"}})},xe=d.useMemo(()=>[{key:"sprf_no",header:"SPRF #",cell:r=>r.isSkeleton?t.jsx("div",{className:"h-4 w-20 bg-slate-200/80 rounded animate-pulse"}):t.jsx("span",{className:"text-[#195c00] font-semibold",children:r.sprf_no??"—"})},{key:"sub_category",header:t.jsx("div",{className:"w-full",children:"SUB CATEGORY"}),cell:r=>r.isSkeleton?t.jsx("div",{className:"h-4 w-24 bg-slate-200/80 rounded animate-pulse mx-auto"}):t.jsx("span",{className:"font-medium flex items-center",children:r.sub_category??"—"})},{key:"company_name",header:t.jsx("div",{className:"w-full",children:"ACCOUNT"}),cell:r=>r.isSkeleton?t.jsx("div",{className:"h-4 w-32 bg-slate-200/80 rounded animate-pulse mx-auto"}):t.jsx("span",{className:"font-medium flex items-center",children:r.company_name??"—"})},{key:"account_manager",header:t.jsx("div",{className:"w-full",children:"ACCOUNT MANAGER"}),cell:r=>r.isSkeleton?t.jsx("div",{className:"h-4 w-28 bg-slate-200/80 rounded animate-pulse mx-auto"}):t.jsx("span",{className:"font-medium flex items-center",children:r.account_manager??"—"})},{key:"type",header:t.jsx("div",{className:"w-full",children:"TYPE"}),cell:r=>r.isSkeleton?t.jsx("div",{className:"h-4 w-16 bg-slate-200/80 rounded animate-pulse mx-auto"}):t.jsx("span",{className:`font-medium flex items-center ${r.type===1?"text-[#289800]":"text-gray-500"}`,children:r.type===1?"Existing":"Potential"})},{key:"last_saved_at",header:t.jsx("div",{className:"w-full",children:"LAST SAVED"}),cell:r=>r.isSkeleton?t.jsx("div",{className:"h-4 w-16 bg-slate-200/80 rounded animate-pulse mx-auto"}):t.jsx("span",{className:"flex items-center md:text-[10px] lg:text-[11px] text-slate-500",children:re(r.last_saved_at)})},{key:"status",header:t.jsx("div",{className:"w-full",children:"STATUS"}),cell:r=>{if(r.isSkeleton)return t.jsx("div",{className:"h-5 w-20 bg-slate-200/80 rounded-full animate-pulse mx-auto"});const h=r.status==="returned";return t.jsx("div",{className:"flex items-center",children:t.jsx("span",{className:`px-2 rounded-full text-[9px] font-bold uppercase tracking-wider md:text-[8px] md:px-1 lg:text-[9px] lg:px-[6px] xl:text-[10px] xl:px-2 border ${h?"bg-red-100 text-red-700 border-red-200":"bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"}`,children:r.status??"—"})})}},{key:"actions",header:t.jsx("div",{className:"text-center w-full",children:"ACTIONS"}),cell:r=>r.isSkeleton?t.jsxs("div",{className:"flex justify-center items-center gap-2",children:[t.jsx("div",{className:"h-7 w-8 bg-slate-200/80 rounded-md animate-pulse"}),t.jsx("div",{className:"h-7 w-8 bg-slate-200/80 rounded-md animate-pulse"})]}):t.jsxs("div",{className:"flex items-center justify-center gap-2 md:gap-1",children:[t.jsx("button",{className:"py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold",onClick:()=>F.visit(E("sprf.entry.projects.show",r.id)),children:t.jsx(te,{className:"text-[10px] md:text-xs lg:text-sm xl:text-base"})}),t.jsx("button",{className:"px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10",onClick:()=>J(r),children:t.jsx(se,{className:"text-[10px] md:text-xs lg:text-sm xl:text-base"})})]})}],[o]),Q=d.useMemo(()=>m?Array.from({length:5},(r,h)=>({id:`skeleton-row-${h}`,isSkeleton:!0})):o?.data??[],[m,o]),fe=o&&typeof o.current_page=="number"?{page:o.current_page,perPage:o.per_page??10,total:o.total??Q.length,onPageChange:r=>K(r)}:null,R=v||w,he=v&&w?`${H(v)} – ${H(w)}`:v?`From ${H(v)}`:w?`Until ${H(w)}`:null,ee=()=>{O(""),j(""),z(!1)},ge=t.jsxs("div",{className:"flex flex-row items-center gap-1 md:gap-1.5 min-w-0 w-full sm:w-auto",children:[t.jsxs("div",{className:"relative h-7 md:h-8 flex items-center min-w-0 flex-shrink-0",children:[t.jsx("input",{type:"text",placeholder:"Search",value:f,onChange:r=>b(r.target.value),className:`peer h-7 md:h-8 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
            outline-none focus:ring-0 focus:border-[#289800] transition-all duration-300
            
            /* Desktop styling: Always expanded */
            md:w-52 md:pl-8 md:pr-3 md:text-black md:placeholder:text-slate-400 md:cursor-text
            
            /* Mobile styling: Conditional based on whether text has been entered */
            ${f?"w-40 pl-8 pr-3 text-black placeholder:text-slate-400":"w-7 px-0 text-transparent placeholder:text-transparent cursor-pointer focus:w-40 focus:pl-8 focus:pr-3 focus:text-black focus:placeholder:text-slate-400 focus:cursor-text"}
          `}),t.jsx(Fe,{className:`absolute text-slate-400 text-base pointer-events-none z-10 transition-all duration-300 
            /* Centers the icon when collapsed, moves it to the left when focused, typed in, or on desktop */
            ${f?"left-2.5 translate-x-0":"left-1/2 -translate-x-1/2 peer-focus:left-2.5 peer-focus:translate-x-0 md:left-2.5 md:translate-x-0"}`})]}),t.jsxs("div",{className:"relative h-7 md:h-8 flex items-center flex-shrink-0",children:[t.jsx($e,{className:"absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-2.5 text-slate-400 text-sm pointer-events-none z-10 transition-all duration-150"}),t.jsxs("select",{value:D,onChange:r=>I(r.target.value),className:`h-7 md:h-8 w-7 md:w-32 px-0 md:pl-8 md:pr-6 py-0 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white 
            text-transparent md:text-black appearance-none cursor-pointer !bg-none [&::-ms-expand]:hidden
            flex items-center outline-none focus:ring-0 focus:border-[#289800]
            transition-all duration-150`,children:[t.jsx("option",{className:"text-black",value:"all",children:"  All Status  "}),t.jsx("option",{className:"text-black",value:"draft",children:"  Draft  "}),t.jsx("option",{className:"text-black",value:"returned",children:"  Returned  "}),t.jsx("option",{className:"text-black",value:"withdrawn",children:"  Withdrawn  "})]})]}),t.jsxs("div",{className:"relative flex-shrink-0",ref:G,children:[t.jsxs("button",{type:"button",onClick:()=>z(r=>!r),className:`h-7 md:h-8 flex items-center gap-1.5 px-1.5 md:px-2.5 text-xs md:text-[13px] font-medium border rounded-lg transition-all duration-150 whitespace-nowrap outline-none focus:ring-0 focus:border-[#289800]
            ${R?"border-[#4FA34E]/40 bg-[#E9F7E7] text-[#2DA300]":"border-gray-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-gray-300"}`,children:[t.jsx(ae,{size:15,className:R?"text-[#4FA34E]":"text-slate-400"}),R&&t.jsx("span",{className:"hidden sm:inline text-[12px] max-w-[180px] truncate",children:he}),R&&t.jsx("span",{className:"ml-0.5 flex items-center text-[#2DA300] hover:text-red-400 transition-colors",onMouseDown:r=>{r.stopPropagation(),ee()},children:t.jsx(Me,{size:13})})]}),T&&t.jsxs("div",{className:"absolute right-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg p-4",children:[t.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[t.jsx(ae,{size:16,className:"text-[#4FA34E]"}),t.jsx("span",{className:"text-[12px] font-semibold text-slate-700 tracking-wide",children:"Filter by Date"})]}),t.jsxs("div",{className:"space-y-2",children:[t.jsx("input",{type:"date",value:v,onChange:r=>O(r.target.value),className:"w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"}),t.jsx("input",{type:"date",value:w,min:v||void 0,onChange:r=>j(r.target.value),className:"w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"})]}),t.jsxs("div",{className:"flex items-center gap-2 mt-4 pt-3 border-t border-gray-100",children:[t.jsx("button",{type:"button",onClick:ee,className:"flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50",children:"Clear"}),t.jsx("button",{type:"button",onClick:()=>z(!1),className:"flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]",children:"Apply"})]})]})]})]}),be=({r,router:h,handleDelete:y})=>{const[N,A]=d.useState(!1);return t.jsxs("div",{className:"relative",children:[t.jsx("button",{type:"button",onClick:P=>{P.stopPropagation(),A(!N)},className:"rounded-lg hover:bg-slate-100 text-slate-500 transition-colors",children:t.jsx(Ae,{className:"text-xl"})}),N&&t.jsx("div",{className:"fixed inset-0 z-40",onClick:P=>{P.stopPropagation(),A(!1)}}),N&&t.jsxs("div",{className:"absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-lg shadow-xl z-50 p-1 flex flex-col gap-1",children:[t.jsxs("button",{type:"button",onClick:P=>{P.stopPropagation(),A(!1),h.visit(E("sprf.entry.projects.show",r.id))},className:"flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-semibold text-[#289800] hover:bg-[#B5EBA2]/20",children:[t.jsx(te,{className:"text-sm"})," Edit"]}),t.jsxs("button",{type:"button",onClick:P=>{P.stopPropagation(),A(!1),y(r)},className:"flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-semibold text-red-500 hover:bg-red-50",children:[t.jsx(se,{className:"text-sm"})," Delete"]})]})]})},ye=r=>{if(r.isSkeleton)return t.jsxs("div",{className:"flex items-center gap-3 animate-pulse px-2 py-3",children:[t.jsx("div",{className:"h-10 w-10 rounded-lg bg-slate-200/80 shrink-0"}),t.jsxs("div",{className:"flex-1 space-y-2 min-w-0",children:[t.jsx("div",{className:"h-3 w-2/3 rounded-full bg-slate-200/80"}),t.jsx("div",{className:"h-2.5 w-1/2 rounded-full bg-slate-200/80"})]})]});const h=r.status?.toLowerCase()??"",y=h==="draft",N=h==="returned",A=h==="withdrawn";return t.jsxs("div",{onClick:()=>F.visit(E("sprf.entry.projects.show",r.id)),className:"cursor-pointer px-2 py-3 hover:bg-slate-50 transition-colors rounded-xl",children:[t.jsxs("div",{className:"gap-2",children:[t.jsxs("div",{className:"flex items-start justify-between gap-2",children:[t.jsx("p",{className:`text-[11px] font-medium ${r.type===1?"text-[#289800]":"text-gray-500"}`,children:r.type===1?"Existing":r.type===0?"Potential":"—"}),t.jsxs("div",{className:"flex items-start justify-end gap-1",children:[t.jsx("span",{className:`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider whitespace-nowrap
                ${N?"bg-red-100 text-red-700 border border-red-200":y?"bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]":A?"bg-[#0565D2]/15 border-[#0565D2]/50 text-[#0565D2]":"bg-gray-100 text-gray-700 border border-gray-200"}`,children:r.status??"—"}),t.jsx("div",{className:"flex items-center justify-end",children:t.jsx(be,{r,router:F,handleDelete:J})})]})]}),t.jsxs("div",{className:"min-w-0 leading-relaxed pt-2.5",children:[t.jsx("p",{className:"text-xs font-medium",children:r.sprf_no??"—"}),t.jsx("p",{className:"text-sm font-semibold truncate",children:r.company_name??"—"}),t.jsx("p",{className:"text-[11px] text-slate-800 font-semibold",children:r.sub_category??"—"})]})]}),t.jsxs("div",{className:"flex items-center justify-between mt-5 pb-1.5 text-[11px] uppercase font-medium text-zinc-700",children:[t.jsx("span",{children:r.account_manager??"—"}),t.jsx("span",{className:"normal-case text-slate-500",children:re(r.last_saved_at)})]})]})};return t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"sticky top-0 z-30 px-4 py-1.5 pb-2 sm:hidden",children:t.jsxs("div",{className:"flex rounded-full bg-[#f8f8f8] w-full border border-[#2c2c2e10] border-b-[#2c2c2e]/15 shadow-sm",children:[t.jsx("button",{type:"button",className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800] border border-[#B5EBA2]/60",children:"Drafts"}),t.jsx("button",{type:"button",onClick:()=>F.visit(E("sprf.current")),className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors",children:"Current"}),t.jsx("button",{type:"button",onClick:()=>F.visit(E("sprf.archive")),className:"flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors",children:"Archive"})]})}),t.jsx(ve,{title:"SPRF Entry"}),t.jsxs("div",{className:"min-h-screen flex flex-col",children:[t.jsxs("div",{className:"flex-1 pb-24",children:[t.jsxs("div",{className:"px-4 sm:px-6 lg:px-10 pt-2 md:pt-8 pb-3 flex justify-between items-end",children:[t.jsxs("div",{className:"flex items-baseline gap-1",children:[t.jsx("h1",{className:"font-semibold text-[13px] sm:text-sm text-slate-500",children:"Project SPRF Approval"}),t.jsx("p",{className:"text-slate-400 hidden sm:block",children:"/"}),t.jsx("p",{className:"text-2xl sm:text-3xl font-semibold text-slate-900 hidden sm:block",children:"Entry"})]}),t.jsx("div",{className:"flex flex-col gap-1 items-end",children:t.jsx("h1",{className:"text-[10px] md:text-xs text-slate-500",children:l})})]}),t.jsx(ke,{tiles:pe,tableTitle:"In-Progress Drafts",columns:xe,rows:Q,rowKey:r=>String(r.id),pagination:m?null:fe,searchControl:ge,emptyText:m?"Loading records...":"No matching records found.",renderCard:ye})]}),t.jsx("button",{type:"button",onClick:()=>F.visit(E("sprf.entry.create")),"aria-label":"Create New Draft",className:"sm:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#289800]/80 text-white shadow-lg active:scale-95 transition-transform",children:t.jsx(De,{className:"text-xl"})}),t.jsx(vt,{}),t.jsx(we,{})]})]})}jt.layout=e=>t.jsx(Ne,{children:e});export{jt as default};
