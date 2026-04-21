import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React, { useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import ProjectListSection from '@/Components/roi/ProjectListSection';

import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoAddCircleOutline } from 'react-icons/io5';
import toast, { Toaster } from 'react-hot-toast';
import { MdDelete, MdEdit } from 'react-icons/md';
import FlashMessages from '@/Components/FlashMessages';

const formatLastSaved = (value) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
};

export default function SprfEntryList({
  drafts = null,
  stats = null,
}) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(today);

  const tiles = useMemo(() => {
    const totalDrafts = stats?.totalDrafts ?? drafts?.total ?? 0;
    const recentlyModified = stats?.recentlyModifiedText ?? '—';

    return [
      {
        label: 'Total Drafts',
        value: totalDrafts,
        icon: <FaFolderOpen />,
        variant: 'normal',
      },
      {
        label: 'Recently Modified',
        value: recentlyModified,
        icon: <IoTimeOutline />,
        variant: 'normal',
      },
      {
        label: 'Create New Draft',
        value: null,
        icon: <IoAddCircleOutline />,
        variant: 'action',
        onClick: () => router.visit(route('sprf.entry.create')),
      },
    ];
  }, [stats, drafts]);

  const handleDelete = (row) => {
    const ref = row.sprf_no ?? row.id;

    toast(
      (t) => {
        const handleOutsideClick = (e) => {
          if (!e.target.closest('[data-toast]')) {
            toast.dismiss(t.id);
            document.removeEventListener('mousedown', handleOutsideClick);
          }
        };

        document.addEventListener('mousedown', handleOutsideClick);

        return (
          <span data-toast className="flex items-center gap-3">
            <span>
              Delete draft <b>{ref}</b>? This cannot be undone.
            </span>

            <button
              onClick={() => {
                toast.dismiss(t.id);
                document.removeEventListener('mousedown', handleOutsideClick);

                router.delete(route('sprf.entry.projects.destroy', row.id), {
                  preserveScroll: true,
                  onStart: () => {
                    toast.loading('Deleting draft...', { id: 'deleteDraft' });
                  },
                  onSuccess: () => {
                    toast.success('Draft deleted successfully!', { id: 'deleteDraft' });
                  },
                  onError: () => {
                    toast.error('Delete failed. Please try again.', { id: 'deleteDraft' });
                  },
                });
              }}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Delete
            </button>

            <button
              onClick={() => {
                toast.dismiss(t.id);
                document.removeEventListener('mousedown', handleOutsideClick);
              }}
              className="bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
            >
              Cancel
            </button>
          </span>
        );
      },
      {
        duration: Infinity,
        style: {
          maxWidth: '500px',
          padding: '16px 20px',
          fontSize: '15px',
        },
      }
    );
  };

  const columns = useMemo(
    () => [
      {
        key: 'sprf_no',
        header: 'SPRF #',
        cell: (r) => (
          <span className="text-[#195c00] font-semibold">
            {r.sprf_no ?? '—'}
          </span>
        ),
      },
      {
        key: 'sub_category',
        header: <div className="text-center w-full">SUB CATEGORY</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {r.sub_category ?? '—'}
          </span>
        ),
      },
      {
        key: 'company_name',
        header: <div className="text-center w-full">ACCOUNT</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {r.company_name ?? '—'}
          </span>
        ),
      },
      {
        key: 'account_manager',
        header: <div className="text-center w-full">ACCOUNT MANAGER</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {r.account_manager ?? '—'}
          </span>
        ),
      },
      {
        key: 'last_saved_at',
        header: <div className="text-center w-full">LAST SAVED</div>,
        cell: (r) => (
          <span className="font-medium flex justify-center items-center">
            {formatLastSaved(r.last_saved_at)}
          </span>
        ),
      },
      {
        key: 'status',
        header: <div className="text-center w-full">STATUS</div>,
        cell: (row) => (
          <div className="flex justify-center items-center">
            <span className="px-2 rounded-full text-[9px] font-bold uppercase tracking-wider md:text-[8px] md:px-1 lg:text-[9px] lg:px-[6px] xl:text-[10px] xl:px-2 bg-gray-100 text-gray-600 border border-gray-200">
              {row.status ?? '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) => (
          <div className="flex items-center justify-center gap-2 md:gap-1">
            <button
              className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
              onClick={() => router.visit(route('sprf.entry.projects.show', r.id))}
            >
              <MdEdit className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
            </button>

            <button
              className="px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10"
              onClick={() => handleDelete(r)}
            >
              <MdDelete className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const goToPage = (p) => {
    router.get(route('sprf.entry.list'), { page: p }, { preserveScroll: true, preserveState: true });
  };

  const rows = drafts?.data ?? [];
  const pagination =
    drafts && typeof drafts.current_page === 'number'
      ? {
          page: drafts.current_page,
          perPage: drafts.per_page ?? 10,
          total: drafts.total ?? rows.length,
          onPageChange: goToPage,
        }
      : null;

  return (
    <>
      <Head title="SPRF Entry" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10 md:mx-4 lg:mx-5 xl:mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project SPRF</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Entry</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          <ProjectListSection
            tiles={tiles}
            tableTitle="In-Progress Drafts"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={pagination}
          />
        </div>

        <Toaster />
        <FlashMessages />

        <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
          <div className="px-10 py-3 flex items-center justify-end" />
        </div>
      </div>
    </>
  );
}

SprfEntryList.layout = (page) => <AuthenticatedLayout children={page} />;