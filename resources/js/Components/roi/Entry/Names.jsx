import React from 'react';
import { usePage } from '@inertiajs/react';
import { useProjectData } from '@/Context/ProjectContext';

function Names() {
  const { project: rawProject, entryProject, usersById = {}, route: routeName } = usePage().props;
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

    console.log('usersById:', usersById);
  console.log('user_id:', project?.user_id);
  console.log('positionOf result:', usersById?.[String(project?.user_id)]);

  const snapSigns = projectData?.metadata?.signatories ?? {};
  const fromSnap = (key) => snapSigns?.[key] ?? '—';

  const hasPageProject = !!project;

  const preparedBy = hasPageProject
    ? (project?.user?.name ?? nameOf(project?.user_id, '—'))
    : fromSnap('preparedBy');

  const reviewedBy = hasPageProject ? nameOf(project?.reviewed_by) : fromSnap('reviewedBy');
  const checkedBy = hasPageProject ? nameOf(project?.checked_by) : fromSnap('checkedBy');
  const endorsedBy = hasPageProject ? nameOf(project?.endorsed_by) : fromSnap('endorsedBy');
  const confirmedBy = hasPageProject ? nameOf(project?.confirmed_by) : fromSnap('confirmedBy');
  const approvedBy = hasPageProject ? nameOf(project?.approved_by) : fromSnap('approvedBy');

  const rejectedBy = hasPageProject
    ? (isRejected ? nameOf(project?.rejected_by) : '—')
    : fromSnap('rejectedBy');

  const rejectedLevel = Number(project?.rejected_by_level ?? 0);

  // Positions — all consistently use positionOf via usersById
  const preparedByPosition = hasPageProject
    ? positionOf(project?.user_id)
    : fromSnap('preparedByPosition');

  const reviewedByPosition = hasPageProject ? positionOf(project?.reviewed_by) : fromSnap('reviewedByPosition');
  const checkedByPosition = hasPageProject ? positionOf(project?.checked_by) : fromSnap('checkedByPosition');
  const endorsedByPosition = hasPageProject ? positionOf(project?.endorsed_by) : fromSnap('endorsedByPosition');
  const confirmedByPosition = hasPageProject ? positionOf(project?.confirmed_by) : fromSnap('confirmedByPosition');
  const approvedByPosition = hasPageProject ? positionOf(project?.approved_by) : fromSnap('approvedByPosition');
  const rejectedByPosition = hasPageProject ? positionOf(project?.rejected_by) : fromSnap('rejectedByPosition');

  return (
    <div className="w-full mx-auto space-y-12 font-sans pb-10 mt-10 print:mx-0">
      <div className="grid grid-cols-4 gap-y-12 gap-x-8 px-2 print:px-1">
        <Signatory label="PREPARED BY:" name={preparedBy} title={preparedByPosition} />

        <Signatory
          label="REVIEWED BY:"
          name={isRejected && rejectedLevel === 2 ? rejectedBy : reviewedBy}
          title={isRejected && rejectedLevel === 2 ? rejectedByPosition : reviewedByPosition}
        />

        <Signatory
          label="CHECKED BY:"
          name={isRejected && rejectedLevel === 3 ? rejectedBy : checkedBy}
          title={isRejected && rejectedLevel === 3 ? rejectedByPosition : checkedByPosition}
        />

        <Signatory
          label="ENDORSED BY:"
          name={isRejected && rejectedLevel === 4 ? rejectedBy : endorsedBy}
          title={isRejected && rejectedLevel === 4 ? rejectedByPosition : endorsedByPosition}
        />

        <div className="col-start-3">
          <Signatory
            label="CONFIRMED BY:"
            name={isRejected && rejectedLevel === 5 ? rejectedBy : confirmedBy}
            title={isRejected && rejectedLevel === 5 ? rejectedByPosition : confirmedByPosition}
          />
        </div>

        <div className="col-start-4">
          <Signatory
            label="APPROVED BY:"
            name={isRejected && rejectedLevel === 6 ? rejectedBy : approvedBy}
            title={isRejected && rejectedLevel === 6 ? rejectedByPosition : approvedByPosition}
          />
        </div>
      </div>
    </div>
  );
}

const Signatory = ({ label, name, title }) => (
  <div className="flex flex-col space-y-4 justify-center">
    <span className="text-[10px] font-extrabold text-gray-800 tracking-tight print:font-semibold">{label}</span>
    <div className="pt-2">
      <p className="text-sm font-semibold text-gray-900 border-b border-gray-400 inline-block min-w-[175px] pb-0.5 print:font-medium print:text-xs print:min-w-[150px]">
        {name || '—'}
      </p>
      <p className="text-[11px] text-gray-500 mt-1">{title}</p>
    </div>
  </div>
);

export default Names;