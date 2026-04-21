export default function NamesBlock({
  signatories,
  showVpCcto = false,
  showPresidentCeo = false,
  showRebateJustification = false,
  rebateJustification = '',
  onChangeRebateJustification,
}) {
  const leftPreparer = signatories?.preparer ?? { name: '', title: '' };
  const leftDirectorCustomerEngagement =
    signatories?.directorCustomerEngagement ?? { name: '', title: '' };

  const rightSignatories = [
    signatories?.esdDirector ?? { name: '', title: '' },
    ...(showVpCcto ? [signatories?.vpCcto ?? { name: '', title: '' }] : []),
    ...(showPresidentCeo ? [signatories?.presidentCeo ?? { name: '', title: '' }] : []),
  ];

  return (
    <div className="w-full mt-10 pb-10">
      <div className="mx-auto w-full max-w-[860px]">
        <div className="grid grid-cols-1 gap-y-12 gap-x-24 md:grid-cols-2">
          <div className="flex flex-col space-y-12">
            <SectionLabel label="PREPARED BY:" />

            <Signatory
              name={leftPreparer.name}
              title={leftPreparer.title}
            />

            <Signatory
              name={leftDirectorCustomerEngagement.name}
              title={leftDirectorCustomerEngagement.title}
            />

            {showRebateJustification && (
              <JustificationField
                value={rebateJustification}
                onChange={onChangeRebateJustification}
              />
            )}
          </div>

          <div className="flex flex-col space-y-12">
            <SectionLabel label="APPROVED BY:" />

            {rightSignatories.map((signatory, index) => (
              <Signatory
                key={`${signatory?.title || 'signatory'}-${index}`}
                name={signatory?.name}
                title={signatory?.title}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <span className="text-[10px] font-extrabold text-gray-800 tracking-tight print:font-semibold">
      {label}
    </span>
  );
}

function Signatory({ name, title }) {
  return (
    <div className="flex flex-col space-y-4 justify-center">
      <div className="pt-2">
        <div className="border-b border-gray-400 min-h-[28px] flex items-end pb-0.5">
          <span className="text-sm font-semibold text-gray-900 print:font-medium print:text-xs">
            {name?.trim() || '—'}
          </span>
        </div>

        <div className="text-[11px] text-gray-500 mt-1 w-full">
          {title || ''}
        </div>
      </div>
    </div>
  );
}

function JustificationField({ value, onChange }) {
  return (
    <div className="flex flex-col space-y-3">
      <label className="text-[10px] font-extrabold text-gray-800 tracking-tight">
        JUSTIFICATION FOR REBATE <span className="text-red-500">*</span>
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Enter justification for rebate request"
        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-xs outline-none placeholder:text-[#9AA08F] hover:border-[#28980080] focus:border-[#289800] focus:outline-none focus:ring-0 resize-none"
      />

      <p className="text-[11px] text-gray-500">
        This field is shown only when the Rebate row has a value.
      </p>
    </div>
  );
}