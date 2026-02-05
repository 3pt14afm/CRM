import React from 'react';

function Names() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 font-sans pb-10 mt-10">

      {/* 2. Signatories Grid */}
      <div className="grid grid-cols-4 gap-y-12 gap-x-8 px-2">
        {/* Top Row */}
        <Signatory label="PREPARED BY:" name="Stephanie Ruth Machan" title="Account Manager" />
        <Signatory label="REVIEWED BY:" name="Lincy Leah Flores" title="Sales Manager" />
        <Signatory label="CHECKED BY:" name="Robert Sandro Tagle" title="Sales Director" />
        <Signatory label="ENDORSED BY:" name="Patrick Khristoper Ay-ad" title="VP - Sales & Marketing" />

        {/* Bottom Row (Offset) */}
        <div className="col-start-3">
          <Signatory label="CONFIRMED BY:" name="Jenyfer Ebio" title="Executive Admin Officer" />
        </div>
        <div className="col-start-4">
          <Signatory label="APPROVED BY:" name="Glenn C. Gucor" title="CEO/President" />
        </div>
      </div>
    </div>
  );
}

// Reusable component for the signature blocks
const Signatory = ({ label, name, title }) => (
  <div className="flex flex-col space-y-4">
    <span className="text-[10px] font-extrabold text-gray-800 tracking-tight">{label}</span>
    <div className="pt-2">
      <p className="text-sm font-semibold text-gray-900 border-b border-gray-400 inline-block min-w-[180px] pb-0.5">
        {name}
      </p>
      <p className="text-[11px] text-gray-500 mt-1">{title}</p>
    </div>
  </div>
);

export default Names;