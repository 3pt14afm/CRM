import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import CurrentList from './CurrentList';

export default function Current({
  currentProjects = null,
  projects = null,
  stats = null,
  canActOnCurrentProject = false,
}) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(today);

  return (
    <>
      <Head title="SPRF Current" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project SPRF Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Current</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          <CurrentList
            currentProjects={currentProjects ?? projects}
            stats={stats}
            canActOnCurrentProject={canActOnCurrentProject}
          />
        </div>

        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end" />
        </div>
      </div>
    </>
  );
}

Current.layout = (page) => <AuthenticatedLayout children={page} />;