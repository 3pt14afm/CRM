import React from 'react';
import { usePage } from '@inertiajs/react';
import { useProjectData } from '@/Context/ProjectContext';

function Names() {
  const { project: rawProject, entryProject, usersById = {}, route: routeName, signatures = {} } = usePage().props;
  const project = rawProject ?? entryProject;

  const { projectData } = useProjectData();

  const isArchive = routeName === 'archive';
  const status = String(project?.status ?? '').toLowerCase();
  const isRejected = isArchive && status === 'rejected';

  const nameOf = (id, fallback = '—') => {
    if (!id) return fallback;
    return usersById?.[String(id)]?.name ?? fallback;
  };

  const positionOf = (id, fallback = '—') => {
    if (!id) return fallback;
    return usersById?.[String(id)]?.position ?? fallback;
  };

  const snapSigns = projectData?.metadata?.signatories ?? {};
  const fromSnap = (key) => snapSigns?.[key] ?? '—';

  const hasPageProject = !!project;

  const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });
    const timePart = date
      .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      .replace(' ', '');
    return `${datePart} ${timePart}`;
  };

  const timestampOf = (value) => (hasPageProject ? formatTimestamp(value) : '');

  const preparedBy = hasPageProject ? (project?.user?.name ?? nameOf(project?.user_id, '—')) : fromSnap('preparedBy');

  const reviewedBy = hasPageProject ? nameOf(project?.reviewed_by) : fromSnap('reviewedBy');
  const checkedBy = hasPageProject ? nameOf(project?.checked_by) : fromSnap('checkedBy');
  const endorsedBy = hasPageProject ? nameOf(project?.endorsed_by) : fromSnap('endorsedBy');
  const confirmedBy = hasPageProject ? nameOf(project?.confirmed_by) : fromSnap('confirmedBy');
  const approvedBy = hasPageProject ? nameOf(project?.approved_by) : fromSnap('approvedBy');

  const rejectedBy = hasPageProject ? (isRejected ? nameOf(project?.rejected_by) : '—') : fromSnap('rejectedBy');

  const rejectedLevel = Number(project?.rejected_by_level ?? 0);

  const preparedByPosition = hasPageProject ? positionOf(project?.user_id) : fromSnap('preparedByPosition');
  const reviewedByPosition = hasPageProject ? positionOf(project?.reviewed_by) : fromSnap('reviewedByPosition');
  const checkedByPosition = hasPageProject ? positionOf(project?.checked_by) : fromSnap('checkedByPosition');
  const endorsedByPosition = hasPageProject ? positionOf(project?.endorsed_by) : fromSnap('endorsedByPosition');
  const confirmedByPosition = hasPageProject ? positionOf(project?.confirmed_by) : fromSnap('confirmedByPosition');
  const approvedByPosition = hasPageProject ? positionOf(project?.approved_by) : fromSnap('approvedByPosition');
  const rejectedByPosition = hasPageProject ? positionOf(project?.rejected_by) : fromSnap('rejectedByPosition');

  const preparedAt = timestampOf(project?.submitted_at);
  const reviewedAt = timestampOf(project?.reviewed_at);
  const checkedAt = timestampOf(project?.checked_at);
  const endorsedAt = timestampOf(project?.endorsed_at);
  const confirmedAt = timestampOf(project?.confirmed_at);
  const approvedAt = timestampOf(project?.approved_at);
  const rejectedAt = isRejected ? timestampOf(project?.rejected_at) : '';

  // Resolve preparer signature from user_id
  const preparerSignature = hasPageProject
    ? (() => {
        const uid = project?.user_id;
        if (!uid) return null;
        const path = `/storage/signatures/${uid}.png`;
        return signatures?.preparer ?? path ?? null;
      })()
    : null;

  return (
    <div className="w-full mx-auto space-y-12 font-sans pb-10 mt-10 print:mx-0">
      <div className="grid grid-cols-4 gap-y-12 gap-x-9 px-2 print:gap-x-6 print:px-1">
        <Signatory
          label="PREPARED BY:"
          name={preparedBy}
          title={preparedByPosition}
          timestamp={preparedAt}
          signatureUrl={preparerSignature}
        />

        <Signatory
          label="REVIEWED BY:"
          name={isRejected && rejectedLevel === 2 ? rejectedBy : reviewedBy}
          title={isRejected && rejectedLevel === 2 ? rejectedByPosition : reviewedByPosition}
          timestamp={isRejected && rejectedLevel === 2 ? rejectedAt : reviewedAt}
          isRejectedAction={isRejected && rejectedLevel === 2}
          signatureUrl={signatures?.reviewed_by ?? null}
        />

        <Signatory
          label="CHECKED BY:"
          name={isRejected && rejectedLevel === 3 ? rejectedBy : checkedBy}
          title={isRejected && rejectedLevel === 3 ? rejectedByPosition : checkedByPosition}
          timestamp={isRejected && rejectedLevel === 3 ? rejectedAt : checkedAt}
          isRejectedAction={isRejected && rejectedLevel === 3}
          signatureUrl={signatures?.checked_by ?? null}
        />

        <Signatory
          label="ENDORSED BY:"
          name={isRejected && rejectedLevel === 4 ? rejectedBy : endorsedBy}
          title={isRejected && rejectedLevel === 4 ? rejectedByPosition : endorsedByPosition}
          timestamp={isRejected && rejectedLevel === 4 ? rejectedAt : endorsedAt}
          isRejectedAction={isRejected && rejectedLevel === 4}
          signatureUrl={signatures?.endorsed_by ?? null}
        />

        <div className="col-start-3">
          <Signatory
            label="CONFIRMED BY:"
            name={isRejected && rejectedLevel === 5 ? rejectedBy : confirmedBy}
            title={isRejected && rejectedLevel === 5 ? rejectedByPosition : confirmedByPosition}
            timestamp={isRejected && rejectedLevel === 5 ? rejectedAt : confirmedAt}
            isRejectedAction={isRejected && rejectedLevel === 5}
            signatureUrl={signatures?.confirmed_by ?? null}
          />
        </div>

        <div className="col-start-4">
          <Signatory
            label="APPROVED BY:"
            name={isRejected && rejectedLevel === 6 ? rejectedBy : approvedBy}
            title={isRejected && rejectedLevel === 6 ? rejectedByPosition : approvedByPosition}
            timestamp={isRejected && rejectedLevel === 6 ? rejectedAt : approvedAt}
            isRejectedAction={isRejected && rejectedLevel === 6}
            signatureUrl={signatures?.approved_by ?? null}
          />
        </div>
      </div>
    </div>
  );
}

const Signatory = ({ label, name, title, timestamp, isRejectedAction, signatureUrl }) => (
  <div className="flex flex-col space-y-4 justify-center">
    <span className="text-[10px] font-extrabold text-gray-800 tracking-tight print:font-semibold">{label}</span>
    <div className="pt-2">
      <div className="flex text-[11px] justify-end gap-1 print:gap-0.5 min-w-[175px] print:min-w-[150px]">
        <p className="text-gray-50/0">.</p>
        <p className={isRejectedAction ? "text-red-500" : "text-[#175500]"}>{timestamp}</p>
      </div>

      {/* Name line with signature overlayed behind it */}
      <div className="relative w-full h-16">
    {signatureUrl && (
        <img
            src={signatureUrl}
            alt="Signature"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ mixBlendMode: 'multiply' }}
            onError={(e) => { e.target.style.display = 'none'; }}
        />
    )}
    <p className="absolute bottom-0 left-0 right-0 text-sm text-center font-semibold text-gray-900 border-b border-gray-400 w-full pb-0.5 print:font-medium print:text-[13px] print:min-w-[150px]">
        {name || '—'}
    </p>
</div>

      <p className="text-[11px] text-center text-gray-500 mt-1">{title}</p>
    </div>
  </div>
);

export default Names;