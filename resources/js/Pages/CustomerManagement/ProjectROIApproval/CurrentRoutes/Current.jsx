import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import CurrentList from './CurrentList';

export default function Current({ currentProjects = null, stats = null, filters = null, locations = [] }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  return (
    <>
      <Head title="ROI Current" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">

          {/* HEADER */}
          <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-3 flex justify-between items-end">
            <div className="flex items-baseline gap-1">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="mr-2 mt-3 self-center w-8 h-8 flex items-center justify-center rounded-full bg-[#B5EBA2]/40 backdrop-blur border border-[#B5EBA2]/60 hover:bg-[#B5EBA2]/70 hover:shadow-[0_0_10px_#B5EBA2]/50 transition-all"
              >
                <FaAngleLeft size={20} className="text-[#195C00]" />
              </button>
              <h1 className="font-semibold text-sm text-slate-500 hidden sm:block">
                Project ROI Approval
              </h1>
              <span className="text-slate-400 hidden sm:block">/</span>
              <p className="text-2xl sm:text-3xl font-semibold text-slate-900">Current</p>
            </div>

            <h1 className="text-xs text-slate-500">{formattedDate}</h1>
          </div>

          <CurrentList
            currentProjects={currentProjects}
            locations={locations}
            stats={stats}
            filters={filters}
          />
        </div>

        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-4 sm:px-10 py-3 flex items-center justify-end" />
        </div>
      </div>
    </>
  );
}

Current.layout = page => <AuthenticatedLayout children={page} />;