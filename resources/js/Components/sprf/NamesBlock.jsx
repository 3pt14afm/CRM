export default function NamesBlock({
  signatories,
  showVpCcto = false,
  showPresidentCeo = false,
  showRebateJustification = true,
  rebateJustification = '',
  onChangeRebateJustification,
  canEditRebateJustification = false,
  isRebateJustificationRequired = false,
  readOnly = false,
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
    <div className="w-full pb-10">
      <div className="mx-auto w-full">
        <div className="grid grid-cols-1 gap-y-10 gap-x-1 md:grid-cols-2">
          <div className="flex flex-col space-y-10">
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
                canEdit={canEditRebateJustification}
                required={isRebateJustificationRequired}
              />
            )}
          </div>

          <div className="flex flex-col space-y-10">
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
      <div className="w-[85%] xl:w-[80%]">
        <div className="border-b border-gray-400 min-h-[25px] flex items-center justify-center xl:pb-0.5">
          <span className="text-xs xl:text-sm font-semibold text-gray-900 print:font-medium print:text-xs">
            {name?.trim() || '—'}
          </span>
        </div>

        <div className="text-[10px] xl:text-[11px] text-gray-500 mt-1 flex items-center justify-center">
          {title || ''}
        </div>
      </div>
    </div>
  );
}

function JustificationField({
  value,
  onChange,
  canEdit = false,
  required = false,
}) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-[10px] pl-1 font-extrabold text-gray-800 tracking-tight">
        JUSTIFICATION FOR REBATE
        {required && <span className="text-red-500"> *</span>}
      </label>

      {!canEdit ? (
        <div className="w-[85%] xl:w-[80%] min-h-[72px] rounded-xl border border-gray-200 px-3 py-3 text-xs bg-white whitespace-pre-wrap">
          {value?.trim?.() ? value : ''}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          rows={2}
          placeholder="Enter justification for rebate request"
          className="w-[85%] xl:w-[80%] rounded-xl border border-gray-200 p-3 text-[11px] leading-tight xl:text-xs outline-none placeholder:text-[#9AA08F] hover:border-[#28980080] focus:border-[#289800] focus:outline-none focus:ring-0 resize-none"
        />
      )}

      {canEdit ? (
        <p className="text-[10px] italic pl-1 text-gray-500 w-[85%] xl:w-[80%]">
          {required
            ? 'Required because the Rebate row has a value.'
            : 'Optional. You may add a rebate justification if needed.'}
        </p>
      ) : (
        <p className="text-[10px] italic pl-1 text-gray-500 w-[85%] xl:w-[80%]">
          Only Director - Customer Engagement can input this field.
        </p>
      )}
    </div>
  );
}