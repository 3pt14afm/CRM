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
  const isApproved = isArchive && status === 'approved';

  const nameOf = (id, fallback = '—') => {
    if (!id) return fallback;
    return usersById?.[String(id)]?.name ?? fallback;
  };

  // ✅ Snapshot signatories (print mode)
  const snapSigns = projectData?.metadata?.signatories ?? {};
  const fromSnap = (key) => snapSigns?.[key] ?? '—';

  const hasPageProject = !!project;

  // Prepared by (ID-based if project exists, else snapshot)
  const preparedBy = hasPageProject
    ? (project?.user?.name ?? nameOf(project?.user_id, '—'))
    : fromSnap('preparedBy');

  const reviewedBy = hasPageProject
    ? nameOf(project?.reviewed_by_id, project?.reviewed_by ?? '—')
    : fromSnap('reviewedBy');

  const checkedBy = hasPageProject
    ? nameOf(project?.checked_by_id, project?.checked_by ?? '—')
    : fromSnap('checkedBy');

  const endorsedBy = hasPageProject
    ? nameOf(project?.endorsed_by_id, project?.endorsed_by ?? '—')
    : fromSnap('endorsedBy');

  const confirmedBy = hasPageProject
    ? nameOf(project?.confirmed_by_id, project?.confirmed_by ?? '—')
    : fromSnap('confirmedBy');

  const approvedBy = hasPageProject
    ? (isApproved ? nameOf(project?.approved_by) : '—')
    : fromSnap('approvedBy');

  const rejectedBy = hasPageProject
    ? (isRejected ? nameOf(project?.rejected_by) : '—')
    : fromSnap('rejectedBy');

  const rejectedLevel = Number(project?.rejected_by_level ?? 0);
  const rejectNameForLevel = (level) => (isRejected && rejectedLevel === level ? rejectedBy : '—');

  return (
    <div className="w-full mx-auto space-y-12 font-sans pb-10 mt-10 print:mx-12">
      <div className="grid grid-cols-4 gap-y-12 gap-x-8 px-2 print:px-1">
        <Signatory label="PREPARED BY:" name={preparedBy} title="Account Manager" />

        <Signatory
          label="REVIEWED BY:"
          name={isRejected ? rejectNameForLevel(2) : reviewedBy}
          title="Sales Manager"
        />

        <Signatory
          label="CHECKED BY:"
          name={isRejected ? rejectNameForLevel(3) : checkedBy}
          title="Sales Director"
        />

        <Signatory
          label="ENDORSED BY:"
          name={isRejected ? rejectNameForLevel(4) : endorsedBy}
          title="VP - Sales & Marketing"
        />

        <div className="col-start-3">
          <Signatory
            label="CONFIRMED BY:"
            name={isRejected ? rejectNameForLevel(5) : confirmedBy}
            title="Executive Admin Officer"
          />
        </div>

        <div className="col-start-4">
          <Signatory
            label="APPROVED BY:"
            name={isApproved ? approvedBy : '—'}
            title="CEO/President"
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