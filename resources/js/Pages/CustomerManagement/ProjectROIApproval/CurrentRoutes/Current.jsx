import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Adjust path if needed
import { Head } from '@inertiajs/react';
import CurrentList from './CurrentList';

export default function Current() {
      const today = new Date();
      const formattedDate = new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(today);

  return (
    <>
         <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          {/* HEADER (same as your Entry.jsx layout) */}
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project ROI Approval</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Current</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
         </div>
        </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mx-10 px-8 pt-4">
            <CurrentList />
        </div>
    </>
  );
}

Current.layout = page => <AuthenticatedLayout children={page} />
