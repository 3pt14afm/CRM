import React from 'react';

const PrintablePaper = ({ children }) => {
  return (
    <div className="flex flex-col items-center py-10 bg-slate-100 min-h-screen print:bg-white print:py-0">
      {/* - max-w-[210mm]: Standard A4 width 
         - shadow-xl: Visual depth for screen; removed on print
         - print:shadow-none: Cleans up for the printer
      */}
      <div className="
        w-full max-w-[210mm] 
        bg-white shadow-2xl 
        mx-auto p-[15mm] sm:p-[20mm] 
        print:p-[10mm] print:shadow-none print:w-full print:max-w-none 
        min-h-[297mm] relative overflow-hidden
      ">
        {/* Your Proposal Content Starts Here */}
        {children}
      </div>
    </div>
  );
};

export default PrintablePaper;