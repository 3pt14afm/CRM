export default function NamesBlock({
  signatories,
  timestamps = {},
  status = null,
  currentLevel = null,
  rejectedAt = null,
  showDirectorCustomerEngagement = false,
  showVpCcto = false,
  showPresidentCeo = false,
  showRebateJustification = true,
  rebateJustification = '',
  onChangeRebateJustification,
  canEditRebateJustification = false,
  isRebateJustificationRequired = false,
  readOnly = false,
  signatures = {}, // NEW
}) {
  const isRejected = status === 'rejected';
  const isRejectorAtLevel = (level) => isRejected && Number(currentLevel) === level;

  const timestampForLevel = (level) => {
    if (isRejectorAtLevel(level)) return rejectedAt;
    return (
      {
        1: timestamps?.submitted_at,
        2: timestamps?.dce_acted_at,
        3: timestamps?.esd_acted_at,
        4: timestamps?.vp_ccto_acted_at,
        5: timestamps?.president_ceo_acted_at,
      }[level] ?? null
    );
  };

  const leftPreparer = signatories?.preparer ?? { name: '', title: '' };
  const leftDce = signatories?.directorCustomerEngagement ?? { name: '', title: '' };

  return (
    <div className="w-full pb-10">
      <div className="mx-auto w-full">
        <div className="grid grid-cols-1 gap-y-10 gap-x-10 md:grid-cols-2">
          {/* ── Left: Prepared By ── */}
          <div className="flex flex-col space-y-10">
            <SectionLabel label="PREPARED BY:" />
            <Signatory
              name={leftPreparer.name}
              title={leftPreparer.title}
              timestamp={timestampForLevel(1)}
              isRejector={isRejectorAtLevel(1)}
              signatureUrl={timestampForLevel(1) ? signatures?.preparer : null}
            />

            {showDirectorCustomerEngagement && (
            <Signatory
                name={leftDce.name}
                title={leftDce.title}
                timestamp={timestampForLevel(2)}
                isRejector={isRejectorAtLevel(2)}
                signatureUrl={timestampForLevel(2) ? signatures?.directorCustomerEngagement : null}
              />
            )}
            {showRebateJustification && showDirectorCustomerEngagement && (
              <JustificationField
                value={rebateJustification}
                onChange={onChangeRebateJustification}
                canEdit={canEditRebateJustification}
                required={isRebateJustificationRequired}
              />
            )}
          </div>
          {/* ── Right: Approved By ── */}
          <div className="flex flex-col space-y-10">
            <SectionLabel label="APPROVED BY:" />
            <Signatory
              name={signatories?.esdDirector?.name}
              title={signatories?.esdDirector?.title}
              timestamp={timestampForLevel(3)}
              isRejector={isRejectorAtLevel(3)}
              signatureUrl={timestampForLevel(3) ? signatures?.esdDirector : null}
            />
            {showVpCcto && (
              <Signatory
                name={signatories?.vpCcto?.name}
                title={signatories?.vpCcto?.title}
                timestamp={timestampForLevel(4)}
                isRejector={isRejectorAtLevel(4)}
                signatureUrl={timestampForLevel(4) ? signatures?.vpCcto : null}
              />
            )}
            {showPresidentCeo && (
              <Signatory
                name={signatories?.presidentCeo?.name}
                title={signatories?.presidentCeo?.title}
                timestamp={timestampForLevel(5)}
                isRejector={isRejectorAtLevel(5)}
                signatureUrl={timestampForLevel(5) ? signatures?.presidentCeo : null}
              />
            )}
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

function Signatory({ name, title, timestamp = null, isRejector = false, signatureUrl = null }) {
  const formatTimestamp = (ts) => {
    if (!ts) return null;
    try {
      const date = new Date(ts);
      if (Number.isNaN(date.getTime())) return null;

      const datePart = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      });
      const timePart = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).replace(' ', '');

      return `${datePart} ${timePart}`;
    } catch {
      return null;
    }
  };

  const formatted = formatTimestamp(timestamp);

  return (
    <div className="flex flex-col space-y-4 justify-center">
      <div className="w-full">
        <div className="text-[10px] xl:text-[10px] mb-1 flex items-center justify-end gap-1 font-medium">
          <p className="text-gray-50/0">.</p>
          <p className={isRejector ? "text-red-500" : "text-[#175500]"}>
            {formatted}
          </p>
        </div>
        <div className="relative border-b border-gray-400 min-h-[25px] flex items-end justify-center xl:pb-0.5">
          {signatureUrl && (
            <img
              src={signatureUrl}
              alt=""
              className="absolute bottom-0 left-1/2 -translate-x-1/2 max-h-[70px] max-w-[160px] object-contain pointer-events-none print:max-h-[36px] mix-blend-multiply"
            />
          )}
          <span className="relative text-xs xl:text-sm font-semibold text-gray-900 print:font-medium print:text-xs">
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

function JustificationField({ value, onChange, canEdit = false, required = false }) {
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
        <p className={`text-[10px] italic pl-1 ${required ? 'text-red-500' : 'text-[#9AA08F]'}`}>
          {required ? 'Required because the Rebate row has a value.'  : 'Optional. You may add a rebate justification if needed.'}
        </p>
      ) : (
        <p className="text-[10px] italic pl-1 text-[#9AA08F]">
          {value?.trim?.() ? 'Rebate justification provided.' : 'No rebate justification provided.'}
        </p>
      )}
    </div>
  );
}