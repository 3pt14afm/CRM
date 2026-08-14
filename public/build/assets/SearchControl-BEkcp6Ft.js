import{j as e}from"./app-BjvQJFdj.js";import{i as n}from"./index-D0ycPVT5.js";import{a as i,b as d}from"./index-DF0YW0Lj.js";import{T as c,a as x,b as p,c as h}from"./ProjectListSection-CSfH0RZW.js";function g({search:s,onSearchChange:o,sortOrder:t="",onSortToggle:r,loading:a=!1}){return e.jsxs("div",{className:"flex items-center gap-1 md:gap-2",children:[e.jsxs("div",{className:"relative h-7 md:h-8 flex items-center min-w-0 flex-shrink-0",children:[e.jsx("input",{type:"text",placeholder:"Search",value:s,onChange:l=>o(l.target.value),className:`peer h-7 md:h-8 text-xs md:text-[13px] border border-gray-200 rounded-lg bg-white
            outline-none focus:ring-0 focus:border-[#289800] transition-all duration-300
            
            /* Preserving your loading state logic */
            ${a?"opacity-60 pointer-events-none":""}
            
            /* Desktop styling: Always expanded (using your w-52) */
            md:w-52 md:pl-8 md:pr-3 md:text-black md:placeholder:text-slate-400 md:cursor-text
            
            /* Mobile styling: Conditional based on whether text has been entered */
            ${s?"w-40 pl-8 pr-3 text-black placeholder:text-slate-400":"w-7 px-0 text-transparent placeholder:text-transparent cursor-pointer focus:w-40 focus:pl-8 focus:pr-3 focus:text-black focus:placeholder:text-slate-400 focus:cursor-text"}
          `}),e.jsx(n,{className:`absolute text-slate-400 text-base pointer-events-none z-10 transition-all duration-300 
            /* Centers the icon when collapsed, moves it to the left when focused, typed in, or on desktop */
            ${s?"left-2.5 translate-x-0":"left-1/2 -translate-x-1/2 peer-focus:left-2.5 peer-focus:translate-x-0 md:left-2.5 md:translate-x-0"}`})]}),e.jsx(c,{children:e.jsxs(x,{children:[e.jsx(p,{asChild:!0,children:e.jsx("button",{type:"button",onClick:r,className:`h-7 w-7 md:h-8 md:w-8 flex items-center justify-center rounded-lg border bg-white transition-colors duration-150
                ${t?"border-[#4FA34E]/50 text-[#4FA34E] bg-[#4FA34E]/5":"border-gray-200 text-slate-800 hover:text-[#4FA34E] hover:border-[#4FA34E]/40 hover:bg-[#4FA34E]/5"}`,children:t==="asc"?e.jsx(i,{className:"text-[17px]"}):e.jsx(d,{className:`text-[17px] ${t===""?"opacity-60":""}`})})}),e.jsx(h,{children:e.jsx("p",{children:t==="desc"?"Newest first":t==="asc"?"Oldest first":"Sort by date"})})]})})]})}export{g as S};
