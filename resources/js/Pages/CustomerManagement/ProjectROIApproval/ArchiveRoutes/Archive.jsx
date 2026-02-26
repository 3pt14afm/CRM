import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ArchiveList from './ArchiveList';

export default function Archive({ archiveProjects = null, stats = null }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  return (
    <>
      <Head title="ROI Archive" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          {/* HEADER */}
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project ROI Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Archive</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          {/* ✅ Render list normally (no grid wrapper) */}
          <ArchiveList archiveProjects={archiveProjects} stats={stats} />
        </div>

        {/* keep footer spacing consistent */}
        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end" />
        </div>
      </div>
    </>
  );
}

Archive.layout = page => <AuthenticatedLayout children={page} />;