import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import ArchiveList from './ArchiveList';

export default function Archive({ archiveProjects = null, stats = null, filters = null, locations=[], isAdmin,   }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(today);

  return (
    <>
      {/* PAGE NAVIGATION TABS (Mobile Only) */}
      <div className="sticky top-0 z-30 px-4 py-1.5 pb-2 bg-[#f5f5f7] sm:hidden">
        <div className="flex rounded-full bg-[#f8f8f8] w-full border border-[#2c2c2e10] border-b-[#2c2c2e]/15 shadow-sm">
          <button
            type="button"
            onClick={() => router.visit(route('roi.entry.list'))}
            className="flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            Drafts
          </button>
                  
          <button
            type="button"
            onClick={() => router.visit(route('roi.current'))}
            className="flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            Current
          </button>
                    
          <button
            type="button"
            className="flex-1 text-center px-2 text-[13px] sm:text-sm m-0.5 py-0.5 bg-[#B5EBA2]/50 font-bold rounded-full text-[#289800] border border-[#B5EBA2]/60"
          >
            Archive
          </button>              
        </div>
      </div>    
      <Head title="ROI Archive" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">

          {/* HEADER */}
          <div className="px-4 sm:px-6 lg:px-10 pt-2 sm:pt-8 pb-3 flex justify-between items-end">
            <div className="flex items-baseline gap-1">
              {/* <button
                type="button"
                onClick={() => window.history.back()}
                className="mr-2 mt-2   self-center w-8 h-8 flex items-center justify-center rounded-full bg-[#B5EBA2]/40 backdrop-blur border border-[#B5EBA2]/60 hover:bg-[#B5EBA2]/70 hover:shadow-[0_0_10px_#B5EBA2]/50 transition-all"
              >
                <FaAngleLeft size={20} className="text-[#195C00]" />
              </button> */}
              <h1 className="font-semibold text-[13px] sm:text-sm text-slate-500">Project ROI Approval</h1>
              <span className="text-xs sm:text-base text-slate-400 hidden sm:block">/</span>
              <p className="text-xl sm:text-3xl font-semibold text-slate-900 hidden sm:block">Archive</p>
            </div>

            <h1 className="text-[10px] md:text-xs text-slate-500">{formattedDate}</h1>
          </div>

          <ArchiveList
            archiveProjects={archiveProjects}
            locations={locations}
            stats={stats}
            filters={filters}
            isAdmin ={isAdmin }
          />
        </div>
      </div>
    </>
  );
}

Archive.layout = page => <AuthenticatedLayout children={page} />;